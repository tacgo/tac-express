// Audit: detect staleness between supabase/migrations/ and the generated
// packages/database/src/database.types.ts.
//
// The Supabase TypeScript types file MUST be regenerated whenever a new
// migration adds or alters tables, columns, enums, or RPC return shapes.
// If the types file's last commit is older than the newest migration, code
// that touches the new schema loses type safety silently — the TS compiler
// can only check what's in the .d.ts.
//
// Uses git commit timestamps (stable across clones, CI, branches) — NOT
// filesystem mtimes (which a `git checkout` resets to the checkout time).
//
// Pass:  exit 0
// Fail:  exit 1 with a list of migrations newer than the types file
//
// Remediation: pnpm supabase:types && commit packages/database/src/database.types.ts

import { readdirSync, existsSync } from "node:fs"
import { execSync } from "node:child_process"
import { join, posix } from "node:path"

const root = process.cwd()
const TYPES_FILE_REL = "packages/database/src/database.types.ts"
const MIGRATIONS_DIR_REL = "supabase/migrations"
const TYPES_FILE_ABS = join(root, ...TYPES_FILE_REL.split("/"))
const MIGRATIONS_DIR_ABS = join(root, ...MIGRATIONS_DIR_REL.split("/"))

const banner = (title) => {
  const line = "═".repeat(48)
  console.log(`\n╔${line}╗\n║  ${title.padEnd(46)}║\n╚${line}╝\n`)
}

banner("DB Types Freshness Audit")

if (!existsSync(TYPES_FILE_ABS)) {
  console.error(`❌ FAIL: types file not found at ${TYPES_FILE_REL}`)
  console.error("   Generate it with: pnpm supabase:types")
  process.exit(1)
}

if (!existsSync(MIGRATIONS_DIR_ABS)) {
  console.error(`❌ FAIL: migrations directory not found at ${MIGRATIONS_DIR_REL}`)
  process.exit(1)
}

// `git log -1 --format=%ct -- <path>` returns the unix-epoch commit time
// of the most recent commit that touched <path>. Returns empty if the
// file is untracked / never committed.
const lastCommitEpoch = (relPath) => {
  try {
    const out = execSync(`git log -1 --format=%ct -- "${relPath}"`, {
      cwd: root,
      encoding: "utf8",
    }).trim()
    return out ? parseInt(out, 10) : null
  } catch {
    return null
  }
}

const typesEpoch = lastCommitEpoch(TYPES_FILE_REL)
if (typesEpoch === null) {
  console.error(`❌ FAIL: ${TYPES_FILE_REL} is untracked or never committed.`)
  process.exit(1)
}

const migrations = readdirSync(MIGRATIONS_DIR_ABS)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => {
    const relPath = posix.join(MIGRATIONS_DIR_REL, f)
    return { name: f, relPath, epoch: lastCommitEpoch(relPath) }
  })
  .filter((m) => m.epoch !== null) // skip uncommitted migrations

if (migrations.length === 0) {
  console.log("⚠️  No committed migrations found — nothing to check.")
  process.exit(0)
}

const fmt = (epoch) =>
  new Date(epoch * 1000).toISOString().replace("T", " ").slice(0, 19)

const stale = migrations.filter((m) => m.epoch > typesEpoch)

console.log(`Types file:  ${TYPES_FILE_REL}`)
console.log(`             last commit ${fmt(typesEpoch)} UTC`)
console.log(`Migrations:  ${migrations.length} committed in ${MIGRATIONS_DIR_REL}/`)

if (stale.length === 0) {
  console.log(`\n✅ PASS: types file is at-or-newer than every migration.`)
  process.exit(0)
}

console.error(`\n❌ FAIL: ${stale.length} migration(s) committed after the types file:\n`)
for (const m of stale) {
  console.error(`   • ${m.name}  (${fmt(m.epoch)} UTC)`)
}
console.error(`\nRemediation:`)
console.error(`   1. Ensure local Supabase stack is running:  pnpm supabase:start`)
console.error(`   2. Regenerate types:                        pnpm supabase:types`)
console.error(`   3. Stage and commit the regenerated file:`)
console.error(`        git add packages/database/src/database.types.ts && git commit`)
console.error(``)
console.error(`Why this matters: code that reads new tables / columns / RPCs loses`)
console.error(`TypeScript safety when the types file is stale. CI cannot catch it.`)
process.exit(1)
