import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join, relative, sep } from "node:path"

const root = process.cwd()
const excludedDirs = new Set(["node_modules", ".next", "dist", "coverage", "playwright-report", ".turbo"])
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

function toRepoPath(filePath) {
  return relative(root, filePath).split(sep).join("/")
}

function fail(filePath, message) {
  errors.push(`${toRepoPath(filePath)} — ${message}`)
}

const appDatabaseImportAllowlist = new Set([
  "apps/dashboard/proxy.ts",
  "apps/web/proxy.ts",
])

for (const file of collectFiles(root)) {
  const repoPath = toRepoPath(file)
  const content = readFileSync(file, "utf8")

  if (repoPath.startsWith("apps/") && content.includes("@workspace/database/") && !appDatabaseImportAllowlist.has(repoPath)) {
    fail(file, "imports @workspace/database outside approved app auth/proxy boundary")
  }

  if (repoPath.startsWith("apps/") && (content.includes(".from(\"") || content.includes(".from('") || content.includes(".rpc(\"") || content.includes(".rpc('"))) {
    fail(file, "contains direct database query in app layer")
  }

  if (repoPath.startsWith("apps/") && content.includes("@supabase/supabase-js")) {
    fail(file, "imports @supabase/supabase-js in app layer")
  }

  if (repoPath.startsWith("apps/") && (content.includes("@clerk/") || content.includes("next-auth") || content.includes("NextAuth") || content.includes("Auth0"))) {
    fail(file, "contains stale third-party auth reference in app layer")
  }

  if (repoPath === "apps/dashboard/proxy.ts" || repoPath === "apps/web/proxy.ts") {
    if (!content.includes("createMiddlewareClient")) {
      fail(file, "proxy does not use createMiddlewareClient")
    }
    if (!content.includes("supabase.auth.getUser()")) {
      fail(file, "proxy does not verify user with Supabase auth")
    }
    if (!content.includes("return response")) {
      fail(file, "proxy does not return refreshed middleware response")
    }
  }
}

if (errors.length > 0) {
  console.error("Auth boundary audit failed:")
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log("Auth boundary audit passed")
