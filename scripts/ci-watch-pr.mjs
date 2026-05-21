#!/usr/bin/env node
// Watch a PR's CI checks with stale-sha auto-detection — closes #122.
//
// Why this exists:
//   Agent sessions repeatedly wrote inline `until [ ...mergeStateStatus... ]`
//   bash loops to wait for CI. The loops would exit on commit A's CLEAN
//   state milliseconds before a fix-push promoted HEAD to commit B —
//   reporting "CLEAN" to chat while commit B's gates hadn't even started.
//
//   Six+ stale-watch events in PR #123 alone made the cost real. This
//   helper anchors on the PR's `headRefOid` at start AND re-checks it on
//   every poll. If HEAD drifts, the watch EXITS with a non-zero code and
//   a clear message — the agent restarts the watch explicitly rather
//   than silently reporting stale state.
//
//   The chosen approach is (b) from the issue's proposed fix: "fail
//   loudly when watched sha drifts from HEAD, force agent to restart
//   watch explicitly." (a) — auto-re-anchor and keep polling — adds
//   complexity around comparing run history across commits; (b) is a
//   smaller, more honest signal.
//
// Usage:
//   node scripts/ci-watch-pr.mjs <pr-number>
//
// Exit codes:
//   0  — watch settled cleanly (CLEAN or BLOCKED), state JSON on stdout
//   1  — invalid usage (missing PR number, etc.)
//   2  — HEAD drifted mid-watch (the #122 failure mode). Stderr contains
//        the before/after sha pair. The agent should re-issue the watch
//        on the new sha by running this script again.
//   3  — `gh` invocation failed (network, auth, etc.)
//   4  — watch timed out (default 15 min; configurable via WATCH_TIMEOUT_MS)
//
// Output (on success):
//   JSON to stdout: { state, mergeable, head, checks: [...] }
//
// Cross-platform: pure node (no bash). Runs on Windows / macOS / Linux.

import { spawnSync } from "node:child_process"

const PR_NUMBER = process.argv[2]
if (!PR_NUMBER || !/^\d+$/.test(PR_NUMBER)) {
  console.error(
    "Usage: node scripts/ci-watch-pr.mjs <pr-number>\n" +
      "Example: node scripts/ci-watch-pr.mjs 123",
  )
  process.exit(1)
}

/**
 * Parse a positive-integer env var with a safe fallback. Guards against:
 *   - non-numeric strings (Number("invalid") → NaN → loop never runs)
 *   - negative values (would make deadline = past → instant fall-through)
 *   - zero (would make sleep() return immediately → tight loop)
 * Macroscope finding 3251426873 caught the NaN-propagation case for
 * TIMEOUT_MS; applied symmetrically to POLL_INTERVAL_MS so the same
 * bug shape doesn't recur if a future contributor sets either env var.
 */
function parsePositiveIntEnv(envValue, fallback) {
  if (envValue == null) return fallback
  const parsed = Number(envValue)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

const POLL_INTERVAL_MS = parsePositiveIntEnv(process.env.WATCH_POLL_INTERVAL_MS, 30_000)
const TIMEOUT_MS = parsePositiveIntEnv(process.env.WATCH_TIMEOUT_MS, 15 * 60 * 1000)

/**
 * Synchronous `gh` invocation. Returns parsed JSON on success, throws
 * with stderr on failure. The agent's shell may not have `gh` aliased
 * the same way every time, so the wrapper centralises the invocation.
 */
function ghJson(args) {
  const result = spawnSync("gh", args, { encoding: "utf8" })
  if (result.error) {
    throw new Error(`gh invocation failed: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`gh exited ${result.status}: ${result.stderr.trim()}`)
  }
  try {
    return JSON.parse(result.stdout)
  } catch (e) {
    throw new Error(`gh stdout was not JSON: ${e.message}\nstdout=${result.stdout.slice(0, 200)}`)
  }
}

function fetchPrState() {
  return ghJson([
    "pr",
    "view",
    PR_NUMBER,
    "--json",
    "headRefOid,mergeStateStatus,mergeable,statusCheckRollup",
  ])
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  let initial
  try {
    initial = fetchPrState()
  } catch (e) {
    console.error(`✗ Initial fetch failed: ${e.message}`)
    process.exit(3)
  }

  const ANCHOR_SHA = initial.headRefOid
  if (!ANCHOR_SHA) {
    console.error("✗ Initial state missing headRefOid — is the PR number correct?")
    process.exit(3)
  }
  console.error(`→ Watching PR #${PR_NUMBER} at ${ANCHOR_SHA.slice(0, 7)} …`)

  const deadline = Date.now() + TIMEOUT_MS
  while (Date.now() < deadline) {
    let state
    try {
      state = fetchPrState()
    } catch (e) {
      console.error(`✗ Poll failed (will retry): ${e.message}`)
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    // ─── STALE-SHA DETECTION (the #122 fix) ─────────────────────────
    // If the PR's HEAD has moved since the watch started, the running
    // poll is observing checks for a stale commit. Exit loudly so the
    // agent re-issues the watch on the new sha rather than silently
    // reporting CLEAN on the old one.
    if (state.headRefOid !== ANCHOR_SHA) {
      console.error(
        `✗ STALE: PR HEAD drifted from ${ANCHOR_SHA.slice(0, 7)} → ${String(state.headRefOid).slice(0, 7)}.\n` +
          `  Re-issue the watch against the new sha:\n` +
          `    node scripts/ci-watch-pr.mjs ${PR_NUMBER}`,
      )
      process.exit(2)
    }

    const settled =
      state.mergeStateStatus !== "UNSTABLE" &&
      state.mergeStateStatus !== "PENDING"
    if (settled) {
      // Print the settled state JSON on stdout — the agent reads this
      // and reports check results to the user.
      console.log(
        JSON.stringify(
          {
            state: state.mergeStateStatus,
            mergeable: state.mergeable,
            head: state.headRefOid,
            checks: (state.statusCheckRollup ?? []).map((c) => ({
              name: c.name ?? c.context,
              status: c.status ?? c.state,
              conclusion: c.conclusion ?? null,
            })),
          },
          null,
          0,
        ),
      )
      process.exit(0)
    }

    await sleep(POLL_INTERVAL_MS)
  }

  console.error(`✗ Watch timed out after ${TIMEOUT_MS}ms`)
  process.exit(4)
}

main().catch((err) => {
  console.error(`✗ Unexpected error: ${err.message}`)
  process.exit(3)
})
