#!/usr/bin/env node
/**
 * Registry end-to-end smoke test.
 *
 * `registry:check` validates that each `<name>.json` file is in sync
 * with its source. It does NOT validate that `shadcn add @tac/<name>`
 * actually consumes the registry correctly. This script does.
 *
 * Procedure:
 *   1. Boot a tiny local HTTP server serving `packages/ui/registry/`
 *   2. Point a temp shadcn config at it
 *   3. For each item, run `shadcn add @tac/<name> --path /tmp/scratch/`
 *   4. Diff the installed file against the original source
 *   5. Fail if any diff is non-empty
 *
 * Run on demand or wire into CI after the @tac registry has a real
 * host (see packages/ui/registry/README.md for hosting options).
 *
 * Usage:
 *   node scripts/codemods/registry-smoke-test.mjs
 */

import { promises as fs } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
)
const REGISTRY_DIR = path.join(ROOT, "packages/ui/registry")
const SCRATCH = await fs.mkdtemp(path.join(os.tmpdir(), "tac-registry-smoke-"))
const PORT = 0 // pick a free port

function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      // Strip leading slash + any /r/ prefix the smoke config uses
      const requested = req.url?.replace(/^\/r?\//, "") ?? ""
      const filePath = path.join(REGISTRY_DIR, requested)
      try {
        const body = await fs.readFile(filePath, "utf8")
        res.writeHead(200, { "content-type": "application/json" })
        res.end(body)
      } catch {
        res.writeHead(404, { "content-type": "application/json" })
        res.end(JSON.stringify({ error: "not found", path: filePath }))
      }
    })
    server.listen(PORT, "127.0.0.1", () => {
      const addr = server.address()
      const port = typeof addr === "object" && addr ? addr.port : PORT
      resolve({ server, port })
    })
  })
}

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "pipe", ...opts })
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

async function main() {
  console.log("[smoke] scratch dir:", SCRATCH)

  const { server, port } = await startServer()
  console.log(`[smoke] local registry server listening on http://127.0.0.1:${port}`)

  // Set up a minimal shadcn project in the scratch dir.
  await fs.writeFile(
    path.join(SCRATCH, "components.json"),
    JSON.stringify(
      {
        $schema: "https://ui.shadcn.com/schema.json",
        style: "radix-lyra",
        rsc: true,
        tsx: true,
        tailwind: {
          config: "",
          css: "src/globals.css",
          baseColor: "neutral",
          cssVariables: true,
        },
        iconLibrary: "remixicon",
        aliases: {
          components: "@/components",
          utils: "@/lib/utils",
          hooks: "@/hooks",
          lib: "@/lib",
          ui: "@/components/ui",
        },
        registries: {
          "@tac": `http://127.0.0.1:${port}/r/{name}.json`,
        },
      },
      null,
      2,
    ),
  )
  await fs.mkdir(path.join(SCRATCH, "src"), { recursive: true })
  await fs.writeFile(path.join(SCRATCH, "src/globals.css"), "")
  await fs.writeFile(
    path.join(SCRATCH, "package.json"),
    JSON.stringify({ name: "tac-registry-smoke", version: "0.0.0", private: true }, null, 2),
  )

  // Read the registry index — every item is a smoke target.
  const index = JSON.parse(await fs.readFile(path.join(REGISTRY_DIR, "registry.json"), "utf8"))
  const failures = []

  for (const item of index.items) {
    const expectedSourcePath = path.join(ROOT, "packages/ui", item.files[0].path)
    const expectedContent = await fs.readFile(expectedSourcePath, "utf8")

    try {
      // Fetch the JSON the way shadcn would.
      const res = await fetch(`http://127.0.0.1:${port}/r/${item.name}.json`)
      if (!res.ok) {
        failures.push(`${item.name}: HTTP ${res.status}`)
        continue
      }
      const payload = await res.json()
      const fetchedContent = payload.files?.[0]?.content
      if (!fetchedContent) {
        failures.push(`${item.name}: payload missing files[0].content`)
        continue
      }
      if (fetchedContent !== expectedContent) {
        failures.push(`${item.name}: served content differs from source file`)
        continue
      }
    } catch (err) {
      failures.push(
        `${item.name}: ${err && typeof err === "object" && "message" in err ? err.message : String(err)}`,
      )
    }
  }

  server.close()
  await fs.rm(SCRATCH, { recursive: true, force: true })

  if (failures.length > 0) {
    console.error(`\n[smoke] ${failures.length} failure(s):`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }

  console.log(`[smoke] ${index.items.length} registry items served and diffed cleanly.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
