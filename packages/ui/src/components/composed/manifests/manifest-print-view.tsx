/* eslint-disable no-restricted-syntax -- Print-view file: <table> is required for print-safe
   layout; CSS grid does not print correctly across page breaks in all browsers. */
"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { UniversalBarcode } from "@workspace/ui/components/primitives/universal-barcode"
import type {
  Manifest,
  ManifestShipment as ManifestShipmentType,
} from "@workspace/types"

export interface ManifestPrintViewLine {
  awbNumber: string
  consigneeName: string
  consigneeCity?: string
  destination: string
  pieces: number
  weightKg: number
  remarks?: string
}

interface ManifestPrintViewProps {
  manifest: Manifest
  lines: ManifestPrintViewLine[]
  /** Crew identity for signature blocks */
  dispatchedBy?: string
  carrier?: string
  flightNumber?: string
  vehicleNumber?: string
  driverName?: string
  className?: string
}

const ManifestPrintView = React.forwardRef<
  HTMLDivElement,
  ManifestPrintViewProps
>(function ManifestPrintView(
  {
    manifest,
    lines,
    dispatchedBy,
    carrier,
    flightNumber,
    vehicleNumber,
    driverName,
    className,
  },
  ref
) {
  const created = manifest.createdAt
    ? format(parseISO(manifest.createdAt), "dd MMM yyyy · HH:mm")
    : "—"
  const totalPieces = lines.reduce((s, l) => s + (l.pieces ?? 0), 0)
  const totalWeight = lines.reduce((s, l) => s + (l.weightKg ?? 0), 0)

  return (
    <div
      ref={ref}
      data-slot="manifest-print-view"
      className={cn(
        "mx-auto bg-background text-foreground print:bg-white print:text-black",
        "w-print-a4-w min-h-print-a4-h p-8 font-sans text-pdf-11 leading-snug",
        "border border-border print:border-0",
        className
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {/* Header band */}
      <header className="grid grid-cols-[1fr_auto_1fr] items-end gap-4 border-b-2 border-current pb-3">
        <div>
          <p className="font-mono text-3xs uppercase tracking-pdf-strip opacity-70">
            TAC EXPRESS // CARGO MANIFEST
          </p>
          <h1 className="mt-1 font-heading text-2xl font-black tracking-tight">
            CARGO MANIFEST
          </h1>
          <p className="mt-1 font-mono text-2xs uppercase tracking-widest opacity-80">
            TAC Logistics Pvt Ltd · Imphal Airport
          </p>
        </div>
        <div className="flex flex-col items-center">
          <UniversalBarcode
            value={manifest.manifestNumber}
            mode="compact"
            includeText={false}
            scale={2}
            height={10}
          />
          <p className="mt-1 font-mono text-xs font-semibold tracking-widest">
            {manifest.manifestNumber}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xs uppercase tracking-pdf-strip opacity-70">
            Generated
          </p>
          <p className="font-mono text-xs">{created}</p>
          <p className="mt-1 font-mono text-3xs uppercase tracking-pdf-strip opacity-70">
            Status
          </p>
          <p className="font-mono text-xs font-semibold">
            {manifest.status}
          </p>
        </div>
      </header>

      {/* Sector + Transport */}
      <section className="mt-4 grid grid-cols-2 gap-px bg-current/30">
        <div className="bg-background p-3 print:bg-white">
          <p className="font-mono text-3xs uppercase tracking-pdf-strip opacity-70">
            Sector
          </p>
          <p className="mt-0.5 font-heading text-base font-semibold">
            {manifest.originHub.replace(/_/g, " ")} →{" "}
            {manifest.destHub.replace(/_/g, " ")}
          </p>
          <p className="font-mono text-2xs opacity-80">
            {manifest.transportMode}
          </p>
        </div>
        <div className="bg-background p-3 print:bg-white">
          <p className="font-mono text-3xs uppercase tracking-pdf-strip opacity-70">
            Transport Details
          </p>
          {manifest.transportMode === "AIR" ? (
            <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-2xs">
              <dt className="font-mono uppercase opacity-70">Carrier</dt>
              <dd className="font-mono">{carrier ?? "—"}</dd>
              <dt className="font-mono uppercase opacity-70">Flight No</dt>
              <dd className="font-mono">{flightNumber ?? "—"}</dd>
              <dt className="font-mono uppercase opacity-70">Departure</dt>
              <dd className="font-mono">
                {manifest.departureDate
                  ? format(parseISO(manifest.departureDate), "dd MMM · HH:mm")
                  : "—"}
              </dd>
            </dl>
          ) : (
            <dl className="mt-0.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-2xs">
              <dt className="font-mono uppercase opacity-70">Vehicle</dt>
              <dd className="font-mono">{vehicleNumber ?? "—"}</dd>
              <dt className="font-mono uppercase opacity-70">Driver</dt>
              <dd className="font-mono">{driverName ?? "—"}</dd>
              <dt className="font-mono uppercase opacity-70">Dispatch</dt>
              <dd className="font-mono">
                {manifest.departureDate
                  ? format(parseISO(manifest.departureDate), "dd MMM · HH:mm")
                  : "—"}
              </dd>
            </dl>
          )}
        </div>
      </section>

      {/* Shipments table */}
      <section className="mt-4">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-current text-left font-mono text-3xs uppercase tracking-widest opacity-80">
              <th className="w-8 py-1.5 pr-2">#</th>
              <th className="py-1.5 pr-2">CN Number</th>
              <th className="py-1.5 pr-2">Consignee</th>
              <th className="py-1.5 pr-2">Destination</th>
              <th className="w-12 py-1.5 pr-2 text-right">Pkgs</th>
              <th className="w-16 py-1.5 pr-2 text-right">Weight (kg)</th>
              <th className="py-1.5">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="py-6 text-center font-mono text-2xs uppercase tracking-widest opacity-60"
                >
                  No shipments on this manifest
                </td>
              </tr>
            ) : (
              lines.map((l, i) => (
                <tr
                  key={l.awbNumber}
                  className="border-b border-current/20 align-top"
                >
                  <td className="py-1.5 pr-2 font-mono text-2xs">
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-2xs font-semibold">
                    {l.awbNumber}
                  </td>
                  <td className="py-1.5 pr-2">
                    <div className="font-medium">{l.consigneeName}</div>
                    {l.consigneeCity && (
                      <div className="font-mono text-3xs uppercase opacity-70">
                        {l.consigneeCity}
                      </div>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 font-mono text-2xs">
                    {l.destination}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-2xs">
                    {l.pieces}
                  </td>
                  <td className="py-1.5 pr-2 text-right font-mono text-2xs">
                    {l.weightKg.toFixed(1)}
                  </td>
                  <td className="py-1.5 text-2xs">{l.remarks ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-current font-mono text-2xs font-semibold uppercase tracking-widest">
              <td colSpan={4} className="py-2">
                Totals
              </td>
              <td className="py-2 text-right">{totalPieces}</td>
              <td className="py-2 text-right">{totalWeight.toFixed(1)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Signature blocks */}
      <section className="mt-10 grid grid-cols-2 gap-8">
        <div>
          <div className="h-12 border-b border-current" />
          <p className="mt-2 font-mono text-3xs uppercase tracking-widest opacity-70">
            Dispatch Officer
          </p>
          <p className="font-mono text-2xs">{dispatchedBy ?? "—"}</p>
          <p className="font-mono text-3xs opacity-70">{created}</p>
        </div>
        <div>
          <div className="h-12 border-b border-current" />
          <p className="mt-2 font-mono text-3xs uppercase tracking-widest opacity-70">
            Received By
          </p>
          <p className="font-mono text-2xs">Name · Sign · Date</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 flex items-center justify-between border-t border-current pt-2 font-mono text-3xs uppercase tracking-pdf-strip opacity-70">
        <span>Manifest UUID: {manifest.id}</span>
        <span>Page 1 of 1</span>
      </footer>
    </div>
  )
})

export { ManifestPrintView }

/** Convert raw manifest shipment rows + per-row shipment data into print lines. */
export function manifestShipmentsToPrintLines(
  manifestShipments: ManifestShipmentType[],
  shipments: Map<string, ManifestPrintViewLine>
): ManifestPrintViewLine[] {
  return manifestShipments
    .map((ms) => shipments.get(ms.awbNumber))
    .filter((x): x is ManifestPrintViewLine => Boolean(x))
}
