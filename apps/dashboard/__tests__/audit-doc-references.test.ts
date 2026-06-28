import { readFileSync, existsSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Sentinel for `docs/audits/2026-05-15-rbac-denial-audit.md`.
 *
 * The audit doc is a load-bearing artifact — referenced from issues #114,
 * #115, #120, runbook § 4 / § 4.1, PR descriptions, and inline source
 * comments. Drift in the audit doc (file rename, RPC rename, route
 * rename) silently rots every consumer.
 *
 * This sentinel is the MINIMAL tier (per the discussion at issue #115
 * closure):
 *   - File-existence: every markdown relative-link target in the doc
 *     resolves to an actual file on disk.
 *   - Symbol-presence: every named RPC + route surface the audit doc
 *     references appears verbatim in the source file the audit doc
 *     says it lives in.
 *
 * NOT in this tier (deferred — full-tier would add):
 *   - Line-number verification (the audit doc's `:48`, `:90`, `:189`
 *     etc. are not asserted). Line drift is cosmetic — readers can
 *     find the right line by symbol. If line drift starts biting,
 *     build the full-tier sentinel with anchor-window verification.
 *
 * Why hardcoded RPC/route lists rather than parsing prose:
 *   The audit doc embeds RPC names + routes inside backticks in
 *   prose, code blocks, and table cells. Robust extraction would
 *   require a markdown parser + heuristics to avoid false positives
 *   (e.g. `withRpc`, `eq`, `single` look like RPC names but aren't).
 *   The hardcoded list is shorter than full prose parsing and uses
 *   the same forcing-function pattern as the silent-by-design
 *   sentinel: adding a new audit-doc reference requires updating
 *   this test, which makes the addition conscious.
 *
 * Same anchor-pattern + forcing-function discipline as:
 *   - apps/dashboard/__tests__/rbac-block-adoption.test.ts (PR #114)
 *   - apps/dashboard/__tests__/api-routes-no-console.test.ts (PR #117)
 *   - packages/services/src/__tests__/silent-by-design.test.ts (PR #120)
 */

const REPO_ROOT = join(__dirname, "..", "..", "..")
const AUDIT_DOC_PATH = join(
  REPO_ROOT,
  "docs/audits/2026-05-15-rbac-denial-audit.md"
)
const AUDIT_DOC_DIR = dirname(AUDIT_DOC_PATH)

const audit = readFileSync(AUDIT_DOC_PATH, "utf8")

// ─── 1. File-existence: parse audit doc for relative links ───────────────────

/**
 * Every relative markdown link target in the audit doc.
 *
 * Pattern matches `[label](target)` where `target` starts with `./` or
 * `../` (any depth), with optional `#fragment` and optional title
 * attribute. Captures the path portion only. Resolves against the
 * audit doc's directory (NOT repo-root) so the test stays correct if
 * the audit doc ever moves to a different depth — CodeRabbit caught
 * the prior version's repo-root assumption as a brittleness.
 *
 * Adding a new relative-link reference to the audit doc auto-includes
 * it here (no test update needed for new files). Sentinel-of-the-
 * sentinel below asserts ≥1 match so a convention switch can't
 * silently zero the coverage.
 */
const LINK_TARGETS = Array.from(
  audit.matchAll(
    /\[[^\]]+\]\(((?:\.{1,2}\/)[^)#\s]+)(?:#[^) \t]+)?(?:\s+"[^"]*")?\)/g
  ),
  (m) => m[1]!
)

// Strip optional `:line` suffixes that may appear in some doc styles
// (defensive — current convention is line numbers in prose, not in
// the link target, but cover both). Then de-dupe.
const LINK_PATHS_UNIQUE = Array.from(
  new Set(LINK_TARGETS.map((t) => t.split(":")[0]!))
)

// ─── 2. Symbol-presence: hardcoded RPC + route surface inventory ─────────────

/**
 * Every named Postgres RPC the audit doc references. For each, the
 * source file the audit doc points at MUST contain the RPC name
 * verbatim — catches RPC renames + audit-doc drift.
 *
 * If a future audit doc adds a new RPC reference: extend this list.
 * The forcing-function makes the addition conscious.
 */
const AUDIT_RPC_REFERENCES: ReadonlyArray<{ rpc: string; sourceFile: string }> =
  [
    {
      rpc: "resolve_exception",
      sourceFile: "packages/services/src/exception.service.ts",
    },
    {
      rpc: "close_manifest_atomic",
      sourceFile: "packages/services/src/manifest.service.ts",
    },
    {
      rpc: "get_rate_card",
      sourceFile: "packages/services/src/rate-card.service.ts",
    },
    {
      rpc: "generate_awb_number",
      sourceFile: "packages/services/src/shipment.service.ts",
    },
    {
      rpc: "convert_booking_to_shipment",
      sourceFile: "packages/services/src/booking.service.ts",
    },
    {
      rpc: "add_shipment_to_manifest",
      sourceFile: "packages/services/src/manifest.service.ts",
    },
    {
      rpc: "bulk_create_shipments",
      sourceFile: "packages/services/src/shipment.service.ts",
    },
    {
      rpc: "detect_sla_breaches",
      sourceFile: "packages/services/src/dashboard.service.ts",
    },
  ]

/**
 * Every BLOCK-site route surface the audit doc references. For each,
 * the source file the audit doc points at MUST contain the literal
 * route path — catches route renames + audit-doc drift.
 *
 * The audit doc's § 2.1 surface strings are the contract for
 * captureRbacDenial's `surface:` tag; PR #114's rbac-block-adoption
 * test already pins the call site → surface string mapping. This
 * sentinel adds the audit-doc → call-site mapping.
 */
const AUDIT_ROUTE_REFERENCES: ReadonlyArray<{
  surface: string
  sourceFile: string
}> = [
  {
    surface: "/api/diagnostics/sentry",
    sourceFile: "apps/dashboard/app/api/diagnostics/sentry/route.ts",
  },
  {
    surface: "/api/whatsapp/send-invoice",
    sourceFile: "apps/dashboard/app/api/whatsapp/send-invoice/route.ts",
  },
  {
    surface: "/api/whatsapp/test",
    sourceFile: "apps/dashboard/app/api/whatsapp/test/route.ts",
  },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("audit doc references (2026-05-15-rbac-denial-audit.md)", () => {
  describe("file-existence — every markdown link target resolves", () => {
    for (const target of LINK_PATHS_UNIQUE) {
      it(`${target} (resolved from audit doc dir) resolves to a file`, () => {
        // Resolve against the audit doc's own directory, NOT REPO_ROOT.
        // Catches a wider class of valid relative links (./, ../, deeper)
        // AND stays correct if the audit doc is ever moved to a different
        // depth (CodeRabbit caught the prior repo-root assumption).
        //
        // Assert .isFile() not just existsSync — existsSync returns true
        // for directories too, and the audit doc's contract is that every
        // link target is a file (a markdown link to a directory is almost
        // certainly an editorial error). statSync throws if the path is
        // missing; let it throw so the failure surfaces clearly rather
        // than being masked by an `existsSync ? statSync : skip` guard.
        const resolved = resolve(AUDIT_DOC_DIR, target)
        expect(existsSync(resolved)).toBe(true)
        expect(statSync(resolved).isFile()).toBe(true)
      })
    }

    it("extracted at least 1 link target (sentinel-of-the-sentinel)", () => {
      // If the regex misses every link (e.g. the audit doc switches to
      // an absolute-path convention), this test fails loudly — without
      // it the suite would falsely "pass" by checking zero targets.
      expect(LINK_PATHS_UNIQUE.length).toBeGreaterThan(0)
    })
  })

  describe("RPC symbol-presence — audit-doc references match source", () => {
    for (const { rpc, sourceFile } of AUDIT_RPC_REFERENCES) {
      describe(rpc, () => {
        it(`is referenced in the audit doc`, () => {
          expect(audit).toContain(rpc)
        })

        it(`appears in ${sourceFile}`, () => {
          const sourcePath = join(REPO_ROOT, sourceFile)
          expect(existsSync(sourcePath)).toBe(true)
          const source = readFileSync(sourcePath, "utf8")
          expect(source).toContain(rpc)
        })
      })
    }

    it("AUDIT_RPC_REFERENCES has the expected count (meta-sentinel)", () => {
      // Hardcoded count forces conscious update when audit doc adds /
      // removes an RPC reference. Same forcing-function pattern as
      // silent-by-design.test.ts and rbac-block-adoption.test.ts.
      expect(AUDIT_RPC_REFERENCES).toHaveLength(8)
    })
  })

  describe("route surface-presence — audit-doc BLOCK sites match source", () => {
    for (const { surface, sourceFile } of AUDIT_ROUTE_REFERENCES) {
      describe(surface, () => {
        it(`is referenced in the audit doc`, () => {
          expect(audit).toContain(surface)
        })

        it(`appears in ${sourceFile}`, () => {
          const sourcePath = join(REPO_ROOT, sourceFile)
          expect(existsSync(sourcePath)).toBe(true)
          const source = readFileSync(sourcePath, "utf8")
          expect(source).toContain(surface)
        })
      })
    }

    it("AUDIT_ROUTE_REFERENCES has the expected count (meta-sentinel)", () => {
      expect(AUDIT_ROUTE_REFERENCES).toHaveLength(3)
    })
  })

  describe("§ 6 item 3 — WONTFIX-UNLESS-TRIGGERED status (#115 closure addendum)", () => {
    it("audit doc § 6 item 3 has an explicit STATUS marker (grep-able)", () => {
      // The closure of #115 left item 3 floating without a tracker.
      // The audit doc amendment adds STATUS: WONTFIX-UNLESS-TRIGGERED
      // as a grep handle. If a future edit removes the marker, this
      // test catches the regression — the item must NOT go back to
      // an implicit-status state.
      expect(audit).toContain("WONTFIX-UNLESS-TRIGGERED")
    })

    it("the WONTFIX item names concrete trigger conditions", () => {
      // The whole point of the WONTFIX-UNLESS-TRIGGERED marker is
      // having a specific trigger — not just "revisit someday."
      // Pin the marker has the "Trigger conditions" subheading so
      // someone can't strip the triggers while keeping the status.
      expect(audit).toMatch(/Trigger conditions for re-opening/i)
    })
  })
})
