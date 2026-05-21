import { describe, expect, it } from "vitest"

import {
  encodeCode128Svg,
  encodeDataMatrixSvg,
  encodeShippingLabelBarcodes,
} from "../barcode/encode"

/**
 * Tests for the barcode encoder. The contract is "produce real,
 * scannable symbology" — these tests assert structural properties of
 * the SVG output that prove encoding actually happened (vs. the prior
 * decorative seeded pattern, which would never have produced these
 * structures).
 *
 * Runtime scan-correctness tests are out of scope here — those need a
 * physical scanner or a separate decoder library. Instead we verify:
 *   - Output is well-formed SVG
 *   - Code 128 contains the right module-count for a known input
 *   - Data Matrix is square (ECC 200 default)
 *   - Determinism: same input → byte-identical output
 *   - Empty / invalid input throws loud
 */

/* bwip-js emits SVG with `<path>` elements (not `<rect>`) plus a
 * trailing newline after `</svg>`. Match shape via regex/contains
 * rather than strict prefix/suffix equality. */

describe("encodeCode128Svg", () => {
  it("returns a self-contained SVG string", () => {
    const svg = encodeCode128Svg("TAC26050810017")
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true)
    // bwip-js emits a viewBox so the SVG can be scaled freely
    expect(svg).toMatch(/viewBox="[\d\s.]+"/)
  })

  it("emits at least one <path> element with non-trivial geometry", () => {
    const svg = encodeCode128Svg("TAC26050810017")
    const pathCount = (svg.match(/<path/g) ?? []).length
    expect(pathCount).toBeGreaterThan(0)
    // bwip-js merges all bars into a single `<path>` whose `d`
    // attribute carries one `M` move per bar. For a 14-char AWB the
    // observed count is around 40 moves; we assert ≥ 30 to leave
    // headroom for bwip-js encoding-strategy tweaks while still
    // proving the path carries genuine encoded geometry rather than
    // a placeholder.
    const moveCount = (svg.match(/M\d/g) ?? []).length
    expect(moveCount).toBeGreaterThanOrEqual(30)
  })

  it("is deterministic per input", () => {
    const a = encodeCode128Svg("TAC26050810017")
    const b = encodeCode128Svg("TAC26050810017")
    expect(a).toBe(b)
  })

  it("produces different output for different inputs", () => {
    const a = encodeCode128Svg("TAC26050810017")
    const b = encodeCode128Svg("TAC26050810018")
    expect(a).not.toBe(b)
  })

  it("throws on empty input", () => {
    expect(() => encodeCode128Svg("")).toThrow(/non-empty/)
    expect(() => encodeCode128Svg("   ")).toThrow(/non-empty/)
  })
})

describe("encodeDataMatrixSvg", () => {
  it("returns a self-contained SVG string", () => {
    const svg = encodeDataMatrixSvg("TAC26050810017")
    expect(svg.startsWith("<svg")).toBe(true)
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true)
  })

  it("produces a square viewBox (Data Matrix default shape)", () => {
    const svg = encodeDataMatrixSvg("TAC26050810017")
    const match = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/)
    expect(match).not.toBeNull()
    if (match) {
      const [, w, h] = match
      expect(Number(w)).toBe(Number(h))
    }
  })

  it("is deterministic per input", () => {
    expect(encodeDataMatrixSvg("TAC26050810017")).toBe(
      encodeDataMatrixSvg("TAC26050810017"),
    )
  })

  it("throws on empty input", () => {
    expect(() => encodeDataMatrixSvg("")).toThrow(/non-empty/)
  })
})

describe("encodeShippingLabelBarcodes", () => {
  it("returns both encoded barcodes for an AWB", () => {
    const result = encodeShippingLabelBarcodes("TAC26050810017")
    expect(result.code128Svg.startsWith("<svg")).toBe(true)
    expect(result.dataMatrixSvg.startsWith("<svg")).toBe(true)
    // Sanity: the two barcodes encode the same payload differently —
    // they should not be byte-identical even when both are SVG.
    expect(result.code128Svg).not.toBe(result.dataMatrixSvg)
  })
})
