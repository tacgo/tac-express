import { describe, it, expect } from "vitest"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import {
  heroContent,
  partnerStripContent,
  whyContent,
  reachContent,
  pipelineContent,
  platformContent,
  controlTowerContent,
  capabilitiesContent,
  supportContent,
  faqContent,
} from "./landing-data"

/**
 * Data-contract tests for the landing content model. The repo verifies UI
 * surfaces through typed-data contracts + drift checks (not React render
 * tests — there is no testing-library here). These guard the shape and
 * completeness every section component relies on, so a content edit that
 * breaks an assumption fails CI rather than the page.
 */

describe("landing-data — hero", () => {
  it("has eyebrow, title, and subtitle copy", () => {
    expect(heroContent.eyebrow).toMatch(/\S/)
    expect(heroContent.title).toMatch(/\S/)
    expect(heroContent.subtitle.length).toBeGreaterThan(40)
  })

  it("exposes exactly four hero stats, each with a label and value", () => {
    expect(heroContent.stats).toHaveLength(4)
    for (const stat of heroContent.stats) {
      expect(stat.label).toMatch(/\S/)
      expect(stat.value).toMatch(/\S/)
    }
  })

  it("uses the success tone on at most one hero stat", () => {
    const toned = heroContent.stats.filter((s) => s.tone === "success")
    expect(toned.length).toBeLessThanOrEqual(1)
  })

  it("has two CTAs pointing at internal routes", () => {
    for (const cta of [heroContent.primaryCta, heroContent.secondaryCta]) {
      expect(cta.label).toMatch(/\S/)
      expect(cta.href.startsWith("/")).toBe(true)
    }
  })

  it("references a hero image asset that exists in apps/web/public", () => {
    expect(heroContent.image.alt.length).toBeGreaterThan(10)
    // landing-data lives at packages/ui/src/components/composed/landing;
    // hop up to repo root, then into the web app's public dir.
    const publicPath = resolve(
      __dirname,
      "../../../../../../apps/web/public",
      heroContent.image.src.replace(/^\//, ""),
    )
    expect(existsSync(publicPath)).toBe(true)
  })
})

describe("landing-data — sector strip", () => {
  it("has a label and at least six sectors with icon + name", () => {
    expect(partnerStripContent.label).toMatch(/\S/)
    expect(partnerStripContent.sectors.length).toBeGreaterThanOrEqual(6)
    for (const sector of partnerStripContent.sectors) {
      expect(sector.icon).toMatch(/\S/)
      expect(sector.name).toMatch(/\S/)
    }
  })
})

describe("landing-data — why trio", () => {
  it("has exactly three features with icon, title, and text", () => {
    expect(whyContent.features).toHaveLength(3)
    for (const f of whyContent.features) {
      expect(f.icon).toMatch(/\S/)
      expect(f.title).toMatch(/\S/)
      expect(f.text.length).toBeGreaterThan(20)
    }
  })
})

describe("landing-data — network reach", () => {
  it("has four numeric stats with non-negative decimals", () => {
    expect(reachContent.stats).toHaveLength(4)
    for (const s of reachContent.stats) {
      expect(typeof s.value).toBe("number")
      expect(Number.isFinite(s.value)).toBe(true)
      expect(s.decimals).toBeGreaterThanOrEqual(0)
      expect(s.label).toMatch(/\S/)
    }
  })
})

describe("landing-data — ops pipeline", () => {
  it("has four ordered steps with zero-padded step numbers", () => {
    expect(pipelineContent.steps).toHaveLength(4)
    pipelineContent.steps.forEach((step, i) => {
      expect(step.step).toBe(String(i + 1).padStart(2, "0"))
      expect(step.icon).toMatch(/\S/)
      expect(step.title).toMatch(/\S/)
      expect(step.text).toMatch(/\S/)
    })
  })
})

describe("landing-data — platform CTA", () => {
  it("has a heading, body, and an internal CTA href", () => {
    expect(platformContent.heading).toMatch(/\S/)
    expect(platformContent.text).toMatch(/\S/)
    expect(platformContent.ctaHref.startsWith("/")).toBe(true)
    expect(platformContent.ctaLabel).toMatch(/\S/)
  })
})

describe("landing-data — control tower", () => {
  it("has three features and at least three telemetry readouts", () => {
    expect(controlTowerContent.features).toHaveLength(3)
    expect(controlTowerContent.telemetry.length).toBeGreaterThanOrEqual(3)
    for (const t of controlTowerContent.telemetry) {
      expect(t.label).toMatch(/\S/)
      expect(t.value).toMatch(/\S/)
    }
  })
})

describe("landing-data — capabilities", () => {
  it("has eight non-empty checklist items (even grid)", () => {
    expect(capabilitiesContent.items).toHaveLength(8)
    expect(capabilitiesContent.items.length % 2).toBe(0)
    for (const item of capabilitiesContent.items) {
      expect(item).toMatch(/\S/)
    }
  })
})

describe("landing-data — support", () => {
  it("has three cards with icon, title, and text", () => {
    expect(supportContent.cards).toHaveLength(3)
    for (const c of supportContent.cards) {
      expect(c.icon).toMatch(/\S/)
      expect(c.title).toMatch(/\S/)
      expect(c.text.length).toBeGreaterThan(20)
    }
  })
})

describe("landing-data — FAQ", () => {
  it("has at least six question/answer pairs", () => {
    expect(faqContent.items.length).toBeGreaterThanOrEqual(6)
    for (const item of faqContent.items) {
      expect(item.question.trim().endsWith("?")).toBe(true)
      expect(item.answer.length).toBeGreaterThan(30)
    }
  })

  it("has unique questions", () => {
    const questions = faqContent.items.map((i) => i.question)
    expect(new Set(questions).size).toBe(questions.length)
  })
})
