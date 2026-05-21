import { readdirSync, readFileSync, statSync, type Dirent } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Sentinel — no UPDATE / DELETE statements against the audit_logs
 * table may appear anywhere in the application or services source
 * tree.
 *
 * Why this matters
 * ----------------
 * The audit_logs table's tamper-evidence property rests on two layers:
 *
 *   1. RLS — NO UPDATE policy, NO DELETE policy. Authenticated users
 *      cannot modify or remove rows. Verified by the migration's own
 *      do$$ verification block + the migrations-fresh-apply CI gate.
 *
 *   2. Application code — even with the service_role JWT (which
 *      bypasses RLS by design in Supabase), our code must never
 *      issue an UPDATE or DELETE against audit_logs. This is a code
 *      contract that RLS cannot enforce for service_role traffic.
 *
 * This sentinel is the (2) enforcer. It scans every .ts / .tsx /
 * .js / .mjs file under:
 *   - packages/ (excluding this test file itself + the registry+
 *     wrapper files, which legitimately mention audit_logs in
 *     comments / type imports)
 *   - apps/
 *   - supabase/functions/
 * for any reference to a destructive PostgREST chain against
 * audit_logs (.from("audit_logs").update(...) / .delete()) and
 * fails CI if found.
 *
 * False-positive avoidance
 * ------------------------
 *   - String matches inside comments are allowed.
 *   - Matches inside test files (.test.ts / .spec.ts) are allowed —
 *     tests legitimately need to assert against destructive insert
 *     payloads, and any test-only attempt to mutate audit_logs would
 *     hit a mock builder, not real Postgres.
 *   - The exclusion list is named explicitly below; growing it
 *     requires an intentional edit (forcing function per
 *     docs/patterns/coderabbit-catalog.md § 7.2).
 */

const ROOTS_TO_SCAN: string[] = [
  resolve(__dirname, "..", "..", "..", "..", "packages"),
  resolve(__dirname, "..", "..", "..", "..", "apps"),
  resolve(__dirname, "..", "..", "..", "..", "supabase", "functions"),
]

const FILE_EXTS = [".ts", ".tsx", ".js", ".mjs"]
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".next",
  "dist",
  "build",
  ".turbo",
  "out",
  ".vercel",
  "_archive",
])

function* walk(dir: string): Generator<string> {
  let entries: Dirent[]
  try {
    // The `encoding: "utf8"` literal narrows the overload to the
    // string-named Dirent variant (avoids the Dirent<NonSharedBuffer>
    // branch that the default overload picks under strict typings).
    entries = readdirSync(dir, { withFileTypes: true, encoding: "utf8" }) as Dirent[]
  } catch {
    return
  }
  for (const e of entries) {
    if (EXCLUDE_DIRS.has(e.name)) continue
    const full = resolve(dir, e.name)
    if (e.isDirectory()) {
      yield* walk(full)
    } else if (e.isFile() && FILE_EXTS.some((ext) => e.name.endsWith(ext))) {
      yield full
    }
  }
}

function isTestFile(path: string): boolean {
  return /\.(test|spec)\.[tj]sx?$/.test(path)
}

// Strip line and block comments to avoid false positives in commentary.
// A naive strip is enough — none of the patterns we look for span
// comment-character boundaries in their valid forms.
function stripComments(source: string): string {
  return source
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
}

/**
 * Match a destructive PostgREST chain against audit_logs:
 *   db.from("audit_logs").update(...)
 *   db.from("audit_logs").delete(...)
 *   <client>.from('audit_logs').update(...)
 *   ...with arbitrary whitespace / newlines / extra method links
 *     between .from("audit_logs") and the .update / .delete.
 *
 * We deliberately match the audit_logs literal + the destructive
 * method in a SINGLE pattern with a non-greedy inter-character range,
 * so methods chained between .from() and .update() / .delete()
 * (.eq(), .in(), .order(), .single(), etc.) are tolerated.
 */
const DESTRUCTIVE_RE = /\.from\(\s*["']audit_logs["']\s*\)[\s\S]{0,400}?\.(update|delete)\s*\(/

describe("audit_logs / no UPDATE or DELETE in application code", () => {
  it("does not appear anywhere under packages/, apps/, supabase/functions/", () => {
    const hits: Array<{ file: string; method: string; snippet: string }> = []
    for (const root of ROOTS_TO_SCAN) {
      let exists = false
      try {
        exists = statSync(root).isDirectory()
      } catch {
        // Root missing (e.g., supabase/functions doesn't exist in some
        // checkouts) — silently skip.
      }
      if (!exists) continue

      for (const file of walk(root)) {
        if (isTestFile(file)) continue
        const raw = readFileSync(file, "utf-8")
        const stripped = stripComments(raw)
        const m = DESTRUCTIVE_RE.exec(stripped)
        if (m) {
          const snippetStart = Math.max(0, m.index - 40)
          const snippetEnd = Math.min(stripped.length, m.index + 120)
          hits.push({
            file: file.replace(/\\/g, "/"),
            method: m[1] ?? "(unknown)",
            snippet: stripped.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim(),
          })
        }
      }
    }

    if (hits.length > 0) {
      const formatted = hits
        .map(
          (h) =>
            `  - ${h.file} :: .${h.method}()\n    snippet: ${h.snippet}`,
        )
        .join("\n")
      throw new Error(
        `audit_logs tamper-evidence violation: application code attempts to UPDATE or DELETE rows.\n` +
          `audit_logs is append-only by design (no RLS UPDATE / DELETE policies + this sentinel).\n` +
          `Even with service_role (which bypasses RLS), application code must not mutate audit rows.\n` +
          `If a row genuinely needs correction, file an incident and use an admin DB session out of band.\n\n` +
          `Found ${hits.length} site(s):\n${formatted}`,
      )
    }

    expect(hits).toHaveLength(0)
  })

  it("the scan actually traversed something (smoke check — guards against silent root-resolution bugs)", () => {
    let totalFiles = 0
    for (const root of ROOTS_TO_SCAN) {
      try {
        if (!statSync(root).isDirectory()) continue
      } catch {
        continue
      }
      for (const _ of walk(root)) totalFiles++
    }
    // If we accidentally point the scan at an empty directory, every
    // sentinel pass becomes vacuously true. This smoke-check fails
    // loud if the traversal degenerates.
    expect(totalFiles).toBeGreaterThan(100)
  })
})
