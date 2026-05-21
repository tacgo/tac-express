import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Sentinel for the two silent-by-design observability decisions made
 * in #115 (resolution of PR #114's audit § 6 follow-ups).
 *
 * Two sites in the codebase intentionally do NOT emit to Sentry, even
 * though they're surfaces that COULD be wrapped with `withRpc` or
 * `captureRbacDenial`. The runbook § 4.1 + § 4.2 documents the full
 * rationale + revisit triggers. This test pins the source-comment
 * markers so a future contributor doesn't:
 *   - regress to the old `SENTRY-MIGRATION-DEFERRED` marker (signals
 *     "decision pending" when the decision is in fact made)
 *   - silently delete the marker comment + add Sentry emission without
 *     reading the runbook section first
 *
 * What this pins (per site):
 *   1. The source file contains the `SENTRY-SILENT-BY-DESIGN` or
 *      `RBAC-EMISSION SILENT-BY-DESIGN` marker.
 *   2. The source file does NOT contain the old `SENTRY-MIGRATION-DEFERRED`
 *      marker (would indicate the decision was regressed).
 *   3. The comment references decision #115 + the runbook section.
 *
 * If a future PR wants to ADD emission at one of these sites, that PR
 * needs to:
 *   - Update the runbook § 4.1/§ 4.2 to remove the silent-by-design entry
 *   - Update this sentinel's expected list
 *   - Update the source marker
 * The forcing function is the right kind of friction.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..", "..")

interface SilentByDesignSite {
  description: string
  filePath: string
  expectedMarker: string
  runbookSection: string
  /**
   * A stable code anchor near the silent-by-design site. The sentinel
   * extracts a ±800-char window around this anchor and runs marker /
   * reference assertions against that LOCAL context only — not the
   * whole file. This catches the spoofing case where the marker is
   * deleted from the target block and reintroduced as a stray comment
   * elsewhere in the same file (CodeRabbit finding 3250055937).
   */
  anchor: string
}

const SILENT_BY_DESIGN_SITES: SilentByDesignSite[] = [
  {
    description: "dashboard.service.ts getSLABreaches — detect_sla_breaches RPC",
    filePath: join(REPO_ROOT, "packages/services/src/dashboard.service.ts"),
    expectedMarker: "SENTRY-SILENT-BY-DESIGN",
    runbookSection: "§ 4.1",
    // Anchor on the method signature ABOVE the rationale comment so a
    // ±800-char window covers both the marker (top of the comment) and
    // the RPC call (bottom). The comment block is ~22 lines and exceeds
    // 800 chars on its own — anchoring on the RPC call alone leaves
    // the marker outside the window.
    anchor: "async getSLABreaches(",
  },
  {
    description:
      "whatsapp/send-invoice route — isAdminOrAbove compound-condition sub-gate",
    filePath: join(
      REPO_ROOT,
      "apps/dashboard/app/api/whatsapp/send-invoice/route.ts",
    ),
    expectedMarker: "RBAC-EMISSION SILENT-BY-DESIGN",
    runbookSection: "§ 4.1",
    anchor: "if (!parsed.overridePhone && !isAdmin)",
  },
]

/**
 * Extract a window of source around the given anchor. Returns "" if
 * the anchor is missing — callers should assert anchor presence first.
 */
function localContext(source: string, anchor: string, radius = 800): string {
  const idx = source.indexOf(anchor)
  if (idx < 0) return ""
  return source.slice(Math.max(0, idx - radius), idx + anchor.length + radius)
}

describe("silent-by-design observability decisions (#115)", () => {
  for (const site of SILENT_BY_DESIGN_SITES) {
    describe(site.description, () => {
      const source = readFileSync(site.filePath, "utf8")
      const context = localContext(source, site.anchor)

      it(`contains the anchor "${site.anchor}" (a stable code reference)`, () => {
        // If this fails, the anchor needs updating BEFORE trusting the
        // subsequent assertions. The subsequent assertions run against
        // the local context; if the anchor moved, the context is empty
        // and the marker assertions would falsely fail OR (if
        // expectedMarker is empty-substring) falsely pass. Fail loud here.
        expect(source).toContain(site.anchor)
      })

      it(`contains the SILENT-BY-DESIGN marker "${site.expectedMarker}" near the anchor`, () => {
        // Scope to ±800 chars around the anchor — catches the spoofing
        // case where the marker is removed from the target block and
        // reintroduced elsewhere in the same file (CodeRabbit finding).
        expect(context).toContain(site.expectedMarker)
      })

      it("does NOT contain the legacy SENTRY-MIGRATION-DEFERRED marker (file-level regression guard)", () => {
        // The old marker meant "decision pending." #115 resolved the
        // decisions; the new marker is SILENT-BY-DESIGN. File-level
        // scope here is intentional — the legacy marker should not
        // appear ANYWHERE in the file, not just near the anchor.
        expect(source).not.toContain("SENTRY-MIGRATION-DEFERRED")
      })

      it("references the decision (#115) near the anchor", () => {
        expect(context).toMatch(/#115/)
      })

      it(`references the runbook section ${site.runbookSection} near the anchor`, () => {
        expect(context).toContain(site.runbookSection)
      })
    })
  }

  it("the SILENT_BY_DESIGN_SITES set has exactly the expected size (sentinel)", () => {
    // Hardcoded count + entries. Adding/removing a silent-by-design
    // site requires conscious update of this list + the runbook section.
    expect(SILENT_BY_DESIGN_SITES).toHaveLength(2)
  })
})
