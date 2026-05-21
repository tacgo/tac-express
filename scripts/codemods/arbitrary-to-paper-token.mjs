#!/usr/bin/env node
/**
 * Codemod — convert raw arbitrary Tailwind utilities to design-token utilities.
 *
 * Replaces:
 *   text-[Npx]     → text-paper-N      (where N ∈ {9,10,11,12,13,14,16,18,22,26,28,32})
 *   tracking-[Xem] → tracking-paper-NN (where X ∈ {0.04,0.06,0.08,0.1,0.12,0.14,0.18})
 *
 * Numeric equivalence is provable — every (text-paper-N) token's rem value
 * resolves to `N` pixels at the default 16px root font-size. See
 * docs/token-swap-verification.md for the audit table. **VRT diff is 0**
 * by construction for these specific replacements.
 *
 * Usage:
 *   node scripts/codemods/arbitrary-to-paper-token.mjs              # apply
 *   node scripts/codemods/arbitrary-to-paper-token.mjs --dry-run    # report only
 *
 * Idempotent: re-running on already-swapped files is a no-op (the regex
 * doesn't match `text-paper-10` etc.; only `text-[10px]`).
 *
 * History:
 *   - 2026-05-13: first run. 218 text-[Npx] replacements across 57 files,
 *     15 tracking-[Xem] replacements across 9 files. Committed as part of
 *     Phase 3 of the shadcn-upgrade plan.
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const TEXT_REPLACEMENTS = [
  [/text-\[9px\]/g, "text-paper-9"],
  [/text-\[10px\]/g, "text-paper-10"],
  [/text-\[11px\]/g, "text-paper-11"],
  [/text-\[12px\]/g, "text-paper-12"],
  [/text-\[13px\]/g, "text-paper-13"],
  [/text-\[14px\]/g, "text-paper-14"],
  [/text-\[16px\]/g, "text-paper-16"],
  [/text-\[18px\]/g, "text-paper-18"],
  [/text-\[22px\]/g, "text-paper-22"],
  [/text-\[26px\]/g, "text-paper-26"],
  [/text-\[28px\]/g, "text-paper-28"],
  [/text-\[32px\]/g, "text-paper-32"],
]

const TRACKING_REPLACEMENTS = [
  [/tracking-\[0\.04em\]/g, "tracking-paper-04"],
  [/tracking-\[0\.06em\]/g, "tracking-paper-06"],
  [/tracking-\[0\.08em\]/g, "tracking-paper-08"],
  [/tracking-\[0\.1em\]/g, "tracking-paper-10"],
  [/tracking-\[0\.12em\]/g, "tracking-paper-12"],
  [/tracking-\[0\.14em\]/g, "tracking-paper-14"],
  [/tracking-\[0\.18em\]/g, "tracking-paper-18"],
]

const REPLACEMENTS = [...TEXT_REPLACEMENTS, ...TRACKING_REPLACEMENTS]

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", ".turbo", "coverage"])

async function walk(dir) {
  const out = []
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  )
  const targets = [
    path.join(root, "packages/ui/src"),
    path.join(root, "apps/dashboard/app"),
    path.join(root, "apps/dashboard/components"),
    path.join(root, "apps/web/app"),
    path.join(root, "apps/web/components"),
  ]

  let totalFiles = 0
  let editedFiles = 0
  let totalReplacements = 0

  for (const t of targets) {
    try {
      await fs.access(t)
    } catch {
      continue
    }
    for (const f of await walk(t)) {
      totalFiles++
      const src = await fs.readFile(f, "utf8")
      let out = src
      let fileReplacements = 0
      for (const [re, to] of REPLACEMENTS) {
        const matches = out.match(re) ?? []
        fileReplacements += matches.length
        out = out.replace(re, to)
      }
      if (out !== src) {
        editedFiles++
        totalReplacements += fileReplacements
        if (!dryRun) await fs.writeFile(f, out)
      }
    }
  }

  const verb = dryRun ? "would edit" : "edited"
  console.log(
    `Scanned ${totalFiles} files. ${verb} ${editedFiles} files, ${totalReplacements} total replacements.`,
  )
  if (dryRun) console.log("Run without --dry-run to apply.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
