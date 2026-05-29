import { describe, it, expect } from "vitest"

import { normalizeAwb, isValidAwb, parseAwb } from "../awb"

/**
 * Pure-function contract tests for the AWB parse/validate helper.
 * Repo convention: assert on pure outputs (no testing-library), mirroring
 * `gst.test.ts`. The single source of truth for the format is
 * `AWB_PATTERN` (/^TAC\d{8,11}$/i) in `@workspace/types`; these tests pin
 * the helper to that contract so a future loosening can't pass silently.
 */
describe("normalizeAwb", () => {
  it("trims surrounding whitespace and uppercases", () => {
    expect(normalizeAwb("  tac26043010002 ")).toBe("TAC26043010002")
  })

  it("leaves an already-canonical value unchanged", () => {
    expect(normalizeAwb("TAC26043010002")).toBe("TAC26043010002")
  })

  it("returns an empty string for nullish input", () => {
    expect(normalizeAwb(null)).toBe("")
    expect(normalizeAwb(undefined)).toBe("")
  })
})

describe("isValidAwb", () => {
  it("accepts a generated AWB (TAC + 11 digits)", () => {
    expect(isValidAwb("TAC26043010002")).toBe(true)
  })

  it("accepts the short boundary (TAC + 8 digits)", () => {
    expect(isValidAwb("TAC12345678")).toBe(true)
  })

  it("is case-insensitive and whitespace-tolerant", () => {
    expect(isValidAwb("  tac26043010002 ")).toBe(true)
  })

  it("rejects nullish / empty input", () => {
    expect(isValidAwb(null)).toBe(false)
    expect(isValidAwb(undefined)).toBe(false)
    expect(isValidAwb("")).toBe(false)
  })

  it("rejects too few digits (7)", () => {
    expect(isValidAwb("TAC1234567")).toBe(false)
  })

  it("rejects too many digits (12)", () => {
    expect(isValidAwb("TAC123456789012")).toBe(false)
  })

  it("rejects a missing TAC prefix", () => {
    expect(isValidAwb("26043010002")).toBe(false)
  })

  it("rejects non-digit body characters", () => {
    expect(isValidAwb("TACABCDEFGH")).toBe(false)
    expect(isValidAwb("TAC2604301000X")).toBe(false)
  })

  it("rejects internal whitespace", () => {
    expect(isValidAwb("TAC 2604 3010")).toBe(false)
  })
})

describe("parseAwb", () => {
  it("returns the canonical (normalized) AWB for valid input", () => {
    expect(parseAwb("  tac26043010002 ")).toBe("TAC26043010002")
  })

  it("returns null for a malformed barcode", () => {
    expect(parseAwb("not-an-awb")).toBeNull()
    expect(parseAwb("TAC123")).toBeNull()
  })

  it("returns null for nullish input", () => {
    expect(parseAwb(null)).toBeNull()
    expect(parseAwb(undefined)).toBeNull()
  })
})
