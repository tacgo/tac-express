import { normalizeAwb, parseAwb } from "./awb"

/**
 * Arrival-audit reconciliation rule.
 *
 * Classifies a raw scanned/typed barcode against the manifest's loaded
 * expected-shipment list. This is business logic, so it lives in
 * `packages/services` (LAW 7) — the app component only renders the result and
 * applies the resulting state change. AWB format knowledge stays delegated to
 * `parseAwb`; this function owns the match/duplicate/exception/success policy.
 */

export type ArrivalScanOutcome = "SUCCESS" | "DUPLICATE" | "ERROR"

/** Minimal view of a manifest line needed to reconcile a scan. */
export interface ArrivalScanCandidate {
  awbNumber: string
  status: "PENDING" | "SCANNED" | "EXCEPTION"
}

export interface ArrivalScanResult {
  outcome: ArrivalScanOutcome
  /** Human-readable reason for DUPLICATE / ERROR outcomes. */
  reason?: string
  /** On SUCCESS, the canonical AWB of the line to mark scanned. */
  matchedAwb?: string
}

export function reconcileArrivalScan(
  items: readonly ArrivalScanCandidate[],
  raw: string
): ArrivalScanResult {
  const awb = parseAwb(raw)
  if (!awb) {
    return {
      outcome: "ERROR",
      reason: `Barcode not matching — no shipment found for ${normalizeAwb(raw)}`,
    }
  }

  const matched = items.find((i) => i.awbNumber === awb)
  if (!matched) {
    return {
      outcome: "ERROR",
      reason: `Barcode not matching — no shipment found for ${awb}`,
    }
  }
  if (matched.status === "SCANNED") {
    return { outcome: "DUPLICATE", reason: "Already received on this manifest" }
  }
  if (matched.status === "EXCEPTION") {
    return {
      outcome: "ERROR",
      reason: "Flagged as an exception — cannot receive",
    }
  }

  return { outcome: "SUCCESS", matchedAwb: awb }
}
