/* eslint-disable no-restricted-syntax -- Print-view file: <table> is required for print-safe
   layout; CSS grid does not print correctly across page breaks in all browsers. */
"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { AwbBarcode } from "../shipments/awb-barcode"

export interface InvoicePrintData {
  invoiceNumber: string
  status: string
  createdAt: string
  dueDate?: string
  paymentMode: string

  awbNumber: string
  customerName: string
  customerGstin?: string
  customerPhone?: string
  customerEmail?: string
  /** Short reference shown next to the customer block (e.g. internal customer ID). */
  customerId?: string
  billingAddress?: string

  baseFreight: number
  docketCharge: number
  pickupCharge?: number
  packingCharge?: number
  fuelSurcharge: number
  handlingFee: number
  insurance: number
  discount: number

  cgst: number
  sgst: number
  igst: number
  totalTax: number
  totalAmount: number
  /** When provided, balance due = totalAmount - advancePaid. Defaults to totalAmount. */
  advancePaid?: number

  notes?: string
  companyName?: string
  companyAddress?: string
  companyGstin?: string
  companyPhone?: string
  companyEmail?: string
  companyId?: string

  /** Optional consignee block (shipment delivery address). */
  shipToName?: string
  shipToAddress?: string

  /**
   * Terms & conditions block variant.
   * - `'numbered'` — 7 single-line clauses (~75 words). Default. Best for
   *   invoice footer where vertical space allows a structured list.
   * - `'paragraph'` — single dense paragraph (~115 words). Use when the
   *   footer is tight (e.g. multi-page invoice with notes).
   * - `'none'` — omit the block (digital previews / drafts).
   */
  terms?: "numbered" | "paragraph" | "none"
}

interface InvoicePrintViewProps {
  data: InvoicePrintData
  className?: string
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Short numeric date — `04. 05. 2026`, mirroring the reference invoice. */
function formatDateShort(iso?: string): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}. ${mm}. ${yyyy}`
  } catch {
    return iso
  }
}

/**
 * TAC Express standard terms & conditions — printed verbatim on every
 * invoice for legal compliance under Indian carriage law (Carriage by
 * Road Act, 2007 § 16; Indian Contract Act, 1872 § 170 lien provisions).
 *
 * Two render variants are supported via the `terms` prop:
 * - `TERMS_NUMBERED`: 7 enumerated clauses (~75 words; ~7 lines at 7pt)
 * - `TERMS_PARAGRAPH`: single dense paragraph (~115 words; ~3-4 lines)
 *
 * Both convey the same legal substance — pick based on footer space.
 */
const TERMS_NUMBERED: readonly string[] = [
  "Consignor must accurately declare contents, value, and weight at booking; misdeclaration voids carrier liability.",
  "Liability for loss/damage is capped at ₹150/kg unless higher value is declared and risk surcharge paid at booking.",
  "Illegal, contraband, hazardous (IMDG/IATA), fragile, electronic, and high-value goods move at consignor's risk unless insured at booking.",
  "Consignments must be collected within 7 days of arrival; storage at ₹55/day + GST accrues from day 22.",
  "Goods are classified unclaimed after 45 days and disposable after 100 days at carrier's discretion under lien (Indian Contract Act, 1872).",
  "Carrier not liable for delay or loss caused by force majeure — natural disasters, strikes, civil unrest, regulatory action, or network disruption.",
  "Governed by Indian law; exclusive jurisdiction of New Delhi courts; claims must be filed in writing within 6 months per Carriage by Road Act, 2007.",
] as const

const TERMS_PARAGRAPH =
  "By booking with TAC Express, the consignor agrees: contents, value, and weight must be accurately declared at booking — misdeclaration voids carrier liability; compensation for loss or damage is capped at ₹150/kg unless a higher value is declared and risk surcharge paid; illegal, contraband, hazardous (IMDG/IATA), fragile, electronic, and high-value goods move at consignor's risk unless insured at booking; consignments must be collected within 7 days of arrival, with storage at ₹55/day + GST from day 22, classified unclaimed after 45 days, and disposable after 100 days at the carrier's discretion under lien (Indian Contract Act, 1872); the carrier is not liable for delay or loss from force majeure events; all disputes are governed by Indian law, subject to exclusive jurisdiction of New Delhi courts, with claims to be filed within 6 months per the Carriage by Road Act, 2007."

const COMPANY_DEFAULTS = {
  name: "TAC Express Logistics Pvt. Ltd.",
  address: "Imphal, Manipur, India",
  gstin: "14AAAAA0000A1Z5",
  phone: "+91 385 000 0000",
  email: "ops@tacexpress.in",
  id: "TAC-EXP-2026",
  // Bank details rendered in the footer "Bank information" block.
  bank: {
    iban: "IN08 0100 0001 0751 3385 0223",
    swift: "TACBINBB001",
    accountNumber: "234-5133850247/023",
  },
} as const

/**
 * Tax invoice rendered in a TAC Express take on the minimal-violet reference:
 *
 *   ┌─[gray header]──────────────────────────────────────┐
 *   │ │T│  COMPANY INFO                       Invoice    │
 *   │ │A│  ID + GSTIN                                    │
 *   │ │C│                                                │
 *   │ │ │  Bill to:               Invoice number:        │
 *   │ │ │  CUSTOMER NAME          #INV-2026-01014       │
 *   │ │ │  contact info           date                   │
 *   ├─┴─┴────────────────────────────────────────────────┤
 *   │ ┃ Service description   Qty  Price   Total        │
 *   │ ┃ ──────────────────────────────────────────       │
 *   │ ┃ Base Freight           1   ₹...   ₹...           │
 *   │ ┃ ...                                              │
 *   │ ┃ Balance due:                       ₹X            │
 *   │ ┃ Due date:                          DD. MM. YYYY  │
 *   │ ┃                                                  │
 *   │ ┃ Bank information:        Invoiced by TAC :       │
 *   │ ┃ IBAN ...                       _________________ │
 *   └───────────────────────────────────────────────────┘
 */
const InvoicePrintView = React.forwardRef<HTMLDivElement, InvoicePrintViewProps>(
  function InvoicePrintView({ data, className }, ref) {
    const company = {
      name: data.companyName ?? COMPANY_DEFAULTS.name,
      address: data.companyAddress ?? COMPANY_DEFAULTS.address,
      gstin: data.companyGstin ?? COMPANY_DEFAULTS.gstin,
      phone: data.companyPhone ?? COMPANY_DEFAULTS.phone,
      email: data.companyEmail ?? COMPANY_DEFAULTS.email,
      id: data.companyId ?? COMPANY_DEFAULTS.id,
    }

    const pickupCharge = data.pickupCharge ?? 0
    const packingCharge = data.packingCharge ?? 0
    const advancePaid = data.advancePaid ?? 0

    // Build the line-items array — quantity is cosmetic (always 1 for our
    // single-shipment invoices) but the column matches the reference layout.
    const lines = [
      { label: "Base Freight", value: data.baseFreight, show: true },
      { label: "Docket Charge", value: data.docketCharge, show: data.docketCharge > 0 },
      { label: "Pickup Charge", value: pickupCharge, show: pickupCharge > 0 },
      { label: "Packing Charge", value: packingCharge, show: packingCharge > 0 },
      { label: "Fuel Surcharge", value: data.fuelSurcharge, show: data.fuelSurcharge > 0 },
      { label: "Handling Fee", value: data.handlingFee, show: data.handlingFee > 0 },
      { label: "Insurance", value: data.insurance, show: data.insurance > 0 },
    ].filter((l) => l.show)

    const subtotal =
      data.baseFreight +
      data.docketCharge +
      pickupCharge +
      packingCharge +
      data.fuelSurcharge +
      data.handlingFee +
      data.insurance
    const taxable = Math.max(0, subtotal - data.discount)
    const balanceDue = Math.max(0, data.totalAmount - advancePaid)

    return (
      <div
        ref={ref}
        data-slot="invoice-print-view"
        className={cn(
          "mx-auto max-w-3xl bg-card text-foreground shadow-brutal border border-border",
          "font-sans text-sm overflow-hidden",
          "print:border-0 print:shadow-none print:max-w-none",
          // One-page-fit: with @page A4 and 12mm margins the printable area is
          // ~273mm tall. Constrain the card so it never spills onto a second
          // page; combined with the tight section margins below, the layout
          // sits comfortably within a single sheet even with the full T&Cs
          // block, notes, and tax rows.
          "print:max-h-[273mm] print:overflow-hidden",
          // Force light-mode rendering so the design reads predictably on
          // any printer regardless of the user's app theme.
          "[color-scheme:light]",
          className
        )}
      >
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* GRAY HEADER ZONE — compact to fit A4 in one page */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="relative bg-muted/40 print:bg-print-surface-muted px-8 pt-5 pb-4">
          {/* Vertical brand strip on far left */}
          <div
            aria-hidden="true"
            className="absolute left-2.5 top-0 bottom-0 flex items-center"
          >
            <span
              className="font-sans font-bold text-pdf-13 tracking-pdf-emboss uppercase text-primary print:text-print-accent leading-none whitespace-nowrap"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {company.name.split(" ")[0] ?? "TAC"}&nbsp;Express
            </span>
          </div>

          {/* Top: company contact info | Invoice headline */}
          <div className="flex items-start justify-between gap-6 pl-7">
            <div className="space-y-0.5">
              <p className="font-sans font-semibold text-pdf-13 leading-tight text-foreground">
                {company.name}
              </p>
              <p className="font-sans text-pdf-11 leading-tight text-foreground/80">
                {company.address}
              </p>
              <p className="font-mono text-pdf-10p5 leading-tight text-foreground/80">
                Tel: {company.phone} · E-mail: {company.email}
              </p>
              <p className="font-mono text-pdf-10p5 leading-tight pt-0.5">
                <span className="font-bold text-foreground">ID:</span>{" "}
                <span className="text-foreground/90">{company.id}</span>
                {"  ·  "}
                <span className="font-bold text-foreground">GSTIN:</span>{" "}
                <span className="text-foreground/90">{company.gstin}</span>
              </p>
            </div>

            <p className="font-sans font-light text-2xl leading-none text-primary print:text-print-accent tracking-tight shrink-0">
              Invoice
            </p>
          </div>

          {/* Bill to / Invoice number two-column block */}
          <div className="grid grid-cols-2 gap-6 mt-4 pl-7">
            <div className="space-y-1">
              <p className="font-sans font-bold text-2xs uppercase tracking-pdf-label text-foreground">
                Bill to:
              </p>
              <p className="font-mono font-bold text-pdf-17 leading-tight tracking-tight text-foreground uppercase">
                {data.customerName}
              </p>
              <div className="font-mono text-pdf-10p5 leading-snug text-foreground/80 space-y-0 pt-0.5">
                {data.customerPhone && <p>Tel: {data.customerPhone}</p>}
                {data.customerEmail && <p>E-mail: {data.customerEmail}</p>}
                {data.billingAddress && (
                  <p className="whitespace-pre-line break-words">
                    Address: {data.billingAddress}
                  </p>
                )}
                {data.customerGstin && (
                  <p>
                    <span className="font-bold">GSTIN:</span> {data.customerGstin}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <p className="font-sans font-bold text-2xs uppercase tracking-pdf-label text-foreground">
                Invoice number:
              </p>
              <p className="font-sans font-bold text-pdf-19 leading-tight tracking-tight text-foreground">
                #{data.invoiceNumber.replace(/^INV-?/i, "")}
              </p>
              <p className="font-mono text-pdf-10p5 leading-snug text-foreground/80 pt-0.5">
                {company.address.split(",")[0]} · {formatDateShort(data.createdAt)}
              </p>
              {data.awbNumber && (
                <p className="font-mono text-pdf-10p5 leading-snug text-foreground/80">
                  AWB: <span className="font-bold">{data.awbNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* WHITE BODY ZONE — compact to fit one A4 page    */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="relative bg-card print:bg-white px-8 pt-5 pb-6">
          {/* Vertical violet accent bar on left edge of the body */}
          <div
            aria-hidden="true"
            className="absolute left-2.5 top-5 bottom-6 w-pdf-rule bg-primary print:bg-print-accent"
          />

          <div className="pl-5">
            {/* Service table */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-foreground/15">
                  <th className="text-left font-sans font-bold text-pdf-11p5 py-1.5 pr-2">
                    Service description
                  </th>
                  <th className="text-right font-sans font-bold text-pdf-11p5 py-1.5 px-2 w-20">
                    Quantity
                  </th>
                  <th className="text-right font-sans font-bold text-pdf-11p5 py-1.5 px-2 w-24">
                    Price
                  </th>
                  <th className="text-right font-sans font-bold text-pdf-11p5 py-1.5 pl-2 w-24">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.label} className="border-b border-foreground/10">
                    <td className="py-1.5 pr-2 font-mono text-pdf-11p5 text-foreground">
                      {line.label}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/80">
                      1
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/80">
                      {formatINR(line.value)}
                    </td>
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground">
                      {formatINR(line.value)}
                    </td>
                  </tr>
                ))}

                {data.discount > 0 && (
                  <tr className="border-b border-foreground/10">
                    <td className="py-1.5 pr-2 font-mono text-pdf-11p5 text-foreground">
                      Discount
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/80">
                      1
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/80">
                      −{formatINR(data.discount)}
                    </td>
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground">
                      −{formatINR(data.discount)}
                    </td>
                  </tr>
                )}

                {/* Tax rows roll into the table for visual consistency */}
                {(data.cgst > 0 || data.sgst > 0 || data.igst > 0) && (
                  <tr className="border-b border-foreground/10">
                    <td className="py-1.5 pr-2 font-mono text-pdf-11p5 text-foreground/70">
                      Taxable Amount
                    </td>
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/70">
                      {formatINR(taxable)}
                    </td>
                  </tr>
                )}
                {data.cgst > 0 && (
                  <tr className="border-b border-foreground/10">
                    <td className="py-1.5 pr-2 font-mono text-pdf-11p5 text-foreground/70">
                      CGST (9%)
                    </td>
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/70">
                      {formatINR(data.cgst)}
                    </td>
                  </tr>
                )}
                {data.sgst > 0 && (
                  <tr className="border-b border-foreground/10">
                    <td className="py-1.5 pr-2 font-mono text-pdf-11p5 text-foreground/70">
                      SGST (9%)
                    </td>
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/70">
                      {formatINR(data.sgst)}
                    </td>
                  </tr>
                )}
                {data.igst > 0 && (
                  <tr className="border-b border-foreground/10">
                    <td className="py-1.5 pr-2 font-mono text-pdf-11p5 text-foreground/70">
                      IGST (18%)
                    </td>
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 pl-2 text-right font-mono tabular-nums text-pdf-11p5 text-foreground/70">
                      {formatINR(data.igst)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Balance due / Due date — violet right-aligned values */}
            <div className="mt-3 space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="font-sans font-bold text-xs text-foreground">
                  Balance due:
                </span>
                <span className="font-mono font-bold text-pdf-15 tabular-nums text-primary print:text-print-accent">
                  {formatINR(balanceDue)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-sans font-bold text-xs text-foreground">
                  Due date:
                </span>
                <span className="font-mono font-bold text-pdf-13 tabular-nums text-primary print:text-print-accent">
                  {data.dueDate
                    ? formatDateShort(data.dueDate)
                    : formatDateShort(
                        // Default 30-day terms when no due date set
                        (() => {
                          try {
                            const d = new Date(data.createdAt)
                            d.setDate(d.getDate() + 30)
                            return d.toISOString()
                          } catch {
                            return undefined
                          }
                        })()
                      )}
                </span>
              </div>
            </div>

            {/* Bank info / Signature footer */}
            <div className="mt-5 grid grid-cols-2 gap-6 [page-break-inside:avoid]">
              <div className="space-y-1">
                <p className="font-sans font-bold text-2xs uppercase tracking-pdf-label text-foreground">
                  Bank information:
                </p>
                <div className="font-mono text-pdf-10p5 leading-tight text-primary print:text-print-accent space-y-0 pt-0.5">
                  <p>
                    <span className="font-bold">IBAN:</span> {COMPANY_DEFAULTS.bank.iban}
                  </p>
                  <p>
                    <span className="font-bold">SWIFT:</span> {COMPANY_DEFAULTS.bank.swift}
                  </p>
                  <p>
                    <span className="font-bold">A/C:</span> {COMPANY_DEFAULTS.bank.accountNumber}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <p className="font-sans font-bold text-2xs uppercase tracking-pdf-label text-foreground self-end">
                  Invoiced by {company.name.split(" ").slice(0, 2).join(" ")}:
                </p>
                <div className="w-full max-w-pdf-signature border-b border-foreground/40 mt-7" />
              </div>
            </div>

            {/* Optional notes block */}
            {data.notes && (
              <div className="mt-4 pt-2 border-t border-foreground/10 [page-break-inside:avoid]">
                <p className="font-sans font-bold text-2xs uppercase tracking-pdf-label text-foreground mb-0.5">
                  Notes:
                </p>
                <p className="font-mono text-pdf-10p5 leading-tight text-foreground/80 whitespace-pre-line">
                  {data.notes}
                </p>
              </div>
            )}

            {/* Terms & Conditions — legal compliance fine print */}
            <TermsBlock variant={data.terms ?? "numbered"} />

            {/* AWB barcode for parcel-side reconciliation */}
            {data.awbNumber && data.awbNumber !== "—" && (
              <div className="mt-4 pt-2 border-t border-foreground/10 flex items-end justify-between gap-6 [page-break-inside:avoid]">
                <div className="flex flex-col items-start gap-0.5">
                  <p className="font-sans font-bold text-3xs uppercase tracking-pdf-tag text-foreground/60">
                    Tracking
                  </p>
                  <AwbBarcode value={data.awbNumber} height={32} barWidth={1.2} showText={false} />
                  <p className="font-mono text-pdf-10p5 font-bold tracking-pdf-awb tabular-nums text-foreground">
                    {data.awbNumber}
                  </p>
                </div>
                <p className="font-mono text-pdf-8p5 uppercase tracking-pdf-emboss text-foreground/50 text-right">
                  Computer-generated invoice<br />No signature required
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
)

/* ════════════════════════════════════════════════════════════════════════ */
/*  TermsBlock                                                               */
/*                                                                           */
/*  Renders the standard TAC Express terms & conditions at the foot of the  */
/*  invoice. Two render variants:                                            */
/*                                                                           */
/*  - "numbered": 7-clause enumerated list — best for invoice footers with   */
/*    headroom. Each clause sits on its own line with a tabular-nums index.  */
/*  - "paragraph": single dense block — best when the footer is tight       */
/*    (e.g. when there are long shipment notes above).                       */
/*  - "none": skip the block entirely (digital previews / drafts).           */
/*                                                                           */
/*  Typography is intentionally hairline (7.5px) with 85% opacity so the     */
/*  block reads as legal fine-print without competing with the main          */
/*  invoice content above it.                                                */
/* ════════════════════════════════════════════════════════════════════════ */

function TermsBlock({ variant }: { variant: "numbered" | "paragraph" | "none" }) {
  if (variant === "none") return null

  return (
    <section className="mt-3 pt-2 border-t border-foreground [page-break-inside:avoid]">
      <p className="font-sans font-bold text-3xs uppercase tracking-pdf-terms text-foreground mb-1">
        Terms &amp; Conditions
      </p>

      {variant === "numbered" ? (
        <ol className="space-y-0.5 text-pdf-7p5 leading-snug text-foreground/85">
          {TERMS_NUMBERED.map((clause, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="font-mono font-bold tabular-nums shrink-0 w-3 text-foreground/70">
                {i + 1}.
              </span>
              <span className="break-words">{clause}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-pdf-7p5 leading-snug text-foreground/85 text-justify">
          {TERMS_PARAGRAPH}
        </p>
      )}
    </section>
  )
}

export { InvoicePrintView }
