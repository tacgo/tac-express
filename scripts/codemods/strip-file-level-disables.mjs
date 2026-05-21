#!/usr/bin/env node
// Strip the file-level `eslint-disable no-restricted-syntax` blocks added
// by `suppress-design-locked.mjs`. Pair with
// `suppress-design-locked-line-level.mjs` to re-apply line-level
// suppressions instead — the line-level form catches only the
// documented case and lets other rules continue to fire.
//
// Usage: node scripts/codemods/strip-file-level-disables.mjs

import { promises as fs } from "node:fs"
import path from "node:path"

const HEADER_OPEN = "/* eslint-disable no-restricted-syntax --"
const HEADER_CLOSE = " */"

async function walk(dir) {
  const out = []
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", "dist"].includes(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(p)))
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(p)
  }
  return out
}

let edited = 0
for (const t of ["packages/ui/src", "apps"]) {
  try {
    await fs.access(t)
  } catch {
    continue
  }
  for (const f of await walk(t)) {
    const src = await fs.readFile(f, "utf8")
    if (!src.includes(HEADER_OPEN)) continue

    const lines = src.split("\n")
    const out = []
    let inHeader = false
    for (const line of lines) {
      if (line.startsWith(HEADER_OPEN)) {
        inHeader = true
        continue
      }
      if (inHeader) {
        if (line.endsWith(HEADER_CLOSE)) {
          inHeader = false
        }
        continue
      }
      out.push(line)
    }

    // Trim leading blank lines that the header insertion may have produced.
    while (out.length > 0 && out[0].trim() === "") out.shift()
    // Restore a single blank line after "use client" if present.
    if (out[0]?.trim() === '"use client"' && out[1]?.trim() !== "") {
      out.splice(1, 0, "")
    }

    await fs.writeFile(f, out.join("\n"))
    edited++
  }
}

console.log(`Stripped file-level disables from ${edited} file(s).`)
