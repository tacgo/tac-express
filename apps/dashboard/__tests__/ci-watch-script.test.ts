import { readFileSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Sentinel for scripts/ci-watch-pr.mjs (closes #122).
 *
 * The script is agent-side scaffolding — its load-bearing behavior is
 * the STALE-SHA detection that exits non-zero when PR HEAD drifts mid-
 * watch. The original failure mode (PR #123 alone had 6+ stale-watch
 * events) made it visible.
 *
 * This sentinel pins:
 *   1. The script exists as a file (not just a tracked-then-deleted ref).
 *   2. It contains the stale-sha detection logic with the right shape:
 *      - reads headRefOid initially (anchors the watch)
 *      - re-reads headRefOid on every poll iteration
 *      - exits non-zero when the two diverge
 *   3. It uses the documented exit-code contract (2 = stale, the
 *      load-bearing signal the agent reads).
 *   4. The script is invokable via `node scripts/ci-watch-pr.mjs <pr>`.
 *
 * Why static analysis rather than running the script:
 *   Running the script requires `gh` auth + a live PR. The behavior
 *   we care about (stale-sha detection) is a code-shape contract; the
 *   `gh` invocation is delegation. Static analysis pins the contract;
 *   the integration-level "does it actually work against a real PR"
 *   verification happens in the next session's first multi-push PR
 *   (per #122's acceptance criterion: "One occurrence in the next 5
 *   PRs proves the fix").
 *
 * Same anchor-pattern + forcing-function discipline as:
 *   - apps/dashboard/__tests__/rbac-block-adoption.test.ts (PR #114)
 *   - apps/dashboard/__tests__/api-routes-no-console.test.ts (PR #117)
 *   - packages/services/src/__tests__/silent-by-design.test.ts (PR #120)
 *   - apps/dashboard/__tests__/audit-doc-references.test.ts (PR #121)
 */

const REPO_ROOT = join(__dirname, "..", "..", "..")
const SCRIPT_PATH = join(REPO_ROOT, "scripts/ci-watch-pr.mjs")

describe("ci-watch-pr.mjs (closes #122 — stale-sha auto-detection)", () => {
  it("the script file exists", () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true)
    expect(statSync(SCRIPT_PATH).isFile()).toBe(true)
  })

  describe("load-bearing behavior contract", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8")

    it("reads headRefOid initially to anchor the watch", () => {
      // The anchor sha is read ONCE at start, then compared on every poll.
      // The script must call out to `gh pr view --json headRefOid` (via
      // the centralised ghJson helper in the script) at least once.
      expect(source).toContain("headRefOid")
      // Pin the anchor variable's existence so a future refactor that
      // renames it to e.g. `START_SHA` doesn't silently break the
      // "compare initial vs current" semantic.
      expect(source).toMatch(/ANCHOR_SHA|INITIAL_SHA|startSha|anchorSha/)
    })

    it("re-fetches PR state on every poll iteration (not cached)", () => {
      // The polling loop must call fetchPrState (or equivalent) inside
      // the `while` body. A cache that re-uses the initial fetch would
      // never detect HEAD drift.
      expect(source).toMatch(/while.*Date\.now\(\)\s*<\s*deadline/)
      expect(source).toContain("fetchPrState()")
    })

    it("compares current headRefOid against anchor on every poll", () => {
      // The actual stale-sha check. The shape is:
      //   if (state.headRefOid !== ANCHOR_SHA) { exit non-zero }
      // Pin both halves: the comparison and the non-zero exit.
      expect(source).toMatch(/state\.headRefOid\s*!==?\s*ANCHOR_SHA/)
    })

    it("exits with code 2 on stale-sha detection (the documented contract)", () => {
      // Exit-code 2 is the documented "stale, re-issue" signal. Agents
      // read the exit code; if it changes to 1 or 0 here, agent prompts
      // would mis-interpret a stale watch as a success/usage error.
      expect(source).toMatch(/process\.exit\(2\)/)
    })

    it("emits a clear human-readable message on stale detection", () => {
      // The error message must include both before/after sha fragments
      // so the agent's chat output is self-explanatory.
      expect(source).toContain("STALE")
      // Must tell the agent what to do next, not just signal failure.
      expect(source).toMatch(/Re-issue|restart|re-run/i)
    })
  })

  describe("CLI contract", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8")

    it("requires a PR number as the first argument", () => {
      expect(source).toMatch(/process\.argv\[2\]/)
      // Validates the arg is numeric to prevent passing flags / typos.
      expect(source).toMatch(/\/\^\\d\+\$\//)
    })

    it("exits with code 1 on invalid usage", () => {
      expect(source).toMatch(/process\.exit\(1\)/)
    })

    it("documents all exit codes in the file header", () => {
      // The exit-code contract IS the API — pin it in comments so a
      // future refactor that removes a code surfaces the docstring
      // requirement to the contributor.
      expect(source).toContain("Exit codes:")
      // Five documented codes: 0 success, 1 usage, 2 stale, 3 gh-failure, 4 timeout.
      for (const code of ["0", "1", "2", "3", "4"]) {
        expect(source).toMatch(new RegExp(`${code}\\s+—`, "m"))
      }
    })
  })

  describe("cross-platform contract", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8")

    it("uses node:child_process spawnSync — pure node, no shell", () => {
      // The whole point of this being .mjs (not .sh) is Windows
      // compatibility. spawnSync with explicit args (not shell:true)
      // sidesteps shell-quoting differences across platforms.
      expect(source).toContain("node:child_process")
      expect(source).toContain("spawnSync")
      // No bash-isms inadvertently slipping in.
      expect(source).not.toMatch(/shell:\s*true/)
    })
  })

  describe("env-var parsing safety (Macroscope finding 3251426873)", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8")

    it("guards env-var Number() conversions against NaN / negative / zero", () => {
      // Macroscope caught: Number("invalid") → NaN → Date.now() < NaN
      // is false → loop never runs → misleading "timed out" error.
      // The fix is a parsePositiveIntEnv helper that validates Number.isFinite
      // AND value > 0, falling back to the safe default on invalid input.
      // Pinning the guard's existence prevents a future refactor from
      // inlining `Number(process.env.X ?? DEFAULT)` and reintroducing the
      // NaN-propagation bug.
      expect(source).toMatch(/parsePositiveIntEnv|Number\.isFinite/)
      // No bare Number(process.env.X) without a guard at the assignment sites.
      // Allow Number(process.env.X) inside the helper itself (it does the validation).
      const bareNumberEnv =
        source.match(/Number\(process\.env\.[A-Z_]+\s*\?\?/g) ?? []
      expect(bareNumberEnv).toHaveLength(0)
    })
  })
})
