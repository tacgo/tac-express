"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

/* ════════════════════════════════════════════════════════════════════════ */
/*  Public API                                                               */
/*                                                                           */
/*  `ShippingLabelData` is preserved from the prior contract so existing     */
/*  callers (`/print/label/[awb]`, `/print/invoice-label/[id]`) keep         */
/*  working. The 7-zone mission-control rendering happens internally.        */
/* ════════════════════════════════════════════════════════════════════════ */

export interface ShippingLabelData {
  awbNumber: string
  origin: string
  destination: string
  serviceLevel: string
  paymentMode: string

  senderName: string
  senderPhone?: string
  senderAddress: string

  receiverName: string
  receiverPhone?: string
  receiverAddress: string

  pieces?: number
  weightKg?: number
  description?: string
  orderRef?: string

  companyName?: string
  /** ISO date — used as the MSN timestamp anchor. Defaults to "now". */
  shipDate?: string
}

interface ShippingLabelProps {
  data: ShippingLabelData
  /**
   * Render variant.
   * - `"print"` — 4in physical width (default). Pairs with `PRINT_PAGE_SIZES.Thermal4x6`.
   * - `"preview"` — 420px screen preview (slightly larger than print for readability).
   */
  size?: "print" | "preview"
  /** Centered footer compliance line. */
  handlerInstruction?: string
  className?: string
  /**
   * Real Code 128 barcode SVG, encoded server-side via
   * `@workspace/services/barcode/encode`. The label inlines this
   * markup directly via `dangerouslySetInnerHTML` so the rendered
   * SVG is the actual scannable symbology — not a decorative
   * stand-in. REQUIRED — without it the label renders an explicit
   * "Barcode missing" placeholder instead of a fake-looking pattern,
   * so the failure mode is loud rather than silently producing
   * unscannable output.
   */
  code128Svg?: string
  /**
   * Real Data Matrix barcode SVG, encoded server-side. Same contract
   * as `code128Svg`.
   */
  dataMatrixSvg?: string
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  ShippingLabel                                                            */
/*                                                                           */
/*  FBA-anatomy 7-zone shipping label, retoned for Violet Grid:              */
/*                                                                           */
/*    ┌─ Zone 1 ─────────────────────────────────────────────────────┐      */
/*    │  TAC EXPRESS                          Box 01 of 01 — 1.2 kg  │      */
/*    ├─ Zone 2 ─────────────────────────────────────────────────────┤      */
/*    │  ORIGIN                  │  DESTINATION                       │      */
/*    │  Sender Name             │  NODE: NEW DELHI                   │      */
/*    │  sender address …        │  Receiver Name + address …         │      */
/*    ├─ Zone 3 (inverted) ──────────────────────────────────────────┤      */
/*    │  MSN (05.05.26 02:41 UTC)                              — 01  │      */
/*    ├─ Zone 4 ─────────────────────────────────────────────────────┤      */
/*    │  ▌▐█▌▐█▌▐▌▌▐█▌▐▌▌▐█▌▌▐█▌▐▌▌▐▌  │  ┌─Data Matrix─┐         │      */
/*    │     (Code 128, stretched)        │  └─────────────┘         │      */
/*    ├─ Zone 5 + 6 ─────────────────────────────────────────────────┤      */
/*    │  TAC26050514110001              Mixed Payload                │      */
/*    │                                 KM-SSHL-KJ9N                 │      */
/*    │                                 Qty 1                        │      */
/*    ├─ Zone 7 ─────────────────────────────────────────────────────┤      */
/*    │            DO NOT COVER — KEEP LABEL VISIBLE                 │      */
/*    └──────────────────────────────────────────────────────────────┘      */
/*                                                                           */
/*  Typography:                                                              */
/*    - Single monospaced family (`font-mono` → IBM Plex Mono)               */
/*    - Two weights: regular (default) + medium 500                          */
/*    - ALL CAPS only for section labels and the handler instruction         */
/*    - Mixed-case for address bodies                                        */
/*    - No color, no decoration — paper-white background, ink-black text    */
/* ════════════════════════════════════════════════════════════════════════ */

const ShippingLabel = React.forwardRef<HTMLDivElement, ShippingLabelProps>(
  function ShippingLabel(
    {
      data,
      size = "print",
      handlerInstruction = "DO NOT COVER — KEEP LABEL VISIBLE",
      className,
      code128Svg,
      dataMatrixSvg,
    },
    ref
  ) {
    /* ── Map the loose `ShippingLabelData` into the strict 7-zone model ── */

    const origin = React.useMemo<DerivedAddress>(
      () => ({
        heading: data.senderName?.trim() || "—",
        lines: compactLines([
          data.senderAddress,
          data.senderPhone ? `Tel: ${data.senderPhone}` : null,
          data.origin ? `Origin: ${data.origin}` : null,
        ]),
      }),
      [data.senderName, data.senderAddress, data.senderPhone, data.origin]
    )

    const destination = React.useMemo<DerivedAddress>(
      () => ({
        heading: `NODE: ${(data.destination || "—").toUpperCase()}`,
        lines: compactLines([
          data.receiverName?.trim() || null,
          data.receiverAddress,
          data.receiverPhone ? `Tel: ${data.receiverPhone}` : null,
        ]),
      }),
      [data.destination, data.receiverName, data.receiverAddress, data.receiverPhone]
    )

    const mission = React.useMemo(
      () => ({
        timestampUtc: formatMissionTime(data.shipDate),
        sequence: 1,
      }),
      [data.shipDate]
    )

    const totalBoxes = Math.max(1, data.pieces ?? 1)
    const box = {
      current: 1,
      total: totalBoxes,
      weight: data.weightKg ? `${data.weightKg} kg` : "—",
    }

    const manifest = {
      type: data.description?.trim() || "Mixed Payload",
      sku: data.orderRef?.trim() || data.awbNumber,
      quantity: data.pieces ?? 1,
    }

    return (
      <div
        ref={ref}
        role="article"
        data-slot="shipping-label"
        data-label-size={size}
        aria-label={`Shipping label · AWB ${data.awbNumber}`}
        className={cn(
          // Print-invariant: paper-white ink-black, monospaced tactical
          // type. Tokens (`--print-bg`, `--print-fg`, `--print-border`,
          // `--spacing-label-4in`) are defined in globals.css and are
          // deliberately NOT themed — print artifacts must read the same
          // regardless of dark-mode preference (issue #31).
          "bg-print-bg text-print-fg font-mono",
          "border-2 border-print-border",
          "[color-scheme:light]",
          "px-4 pt-3.5 pb-3 w-full mx-auto",
          size === "print" ? "max-w-label-4in" : "max-w-label-preview",
          "print:max-w-label-4in print:border-0",
          className
        )}
      >
        {/* ━━━━━━━━━━━━ Zone 1: brand mark + box meta ━━━━━━━━━━━━ */}
        <header className="flex items-baseline justify-between border-b-2 border-print-border pb-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-medium tracking-pdf-label leading-none">
              {data.companyName ? data.companyName.split(" ")[0] : "TAC"}
            </span>
            <span className="text-pdf-11 font-medium tracking-pdf-tag">
              EXPRESS
            </span>
          </div>
          <div className="text-xs font-medium tabular-nums whitespace-nowrap">
            Box {pad2(box.current)} of {pad2(box.total)} — {box.weight}
          </div>
        </header>

        {/* ━━━━━━━━━━━━ Zone 2: ORIGIN / DESTINATION ━━━━━━━━━━━━ */}
        <div className="grid grid-cols-2 gap-4 py-2.5">
          <AddressColumn label="ORIGIN" address={origin} />
          <AddressColumn label="DESTINATION" address={destination} />
        </div>

        {/* ━━━━━━━━━━━━ Zone 3: inverted MSN bar ━━━━━━━━━━━━ */}
        <div className="bg-print-fg text-print-bg px-2 py-1 flex justify-between items-center text-2xs tracking-pdf-band font-medium">
          <span className="uppercase">MSN ({mission.timestampUtc})</span>
          <span>— {pad2(mission.sequence)}</span>
        </div>

        {/* ━━━━━━━━━━━━ Zone 4: Code 128 + Data Matrix ━━━━━━━━━━━━ */}
        <div className="flex items-stretch gap-2.5 pt-3.5 pb-1.5">
          <Code128 svg={code128Svg} awbNumber={data.awbNumber} />
          <DataMatrix svg={dataMatrixSvg} awbNumber={data.awbNumber} />
        </div>

        {/* ━━━━━━━━━━━━ Zones 5 + 6: tracking number + manifest stack ━━━━━━━━━━━━ */}
        <div className="flex justify-between items-start gap-3 border-b border-print-border pb-2">
          <span className="text-sm font-medium tracking-pdf-id tabular-nums pt-0.5 whitespace-nowrap">
            {data.awbNumber}
          </span>
          <div className="text-right text-2xs leading-snug whitespace-nowrap">
            <div className="font-medium">{manifest.type}</div>
            <div className="break-all">{manifest.sku}</div>
            <div>Qty {manifest.quantity}</div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━ Zone 7: handler instruction ━━━━━━━━━━━━ */}
        <p className="text-center pt-2 text-pdf-9p5 tracking-pdf-terms font-medium uppercase">
          {handlerInstruction}
        </p>
      </div>
    )
  }
)

/* ════════════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                           */
/* ════════════════════════════════════════════════════════════════════════ */

interface DerivedAddress {
  heading: string
  lines: string[]
}

function AddressColumn({
  label,
  address,
}: {
  label: string
  address: DerivedAddress
}) {
  return (
    <div className="text-pdf-11 leading-snug min-w-0">
      <div className="text-3xs font-medium tracking-pdf-emboss mb-1.5 uppercase">
        {label}
      </div>
      <div className="font-medium break-words">{address.heading}</div>
      {address.lines.map((line, i) => (
        <div key={i} className="break-words">
          {line}
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  Barcodes — real symbology, encoded server-side via                       */
/*  `@workspace/services/barcode/encode`. The components here are dumb       */
/*  inliners: they render the encoded SVG markup as-is, or a loud            */
/*  "Barcode missing" placeholder when no SVG was provided. Failure mode     */
/*  is deliberately visible — silently rendering a decorative stand-in       */
/*  was the bug this code replaces (#28).                                    */
/* ════════════════════════════════════════════════════════════════════════ */

function Code128({ svg, awbNumber }: { svg: string | undefined; awbNumber: string }) {
  if (!svg) return <BarcodeMissing kind="Code 128" awbNumber={awbNumber} flex />
  return (
    <div
      className="flex-1 min-w-0 [&>svg]:block [&>svg]:h-label-barcode [&>svg]:w-full"
      role="img"
      aria-label={`Code 128 barcode for ${awbNumber}`}
      // The encoder output is generated server-side from a known
      // payload (the AWB string). It contains no user-controlled HTML,
      // only static SVG primitives produced by bwip-js — safe to inline.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

function DataMatrix({
  svg,
  awbNumber,
}: {
  svg: string | undefined
  awbNumber: string
}) {
  if (!svg) return <BarcodeMissing kind="Data Matrix" awbNumber={awbNumber} />
  return (
    <div
      className="shrink-0 w-label-barcode h-label-barcode [&>svg]:block [&>svg]:w-full [&>svg]:h-full"
      role="img"
      aria-label={`Data Matrix code for ${awbNumber}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/**
 * Loud placeholder rendered when the caller forgot to pass in the
 * encoded SVG. Picking up this fallback in the print preview means
 * something upstream (the page's server component) skipped the
 * encoder call — much better than silently shipping an unscannable
 * label to a customer.
 */
function BarcodeMissing({
  kind,
  awbNumber,
  flex = false,
}: {
  kind: string
  awbNumber: string
  flex?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border-2 border-dashed border-print-border p-2 text-center",
        flex ? "flex-1" : "shrink-0 w-label-barcode h-label-barcode",
      )}
      role="alert"
    >
      <span className="text-3xs font-medium tracking-widest uppercase">
        {kind} missing
      </span>
      <span className="text-pdf-8 mt-0.5 break-all">{awbNumber}</span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  Misc helpers                                                             */
/* ════════════════════════════════════════════════════════════════════════ */

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * Format an ISO timestamp as `DD.MM.YY HH:mm UTC` for the MSN bar.
 * Falls back to "now" when no date is supplied.
 */
function formatMissionTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  if (isNaN(d.getTime())) return "—"
  const dd = pad2(d.getUTCDate())
  const mm = pad2(d.getUTCMonth() + 1)
  const yy = String(d.getUTCFullYear()).slice(-2)
  const hh = pad2(d.getUTCHours())
  const min = pad2(d.getUTCMinutes())
  return `${dd}.${mm}.${yy} ${hh}:${min} UTC`
}

function compactLines(lines: Array<string | null | undefined>): string[] {
  return lines.filter((l): l is string => Boolean(l && l.trim().length))
}

export { ShippingLabel }
