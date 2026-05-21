import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative, sep } from "node:path"

const root = process.cwd()
const excludedDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  "playwright-report",
  ".turbo",
  // `.claude/` houses git worktrees + skill files — both legitimately
  // contain source-shaped artefacts (other-branch code under
  // `worktrees/`, skill markdown that may quote forbidden patterns) that
  // shouldn't trip the governance scan.
  ".claude",
  // `.audit-cache/` is the working scratch for Claude_Preview audit runs
  // (gitignored). It can contain v6-*.tsx snapshots of deleted source
  // that would falsely register as "consumers" of components otherwise
  // recognised as orphans. Exclude so local + CI see identical orphan sets.
  ".audit-cache",
])
const sourceExtensions = new Set([".ts", ".tsx"])
const errors = []

function collectFiles(directory) {
  const entries = []
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      if (!excludedDirs.has(entry)) {
        entries.push(...collectFiles(fullPath))
      }
      continue
    }
    if (stats.isFile() && sourceExtensions.has(extname(entry))) {
      entries.push(fullPath)
    }
  }
  return entries
}

function collectPackageManifests(directory) {
  const entries = []
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      if (!excludedDirs.has(entry)) {
        entries.push(...collectPackageManifests(fullPath))
      }
      continue
    }
    if (stats.isFile() && entry === "package.json") {
      entries.push(fullPath)
    }
  }
  return entries
}

function toRepoPath(filePath) {
  return relative(root, filePath).split(sep).join("/")
}

function fail(filePath, message) {
  errors.push(`${toRepoPath(filePath)} — ${message}`)
}

const files = collectFiles(root)
const packageManifests = collectPackageManifests(root)

for (const file of files) {
  const repoPath = toRepoPath(file)
  const content = readFileSync(file, "utf8")

  // LAW 8 — `@supabase/supabase-js` only in packages/database OR in
  // Supabase Edge Functions (which run on Deno and import via JSR /
  // esm.sh by design — see `tac-api-surface` skill). Both are legitimate.
  if (
    !repoPath.startsWith("packages/database/") &&
    !repoPath.startsWith("supabase/functions/") &&
    content.includes("@supabase/supabase-js")
  ) {
    fail(file, "imports @supabase/supabase-js outside packages/database")
  }

  if (content.includes("text-orange-500") || content.includes("border-orange-500") || content.includes("bg-orange-500")) {
    fail(file, "uses named orange Tailwind color utilities")
  }

  if (content.includes("backdrop-blur")) {
    fail(file, "uses backdrop blur instead of solid TAC Precision overlay")
  }

  // LAW 2 — All UI components must live in `packages/ui`. Files under
  // `apps/*/components/` are restricted to app-specific glue: React Context
  // providers, auth guards, and other side-effect wrappers that legitimately
  // depend on the app's Next router / provider stack.
  //
  // The allowlist below names every legitimate exception by **exact path**
  // with the reason. Adding to it requires a deliberate diff that reviewers
  // can challenge. Pattern-based exceptions (e.g. "anything matching
  // *-guard.tsx") are intentionally avoided — they make it too easy to
  // sneak a real UI component past the gate by naming it `foo-guard.tsx`.
  // See Sprint 0 / S0.3 in the Phase 4+ plan.
  //
  // Format: { path, reason }. Reasons must be one short sentence describing
  // why the file is glue and not a UI component.
  const LAW2_APP_COMPONENT_ALLOWLIST = [
    {
      path: "apps/dashboard/components/providers.tsx",
      reason:
        "Composes React Query + theme + toaster providers — instantiates a per-app QueryClient and renders <Toaster>; not a reusable UI element.",
    },
    {
      path: "apps/dashboard/components/theme-provider.tsx",
      reason: "Thin wrapper around next-themes ThemeProvider. No JSX of its own beyond the provider context.",
    },
    {
      path: "apps/dashboard/components/session-guard.tsx",
      reason:
        "Auth-event subscriber. useEffect-only side-effect (SIGNED_OUT → router.replace('/sign-in')); renders null.",
    },
    {
      path: "apps/dashboard/components/idle-guard.tsx",
      reason:
        "Idle-timeout side-effect: mounts <IdleTimeoutBoundary> with a role-derived ms; depends on next/router + useRBAC, so cannot live in packages/ui without coupling that package to the app's router.",
    },
    {
      path: "apps/web/components/theme-provider.tsx",
      reason: "Thin wrapper around next-themes ThemeProvider. Mirrors the dashboard's equivalent; same justification.",
    },
  ]
  const allowedPaths = new Set(LAW2_APP_COMPONENT_ALLOWLIST.map((e) => e.path))
  if (
    /^apps\/[^/]+\/components\/.*\.tsx$/.test(repoPath) &&
    !allowedPaths.has(repoPath)
  ) {
    fail(
      file,
      "[LAW 2] UI components must live in packages/ui/. App-local components/ is reserved for provider/guard wrappers — add to the LAW2_APP_COMPONENT_ALLOWLIST in audit-governance.mjs only if this file is verifiably app-specific glue (provide a one-line reason)."
    )
  }
}

for (const file of packageManifests) {
  const repoPath = toRepoPath(file)
  const content = readFileSync(file, "utf8")

  if (!repoPath.startsWith("packages/database/") && content.includes("\"@supabase/supabase-js\"")) {
    fail(file, "declares @supabase/supabase-js outside packages/database")
  }
}

// ──────────────────────────────────────────────────────────────────────
// Orphan-component gate
// ──────────────────────────────────────────────────────────────────────
//
// Catches the regression class that hit on 2026-05-12 (commit eaa7f67): the
// shadcn transformation replaced the multi-step InvoiceWizard /
// ManifestBuilderWizard / CreateShipmentForm route shells with simpler MVP
// forms but LEFT the wizard components sitting in packages/ui. The lint +
// typecheck + visual gates all passed; nobody noticed the wizards were
// unused for ~36 hours until a user spotted the "Single-page MVP" banner.
//
// The gate: any `*.tsx` under `packages/ui/src/components/composed/` whose
// named exports are imported by NOBODY (outside the file itself, its
// adjacent test files, and same-folder siblings + barrels) is an orphan.
// Forces the conversation that should have happened when the route shell
// was swapped out. See `docs/v6-mvp-regression-audit.md` § "How this
// slipped through".
//
// Allowlist: legitimately-unused exports (e.g. WIP components staged for an
// upcoming feature, or step components consumed only by their parent wizard
// inside the same dir) must be enumerated in COMPOSED_ORPHAN_ALLOWLIST
// below with a one-line reason.

const COMPOSED_ROOT = "packages/ui/src/components/composed/"

/** Files that ARE composed sources (component .tsx, not test / story / barrel). */
function isComposedSource(repoPath) {
  if (!repoPath.startsWith(COMPOSED_ROOT)) return false
  if (!repoPath.endsWith(".tsx")) return false
  if (/\.(test|spec|stories)\.tsx?$/.test(repoPath)) return false
  if (/(^|\/)__(tests|snapshots)__\//.test(repoPath)) return false
  if (/\/index\.tsx?$/.test(repoPath)) return false
  // `_archive/` subtrees are intentionally orphaned (see the corresponding
  // README.md). Same convention as supabase/migrations/_archive/ and
  // docs/_archive/ — files are kept for git-blame value but are NOT live.
  if (/(^|\/)_archive\//.test(repoPath)) return false
  return true
}

/**
 * Extract top-level named exports from a TSX source. Conservative — only
 * matches the four forms we actually emit:
 *   export function NAME
 *   export const NAME =
 *   export class NAME
 *   export { NAME, NAME2 }
 * Defaults are ignored (they have no canonical name to match imports against).
 */
function extractNamedExports(content) {
  const names = new Set()
  const declRe = /^export\s+(?:async\s+)?(?:function|const|class|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm
  let m
  while ((m = declRe.exec(content)) !== null) names.add(m[1])
  const reexportRe = /^export\s*\{([^}]+)\}/gm
  while ((m = reexportRe.exec(content)) !== null) {
    for (const raw of m[1].split(",")) {
      const tok = raw.trim().split(/\s+as\s+/i)[0]?.trim()
      if (tok && /^[A-Za-z_$]/.test(tok)) names.add(tok)
    }
  }
  return [...names]
}

const COMPOSED_ORPHAN_ALLOWLIST = new Set([
  // Add `repoPath::ExportName` strings here only with a same-PR
  // justification — comment describing why the export is reachable by
  // some other path (route group, manifest scan, dynamic import).
])

// Collect every named export from every composed source.
const composedExports = new Map() // repoPath → string[]
for (const file of files) {
  const repoPath = toRepoPath(file)
  if (!isComposedSource(repoPath)) continue
  const content = readFileSync(file, "utf8")
  const names = extractNamedExports(content)
  if (names.length > 0) composedExports.set(repoPath, names)
}

// Build a global text corpus of every file OUTSIDE packages/ui/src/components/composed
// (apps/ + packages/services + packages/database + packages/types + … and
// the index barrels inside composed/). Same-folder neighbors inside composed
// don't count — a step file used only by its sibling wizard is still an
// orphan if no app imports the wizard.
const consumerFiles = files.filter((file) => {
  const p = toRepoPath(file)
  if (p.startsWith(COMPOSED_ROOT) && !p.endsWith("/index.ts") && !p.endsWith("/index.tsx")) {
    // Allow same-folder siblings to count as consumers ONLY for files in
    // the same immediate directory (step-files importing their wizard, etc.)
    return true
  }
  return true
})

// Build a single concatenated corpus is too memory-heavy on bigger repos;
// instead, for each composed source, scan every consumer file for ANY of
// its named exports.
function isConsumedBy(consumerPath, consumerContent, exporterPath, exportNames) {
  // Skip the exporter itself.
  if (consumerPath === exporterPath) return false
  // Skip test files in the same package.
  if (/\.(test|spec)\.tsx?$/.test(consumerPath)) return false
  // Skip story files.
  if (/\.stories\.tsx?$/.test(consumerPath)) return false
  // Require an import statement referencing one of the named exports OR
  // the exporter's file path (covers `import x from "./foo"` default
  // re-exports via barrels).
  // We look for `import ... { Name ...} from` to be precise; also accept
  // `import * as ns from` followed by `ns.Name`.
  for (const name of exportNames) {
    // Look for `Name` inside an import { ... } block (multi-line tolerant)
    const importedRe = new RegExp(
      `import[^"']*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from`,
      "m",
    )
    if (importedRe.test(consumerContent)) return true
  }
  return false
}

const consumerCache = new Map() // path → content
for (const file of consumerFiles) {
  consumerCache.set(file, readFileSync(file, "utf8"))
}

const orphans = []
for (const [exporterPath, names] of composedExports) {
  // Same-folder siblings (e.g. wizard step-files inside manifest-builder/)
  // count as legitimate consumers. The orphan check is whether ANY consumer
  // — same-folder OR outside-folder — imports the named export. If only
  // same-folder consumers exist, that's a sub-tree of files with no
  // outside entry-point, which is the regression we're guarding against
  // for top-level orphans, but is a normal pattern for internal step files.
  // So: a file is an orphan if NO consumer (anywhere in the repo) imports
  // any of its named exports.
  const exporterAbs = join(root, exporterPath)
  let hasConsumer = false
  for (const [consumerAbs, consumerContent] of consumerCache) {
    const consumerPath = toRepoPath(consumerAbs)
    if (consumerAbs === exporterAbs) continue
    if (isConsumedBy(consumerPath, consumerContent, exporterPath, names)) {
      hasConsumer = true
      break
    }
  }
  if (!hasConsumer) {
    // Check allowlist by `repoPath::ExportName` for any of the exports
    const allListed = names.every((n) =>
      COMPOSED_ORPHAN_ALLOWLIST.has(`${exporterPath}::${n}`),
    )
    if (!allListed) orphans.push({ exporterPath, names })
  }
}

// Baseline mode: the codebase had ~40 pre-existing orphans on 2026-05-13
// when this gate first ran. Listing all of them as inline allowlist entries
// would dwarf the script; instead, snapshot them to a baseline JSON file
// and compare. New orphans (not in the baseline) FAIL CI. Orphans that
// disappear from the baseline are progress and should drop the baseline by
// running `pnpm audit:orphans:refresh-baseline`.
//
// The baseline file lives at scripts/audit-orphans-baseline.json; PRs that
// shrink it are the cleanup signal we want. PRs that try to grow it must
// either delete the orphan or refresh the baseline (which forces a diff +
// review).
const ORPHAN_BASELINE_PATH = join(root, "scripts/audit-orphans-baseline.json")
let orphanBaseline = { paths: [] }
try {
  orphanBaseline = JSON.parse(readFileSync(ORPHAN_BASELINE_PATH, "utf8"))
} catch {
  // First run — no baseline yet. Create-mode is triggered by
  // AUDIT_ORPHANS_WRITE_BASELINE=1 in the env (see refresh-baseline script).
}
const baselineSet = new Set(orphanBaseline.paths ?? [])
const newOrphans = orphans.filter(({ exporterPath }) => !baselineSet.has(exporterPath))
const fixedSinceBaseline = [...baselineSet].filter(
  (p) => !orphans.some((o) => o.exporterPath === p),
)

if (process.env.AUDIT_ORPHANS_WRITE_BASELINE === "1") {
  // refresh-baseline mode: rewrite the snapshot, log a summary, and exit 0
  // before any other governance failure (so refresh works on dirty trees).
  const next = orphans.map((o) => o.exporterPath).sort()
  // eslint-disable-next-line no-undef
  import("node:fs").then(({ writeFileSync }) => {
    writeFileSync(
      ORPHAN_BASELINE_PATH,
      JSON.stringify({ generatedAt: new Date().toISOString(), paths: next }, null, 2) + "\n",
    )
    console.log(`Refreshed orphan baseline → ${next.length} entries`)
  })
} else if (newOrphans.length > 0) {
  for (const { exporterPath, names } of newOrphans) {
    fail(
      join(root, exporterPath),
      `[ORPHAN] new composed component file has no consumer outside itself. Exports: ${names.join(", ")}. ` +
        `If intentional (WIP / staged for upcoming feature), add to COMPOSED_ORPHAN_ALLOWLIST in scripts/audit-governance.mjs with a one-line reason. ` +
        `Otherwise wire it into a route or delete it. ` +
        `Background: docs/v6-mvp-regression-audit.md`,
    )
  }
}

if (fixedSinceBaseline.length > 0 && errors.length === 0) {
  // Print this even on success — pure good news, no need to fail.
  console.log(
    `Orphan baseline contains ${fixedSinceBaseline.length} entry(ies) that are no longer orphans:\n` +
      fixedSinceBaseline.map((p) => `  - ${p}`).join("\n") +
      `\nRun \`pnpm audit:orphans:refresh-baseline\` to shrink the baseline.`,
  )
}

if (errors.length > 0) {
  console.error("Governance audit failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log("Governance audit passed")
