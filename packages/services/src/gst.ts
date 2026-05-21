// India GST helpers — pure utilities, zero deps. Live in services so both
// hooks and Edge Functions can import them.

/**
 * Canonical GSTIN regex per the GST Network spec.
 * Format: 2-digit state code + 5-letter PAN prefix + 4-digit PAN sequence
 *         + 1-letter PAN entity + 1 alphanumeric + literal "Z" + 1 alphanumeric.
 * Example: 27ABCDE1234F1Z5
 */
export const GSTIN_PATTERN =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function isValidGstin(value: string | null | undefined): boolean {
  if (!value) return false
  return GSTIN_PATTERN.test(value.trim().toUpperCase())
}

/** Extract the 2-digit state code from a GSTIN. Returns null on invalid input. */
export function stateCodeFromGstin(
  gstin: string | null | undefined
): string | null {
  if (!isValidGstin(gstin ?? undefined)) return null
  return (gstin ?? "").substring(0, 2)
}

export type GstSplitMode = "INTRA_STATE" | "INTER_STATE"

/**
 * Decide whether a transaction triggers CGST+SGST (same state) or IGST
 * (cross-state) given the supplier and recipient GSTINs.
 */
export function gstSplitMode(
  supplierGstin: string | null | undefined,
  recipientGstin: string | null | undefined
): GstSplitMode {
  const s = stateCodeFromGstin(supplierGstin)
  const r = stateCodeFromGstin(recipientGstin)
  // If either party doesn't have a valid GSTIN we default to inter-state IGST.
  if (!s || !r) return "INTER_STATE"
  return s === r ? "INTRA_STATE" : "INTER_STATE"
}

export interface GstBreakdown {
  cgst: number
  sgst: number
  igst: number
  total: number
}

/**
 * Compute a GST breakdown for a taxable amount and a total tax rate (e.g. 18).
 * In INTRA_STATE mode the rate is split equally into CGST + SGST.
 */
export function computeGstBreakdown(
  taxableAmount: number,
  totalRatePct: number,
  mode: GstSplitMode
): GstBreakdown {
  const total = round2((taxableAmount * totalRatePct) / 100)
  if (mode === "INTRA_STATE") {
    const half = round2(total / 2)
    return {
      cgst: half,
      sgst: round2(total - half),
      igst: 0,
      total,
    }
  }
  return { cgst: 0, sgst: 0, igst: total, total }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
