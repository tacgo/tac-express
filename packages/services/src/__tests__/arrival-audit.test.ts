import { describe, it, expect } from "vitest"

import { reconcileArrivalScan } from "../arrival-audit"

/**
 * Contract tests for the arrival-audit reconciliation rule. This is the
 * business logic that classifies a scanned barcode against the loaded
 * manifest's expected list — extracted out of the app component to honor
 * LAW 7 (no business logic in apps/). Pure function, no DOM, no clock.
 */

const items = [
  { awbNumber: "TAC26043010001", status: "PENDING" as const },
  { awbNumber: "TAC26043010002", status: "SCANNED" as const },
  { awbNumber: "TAC26043010003", status: "EXCEPTION" as const },
]

describe("reconcileArrivalScan", () => {
  it("returns SUCCESS with the matched AWB for a pending shipment", () => {
    expect(reconcileArrivalScan(items, "TAC26043010001")).toEqual({
      outcome: "SUCCESS",
      matchedAwb: "TAC26043010001",
    })
  })

  it("normalizes the scan before matching (lowercase + whitespace)", () => {
    expect(reconcileArrivalScan(items, "  tac26043010001 ")).toEqual({
      outcome: "SUCCESS",
      matchedAwb: "TAC26043010001",
    })
  })

  it("rejects a malformed barcode with a clear no-match reason", () => {
    const r = reconcileArrivalScan(items, "not-an-awb")
    expect(r.outcome).toBe("ERROR")
    expect(r.reason).toBe("Barcode not matching — no shipment found for NOT-AN-AWB")
    expect(r.matchedAwb).toBeUndefined()
  })

  it("rejects a valid AWB that is not on the manifest", () => {
    const r = reconcileArrivalScan(items, "TAC26043019999")
    expect(r.outcome).toBe("ERROR")
    expect(r.reason).toBe(
      "Barcode not matching — no shipment found for TAC26043019999"
    )
  })

  it("flags an already-scanned shipment as a DUPLICATE", () => {
    expect(reconcileArrivalScan(items, "TAC26043010002")).toEqual({
      outcome: "DUPLICATE",
      reason: "Already received on this manifest",
    })
  })

  it("refuses to receive a shipment flagged as an exception", () => {
    expect(reconcileArrivalScan(items, "TAC26043010003")).toEqual({
      outcome: "ERROR",
      reason: "Flagged as an exception — cannot receive",
    })
  })
})
