// Invoice PDF — rendered server-side and attached as the WhatsApp
// template's HEADER document. Pure presentational React-PDF component.
//
// The `pdf-header.png` file is read from the dashboard app's `public/`
// directory and embedded as the page banner. Everything else is layout.
//
// LAYOUT (v2 — production tax invoice):
//   [Header banner image]
//   [Company header row]   left: registered name + statutory IDs   right: TAX INVOICE title + #number
//   [Bill-to row]          left: customer block                    right: invoice meta + QR
//   [Consignment band]     AWB · status · payment mode (when applicable)
//   [Charges table]        DESCRIPTION · QTY · PRICE · TOTAL
//   [Totals stack]         subtotal → tax breakdown → grand total → balance due (violet)
//   [Bank + Sign-off row]  left: bank details   right: "For TAC Express…" + authorized signatory line
//   [Notes]                operator-supplied notes (optional)
//   [Terms & Conditions]   numbered, statutory liability + limitation clauses
//   [Footer]               fixed, computer-generated note + page #

import * as React from "react"
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer"

import { PDF_FONT_SIZES, PDF_TOKENS } from "../branding/pdf-tokens"

/* ────────────────────────────────────────────────────────────────────────
 * Font strategy: rely on @react-pdf/renderer's built-in PDF fonts
 * (Helvetica / Helvetica-Bold / Courier). The previous version registered
 * Space Grotesk + JetBrains Mono via Google Fonts gstatic URLs, but those
 * specific version-pinned URLs (v16 / v22) returned 404 once Google
 * rotated to newer versions — silently breaking every PDF render with
 * `Error: Failed to fetch font ... 404 Not Found`.
 *
 * Built-in fonts are zero-config and never break. Mapping:
 *   "Plus Jakarta Sans" → Helvetica  (sans, with Helvetica-Bold for weights)
 *   "IBM Plex Mono"     → Courier    (monospace for invoice numbers, IDs, $)
 *
 * Currency: Helvetica uses WinAnsi encoding, which does NOT include the
 * Indian rupee glyph (U+20B9). We render amounts with the `INR` prefix —
 * ASCII-safe and standard for B2B invoices. Using `₹` here would render
 * as a missing-glyph box.
 *
 * Follow-up: bundle the original brand fonts as workspace assets and
 * `Font.register` from disk to restore the design-system typography
 * without depending on a remote CDN.
 * ──────────────────────────────────────────────────────────────────────── */
const FONT_SANS = "Helvetica"
const FONT_MONO = "Courier"

/* ────────────────────────────────────────────────────────────────────────
 * Brand & legal constants — single source of truth for the issuer block.
 * In v3 these will move to `packages/services/src/branding/company.ts`
 * so the dashboard, the tax-report exporter, and the PDF all share one
 * canonical record. Hard-coded here for now to keep this change focused.
 *
 * COLOR TOKENS: All color values come from `../branding/pdf-tokens.ts`.
 * Don't introduce raw hex literals into this file — the token map is
 * the single source of truth that mirrors `globals.css` for PDF render.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Company + bank details rendered on the invoice. Sourced from env so we
 * never ship placeholder GSTIN / account numbers to production. Each
 * field falls back to an obviously-bogus marker in dev so a missing env
 * fails loudly visually rather than silently rendering an invalid
 * statutory document.
 *
 * Required envs (must be set in production):
 *   COMPANY_LEGAL_NAME, COMPANY_GSTIN, COMPANY_PAN, COMPANY_CIN,
 *   COMPANY_ADDRESS, COMPANY_TEL, COMPANY_EMAIL, COMPANY_WEB,
 *   BANK_NAME, BANK_ACCOUNT, BANK_IFSC, BANK_SWIFT, BANK_UPI
 *
 * `assertCompanyConfig()` is exported so callers (the public PDF route)
 * can refuse to render before letting WhatsApp or a customer see junk.
 */
const PLACEHOLDER = "[unset]"
const env = (key: string): string =>
  (typeof process !== "undefined" && process.env?.[key]?.trim()) || PLACEHOLDER

/**
 * Parse the pipe-separated `COMPANY_ADDRESS` env var into an array of
 * non-empty trimmed lines. Returns `[]` when the env is unset so
 * `assertCompanyConfig()` can detect the missing config — naively
 * splitting `"[unset]"` would produce `["[unset]"]` (length 1), which
 * would silently render the placeholder as a real address line.
 */
function parseAddressLines(raw: string): string[] {
  if (raw === PLACEHOLDER) return []
  return raw.split("|").map((s) => s.trim()).filter(Boolean)
}

const COMPANY = {
  legalName: env("COMPANY_LEGAL_NAME"),
  addressLines: parseAddressLines(env("COMPANY_ADDRESS")),
  tel: env("COMPANY_TEL"),
  email: env("COMPANY_EMAIL"),
  web: env("COMPANY_WEB"),
  gstin: env("COMPANY_GSTIN"),
  pan: env("COMPANY_PAN"),
  cin: env("COMPANY_CIN"),
  hsn: "996511", // GTA / road transport of goods — statutory, not env-bound
}

const BANK = {
  name: env("BANK_NAME"),
  account: env("BANK_ACCOUNT"),
  ifsc: env("BANK_IFSC"),
  swift: env("BANK_SWIFT"),
  upi: env("BANK_UPI"),
}

/**
 * Throws if any rendered company/bank field is missing. Callers should
 * invoke this at the top of any code path that renders an invoice for
 * external delivery (WhatsApp, print) so we never ship a tax document
 * with `[unset]` GSTIN or "1234..." account numbers.
 */
export function assertCompanyConfig(): void {
  // Every field rendered into the PDF gets validated. SWIFT/UPI are in
  // the bank stack alongside name/account/ifsc — leaving them out would
  // let `[unset]` placeholders reach the rendered document for accounts
  // that don't fill those env vars.
  const required: Array<[string, string]> = [
    ["COMPANY_LEGAL_NAME", COMPANY.legalName],
    ["COMPANY_GSTIN", COMPANY.gstin],
    ["COMPANY_PAN", COMPANY.pan],
    ["COMPANY_CIN", COMPANY.cin],
    ["COMPANY_TEL", COMPANY.tel],
    ["COMPANY_EMAIL", COMPANY.email],
    ["COMPANY_WEB", COMPANY.web],
    ["BANK_NAME", BANK.name],
    ["BANK_ACCOUNT", BANK.account],
    ["BANK_IFSC", BANK.ifsc],
    ["BANK_SWIFT", BANK.swift],
    ["BANK_UPI", BANK.upi],
  ]
  const missing = required
    .filter(([, value]) => !value || value === PLACEHOLDER)
    .map(([key]) => key)
  // `parseAddressLines()` already returns `[]` when the env equals the
  // placeholder, but defensively also reject any line that equals it
  // (e.g. a misconfigured `"|[unset]|"` would otherwise sneak through).
  if (
    COMPANY.addressLines.length === 0 ||
    COMPANY.addressLines.some((line) => line === PLACEHOLDER)
  ) {
    missing.push("COMPANY_ADDRESS")
  }
  if (missing.length > 0) {
    throw new Error(
      `Invoice PDF cannot render — missing required company/bank env vars: ${missing.join(", ")}. ` +
        `Set these in apps/dashboard/.env.local (see .env.example).`,
    )
  }
}

/**
 * Single-line T&C reference. The full statutory clauses (Carriage by
 * Road Act 2007, liability cap, force majeure, jurisdiction etc.) live
 * on the marketing site so the invoice itself stays one page. Keeping
 * this as a constant rather than inline string so the URL is easy to
 * update in one place if/when the legal copy moves.
 */
const TERMS_NOTICE = `Terms & Conditions governing this invoice — including liability limits, force majeure, storage, and jurisdiction — are available at ${COMPANY.web}/terms. By accepting delivery, the consignee agrees to those terms.`

export interface InvoicePdfData {
  invoiceNumber: string
  status: string
  createdAt: string
  dueDate?: string | null
  paymentMode: string
  awbNumber?: string | null
  customerName: string
  customerGstin?: string | null
  customerPhone?: string | null
  customerAddress?: string | null
  baseFreight: number
  docketCharge: number
  pickupCharge?: number | null
  packingCharge?: number | null
  fuelSurcharge: number
  handlingFee: number
  insurance: number
  discount: number
  cgst: number
  sgst: number
  igst: number
  totalAmount: number
  advancePaid: number
  balance: number
  notes?: string | null
  /**
   * Public URL the QR code embedded in the PDF will point to. Typically
   * `${origin}/track/${awbNumber}`. When unset, no QR is rendered.
   */
  trackingUrl?: string | null
}

export interface InvoicePdfProps {
  data: InvoicePdfData
  /**
   * Source for the header banner image. Either a URL (e.g. served from
   * Next.js public/) or a Buffer / base64-encoded image. Optional — if
   * absent, the document renders without a banner.
   */
  headerImageSrc?: string | { data: Buffer; format: "png" | "jpg" }
  /**
   * QR code PNG buffer (typically encoding the public tracking URL).
   * Generated by `generateQrPng` in `./qr`. Optional — when present,
   * a QR + "Scan to track" caption is rendered in the invoice meta cell.
   */
  qrPng?: Buffer
  /** Human-readable tracking URL printed below the QR for fallback. */
  trackingUrl?: string
}

/* ────────────────────────────────────────────────────────────────────────
 * Stylesheet — sized for A4 (595 × 842 pt), ~515pt content width.
 * Aim: full single-page layout for typical 1-row consignments. Multi-row
 * carts will spill to page 2 with the fixed footer staying visible.
 * ──────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  page: {
    backgroundColor: PDF_TOKENS.SURFACE_WHITE,
    color: PDF_TOKENS.FG_PRIMARY,
    paddingHorizontal: 36,
    paddingTop: 20,
    paddingBottom: 60, // leave room for fixed footer
    fontFamily: FONT_SANS,
    fontSize: PDF_FONT_SIZES.BODY,
    lineHeight: 1.4,
  },

  /* ── Header banner ── */
  headerBanner: {
    width: "100%",
    height: 64,
    objectFit: "contain",
    marginBottom: 8,
  },

  /* ── Company header (issuer) ── */
  companyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: PDF_TOKENS.BRAND_PRIMARY,
    marginBottom: 14,
  },
  companyLeft: {
    flexDirection: "column",
    flex: 1,
  },
  companyName: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.H_TOTALS,
    color: PDF_TOKENS.FG_PRIMARY,
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: PDF_FONT_SIZES.CAPTION,
    color: PDF_TOKENS.FG_MUTED,
    lineHeight: 1.4,
  },
  companyMetaMono: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.CAPTION,
    color: PDF_TOKENS.FG_MUTED,
  },
  companyRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  invoiceTitle: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.DISPLAY,
    color: PDF_TOKENS.BRAND_PRIMARY,
    letterSpacing: 1,
  },

  /* ── Bill-to / Invoice-meta row ── */
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    gap: 18,
  },
  billLeft: {
    flex: 1.4,
  },
  billRight: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  billRightCol: {
    flex: 1,
  },

  sectionLabel: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.LABEL,
    letterSpacing: 1.4,
    color: PDF_TOKENS.BRAND_PRIMARY,
    fontWeight: 700,
    marginBottom: 4,
  },
  customerName: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.H_SECTION,
    marginBottom: 3,
    color: PDF_TOKENS.FG_PRIMARY,
  },
  bodyText: {
    fontSize: PDF_FONT_SIZES.BODY,
    color: PDF_TOKENS.FG_SECONDARY,
    marginTop: 1,
  },
  monoText: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.CAPTION,
    color: PDF_TOKENS.FG_MUTED,
    marginTop: 1,
  },

  invoiceNumberValue: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.H_TITLE,
    color: PDF_TOKENS.FG_PRIMARY,
    marginBottom: 2,
  },
  invoiceMetaValue: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.BODY,
    fontWeight: 700,
    color: PDF_TOKENS.FG_SECONDARY,
    marginTop: 1,
  },

  qrBlock: {
    flexDirection: "column",
    alignItems: "flex-end",
    width: 80,
  },
  qrImage: {
    width: 76,
    height: 76,
  },
  qrCaption: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.MICRO_SM,
    letterSpacing: 1,
    color: PDF_TOKENS.FG_FAINT,
    marginTop: 2,
    textAlign: "right",
  },

  /* ── Consignment band ── */
  consignmentBand: {
    flexDirection: "row",
    backgroundColor: PDF_TOKENS.SURFACE_MUTED,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 12,
    gap: 18,
  },
  consignmentCell: {
    flexDirection: "column",
  },
  consignmentLabel: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.MICRO_SM,
    letterSpacing: 1.2,
    color: PDF_TOKENS.FG_DISABLED,
  },
  consignmentValue: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.BODY,
    fontWeight: 700,
    color: PDF_TOKENS.FG_PRIMARY,
    marginTop: 1,
  },

  /* ── Charges table ── */
  table: {
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: PDF_TOKENS.BORDER_STRONG,
    paddingVertical: 5,
    backgroundColor: PDF_TOKENS.SURFACE_TINT,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderColor: PDF_TOKENS.BORDER_DEFAULT,
  },
  thLabel: {
    flex: 5,
    fontSize: PDF_FONT_SIZES.CAPTION,
    fontWeight: 700,
    fontFamily: FONT_MONO,
    letterSpacing: 0.8,
    color: PDF_TOKENS.FG_PRIMARY,
    paddingHorizontal: 4,
  },
  thQty: {
    flex: 1,
    fontSize: PDF_FONT_SIZES.CAPTION,
    fontWeight: 700,
    fontFamily: FONT_MONO,
    letterSpacing: 0.8,
    color: PDF_TOKENS.FG_PRIMARY,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  thPrice: {
    flex: 1.6,
    fontSize: PDF_FONT_SIZES.CAPTION,
    fontWeight: 700,
    fontFamily: FONT_MONO,
    letterSpacing: 0.8,
    color: PDF_TOKENS.FG_PRIMARY,
    textAlign: "right",
    paddingHorizontal: 4,
  },
  thTotal: {
    flex: 1.6,
    fontSize: PDF_FONT_SIZES.CAPTION,
    fontWeight: 700,
    fontFamily: FONT_MONO,
    letterSpacing: 0.8,
    color: PDF_TOKENS.FG_PRIMARY,
    textAlign: "right",
    paddingHorizontal: 4,
  },
  tdLabel: {
    flex: 5,
    fontSize: PDF_FONT_SIZES.BODY,
    color: PDF_TOKENS.FG_SECONDARY,
    paddingHorizontal: 4,
  },
  tdQty: {
    flex: 1,
    fontSize: PDF_FONT_SIZES.BODY,
    fontFamily: FONT_MONO,
    color: PDF_TOKENS.FG_SECONDARY,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  tdPrice: {
    flex: 1.6,
    fontSize: PDF_FONT_SIZES.BODY,
    fontFamily: FONT_MONO,
    color: PDF_TOKENS.FG_SECONDARY,
    textAlign: "right",
    paddingHorizontal: 4,
  },
  tdTotal: {
    flex: 1.6,
    fontSize: PDF_FONT_SIZES.BODY,
    fontFamily: FONT_MONO,
    color: PDF_TOKENS.FG_SECONDARY,
    textAlign: "right",
    paddingHorizontal: 4,
  },

  /* ── Totals stack ── */
  totalsBlock: {
    flexDirection: "column",
    alignSelf: "flex-end",
    marginTop: 10,
    width: "55%",
  },
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 3,
    justifyContent: "space-between",
  },
  totalsLabel: {
    fontSize: PDF_FONT_SIZES.BODY,
    color: PDF_TOKENS.FG_MUTED,
  },
  totalsAmount: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.BODY,
    color: PDF_TOKENS.FG_SECONDARY,
  },
  grandTotalRow: {
    flexDirection: "row",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: PDF_TOKENS.BORDER_STRONG,
    justifyContent: "space-between",
  },
  grandTotalLabel: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.TABLE_HEADER,
    color: PDF_TOKENS.FG_PRIMARY,
  },
  grandTotalAmount: {
    fontFamily: FONT_MONO,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.H_LABEL,
    color: PDF_TOKENS.FG_PRIMARY,
  },
  balanceDueRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 4,
    backgroundColor: PDF_TOKENS.BRAND_PRIMARY_SOFT,
    borderLeftWidth: 3,
    borderLeftColor: PDF_TOKENS.BRAND_PRIMARY,
    justifyContent: "space-between",
  },
  balanceDueLabel: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.H_LABEL,
    color: PDF_TOKENS.BRAND_PRIMARY,
  },
  balanceDueAmount: {
    fontFamily: FONT_MONO,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.H_TITLE,
    color: PDF_TOKENS.BRAND_PRIMARY,
  },

  /* ── Bank + signature row ── */
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 18,
  },
  bankBlock: {
    flex: 1.3,
  },
  bankLine: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.CAPTION,
    color: PDF_TOKENS.FG_SECONDARY,
    marginTop: 2,
  },
  signBlock: {
    flex: 1,
    alignItems: "flex-end",
    flexDirection: "column",
  },
  signLine: {
    width: 140,
    height: 1,
    backgroundColor: PDF_TOKENS.BORDER_STRONG,
    marginTop: 28,
    marginBottom: 4,
  },
  signCaption: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.LABEL,
    letterSpacing: 1.2,
    color: PDF_TOKENS.FG_FAINT,
    textAlign: "right",
  },
  signCompany: {
    fontFamily: FONT_SANS,
    fontWeight: 700,
    fontSize: PDF_FONT_SIZES.BODY,
    color: PDF_TOKENS.FG_PRIMARY,
    textAlign: "right",
  },

  /* ── Notes ── */
  notesBlock: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderLeftWidth: 2,
    borderLeftColor: PDF_TOKENS.BORDER_SOFT,
    backgroundColor: PDF_TOKENS.SURFACE_TINT,
  },
  notesText: {
    fontSize: PDF_FONT_SIZES.BODY_SM,
    color: PDF_TOKENS.FG_SECONDARY,
    lineHeight: 1.45,
  },

  /* ── Terms & Conditions — single-line notice, compact ── */
  termsBlock: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: PDF_TOKENS.BORDER_SOFT,
  },
  termsTitle: {
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.LABEL,
    letterSpacing: 1.4,
    color: PDF_TOKENS.BRAND_PRIMARY,
    fontWeight: 700,
    marginBottom: 6,
  },
  termText: {
    fontSize: PDF_FONT_SIZES.CAPTION_SM,
    color: PDF_TOKENS.FG_MUTED,
    lineHeight: 1.45,
  },

  /* ── Footer ── */
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontFamily: FONT_MONO,
    fontSize: PDF_FONT_SIZES.MICRO,
    letterSpacing: 1.2,
    color: PDF_TOKENS.FG_DISABLED,
    textAlign: "center",
    borderTopWidth: 0.5,
    borderColor: PDF_TOKENS.BORDER_SOFT,
    paddingTop: 6,
  },
})

/* ────────────────────────────────────────────────────────────────────────
 * Formatting helpers — currency in INR (no ₹ glyph; Helvetica = WinAnsi),
 * dates as `dd MMM yyyy`.
 * ──────────────────────────────────────────────────────────────────────── */
const formatINR = (n: number) =>
  `INR ${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

/**
 * Negative-aware INR formatter. Uses ASCII hyphen-minus `-` (U+002D),
 * NOT the Unicode MINUS SIGN `−` (U+2212), because @react-pdf/renderer
 * uses WinAnsi font encoding by default — U+2212 falls outside the
 * encoding's glyph table and renders as a missing-glyph box.
 */
const formatINRSigned = (n: number) =>
  `${n < 0 ? "-" : ""}INR ${Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const formatDate = (iso?: string | null) => {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

interface ChargeLine {
  label: string
  qty: number
  unitPrice: number
  total: number
}

/**
 * Expand the flat charge fields on `InvoicePdfData` into a structured
 * line-item list. Quantity defaults to 1 for service-line items (the
 * majority of invoices) — this matches the canonical Indian tax-invoice
 * layout where a transport service is "1 × INR Y" rather than weight ×
 * rate. Discount is rendered as a negative line.
 *
 * HSN/SAC is shown once in the consignment band (top of invoice) rather
 * than repeated per line, to keep the table compact.
 */
function buildChargeLines(d: InvoicePdfData): ChargeLine[] {
  const out: ChargeLine[] = []
  const push = (label: string, value: number | null | undefined) => {
    if (value !== null && value !== undefined && value > 0) {
      out.push({ label, qty: 1, unitPrice: value, total: value })
    }
  }
  push("Base Freight", d.baseFreight)
  push("Docket Charge", d.docketCharge)
  push("Pickup Charge", d.pickupCharge ?? 0)
  push("Packing Charge", d.packingCharge ?? 0)
  push("Fuel Surcharge", d.fuelSurcharge)
  push("Handling Fee", d.handlingFee)
  push("Insurance / Risk Surcharge", d.insurance)
  if (d.discount > 0) {
    out.push({
      label: "Discount",
      qty: 1,
      unitPrice: -d.discount,
      total: -d.discount,
    })
  }
  return out
}

/**
 * Convert a number to Indian-style words (lakhs/crores).
 * Used for the statutory "Amount in words" line on the invoice.
 * Handles paise as a separate trailing fragment.
 */
function amountInWords(n: number): string {
  if (!isFinite(n)) return ""
  let rupees = Math.floor(Math.abs(n))
  let paise = Math.round((Math.abs(n) - rupees) * 100)
  // Floating-point edge case: 99.999 → rupees=99, paise=Math.round(99.9)=100.
  // Without this guard, the output reads "and One Hundred Paise" which is
  // numerically wrong. Carry the overflow into rupees.
  if (paise >= 100) {
    paise = 0
    rupees += 1
  }
  const sign = n < 0 ? "Minus " : ""
  const main = numberToIndianWords(rupees)
  const tail = paise > 0 ? ` and ${numberToIndianWords(paise)} Paise` : ""
  return `${sign}Rupees ${main}${tail} only`
}

function numberToIndianWords(num: number): string {
  if (num === 0) return "Zero"
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ]
  // Helpers — guarded array access keeps `noUncheckedIndexedAccess` happy
  // without sprinkling non-null assertions through the math.
  const safeOne = (n: number) => ones[n] ?? ""
  const safeTen = (n: number) => tens[n] ?? ""
  const twoDigits = (n: number): string => {
    if (n < 20) return safeOne(n)
    const t = Math.floor(n / 10)
    const u = n % 10
    return u === 0 ? safeTen(t) : `${safeTen(t)} ${safeOne(u)}`
  }
  const threeDigits = (n: number): string => {
    const h = Math.floor(n / 100)
    const r = n % 100
    if (h === 0) return twoDigits(r)
    return r === 0
      ? `${safeOne(h)} Hundred`
      : `${safeOne(h)} Hundred ${twoDigits(r)}`
  }
  if (num < 1000) return threeDigits(num)
  const parts: string[] = []
  const crore = Math.floor(num / 10000000)
  const lakh = Math.floor((num % 10000000) / 100000)
  const thousand = Math.floor((num % 100000) / 1000)
  const rem = num % 1000
  if (crore) parts.push(`${twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (rem) parts.push(threeDigits(rem))
  return parts.join(" ")
}

export function InvoicePdf({
  data,
  headerImageSrc,
  qrPng,
  trackingUrl,
}: InvoicePdfProps) {
  const lines = buildChargeLines(data)
  const subtotal = lines.reduce((sum, line) => sum + line.total, 0)
  const totalTax = (data.cgst ?? 0) + (data.sgst ?? 0) + (data.igst ?? 0)
  const taxRegime = data.igst > 0 ? "inter-state" : "intra-state"

  return (
    <Document
      title={`Tapan Associate Cargo · Tax Invoice ${data.invoiceNumber}`}
      author={COMPANY.legalName}
      subject={`Tax invoice for ${data.customerName}`}
      keywords={`invoice,${data.invoiceNumber},${data.awbNumber ?? ""}`}
    >
      <Page size="A4" style={styles.page}>
        {/* Header banner — embeds pdf-header.png */}
        {headerImageSrc && (
          // @react-pdf/renderer types lag the runtime — `src` accepts URL,
          // Buffer, or `{ data, format }`. Cast at the boundary.
          <Image
            src={headerImageSrc as unknown as string}
            style={styles.headerBanner}
          />
        )}

        {/* ─── Issuer block + Invoice title ─── */}
        <View style={styles.companyRow}>
          <View style={styles.companyLeft}>
            <Text style={styles.companyName}>{COMPANY.legalName}</Text>
            {COMPANY.addressLines.map((l, i) => (
              <Text key={i} style={styles.companyMeta}>
                {l}
              </Text>
            ))}
            <Text style={styles.companyMeta}>
              Tel: {COMPANY.tel} · Email: {COMPANY.email} · {COMPANY.web}
            </Text>
            <Text style={styles.companyMetaMono}>
              GSTIN: {COMPANY.gstin} · PAN: {COMPANY.pan} · CIN: {COMPANY.cin}
            </Text>
          </View>
          <View style={styles.companyRight}>
            <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
          </View>
        </View>

        {/* ─── Bill-to + invoice meta + QR ─── */}
        <View style={styles.billRow}>
          <View style={styles.billLeft}>
            <Text style={styles.sectionLabel}>BILL TO</Text>
            <Text style={styles.customerName}>
              {(data.customerName || "").toUpperCase()}
            </Text>
            {data.customerAddress ? (
              <Text style={styles.bodyText}>{data.customerAddress}</Text>
            ) : null}
            {data.customerPhone ? (
              <Text style={styles.monoText}>Tel: {data.customerPhone}</Text>
            ) : null}
            {data.customerGstin ? (
              <Text style={styles.monoText}>GSTIN: {data.customerGstin}</Text>
            ) : (
              <Text style={styles.monoText}>GSTIN: Unregistered (B2C)</Text>
            )}
          </View>

          <View style={styles.billRight}>
            <View style={styles.billRightCol}>
              <Text style={styles.sectionLabel}>INVOICE NUMBER</Text>
              <Text style={styles.invoiceNumberValue}>
                #{data.invoiceNumber}
              </Text>
              <Text style={styles.monoText}>
                Issued: {formatDate(data.createdAt)}
              </Text>
              {data.dueDate ? (
                <Text style={styles.monoText}>
                  Due: {formatDate(data.dueDate)}
                </Text>
              ) : null}
              <Text style={styles.monoText}>Status: {data.status}</Text>
            </View>

            {qrPng ? (
              <View style={styles.qrBlock}>
                <Image
                  // @react-pdf/renderer's Image accepts a Buffer at runtime
                  // even though its types only document URL strings.
                  src={{ data: qrPng, format: "png" } as unknown as string}
                  style={styles.qrImage}
                />
                <Text style={styles.qrCaption}>SCAN TO TRACK</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ─── Consignment band — only shown when there's an AWB ─── */}
        {data.awbNumber || data.paymentMode ? (
          <View style={styles.consignmentBand}>
            {data.awbNumber ? (
              <View style={styles.consignmentCell}>
                <Text style={styles.consignmentLabel}>AWB / DOCKET</Text>
                <Text style={styles.consignmentValue}>{data.awbNumber}</Text>
              </View>
            ) : null}
            <View style={styles.consignmentCell}>
              <Text style={styles.consignmentLabel}>PAYMENT MODE</Text>
              <Text style={styles.consignmentValue}>
                {data.paymentMode.toUpperCase()}
              </Text>
            </View>
            <View style={styles.consignmentCell}>
              <Text style={styles.consignmentLabel}>TAX REGIME</Text>
              <Text style={styles.consignmentValue}>
                {taxRegime.toUpperCase()}
              </Text>
            </View>
            <View style={styles.consignmentCell}>
              <Text style={styles.consignmentLabel}>HSN / SAC</Text>
              <Text style={styles.consignmentValue}>{COMPANY.hsn}</Text>
            </View>
          </View>
        ) : null}

        {/* ─── Charges table ─── */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.thLabel}>SERVICE DESCRIPTION</Text>
            <Text style={styles.thQty}>QTY</Text>
            <Text style={styles.thPrice}>PRICE</Text>
            <Text style={styles.thTotal}>TOTAL</Text>
          </View>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.tdLabel}>{line.label}</Text>
              <Text style={styles.tdQty}>{line.qty}</Text>
              <Text style={styles.tdPrice}>{formatINRSigned(line.unitPrice)}</Text>
              <Text style={styles.tdTotal}>{formatINRSigned(line.total)}</Text>
            </View>
          ))}
        </View>

        {/* ─── Totals stack ─── */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsAmount}>{formatINRSigned(subtotal)}</Text>
          </View>
          {data.cgst > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>CGST @ 9%</Text>
              <Text style={styles.totalsAmount}>{formatINR(data.cgst)}</Text>
            </View>
          ) : null}
          {data.sgst > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>SGST @ 9%</Text>
              <Text style={styles.totalsAmount}>{formatINR(data.sgst)}</Text>
            </View>
          ) : null}
          {data.igst > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGST @ 18%</Text>
              <Text style={styles.totalsAmount}>{formatINR(data.igst)}</Text>
            </View>
          ) : null}
          {totalTax > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total Tax</Text>
              <Text style={styles.totalsAmount}>{formatINR(totalTax)}</Text>
            </View>
          ) : null}

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={styles.grandTotalAmount}>
              {formatINR(data.totalAmount)}
            </Text>
          </View>

          {data.advancePaid > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Advance Paid</Text>
              <Text style={styles.totalsAmount}>
                {formatINRSigned(-data.advancePaid)}
              </Text>
            </View>
          ) : null}

          <View style={styles.balanceDueRow}>
            <Text style={styles.balanceDueLabel}>BALANCE DUE</Text>
            <Text style={styles.balanceDueAmount}>
              {formatINR(data.balance)}
            </Text>
          </View>
        </View>

        {/* ─── Amount in words ─── */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.monoText}>
            Amount in words:{" "}
            <Text style={{ color: PDF_TOKENS.FG_PRIMARY }}>
              {amountInWords(data.totalAmount)}
            </Text>
          </Text>
        </View>

        {/* ─── Bank details + Authorized signatory ─── */}
        <View style={styles.bankRow}>
          <View style={styles.bankBlock}>
            <Text style={styles.sectionLabel}>BANK DETAILS</Text>
            <Text style={styles.bankLine}>{BANK.name}</Text>
            <Text style={styles.bankLine}>A/C: {BANK.account}</Text>
            <Text style={styles.bankLine}>IFSC: {BANK.ifsc}</Text>
            <Text style={styles.bankLine}>SWIFT: {BANK.swift}</Text>
            <Text style={styles.bankLine}>UPI: {BANK.upi}</Text>
          </View>
          <View style={styles.signBlock}>
            <Text style={styles.signCaption}>FOR AND ON BEHALF OF</Text>
            <Text style={styles.signCompany}>{COMPANY.legalName}</Text>
            <View style={styles.signLine} />
            <Text style={styles.signCaption}>AUTHORIZED SIGNATORY</Text>
          </View>
        </View>

        {/* ─── Notes ─── */}
        {data.notes ? (
          <View style={styles.notesBlock}>
            <Text style={styles.sectionLabel}>NOTES</Text>
            <Text style={styles.notesText}>
              {sanitizeNotes(data.notes)}
            </Text>
          </View>
        ) : null}

        {/* ─── Terms & Conditions — single-line reference to keep the
              invoice on one page; full statutory clauses live on the
              marketing site (`tapanassociatecargo.in/terms`). ─── */}
        <View style={styles.termsBlock}>
          <Text style={styles.termsTitle}>TERMS &amp; CONDITIONS</Text>
          <Text style={styles.termText}>{TERMS_NOTICE}</Text>
        </View>

        {/* ─── Footer (fixed, repeats on every page) ─── */}
        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `TAC EXPRESS · LOGISTICS FOR THE NORTH-EAST · COMPUTER-GENERATED INVOICE — NO SIGNATURE REQUIRED · PAGE ${pageNumber} OF ${totalPages}` +
            (trackingUrl ? `  ·  TRACK: ${trackingUrl}` : "")
          }
        />
      </Page>
    </Document>
  )
}

/**
 * `notes` may arrive as a JSON blob (from the invoice wizard's structured
 * notes) or as plain text. When it's JSON, surface only the human-readable
 * fields rather than dumping the raw object into the PDF. Falls back to
 * the original text when the shape isn't recognised.
 */
function sanitizeNotes(notes: string): string {
  const trimmed = notes.trim()
  if (!trimmed.startsWith("{")) return trimmed
  try {
    const parsed = JSON.parse(trimmed) as {
      handling?: string
      remarks?: string
      consignor?: { name?: string; phone?: string; address?: string }
      consignee?: { name?: string; phone?: string; address?: string }
    }
    const out: string[] = []
    if (parsed.handling) out.push(`Handling: ${parsed.handling}`)
    if (parsed.remarks) out.push(parsed.remarks)
    if (parsed.consignor?.name)
      out.push(
        `Consignor: ${parsed.consignor.name}${
          parsed.consignor.phone ? ` (${parsed.consignor.phone})` : ""
        }`,
      )
    if (parsed.consignee?.name)
      out.push(
        `Consignee: ${parsed.consignee.name}${
          parsed.consignee.phone ? ` (${parsed.consignee.phone})` : ""
        }`,
      )
    return out.length > 0 ? out.join(" · ") : trimmed
  } catch {
    return trimmed
  }
}

/**
 * Server-side helper: render the invoice document to a binary PDF.
 *
 * The route handler imports this rather than `renderToBuffer` directly,
 * so `@react-pdf/renderer` stays a transitive dependency through the
 * services package — keeps `apps/dashboard/package.json` clean.
 */
export async function renderInvoicePdfToBuffer(
  props: InvoicePdfProps,
): Promise<Buffer> {
  // `InvoicePdf` returns `<Document>...</Document>`, so calling it
  // directly produces a `ReactElement<DocumentProps>` at runtime. The
  // cast tells TS what we know structurally — `as unknown` first
  // because TS can't infer through the function's return without an
  // explicit annotation.
  return renderToBuffer(
    InvoicePdf(props) as unknown as React.ReactElement<DocumentProps>,
  )
}
