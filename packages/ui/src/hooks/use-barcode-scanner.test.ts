import { describe, it, expect } from "vitest"

import { createScanAccumulator } from "./use-barcode-scanner"

/**
 * Pure-core tests for the HID barcode-capture state machine. Repo convention
 * is no testing-library (see stat-card.test.ts) — the React hook is a thin
 * adapter over this pure accumulator, so the load-bearing behavior (timing
 * discrimination + terminator segmentation) is exercised here by simulating
 * keystroke sequences with explicit timestamps.
 *
 * Helett HT20 USB HID wedge: types decoded chars as fast keystrokes
 * (<~30ms apart) terminated by Enter. Human typing is >150ms apart.
 */

/** Drive a sequence of [key, atMs] pairs; return every decoded code emitted. */
function drive(
  acc: ReturnType<typeof createScanAccumulator>,
  events: [key: string, atMs: number][]
): string[] {
  const out: string[] = []
  for (const [key, atMs] of events) {
    const code = acc.feed(key, atMs)
    if (code !== null) out.push(code)
  }
  return out
}

describe("createScanAccumulator — scanner bursts", () => {
  it("decodes a fast keystroke burst terminated by Enter", () => {
    const acc = createScanAccumulator()
    const out = drive(acc, [
      ["T", 0],
      ["A", 10],
      ["C", 20],
      ["1", 30],
      ["2", 40],
      ["3", 50],
      ["Enter", 60],
    ])
    expect(out).toEqual(["TAC123"])
  })

  it("sets isScanning while a fast burst accumulates, clears it on terminate", () => {
    const acc = createScanAccumulator()
    acc.feed("T", 0)
    acc.feed("A", 10)
    expect(acc.isScanning).toBe(true)
    acc.feed("C", 20)
    acc.feed("Enter", 30)
    expect(acc.isScanning).toBe(false)
  })
})

describe("createScanAccumulator — human typing is not a scan", () => {
  it("does not emit for slow keystrokes terminated by Enter", () => {
    const acc = createScanAccumulator()
    const out = drive(acc, [
      ["T", 0],
      ["A", 200],
      ["C", 400],
      ["1", 600],
      ["2", 800],
      ["3", 1000],
      ["Enter", 1200],
    ])
    expect(out).toEqual([])
    expect(acc.isScanning).toBe(false)
  })

  it("restarts the buffer when a slow gap interrupts a burst", () => {
    const acc = createScanAccumulator()
    // "AB" fast, long pause, then "CDE" fast + Enter → only CDE survives.
    const out = drive(acc, [
      ["A", 0],
      ["B", 10],
      ["C", 500],
      ["D", 510],
      ["E", 520],
      ["Enter", 530],
    ])
    expect(out).toEqual(["CDE"])
  })
})

describe("createScanAccumulator — terminator segmentation", () => {
  it("resolves two back-to-back scans independently without merging", () => {
    const acc = createScanAccumulator()
    const out = drive(acc, [
      ["T", 0],
      ["A", 10],
      ["C", 20],
      ["1", 30],
      ["Enter", 40],
      // second scan immediately after — even at scanner speed it must not merge
      ["T", 50],
      ["A", 60],
      ["C", 70],
      ["2", 80],
      ["Enter", 90],
    ])
    expect(out).toEqual(["TAC1", "TAC2"])
  })

  it("ignores a terminator when the buffer is below minLength (stray Enter)", () => {
    const acc = createScanAccumulator({ minLength: 3 })
    const out = drive(acc, [
      ["A", 0],
      ["B", 10],
      ["Enter", 20],
    ])
    expect(out).toEqual([])
  })

  it("ignores a terminator on an empty buffer", () => {
    const acc = createScanAccumulator()
    expect(acc.feed("Enter", 0)).toBeNull()
  })

  it("honors a custom terminator key", () => {
    const acc = createScanAccumulator({ terminators: ["Tab"] })
    const out = drive(acc, [
      ["X", 0],
      ["Y", 10],
      ["Z", 20],
      ["Tab", 30],
    ])
    expect(out).toEqual(["XYZ"])
  })
})
