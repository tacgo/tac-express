#!/usr/bin/env node
/**
 * Monthly upstream-drift tracker for shadcn primitives.
 *
 * For each primitive in the @tac registry, fetch the current shadcn
 * source via `pnpm shadcn view <name>`, diff against the TAC-local
 * file, and produce a report flagging changes worth porting.
 *
 * Triggered by the GitHub Actions schedule cron (see
 * .github/workflows/shadcn-drift-check.yml). If the report finds new
 * upstream changes, the workflow opens an issue tagged
 * `shadcn-upstream-drift` with the file-level diffs as the body, so
 * the team has a single place to review what's accumulated upstream.
 *
 * The "TAC exceeds shadcn" position decays silently without this. With
 * it, the cherry-pick backlog in `docs/primitive-upgrade-audit.md`
 * stays current.
 *
 * Usage:
 *   node scripts/check-shadcn-drift.mjs               # write report
 *   node scripts/check-shadcn-drift.mjs --check       # exit 1 on drift
 *
 * Output:
 *   docs/SHADCN-DRIFT-REPORT.md (overwritten each run)
 *   Exit 1 if --check and any primitive shows a non-trivial diff.
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
)
const PKG_UI = path.join(ROOT, "packages/ui")
const REGISTRY_INDEX = path.join(PKG_UI, "registry/registry.json")
const REPORT_PATH = path.join(ROOT, "docs/SHADCN-DRIFT-REPORT.md")
// Snapshot file checked into git so each run can compare to the prior
// state. Holds `{ [primitive]: { hash: <upstream-hash>, capturedAt: ISO } }`.
const LAST_REPORT_PATH = path.join(
  ROOT,
  "docs/shadcn-drift-last-report.json",
)

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "pipe", shell: process.platform === "win32", ...opts })
    let stdout = ""
    let stderr = ""
    child.stdout?.on("data", (d) => (stdout += d))
    child.stderr?.on("data", (d) => (stderr += d))
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr })
      else reject(new Error(`${cmd} exit ${code}: ${stderr || stdout}`))
    })
  })
}

async function fetchUpstream(name) {
  // `shadcn view <name>` emits a JSON array with the registry-item shape.
  const { stdout } = await run("pnpm", ["shadcn", "view", name], { cwd: PKG_UI })
  // Parse JSON; pnpm wraps it in a banner, so locate the first `[`.
  const start = stdout.indexOf("[")
  if (start < 0) throw new Error(`shadcn view ${name}: no JSON in output`)
  const parsed = JSON.parse(stdout.slice(start))
  const entry = Array.isArray(parsed) ? parsed[0] : parsed
  const file = entry?.files?.[0]
  if (!file?.content) throw new Error(`shadcn view ${name}: no files[0].content`)
  return file.content
}

function shortDiff(local, upstream) {
  // Cheap line-level summary — counts unique-to-each-side lines.
  const ls = new Set(local.split("\n"))
  const us = new Set(upstream.split("\n"))
  const onlyLocal = [...ls].filter((l) => !us.has(l)).length
  const onlyUpstream = [...us].filter((l) => !ls.has(l)).length
  return { onlyLocal, onlyUpstream }
}

function sha(str) {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16)
}

async function loadLastReport() {
  try {
    return JSON.parse(await fs.readFile(LAST_REPORT_PATH, "utf8"))
  } catch {
    return {}
  }
}

async function main() {
  const checkOnly = process.argv.includes("--check")
  const indexRaw = await fs.readFile(REGISTRY_INDEX, "utf8")
  const index = JSON.parse(indexRaw)
  const lastReport = await loadLastReport()
  const newReport = {}

  const rows = []
  let driftedCount = 0
  let newDriftCount = 0

  for (const item of index.items) {
    const sourcePath = path.join(PKG_UI, item.files[0].path)
    const local = await fs.readFile(sourcePath, "utf8")

    let upstream = ""
    let error = null
    try {
      upstream = await fetchUpstream(item.name)
    } catch (err) {
      error = err && typeof err === "object" && "message" in err ? err.message : String(err)
    }

    if (error) {
      rows.push({
        name: item.name,
        status: "ERROR",
        detail: error,
        changedSinceLast: false,
      })
      continue
    }

    const upstreamHash = sha(upstream)
    newReport[item.name] = { hash: upstreamHash, capturedAt: new Date().toISOString() }

    if (local === upstream) {
      rows.push({
        name: item.name,
        status: "IN_SYNC",
        detail: "",
        changedSinceLast: false,
      })
      continue
    }

    driftedCount++
    const { onlyLocal, onlyUpstream } = shortDiff(local, upstream)
    const lastHash = lastReport[item.name]?.hash
    const changedSinceLast = lastHash !== undefined && lastHash !== upstreamHash
    const newlyTracked = lastHash === undefined
    if (changedSinceLast || newlyTracked) newDriftCount++

    let statusLabel = "DRIFT"
    if (changedSinceLast) statusLabel = "DRIFT · NEW SINCE LAST RUN"
    else if (newlyTracked) statusLabel = "DRIFT · NEWLY TRACKED"
    else statusLabel = "DRIFT · UNCHANGED"

    rows.push({
      name: item.name,
      status: statusLabel,
      detail: `local has ${onlyLocal} lines not upstream · upstream has ${onlyUpstream} lines not local · upstream hash ${upstreamHash}`,
      changedSinceLast: changedSinceLast || newlyTracked,
    })
  }

  // Update the snapshot file so the next run has something to compare against.
  await fs.writeFile(LAST_REPORT_PATH, JSON.stringify(newReport, null, 2) + "\n")

  const body = [
    "# shadcn drift report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Tracks how far TAC's @tac primitives have diverged from the upstream shadcn 4.7.0 registry. Run by the `shadcn-drift-check` GitHub Actions cron.",
    "",
    "**Signal vs. noise:** the actionable signal is the `NEW SINCE LAST RUN` column — that means upstream changed something since the last cron tick. Long-standing `UNCHANGED` drift is the steady-state TAC customization layer and doesn't need monthly triage. The previous-run hashes live in `docs/shadcn-drift-last-report.json` (checked into git so the snapshot survives across runs).",
    "",
    "Cherry-pick decisions go in `docs/primitive-upgrade-audit.md` (Cherry-pick backlog table) — this report is the trigger, not the resolution.",
    "",
    "| Primitive | Status | Detail |",
    "|---|---|---|",
    ...rows.map((r) => `| \`${r.name}\` | ${r.status} | ${r.detail || "—"} |`),
    "",
    `**Summary:** ${rows.length} primitives checked · ${driftedCount} drifted (total) · ${newDriftCount} new-since-last-run · ${rows.filter((r) => r.status === "ERROR").length} errors.`,
    "",
  ].join("\n")

  await fs.writeFile(REPORT_PATH, body)

  if (checkOnly && newDriftCount > 0) {
    console.error(
      `New drift detected in ${newDriftCount} primitive(s) since last run; see ${REPORT_PATH}.`,
    )
    process.exit(1)
  }

  console.log(
    `Drift report written to ${path.relative(ROOT, REPORT_PATH)}. ${newDriftCount} new drift, ${driftedCount - newDriftCount} unchanged, ${rows.length - driftedCount} in-sync.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
