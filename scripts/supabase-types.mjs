// Safe wrapper around `supabase gen types typescript`.
//
// Two failure modes the raw `supabase gen types ... > file` shell pipeline has:
//   1. Shell redirection truncates the destination file BEFORE the command runs.
//      If supabase then errors (Docker not running, login expired, etc.), the
//      file is left empty — every importer in the workspace loses TypeScript
//      types silently. The regenerator must capture the full stdout in memory
//      and only write the file once the command exits 0 with non-empty output.
//   2. The CLI's --local mode requires Docker. Many workflows (CI without
//      Docker, devs without Docker Desktop installed) need to pull from the
//      remote project instead. This wrapper exposes a --remote mode that uses
//      --project-id against the production project, no Docker required.
//
// Usage:
//   node scripts/supabase-types.mjs --local    # boot local stack + generate
//   node scripts/supabase-types.mjs --remote   # pull from production schema

import { execSync } from "node:child_process"
import { writeFileSync, existsSync, statSync } from "node:fs"
import { join } from "node:path"

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID ?? ""
if (mode === "remote" && !PROJECT_ID) {
  console.error("✗ SUPABASE_PROJECT_ID environment variable is not set.")
  console.error("  Export it before running: export SUPABASE_PROJECT_ID=<your-project-ref>")
  process.exit(1)
}
const TARGET = join("packages", "database", "src", "database.types.ts")

const mode = process.argv.includes("--remote") ? "remote" : "local"

const cmd =
  mode === "remote"
    ? `pnpm exec supabase gen types typescript --project-id ${PROJECT_ID}`
    : `pnpm exec supabase gen types typescript --local`

console.log(`▸ regenerating ${TARGET} via ${mode} mode`)
console.log(`  $ ${cmd}\n`)

let out
try {
  out = execSync(cmd, {
    encoding: "utf8",
    stdio: ["inherit", "pipe", "inherit"],
    maxBuffer: 32 * 1024 * 1024, // 32MB — types files for medium schemas can be ~1MB
  })
} catch (e) {
  console.error(`✗ supabase gen types failed (exit ${e.status ?? "?"}):`, e.message)
  console.error(`  destination ${TARGET} preserved unchanged.`)
  if (mode === "local") {
    console.error(`  (try --remote if Docker isn't running:  pnpm supabase:types:remote)`)
  }
  process.exit(1)
}

if (!out || out.trim().length === 0) {
  console.error(`✗ supabase gen types produced empty output; refusing to overwrite ${TARGET}.`)
  process.exit(1)
}

if (!out.includes("Database") || !out.includes("public")) {
  console.error(`✗ output doesn't look like a Supabase types file (missing Database / public namespaces).`)
  console.error(`  destination ${TARGET} preserved unchanged.`)
  process.exit(1)
}

writeFileSync(TARGET, out)

const after = statSync(TARGET)
console.log(`✓ wrote ${TARGET} — ${after.size} bytes, ${out.split("\n").length} lines`)
console.log(`  next: git add ${TARGET} && git commit -m "chore(types): regen from ${mode}"`)
