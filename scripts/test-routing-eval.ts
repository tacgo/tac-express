#!/usr/bin/env tsx
/**
 * test-routing-eval.ts
 *
 * Runs the routing-dispatcher eval against `.claude/skills/evals/routing.jsonl`.
 *
 * Closes #50. Each JSONL line is one real-world user phrase paired with
 * the skill(s) the resolver should dispatch to. This runner is a static
 * checker — it does NOT invoke an LLM, because:
 *
 *   1. We don't have a deterministic local model to score against.
 *   2. The cheapest, highest-signal check is structural: every expected
 *      skill must (a) exist on disk and (b) be referenced from the
 *      RESOLVER.md dispatch table. If those break, the eval entry is
 *      pointing to a ghost — humans will dispatch wrong too.
 *
 * What this runner checks per entry:
 *
 *   - JSON parses
 *   - `intent` is a non-empty string
 *   - `expected` is a non-empty array of strings
 *   - Every entry in `expected` corresponds to a real skill on disk
 *     (.claude/skills/<name>/SKILL.md exists) OR is a valid conventions/
 *     path
 *   - Every entry in `expected` is referenced somewhere in RESOLVER.md
 *     (substring match — the dispatcher must know about it)
 *
 * Usage:
 *   pnpm test:routing-eval
 *   pnpm test:routing-eval --verbose      # print each passing entry too
 */

import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")
const EVAL_FILE = join(ROOT, ".claude/skills/evals/routing.jsonl")
const RESOLVER_FILE = join(ROOT, ".claude/skills/RESOLVER.md")
const SKILLS_DIR = join(ROOT, ".claude/skills")

const verbose = process.argv.includes("--verbose")

interface EvalEntry {
  intent: string
  expected: string[]
  tags?: string[]
}

interface Failure {
  lineNumber: number
  intent: string
  reasons: string[]
}

function readFile(p: string): string {
  try {
    return readFileSync(p, "utf-8")
  } catch {
    return ""
  }
}

function listSkillDirs(): Set<string> {
  const out = new Set<string>()
  try {
    for (const entry of readdirSync(SKILLS_DIR)) {
      const full = join(SKILLS_DIR, entry)
      if (statSync(full).isDirectory()) {
        try {
          statSync(join(full, "SKILL.md"))
          out.add(entry)
        } catch {
          /* no SKILL.md — not a skill dir */
        }
      }
    }
  } catch {
    /* dir doesn't exist */
  }
  return out
}

function parseEntries(content: string): Array<{ entry: EvalEntry | null; raw: string; lineNumber: number; parseError?: string }> {
  const lines = content.split("\n")
  const out: Array<{ entry: EvalEntry | null; raw: string; lineNumber: number; parseError?: string }> = []
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw || raw.trim().length === 0 || raw.trim().startsWith("//")) continue
    try {
      const parsed = JSON.parse(raw) as EvalEntry
      out.push({ entry: parsed, raw, lineNumber: i + 1 })
    } catch (err) {
      out.push({
        entry: null,
        raw,
        lineNumber: i + 1,
        parseError: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return out
}

function validate(entry: EvalEntry, ctx: { skillDirs: Set<string>; resolverText: string }): string[] {
  const errs: string[] = []
  if (typeof entry.intent !== "string" || entry.intent.length === 0) {
    errs.push("missing or empty 'intent' field")
  }
  if (!Array.isArray(entry.expected) || entry.expected.length === 0) {
    errs.push("missing or empty 'expected' array")
    return errs
  }
  for (const exp of entry.expected) {
    if (typeof exp !== "string") {
      errs.push(`'expected' contains non-string entry: ${JSON.stringify(exp)}`)
      continue
    }
    // Accept either a real skill dir, a path inside conventions/, or a path inside docs/.
    const isSkill = ctx.skillDirs.has(exp)
    const isConvention = exp.startsWith("conventions/")
    const isDoc = exp.startsWith("docs/")
    
    if (isDoc) {
      try {
        statSync(join(ROOT, exp))
      } catch {
        errs.push(`expected doc "${exp}" does not exist on disk`)
        continue
      }
    } else if (!isSkill && !isConvention) {
      errs.push(`expected skill "${exp}" has no matching .claude/skills/${exp}/SKILL.md`)
      continue
    }
    // Verify the resolver knows about this entry — substring search is
    // good enough; RESOLVER.md references skills as `tac-foo` and
    // conventions as `conventions/<name>.md`, both of which contain the
    // bare-name substring. Applied to BOTH skills AND convention paths so
    // a ghost convention reference in the eval can't slip past validation
    // (header contract: "every expected entry is referenced from RESOLVER").
    if (!ctx.resolverText.includes(exp)) {
      errs.push(`expected entry "${exp}" is not referenced anywhere in RESOLVER.md`)
    }
  }
  return errs
}

function main() {
  console.log("\n╔══════════════════════════════════════════════════╗")
  console.log("║  TAC Express — Routing Eval (closes #50)         ║")
  console.log("╚══════════════════════════════════════════════════╝\n")

  const evalContent = readFile(EVAL_FILE)
  if (!evalContent) {
    console.error(`❌ Cannot read ${EVAL_FILE}`)
    process.exit(1)
  }
  const resolverText = readFile(RESOLVER_FILE)
  if (!resolverText) {
    console.error(`❌ Cannot read ${RESOLVER_FILE}`)
    process.exit(1)
  }
  const skillDirs = listSkillDirs()
  console.log(`Found ${skillDirs.size} skill(s) on disk.`)

  const parsed = parseEntries(evalContent)
  const failures: Failure[] = []
  let passing = 0

  for (const { entry, raw, lineNumber, parseError } of parsed) {
    if (parseError || !entry) {
      failures.push({
        lineNumber,
        intent: raw.slice(0, 80),
        reasons: [`JSON parse error: ${parseError ?? "unknown"}`],
      })
      continue
    }
    const errs = validate(entry, { skillDirs, resolverText })
    if (errs.length > 0) {
      failures.push({ lineNumber, intent: entry.intent, reasons: errs })
    } else {
      passing++
      if (verbose) console.log(`  ✅ line ${lineNumber}: "${entry.intent}" → ${entry.expected.join(", ")}`)
    }
  }

  console.log(`\nResults: ${passing} passing, ${failures.length} failing (of ${parsed.length} total entries)\n`)

  if (failures.length > 0) {
    for (const f of failures) {
      console.log(`  ❌ line ${f.lineNumber}: "${f.intent}"`)
      for (const r of f.reasons) console.log(`       - ${r}`)
    }
    console.log("")
    process.exit(1)
  }

  console.log("✅ All routing-eval entries valid (every expected skill exists + is reachable from RESOLVER.md).\n")
}

main()
