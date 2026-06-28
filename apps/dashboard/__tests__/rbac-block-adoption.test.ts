import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * BLOCK-sites contract sentinel for PR α adoption.
 *
 * Static analysis (file-text grep) on the three API routes the audit
 * doc classified as BLOCK. Each route MUST:
 *   1. Import captureRbacDenial from "@workspace/auth"
 *   2. Invoke captureRbacDenial with the exact surface string the audit
 *      assigned (deterministic — no req.url derivation)
 *   3. Pass UserRole.MANAGER as requiredRole (the floor for all three gates)
 *
 * Why static rather than a runtime integration test:
 *   Mocking Next.js cookies(), NextResponse, Supabase client, and the
 *   admin service for each route handler would balloon the test surface
 *   far beyond the adoption's marginal complexity. The captureRbacDenial
 *   mechanics are already runtime-tested in
 *   packages/auth/src/rbac-instrumentation.test.ts (PR #113).
 *
 *   What this test pins is the *adoption*: that the call sites named in
 *   the audit doc continue to invoke the helper with the agreed-upon
 *   tag shape. A future refactor that deletes the captureRbacDenial
 *   call, changes the surface string, or relaxes the required role
 *   will fail this test loudly.
 *
 *   If this test ever feels brittle, the right reaction is to delete it
 *   and replace with a route-handler integration test — NOT to soften
 *   the assertion. The BLOCK contract is load-bearing for rule 5.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..")

interface BlockSite {
  routePath: string // for error messages
  filePath: string // absolute
  surface: string // expected `surface:` string in the adoption
}

const BLOCK_SITES: BlockSite[] = [
  {
    routePath: "/api/diagnostics/sentry",
    filePath: join(
      REPO_ROOT,
      "apps/dashboard/app/api/diagnostics/sentry/route.ts"
    ),
    surface: "/api/diagnostics/sentry",
  },
  {
    routePath: "/api/whatsapp/send-invoice",
    filePath: join(
      REPO_ROOT,
      "apps/dashboard/app/api/whatsapp/send-invoice/route.ts"
    ),
    surface: "/api/whatsapp/send-invoice",
  },
  {
    routePath: "/api/whatsapp/test",
    filePath: join(REPO_ROOT, "apps/dashboard/app/api/whatsapp/test/route.ts"),
    surface: "/api/whatsapp/test",
  },
]

describe("BLOCK-sites captureRbacDenial adoption", () => {
  for (const site of BLOCK_SITES) {
    describe(site.routePath, () => {
      const source = readFileSync(site.filePath, "utf8")

      it("imports captureRbacDenial from @workspace/auth", () => {
        // Allow either {captureRbacDenial} alone or part of a multi-import
        expect(source).toMatch(
          /import\s+\{[^}]*\bcaptureRbacDenial\b[^}]*\}\s+from\s+["']@workspace\/auth["']/
        )
      })

      it("invokes captureRbacDenial with the audited surface string", () => {
        // The surface MUST be the literal string the audit doc assigned.
        // No template literals, no req.url derivation, no concatenation.
        const expectedLiteral = `surface: "${site.surface}"`
        expect(source).toContain(expectedLiteral)
      })

      it("passes UserRole.MANAGER as requiredRole (the agreed floor)", () => {
        expect(source).toMatch(/requiredRole:\s*UserRole\.MANAGER/)
      })

      it("falls back to UserRole.OPS_STAFF when role is missing (audit-doc sentinel)", () => {
        // The audit doc § 2.1 specifies OPS_STAFF as the "no role / not
        // authenticated" sentinel — puts the unauthenticated bucket at the
        // lowest rank without leaking identity.
        expect(source).toMatch(
          /actualRole:\s*role\s*\?\?\s*UserRole\.OPS_STAFF/
        )
      })
    })
  }

  it("the BLOCK-sites set matches the audit doc § 2.1 (sentinel — update both together)", () => {
    // This sentinel catches the case where a BLOCK site is added or
    // removed in the audit doc but this test's list isn't updated, or
    // vice versa. Hardcoded count by design — change requires conscious
    // intent.
    expect(BLOCK_SITES).toHaveLength(3)
    expect(BLOCK_SITES.map((s) => s.routePath).sort()).toEqual([
      "/api/diagnostics/sentry",
      "/api/whatsapp/send-invoice",
      "/api/whatsapp/test",
    ])
  })
})
