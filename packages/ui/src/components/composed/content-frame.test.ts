import { describe, it, expect } from "vitest"

import { contentFrameVariants } from "./content-frame"

/**
 * Contract tests for ContentFrame — the canonical bounded-composition wrapper.
 * Class-composition assertions (repo convention; no testing-library). These
 * lock the bounded-width scale so no surface can silently stretch edge-to-edge.
 */
describe("contentFrameVariants — bounded composition scale", () => {
  it("always centers (mx-auto w-full)", () => {
    const cls = contentFrameVariants()
    expect(cls).toContain("mx-auto")
    expect(cls).toContain("w-full")
  })

  it("defaults to the 1280px primary content measure", () => {
    expect(contentFrameVariants()).toContain("max-w-frame-content")
  })

  it("maps each size to its bounded token", () => {
    expect(contentFrameVariants({ size: "shell" })).toContain("max-w-frame-shell")
    expect(contentFrameVariants({ size: "content" })).toContain("max-w-frame-content")
    expect(contentFrameVariants({ size: "table" })).toContain("max-w-frame-table")
    expect(contentFrameVariants({ size: "workflow" })).toContain(
      "max-w-frame-workflow"
    )
  })

  it("full is the only unbounded escape (no max-w)", () => {
    expect(contentFrameVariants({ size: "full" })).not.toMatch(/max-w-/)
  })
})
