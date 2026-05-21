// Audit: detect drift between the canonical design system spec and the codebase.
// Fails (exit 1) if any of the legacy spec strings are found in code or docs
// outside of explicit history/changelog locations.

import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative, sep } from "node:path"

const root = process.cwd()
const excludedDirs = new Set([
  "node_modules", ".next", "dist", "coverage", ".turbo",
  ".git",
  // .agents/ is archived legacy content per CLAUDE.md § 0 (Authority
  // Chain). The canonical skills directory is .claude/skills/. Stale
  // legacy-spec strings in archived skill copies should not gate CI.
  ".agents",
])
const allowed = new Set([
  // governance/documentation files where the patterns are described, not used.
  // As of May 2026 consolidation: PROJECT-RULES.md merged into AGENTS.md;
  // .agents/ and .agent/ archived under .archive/.
  "AGENTS.md",
  "CLAUDE.md",
  "DESIGN_SYSTEM.md",
  "README.md",
  ".planning",
  "docs",
  ".archive",
  ".windsurf",
  ".claude/skills",
  // Sibling git worktrees under `.claude/worktrees/` host other-branch
  // copies of the repo and may legitimately contain legacy spec strings
  // from older revisions. They aren't part of the canonical tree this
  // audit governs.
  ".claude/worktrees",
  "scripts/audit-design-spec.mjs",
  "scripts/audit-governance.mjs",
  "scripts/generate-claude-skills.js",
])

const checks = [
  // legacy version labels — must not appear in active code/skills outside the allowed list
  { pattern: /\bTAC Orbital v1\.0\b/g, msg: "Legacy version label 'TAC Orbital v1.0'" },
  { pattern: /\bTAC Orbital v2\.0\b/g, msg: "Legacy version label 'TAC Orbital v2.0'" },
  { pattern: /TAC Precision\b/g, msg: "Legacy spec name 'TAC Precision'" },
  { pattern: /VELOX Glass/g, msg: "Legacy spec name 'VELOX Glass'" },
  { pattern: /backdrop-blur/g, msg: "Glassmorphism utility 'backdrop-blur' is forbidden (DESIGN_SYSTEM §3)" },
  { pattern: /backdrop-filter/g, msg: "Glassmorphism property 'backdrop-filter' is forbidden" },
  // hardcoded radii (LAW 9)
  { pattern: /\brounded-(?:full|md|lg|xl|2xl|3xl)\b/g, msg: "Hardcoded radius — design system uses --radius (0rem)" },
  // forbidden packages
  { pattern: /from ['"]lucide-react['"]/g, msg: "lucide-react is forbidden — use @workspace/ui/icons (LAW 2)" },
  { pattern: /from ['"]framer-motion['"]/g, msg: "Legacy framer-motion forbidden — use motion/react (LAW 3)" },
  { pattern: /from ['"]@tabler\/icons-react['"]/g, msg: "@tabler/icons-react is forbidden (LAW 2)" },
  { pattern: /from ['"]gsap['"]/g, msg: "gsap is forbidden (LAW 3)" },
]

const errors = []

function isAllowed(repoPath) {
  for (const a of allowed) {
    if (repoPath === a || repoPath.startsWith(`${a}/`)) return true
  }
  return false
}

function collect(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stats = statSync(full)
    if (stats.isDirectory()) {
      if (!excludedDirs.has(entry)) out.push(...collect(full))
      continue
    }
    const ext = extname(entry)
    if ([".ts", ".tsx", ".js", ".mjs", ".css", ".md"].includes(ext)) {
      out.push(full)
    }
  }
  return out
}

const files = collect(root)
for (const file of files) {
  const repoPath = relative(root, file).split(sep).join("/")
  if (isAllowed(repoPath)) continue
  const content = readFileSync(file, "utf8")
  for (const c of checks) {
    if (c.pattern.test(content)) {
      errors.push(`${repoPath} — ${c.msg}`)
    }
    c.pattern.lastIndex = 0
  }
}

if (errors.length > 0) {
  console.error("\nDesign-system spec drift detected:\n")
  for (const e of errors) console.error("  • " + e)
  console.error(`\n${errors.length} issue(s). Fix before merging.\n`)
  process.exit(1)
} else {
  console.log("Design-system spec clean. No drift detected.")
}
