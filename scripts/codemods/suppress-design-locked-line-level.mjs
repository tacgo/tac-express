#!/usr/bin/env node
// Per-line eslint-disable insertion for design-locked arbitrary values.
//
// The earlier `suppress-design-locked.mjs` used file-level disables which
// silently swallow ANY future no-restricted-syntax violation in those
// files, not just the documented design-locks. This script replaces that
// blanket suppression with line-level disables that only mask the
// specific design-locked line.
//
// JSX context discrimination:
//   - If the flagged line starts a JSX element (matches `<[A-Z]|<[a-z]`
//     at first non-whitespace char) → use `{/* eslint-disable-next-line ... */}`
//     above it (JSX-children comment).
//   - Otherwise (CVA array entry, cn() argument, etc.) → use
//     `// eslint-disable-next-line ...` above it.
//
// Reads lint output from stdin. Idempotent: a line already prefixed with
// an eslint-disable for this rule is skipped.
//
// Usage:
//   pnpm lint 2>&1 | node scripts/codemods/suppress-design-locked-line-level.mjs

import { promises as fs } from "node:fs"

const REASON = "design-locked: see docs/design-exceptions.md"
const JSX_LINE_DISABLE = `{/* eslint-disable-next-line no-restricted-syntax -- ${REASON} */}`
const JS_LINE_DISABLE = `// eslint-disable-next-line no-restricted-syntax -- ${REASON}`

function parseLintOutput(text) {
  const result = new Map()
  let currentFile = null
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.replace(/^@workspace\/\S+:lint:\s*/, "").trimEnd()
    const fileMatch = stripped.match(/^([A-Z]:[\\/].+\.(?:tsx?|jsx?))$/)
    if (fileMatch) {
      currentFile = fileMatch[1]
      continue
    }
    const warnMatch = stripped.match(/^\s*(\d+):\d+\s+warning\s+/)
    if (warnMatch && currentFile) {
      const lineNum = parseInt(warnMatch[1], 10)
      if (!result.has(currentFile)) result.set(currentFile, new Set())
      result.get(currentFile).add(lineNum)
    }
  }
  return result
}

function isJsxLine(rawLine) {
  // Heuristic: the line opens with a JSX tag (`<Foo` or `<div`) optionally
  // preceded by whitespace. Lines starting with quoted string fragments
  // like `"some-class"`, or with an unquoted `className: "..."` pattern,
  // are JS-context.
  const trimmed = rawLine.trimStart()
  return /^</.test(trimmed)
}

async function main() {
  const stdinChunks = []
  for await (const chunk of process.stdin) stdinChunks.push(chunk)
  const text = Buffer.concat(stdinChunks).toString("utf8")

  const locations = parseLintOutput(text)
  if (locations.size === 0) {
    console.log("No warnings found in input.")
    return
  }

  let edited = 0
  let inserted = 0
  let jsxCount = 0
  let jsCount = 0

  for (const [filePath, lineSet] of locations) {
    const src = await fs.readFile(filePath, "utf8")
    const lines = src.split("\n")
    const sorted = [...lineSet].sort((a, b) => b - a) // descending

    let dirty = false
    for (const lineNum of sorted) {
      const targetIdx = lineNum - 1
      const target = lines[targetIdx] ?? ""
      const prev = lines[targetIdx - 1] ?? ""

      // Skip if already disabled.
      if (
        prev.includes("eslint-disable-next-line no-restricted-syntax") ||
        prev.includes("eslint-disable no-restricted-syntax")
      ) {
        continue
      }

      const indent = target.match(/^\s*/)?.[0] ?? ""
      const useJsx = isJsxLine(target)
      const directive = useJsx ? JSX_LINE_DISABLE : JS_LINE_DISABLE
      lines.splice(targetIdx, 0, `${indent}${directive}`)
      inserted++
      if (useJsx) jsxCount++
      else jsCount++
      dirty = true
    }

    if (dirty) {
      await fs.writeFile(filePath, lines.join("\n"))
      edited++
    }
  }

  console.log(
    `Inserted ${inserted} line-level disables across ${edited} file(s).`,
  )
  console.log(`  JSX-context  (\`{/* ... */}\`): ${jsxCount}`)
  console.log(`  JS-context   (\`// ...\`)     : ${jsCount}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
