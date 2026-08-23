import { describe, it, expect } from "vitest"

import { statCardVariants } from "./stat-card"

/**
 * Contract tests for the StatCard variant system. Class-composition
 * assertions (repo convention; no testing-library). These lock the KPI
 * surface hierarchy + the zero-radius identity.
 *
 * The zero-radius assertion is load-bearing after the "round controls only"
 * LAW-13 carve-out (2026-05-24): controls may use --radius-control, but a
 * StatCard is a STRUCTURAL surface and must stay sharp. This test fails loudly
 * if anyone applies a rounded utility (named or the control token) to the card.
 */
describe("statCardVariants — KPI surface tiers", () => {
  it("default tier: card padding + small brutalist shadow on bg-card", () => {
    const cls = statCardVariants()
    expect(cls).toContain("bg-card")
    expect(cls).toContain("p-[var(--spacing-card-pad)]")
    expect(cls).toContain("shadow-[var(--shadow-brutal-sm)]")
    expect(cls).toContain("border-border")
  })

  it("default tier breathes at gap-4 (16px internal rhythm)", () => {
    expect(statCardVariants()).toContain("gap-4")
  })

  it("compact tier tightens to gap-3 for dense KPI strips", () => {
    expect(statCardVariants({ variant: "compact" })).toContain("gap-3")
  })

  it("hero tier leads with larger padding + the full brutalist shadow", () => {
    const cls = statCardVariants({ variant: "hero" })
    expect(cls).toContain("p-[var(--spacing-card-pad-lg)]")
    expect(cls).toContain("shadow-[var(--shadow-brutal)]")
  })

  it("interactive adds keyboard focus ring + hover lift", () => {
    const cls = statCardVariants({ interactive: true })
    expect(cls).toContain("focus-visible:tac-focus-premium")
    expect(cls).toContain("cursor-pointer")
  })

  it("stays a SHARP structural surface — no rounded utilities, no control radius", () => {
    for (const variant of ["default", "compact", "hero"] as const) {
      const cls = statCardVariants({ variant })
      expect(cls).not.toMatch(/\brounded(?:-(?:sm|md|lg|xl|2xl|3xl|full))?\b/)
      expect(cls).not.toContain("--radius-control")
    }
  })
})
