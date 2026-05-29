import { describe, it, expect } from "vitest"
import {
  isValidGstin,
  stateCodeFromGstin,
  gstSplitMode,
  computeGstBreakdown,
} from "../gst"

describe("isValidGstin", () => {
  it("accepts a valid GSTIN", () => {
    expect(isValidGstin("27ABCDE1234F1Z5")).toBe(true)
  })

  it("rejects null/undefined", () => {
    expect(isValidGstin(null)).toBe(false)
    expect(isValidGstin(undefined)).toBe(false)
    expect(isValidGstin("")).toBe(false)
  })

  it("is case-insensitive (normalises to uppercase)", () => {
    expect(isValidGstin("27abcde1234f1z5")).toBe(true)
  })

  it("rejects wrong length", () => {
    expect(isValidGstin("27ABCDE1234F1Z")).toBe(false)
    expect(isValidGstin("27ABCDE1234F1Z55")).toBe(false)
  })

  it("rejects missing Z at position 13", () => {
    expect(isValidGstin("27ABCDE1234F1A5")).toBe(false)
  })
})

describe("stateCodeFromGstin", () => {
  it("extracts the 2-digit state code", () => {
    expect(stateCodeFromGstin("27ABCDE1234F1Z5")).toBe("27")
    expect(stateCodeFromGstin("14AAAAA0000A1Z5")).toBe("14")
  })

  it("returns null for invalid GSTIN", () => {
    expect(stateCodeFromGstin("invalid")).toBeNull()
    expect(stateCodeFromGstin(null)).toBeNull()
  })
})

describe("gstSplitMode", () => {
  it("returns INTRA_STATE when both GSTINs share the same state code", () => {
    expect(gstSplitMode("27ABCDE1234F1Z5", "27XYZAB9999G1Z3")).toBe("INTRA_STATE")
  })

  it("returns INTER_STATE when state codes differ", () => {
    expect(gstSplitMode("27ABCDE1234F1Z5", "07XYZAB9999G1Z3")).toBe("INTER_STATE")
  })

  it("defaults to INTER_STATE when either GSTIN is null/invalid", () => {
    expect(gstSplitMode(null, "27ABCDE1234F1Z5")).toBe("INTER_STATE")
    expect(gstSplitMode("27ABCDE1234F1Z5", null)).toBe("INTER_STATE")
    expect(gstSplitMode(null, null)).toBe("INTER_STATE")
    expect(gstSplitMode("invalid", "27ABCDE1234F1Z5")).toBe("INTER_STATE")
  })
})

describe("computeGstBreakdown", () => {
  it("splits into equal CGST+SGST in INTRA_STATE mode at 18%", () => {
    const b = computeGstBreakdown(1000, 18, "INTRA_STATE")
    expect(b.cgst).toBe(90)
    expect(b.sgst).toBe(90)
    expect(b.igst).toBe(0)
    expect(b.total).toBe(180)
  })

  it("puts full tax into IGST in INTER_STATE mode at 18%", () => {
    const b = computeGstBreakdown(1000, 18, "INTER_STATE")
    expect(b.cgst).toBe(0)
    expect(b.sgst).toBe(0)
    expect(b.igst).toBe(180)
    expect(b.total).toBe(180)
  })

  it("handles 12% GST correctly", () => {
    const b = computeGstBreakdown(500, 12, "INTRA_STATE")
    expect(b.cgst).toBe(30)
    expect(b.sgst).toBe(30)
    expect(b.total).toBe(60)
  })

  it("rounds to 2 decimal places", () => {
    // 100 * 18% = 18.00 — exact
    const b = computeGstBreakdown(100, 18, "INTRA_STATE")
    expect(b.cgst).toBe(9)
    expect(b.sgst).toBe(9)
    expect(b.total).toBe(18)
  })

  it("handles fractional amounts with rounding", () => {
    // 333 * 18% = 59.94 → INTRA: CGST = 29.97, SGST = 29.97
    const b = computeGstBreakdown(333, 18, "INTRA_STATE")
    expect(b.total).toBe(59.94)
    expect(b.cgst + b.sgst).toBeCloseTo(59.94, 2)
  })

  it("returns zero tax for 0% rate", () => {
    const b = computeGstBreakdown(1000, 0, "INTRA_STATE")
    expect(b.cgst).toBe(0)
    expect(b.sgst).toBe(0)
    expect(b.total).toBe(0)
  })
})
