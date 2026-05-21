#!/usr/bin/env node
/**
 * Codemod — build per-item registry JSON files for the @tac private
 * registry, based on `packages/ui/registry/registry.json` (the index).
 *
 * For each item in the index, this script:
 *   1. Reads the source file at `item.files[0].path` (relative to
 *      `packages/ui/`).
 *   2. Writes `packages/ui/registry/<name>.json` with the file content
 *      inlined, conforming to the shadcn registry-item schema.
 *   3. Performs basic sanity checks (file exists, content non-empty,
 *      no LAW violations slipped through via the lint gate).
 *
 * The output JSON files are what `npx shadcn add @tac/<name>` ultimately
 * fetches when consumers register `@tac` in their `components.json`.
 *
 * Usage:
 *   node scripts/codemods/build-tac-registry.mjs              # build
 *   node scripts/codemods/build-tac-registry.mjs --check      # dry-run, fail
 *                                                              # if anything is
 *                                                              # stale
 *
 * Output: `packages/ui/registry/<name>.json` per item, plus a copy of
 * the original `registry.json` index served alongside.
 *
 * Hosting (Sprint 4, S4.2): pick one of
 *   - GitHub Pages from a `tac-registry` branch (free, version-controlled,
 *     auth via GitHub token)
 *   - Internal S3 + CloudFront
 *   - Vercel deployment of `packages/ui/registry/`
 *
 * The chosen host serves `<host>/r/<name>.json` so that `components.json`
 * `"registries": { "@tac": "<host>/r/{name}.json" }` resolves correctly.
 */

import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)
const PKG_UI = path.join(ROOT, "packages/ui")
const REGISTRY_DIR = path.join(PKG_UI, "registry")
const INDEX_PATH = path.join(REGISTRY_DIR, "registry.json")

async function main() {
  const checkOnly = process.argv.includes("--check")

  const indexRaw = await fs.readFile(INDEX_PATH, "utf8")
  const index = JSON.parse(indexRaw)

  if (!Array.isArray(index.items)) {
    throw new Error("registry.json: expected `items` to be an array")
  }

  const errors = []
  let written = 0

  for (const item of index.items) {
    if (!item.name) {
      errors.push("Item missing `name`")
      continue
    }
    if (!Array.isArray(item.files) || item.files.length === 0) {
      errors.push(`${item.name}: missing files[]`)
      continue
    }

    // Inline each referenced file's content into a per-item JSON.
    const inlined = await Promise.all(
      item.files.map(async (f) => {
        const abs = path.join(PKG_UI, f.path)
        try {
          // Normalize line endings to LF so registry JSONs are byte-stable
          // across Windows (CRLF source) and CI (LF source). Without this,
          // the inlined content string captures the platform's line endings
          // and registry:check fails on cross-platform commits.
          const content = (await fs.readFile(abs, "utf8")).replace(/\r\n/g, "\n")
          // Sanity check — no raw text-[Npx] or tracking-[Xem] in the
          // content. If it has any, the registry would distribute a
          // LAW-violating file, defeating the @tac promise.
          if (/text-\[\d+px\]|tracking-\[0?\.\d+em\]/.test(content)) {
            errors.push(
              `${item.name}: source ${f.path} contains raw arbitrary values; run codemod first.`,
            )
          }
          return { ...f, content }
        } catch (err) {
          errors.push(
            `${item.name}: cannot read ${f.path} — ${(err && typeof err === "object" && "message" in err ? err.message : String(err))}`,
          )
          return null
        }
      }),
    )

    if (inlined.some((x) => x === null)) continue

    const itemPayload = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: item.name,
      type: item.type,
      title: item.title,
      description: item.description,
      ...(item.dependencies ? { dependencies: item.dependencies } : {}),
      ...(item.registryDependencies
        ? { registryDependencies: item.registryDependencies }
        : {}),
      files: inlined,
    }

    const outPath = path.join(REGISTRY_DIR, `${item.name}.json`)
    if (checkOnly) {
      try {
        const existing = await fs.readFile(outPath, "utf8")
        if (existing.trim() !== JSON.stringify(itemPayload, null, 2).trim()) {
          errors.push(
            `${item.name}: ${path.relative(ROOT, outPath)} is stale; re-run without --check`,
          )
        }
      } catch {
        errors.push(
          `${item.name}: ${path.relative(ROOT, outPath)} missing; re-run without --check`,
        )
      }
    } else {
      await fs.writeFile(outPath, JSON.stringify(itemPayload, null, 2) + "\n")
      written++
    }
  }

  if (errors.length > 0) {
    console.error("Registry build errors:")
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }

  if (checkOnly) {
    console.log(`Registry check passed: ${index.items.length} items up to date.`)
  } else {
    console.log(
      `Registry built: ${written} item file(s) written to ${path.relative(ROOT, REGISTRY_DIR)}/.`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
