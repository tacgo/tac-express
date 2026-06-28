import { readdirSync, readFileSync, existsSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Sentinel for `docs/backlog/production-readiness.md`.
 *
 * The FIFTH sentinel in the family lineage:
 *   1. apps/dashboard/__tests__/rbac-block-adoption.test.ts        (PR #114)
 *   2. apps/dashboard/__tests__/api-routes-no-console.test.ts      (PR #117)
 *   3. packages/services/src/__tests__/silent-by-design.test.ts    (PR #120)
 *   4. apps/dashboard/__tests__/audit-doc-references.test.ts       (PR #121)
 *   5. apps/dashboard/__tests__/backlog-refs-drift.test.ts         (this PR, #136)
 *
 * Direct structural template: audit-doc-references.test.ts. The pattern there is
 * "the doc names code artifacts; for each, verify the artifact exists in current
 * main." This sentinel extends that pattern from a single audit doc to the
 * authoritative production-readiness backlog file.
 *
 * Decision doc: docs/decisions/2026-05-17-backlog-drift-sentinel.md.
 * Catalog preempted: entries #5 (no hardcoded line numbers — anywhere),
 *                    #8 (generalize beyond current data shape — the parser
 *                    dispatches via KIND_HANDLERS), #11 (statSync isFile —
 *                    every file ref).
 *
 * SCOPE BOUNDARY (load-bearing — see decision doc § D):
 * This sentinel verifies REFERENCE EXISTENCE only.
 *   ✓ Every `file:` ref resolves to a real file (statSync.isFile()).
 *   ✓ Every `symbol: <file>::<name>` — file exists AND contains <name>.
 *   ✓ Every `table: <name>` — some non-archived migration mentions it.
 *   ✓ Every `rpc: <name>` — some packages/ or supabase/ file mentions <name>(.
 *
 *   ✗ Does NOT verify items marked DONE are actually merged.
 *   ✗ Does NOT verify a symbol is exported (only that it appears in the file).
 *   ✗ Does NOT parse prose for additional references.
 *   ✗ Does NOT assert types, signatures, table columns, or RPC arguments.
 *
 * The boundary IS the maintainability contract. Extending it requires per-item
 * semantic rules; that path leads to an un-maintainable sentinel.
 *
 * FORMAT (per decision § C):
 * Items in the backlog look like
 *
 *   ## <ID> — <Title>
 *   **Risk:** rank #<N>
 *   **Status:** OPEN | DONE | WONTFIX | RENOUNCED
 *   ...prose...
 *   ```refs
 *   file: <path>
 *   symbol: <path>::<name>
 *   table: <name>
 *   rpc: <name>
 *   ```
 *
 * Items without code artifacts use the explicit opt-out marker:
 *   `refs: none — not-sentinel-checked (<reason>)`
 *
 * That literal-backtick line is what tells the sentinel "intentionally skipped"
 * vs "forgot the refs block" (which would silently pass without the opt-out).
 */

const REPO_ROOT = join(__dirname, "..", "..", "..")
const BACKLOG_PATH = join(REPO_ROOT, "docs/backlog/production-readiness.md")

// ─── Format pre-checks ───────────────────────────────────────────────────────

describe("backlog file format pre-checks", () => {
  it("the backlog file exists", () => {
    expect(existsSync(BACKLOG_PATH)).toBe(true)
    expect(statSync(BACKLOG_PATH).isFile()).toBe(true)
  })
})

const backlog = readFileSync(BACKLOG_PATH, "utf8")
const backlogLines = backlog.split(/\r?\n/)

// ─── Parser ──────────────────────────────────────────────────────────────────
//
// The parser is intentionally small + regex-based — no js-yaml dep. Each item
// is delimited by `## <ID> — <Title>` headings. Inside an item we look for
// either a fenced `refs` block (```refs ... ```) or an inline opt-out line
// matching `refs: none — not-sentinel-checked (reason)`.
//
// Per catalog #8 (generalize beyond current data shape), the parser does NOT
// hardcode the set of valid `kind:` values in the parser itself — it accepts
// any `<word>: <value>` line and the dispatcher (KIND_HANDLERS below) decides
// how to verify each kind. Adding a new kind = one entry in KIND_HANDLERS.

interface RefLine {
  /** 1-indexed line number in the backlog file — for failure messages */
  lineNumber: number
  raw: string
  kind: string
  value: string
}

interface BacklogItem {
  /** The item ID extracted from `## <ID> — <Title>`, e.g. "W1", "O2". */
  id: string
  /** The full heading title (right side of the em-dash). */
  title: string
  /** Heading line number in the backlog file. */
  headingLine: number
  /** Status from the `**Status:**` line, if any. */
  status?: string
  /** Risk rank from the `**Risk:**` line, if any. */
  risk?: string
  /**
   * The refs in this item, or `null` if the item carries the explicit
   * `refs: none — not-sentinel-checked (...)` opt-out marker. An item with
   * NEITHER a fenced refs block NOR the opt-out marker is malformed and the
   * sentinel fails on the format pre-check.
   */
  refs: RefLine[] | null
  /** True if the explicit opt-out marker was found. */
  optOut: boolean
}

// Item headings are level-3 (`### W1 — Title`); level-2 `##` is for SECTION
// dividers in the backlog file and intentionally NOT parsed as items.
const HEADING_RE = /^###\s+([A-Za-z]\w*)\s+—\s+(.+?)\s*$/
const STATUS_RE = /^\*\*Status:\*\*\s+(.+?)\s*$/
const RISK_RE = /^\*\*Risk:\*\*\s+(.+?)\s*$/
const REFS_FENCE_OPEN_RE = /^```refs\s*$/
const REFS_FENCE_CLOSE_RE = /^```\s*$/
const REF_LINE_RE = /^([a-z][a-z_]*):\s+(\S.*?)\s*$/
const OPT_OUT_RE = /^`refs:\s+none\s+—\s+not-sentinel-checked\s+\(([^)]+)\)`/

/**
 * Parse the backlog file into a list of items. Throws (via expect.fail) on a
 * malformed `refs` block — we want format problems to surface as a clear
 * format-pre-check failure, not as a downstream existence failure with a
 * confusing message.
 */
function parseBacklog(): BacklogItem[] {
  const items: BacklogItem[] = []
  let current: BacklogItem | null = null
  let inRefsFence = false
  const malformations: string[] = []

  for (let i = 0; i < backlogLines.length; i++) {
    const line = backlogLines[i]!
    const lineNumber = i + 1

    // Heading — start a new item
    const headingMatch = HEADING_RE.exec(line)
    if (headingMatch && !inRefsFence) {
      if (current) items.push(current)
      current = {
        id: headingMatch[1]!,
        title: headingMatch[2]!,
        headingLine: lineNumber,
        refs: null,
        optOut: false,
      }
      continue
    }

    if (!current) continue

    // Refs fence open
    if (REFS_FENCE_OPEN_RE.test(line)) {
      if (inRefsFence) {
        malformations.push(
          `line ${lineNumber}: nested \`\`\`refs fence opener inside an unclosed fence`
        )
      }
      inRefsFence = true
      current.refs = []
      continue
    }

    // Refs fence close
    if (inRefsFence && REFS_FENCE_CLOSE_RE.test(line)) {
      inRefsFence = false
      continue
    }

    // Line INSIDE refs fence — must match REF_LINE_RE or be blank
    if (inRefsFence) {
      if (line.trim() === "") continue
      const refMatch = REF_LINE_RE.exec(line)
      if (!refMatch) {
        malformations.push(
          `line ${lineNumber}: malformed refs line "${line}" — ` +
            `expected "<kind>: <value>"`
        )
        continue
      }
      current.refs ??= []
      current.refs.push({
        lineNumber,
        raw: line,
        kind: refMatch[1]!,
        value: refMatch[2]!,
      })
      continue
    }

    // Status / Risk lines
    const statusMatch = STATUS_RE.exec(line)
    if (statusMatch) {
      current.status = statusMatch[1]!
      continue
    }
    const riskMatch = RISK_RE.exec(line)
    if (riskMatch) {
      current.risk = riskMatch[1]!
      continue
    }

    // Opt-out marker
    if (OPT_OUT_RE.test(line)) {
      current.optOut = true
      continue
    }
  }

  if (current) items.push(current)

  if (inRefsFence) {
    malformations.push("unclosed ```refs fence at end of file")
  }

  if (malformations.length > 0) {
    expect.fail(
      "backlog file format invalid:\n  - " + malformations.join("\n  - ")
    )
  }

  return items
}

const ITEMS = parseBacklog()

// ─── Sentinel-of-the-sentinel ────────────────────────────────────────────────

describe("backlog file structural invariants", () => {
  it("the parser found at least one item (sentinel-of-the-sentinel)", () => {
    // If a future format change makes the parser miss everything, this fails
    // loudly — without it, the suite would falsely "pass" by checking zero
    // items. Same shape as audit-doc-references.test.ts's LINK_PATHS_UNIQUE
    // length guard.
    expect(ITEMS.length).toBeGreaterThan(0)
  })

  it("at least one item carries a non-empty refs block (dogfood guard)", () => {
    // The whole point of this sentinel is to verify refs against current main.
    // If every item is opt-out, the sentinel has nothing to do — that would
    // mean the backlog file has been stripped of all code references, which
    // defeats the forcing function. The whatsapp_sends item (W1) is the
    // permanent dogfood case until it's rotated out post-Sprint.
    const itemsWithRefs = ITEMS.filter(
      (item) => item.refs !== null && item.refs.length > 0
    )
    expect(itemsWithRefs.length).toBeGreaterThan(0)
  })

  it("every item is either opt-out OR has a refs block (no silent skips)", () => {
    // An item with NEITHER refs nor the opt-out marker is the bug shape — a
    // contributor adds a backlog item and forgets the refs decision. The
    // sentinel must catch that, not silently let it through.
    const silentSkips = ITEMS.filter(
      (item) => !item.optOut && (item.refs === null || item.refs.length === 0)
    )
    if (silentSkips.length > 0) {
      const lines = silentSkips
        .map(
          (item) =>
            `  - "${item.id} — ${item.title}" (heading line ${item.headingLine}): ` +
            `no refs block AND no \`refs: none — not-sentinel-checked (...)\` ` +
            `opt-out. Add one or the other.`
        )
        .join("\n")
      expect.fail("Backlog items without refs decision:\n" + lines)
    }
  })
})

// ─── Existence assertions ────────────────────────────────────────────────────
//
// One describe-per-item so per-item failures are easy to scan. Per-kind
// dispatcher so adding a new kind (e.g., "url:" for live monitoring dashboards
// in D3 — though that's its own out-of-scope discussion) = one entry below.

interface KindHandler {
  /**
   * Verify the ref. Throw an `Error` whose message names the missing artifact
   * + a remediation suggestion. The caller wraps + tags with the item context.
   */
  verify(value: string): void
  /** Short, human-readable name for failure messages. */
  label: string
}

// Migrations live here; the verification asserts the table name appears in
// at least one non-archived migration file.
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase/migrations")
const PACKAGES_DIR = join(REPO_ROOT, "packages")
const SUPABASE_DIR = join(REPO_ROOT, "supabase")

/**
 * Recursively walk a directory, returning all file paths matching the test.
 * Skips node_modules, .next, dist, .git, _archive (per migration convention).
 */
function walk(dir: string, test: (file: string) => boolean): string[] {
  const out: string[] = []
  const stack = [dir]
  while (stack.length > 0) {
    const current = stack.pop()!
    let entries: import("node:fs").Dirent[]
    try {
      entries = readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        if (
          entry.name === "node_modules" ||
          entry.name === ".next" ||
          entry.name === "dist" ||
          entry.name === ".git" ||
          entry.name === "_archive"
        )
          continue
        stack.push(full)
        continue
      }
      if (test(full)) out.push(full)
    }
  }
  return out
}

const KIND_HANDLERS: Record<string, KindHandler> = {
  file: {
    label: "file",
    verify(value) {
      const path = resolve(REPO_ROOT, value)
      if (!existsSync(path)) {
        throw new Error(
          `file does not exist: ${value}\n` +
            `  fix: either create the file, update the ref to point at the actual ` +
            `artifact, or mark the item with \`refs: none — not-sentinel-checked ` +
            `(<reason>)\` if the work is not yet started.`
        )
      }
      // Catalog #11: .isFile() not just existsSync — existsSync passes on dirs.
      if (!statSync(path).isFile()) {
        throw new Error(
          `path exists but is not a file: ${value}\n` +
            `  fix: ref must point at a file, not a directory.`
        )
      }
    },
  },

  symbol: {
    label: "symbol",
    verify(value) {
      // Format: <file>::<symbol-name>
      const sep = value.indexOf("::")
      if (sep < 0) {
        throw new Error(
          `symbol ref must be in the form "<file>::<name>", got "${value}"`
        )
      }
      const filePart = value.slice(0, sep)
      const symbolPart = value.slice(sep + 2)
      const path = resolve(REPO_ROOT, filePart)
      if (!existsSync(path) || !statSync(path).isFile()) {
        throw new Error(
          `symbol ref's file does not exist: ${filePart}\n` +
            `  fix: update the file portion of the ref.`
        )
      }
      const source = readFileSync(path, "utf8")
      if (!source.includes(symbolPart)) {
        throw new Error(
          `symbol "${symbolPart}" not found in ${filePart}\n` +
            `  fix: either restore the symbol, update the ref to the new symbol ` +
            `name, or remove the ref if the symbol was intentionally retired.`
        )
      }
    },
  },

  table: {
    label: "table",
    verify(value) {
      // The table name must appear in at least one non-archived migration —
      // either in a `create table ... <name>` clause or a `comment on table
      // public.<name>` clause. We accept both because a table can be created
      // in one migration and re-commented in another; both are valid refs.
      const migrationFiles = walk(MIGRATIONS_DIR, (f) => f.endsWith(".sql"))
      const createRe = new RegExp(
        `create\\s+table\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?${escapeRegex(value)}\\b`,
        "i"
      )
      const commentRe = new RegExp(
        `comment\\s+on\\s+table\\s+public\\.${escapeRegex(value)}\\b`,
        "i"
      )
      const hit = migrationFiles.some((f) => {
        const text = readFileSync(f, "utf8")
        return createRe.test(text) || commentRe.test(text)
      })
      if (!hit) {
        throw new Error(
          `table "${value}" not found in any non-archived migration under ` +
            `supabase/migrations/\n` +
            `  fix: either land the migration that creates the table, update the ` +
            `ref to the correct table name, or remove the ref if the table was ` +
            `intentionally dropped.`
        )
      }
    },
  },

  rpc: {
    label: "rpc",
    verify(value) {
      // The RPC must appear as <name>( somewhere under packages/ or supabase/.
      // Function-call or function-definition shape both match.
      const callRe = new RegExp(`\\b${escapeRegex(value)}\\(`)
      const candidates = [
        ...walk(PACKAGES_DIR, (f) => f.endsWith(".ts") || f.endsWith(".tsx")),
        ...walk(SUPABASE_DIR, (f) => f.endsWith(".sql") || f.endsWith(".ts")),
      ]
      const hit = candidates.some((f) => callRe.test(readFileSync(f, "utf8")))
      if (!hit) {
        throw new Error(
          `rpc "${value}" not found as a call or definition under packages/ or ` +
            `supabase/\n` +
            `  fix: either land the RPC migration + a JS-side caller, update the ` +
            `ref to the correct RPC name, or remove the ref if the RPC was ` +
            `intentionally retired.`
        )
      }
    },
  },
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

describe("backlog reference existence (per item × per ref)", () => {
  for (const item of ITEMS) {
    if (item.optOut || item.refs === null || item.refs.length === 0) continue
    describe(`${item.id} — ${item.title}`, () => {
      for (const ref of item.refs!) {
        const handler = KIND_HANDLERS[ref.kind]
        it(`${ref.kind}: ${ref.value} (backlog line ${ref.lineNumber})`, () => {
          if (!handler) {
            expect.fail(
              `unknown ref kind "${ref.kind}" at backlog line ${ref.lineNumber}\n` +
                `  known kinds: ${Object.keys(KIND_HANDLERS).join(", ")}\n` +
                `  fix: add a handler to KIND_HANDLERS in ` +
                `apps/dashboard/__tests__/backlog-refs-drift.test.ts, OR fix the ` +
                `kind name in the backlog file.`
            )
          }
          try {
            handler.verify(ref.value)
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            expect.fail(
              `[backlog-refs-drift]\n` +
                `  item:  ## ${item.id} — ${item.title}\n` +
                `  ref:   ${ref.kind}: ${ref.value}\n` +
                `  error: ${message.split("\n")[0]}\n${message
                  .split("\n")
                  .slice(1)
                  .join("\n")}`
            )
          }
        })
      }
    })
  }
})
