import { describe, it, expect } from "vitest"

import { opsContentVariants } from "./ops-content"

/**
 * Width-contract tests for the ops-shell content region.
 *
 * The repo verifies UI through class-composition / typed-data contracts, not
 * React render tests (there is no testing-library here — see
 * landing-data.test.ts). These lock the two-tier layout contract:
 *
 *   - Shell tier  → centers + caps EVERY route at the hardware-frame ceiling
 *                   (max-w-control / 1600px), so nothing sprawls on ultrawides.
 *   - Page tier   → PageShell narrows further per route (1536 / 1280 / form).
 */
describe("opsContentVariants — shell width contract", () => {
  it("centers the content region by default", () => {
    const cls = opsContentVariants()
    expect(cls).toContain("mx-auto")
    expect(cls).toContain("w-full")
  })

  it("caps the content region at the hardware-frame ceiling by default", () => {
    expect(opsContentVariants()).toContain("max-w-control")
  })

  it("treats bounded as the default frame", () => {
    expect(opsContentVariants({ frame: "bounded" })).toBe(opsContentVariants())
  })

  it("lets a deliberate full-bleed route escape the cap", () => {
    const cls = opsContentVariants({ frame: "full" })
    expect(cls).toContain("mx-auto")
    expect(cls).not.toContain("max-w-control")
  })
})
