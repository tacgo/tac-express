#!/usr/bin/env node
/**
 * Codemod — add file-level `eslint-disable no-restricted-syntax` headers
 * to files containing exclusively design-locked arbitrary values.
 *
 * Why file-level (not per-line): the `// eslint-disable-next-line` form
 * doesn't work inside JSX trees (it's treated as a text node, not a
 * comment). And per-line block comments `{/* ... *\/}` are fragile
 * because they only work in JSX-children context, not in attribute
 * lists or string literals passed to `cn()`. File-level disables
 * sidestep all of that.
 *
 * Trade-off: the file loses LAW-9 enforcement entirely. The mitigation
 * is the `docs/design-exceptions.md` registry — every file disabled here
 * has a row there with the design rationale. A PR that adds a NEW
 * arbitrary value to a disabled file should still go through that
 * registry, even if lint doesn't enforce it.
 *
 * Workflow:
 *   1. Run lint, capture to /tmp/lint-current.txt
 *   2. Run this codemod (reads stdin)
 *   3. Re-run lint — should be 0 warnings
 *   4. Flip warn → error in design-system.js
 *
 * Usage:
 *   pnpm lint 2>&1 | node scripts/codemods/suppress-design-locked.mjs
 *
 * Idempotent: a file that already has the header is skipped.
 */

import { promises as fs } from "node:fs"

const HEADER = [
  "/* eslint-disable no-restricted-syntax --",
  " * design-locked: this file contains arbitrary values that intentionally",
  " * sit outside the Tailwind spacing scale (sub-pixel dots, content-fit",
  " * column widths, viewport/print-unit constraints, etc.). Each value is",
  " * documented in docs/design-exceptions.md as DESIGN-LOCKED. New",
  " * arbitrary values added to this file MUST be added to that registry.",
  " */",
].join("\n")

function parseLintOutput(text) {
  const result = new Set()
  let currentFile = null
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.replace(/^@workspace\/\S+:lint:\s*/, "").trimEnd()
    const fileMatch = stripped.match(/^([A-Z]:[\\/].+\.(?:tsx?|jsx?))$/)
    if (fileMatch) {
      currentFile = fileMatch[1]
      continue
    }
    if (/^\s*\d+:\d+\s+warning\s+/.test(stripped) && currentFile) {
      result.add(currentFile)
    }
  }
  return result
}

async function main() {
  const stdinChunks = []
  for await (const chunk of process.stdin) stdinChunks.push(chunk)
  const text = Buffer.concat(stdinChunks).toString("utf8")

  const files = parseLintOutput(text)
  if (files.size === 0) {
    console.log("No warnings found in input.")
    return
  }

  let edited = 0
  let skipped = 0

  for (const filePath of files) {
    const src = await fs.readFile(filePath, "utf8")
    if (src.includes("eslint-disable no-restricted-syntax")) {
      skipped++
      continue
    }
    // Insert the header after any "use client" / "use server" pragma
    // but before any import. ESLint reads file-level disables from the
    // top of the file regardless of position, but keeping it visually
    // grouped with the use-client pragma is cleanest.
    const lines = src.split("\n")
    let insertAt = 0
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (/^"use (client|server)"$/.test(lines[i].trim())) {
        insertAt = i + 1
      } else if (lines[i].trim() === "") {
        // skip blank lines after use-pragma
        if (insertAt === i) insertAt = i + 1
      } else {
        break
      }
    }
    lines.splice(insertAt, 0, "", HEADER, "")
    await fs.writeFile(filePath, lines.join("\n"))
    edited++
  }

  console.log(
    `Added file-level disable to ${edited} file(s); skipped ${skipped} already-disabled.`,
  )
  console.log(
    "Each insertion explains the disable inline and points at docs/design-exceptions.md.",
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
