import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Sentinel test: the three API routes migrated to pino in
 * apps/dashboard/lib/logger.ts MUST NOT regress to console.* calls.
 *
 * Why static analysis:
 *   Mocking three Next.js route handlers + their auth/Supabase/PDF
 *   dependencies for a behavioral test would balloon the test surface
 *   well beyond the migration's marginal complexity. Pino's logger is
 *   already battle-tested upstream; what we need to pin is the
 *   *adoption* — that a future contributor doesn't accidentally
 *   reintroduce console.log when copying a code pattern from elsewhere.
 *
 *   This test fails loudly if any console.{log,warn,error} appears in
 *   the three migrated route files. If new console.* calls are
 *   intentional (e.g., a future route legitimately needs unbuffered
 *   stdout for a CI integration), add the route to MIGRATED_ROUTES
 *   only after confirming the migration — never weaken the regex.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..")

const MIGRATED_ROUTES = [
  "apps/dashboard/app/api/diagnostics/sentry/route.ts",
  "apps/dashboard/app/api/public/invoice-pdf/route.ts",
  "apps/dashboard/app/api/whatsapp/send-invoice/route.ts",
] as const

describe("API-routes pino migration sentinel (#102)", () => {
  for (const relativePath of MIGRATED_ROUTES) {
    describe(relativePath, () => {
      const source = readFileSync(join(REPO_ROOT, relativePath), "utf8")

      it("contains no console.log / console.warn / console.error", () => {
        // Strict regex — catches `console.log(`, `console . warn(`, etc.
        // Allow `console` inside comments only if NOT followed by `.`+method.
        // Practical impl: split lines, strip line-comment text after `//`,
        // then test each line.
        const lines = source.split(/\r?\n/)
        const offenders: string[] = []
        lines.forEach((line, i) => {
          // Strip inline single-line comments (best-effort — doesn't handle
          // strings containing `//`, which is fine for our routes).
          const codeOnly = line.replace(/\/\/.*$/, "")
          if (
            /\bconsole\s*\.\s*(log|warn|error|info|debug)\s*\(/.test(codeOnly)
          ) {
            offenders.push(`  L${i + 1}: ${line.trim()}`)
          }
        })
        if (offenders.length > 0) {
          throw new Error(
            `${relativePath} regressed to console.* — found ${offenders.length} offender(s):\n` +
              offenders.join("\n") +
              `\n\nThese routes were migrated to pino in PR γ (#102 Sprint 1 ` +
              `Observability bullet). Use \`logger.{info,warn,error,debug}\` ` +
              `from "@/lib/logger" instead. See apps/dashboard/lib/logger.ts.`
          )
        }
        expect(offenders).toEqual([])
      })

      it('imports logger from "@/lib/logger"', () => {
        expect(source).toMatch(
          /import\s+\{\s*logger\s*\}\s+from\s+["']@\/lib\/logger["']/
        )
      })

      it("binds a child logger with a route field", () => {
        // Pinning the per-route binding convention. Subsequent logs in
        // the file inherit `route: <path>`, which is how the log indexer
        // groups events per endpoint.
        expect(source).toMatch(/logger\.child\(\s*\{\s*route:\s*["'][^"']+["']/)
      })
    })
  }

  it("the MIGRATED_ROUTES set matches the pino-migration commit (sentinel)", () => {
    // Hardcoded count + paths — adding/removing a route here requires
    // conscious intent. If a NEW route file gets migrated to logger.*
    // in a future PR, add it to MIGRATED_ROUTES so this test catches
    // any regression there too.
    expect(MIGRATED_ROUTES).toHaveLength(3)
  })
})
