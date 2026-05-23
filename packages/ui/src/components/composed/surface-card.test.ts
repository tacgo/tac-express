import { describe, it, expect } from "vitest"

import { surfaceCardVariants } from "./surface-card"

/**
 * Contract tests for the SurfaceCard emphasis/density system — the canonical
 * composition primitive. Class-composition assertions (repo convention; no
 * testing-library). These lock the asymmetric-weight tiers the operational
 * shell depends on.
 */
describe("surfaceCardVariants — emphasis tiers", () => {
  it("default panel uses the small brutalist offset shadow on bg-card", () => {
    const cls = surfaceCardVariants()
    expect(cls).toContain("bg-card")
    expect(cls).toContain("shadow-[var(--shadow-brutal-sm)]")
    expect(cls).toContain("border-border")
  })

  it("command surface leads with elevated bg, violet top accent, larger shadow", () => {
    const cls = surfaceCardVariants({ emphasis: "command" })
    expect(cls).toContain("bg-surface-elevated")
    expect(cls).toContain("border-t-primary")
    expect(cls).toContain("shadow-[var(--shadow-brutal)]")
  })

  it("tactical side-rail recedes on a muted surface", () => {
    expect(surfaceCardVariants({ emphasis: "tactical" })).toContain("bg-muted/30")
  })

  it("compact density tightens padding + gap", () => {
    const cls = surfaceCardVariants({ density: "compact" })
    expect(cls).toContain("p-[var(--spacing-gutter-md)]")
    expect(cls).toContain("gap-2")
  })

  it("keeps zero-radius identity (no rounded utilities)", () => {
    const cls = surfaceCardVariants({ emphasis: "command" })
    expect(cls).not.toMatch(/rounded-(sm|md|lg|xl|2xl|full)/)
  })
})
