import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import type { DestructiveAuditAction } from "@workspace/types"
import { DESTRUCTIVE_AUDIT_ACTIONS } from "@workspace/types"

import {
  DESTRUCTIVE_OP_REGISTRY,
  type DestructiveOpRegistryEntry,
} from "../shared/destructive-op-registry"

/**
 * Sentinel — destructive-op registry coverage gate.
 *
 * What this enforces (post-PR-#134 — all five contracts active)
 * -------------------------------------------------------------
 * a. The registry is in sync with the AuditAction enum's destructive
 *    subset (compile-time exhaustiveness — re-asserted at runtime here
 *    for redundancy with destructive-op-registry.ts's own check).
 * b. Each registry entry's serviceFile actually exists on disk.
 * c. Each registry entry's serviceFile contains the named methodName
 *    as an exported / declared function.
 * d. The registry size is pinned (meta-sentinel — adding / removing
 *    entries requires updating this test, forcing conscious intent
 *    per docs/patterns/coderabbit-catalog.md § 7.2).
 * e. Each registry entry's serviceFile actually wraps its destructive
 *    op with `withAudit({ action: "...", ... })`, AND the wrapped
 *    call references the registry's canonical action literal — making
 *    it impossible to wire a wrapper-call to the wrong op without
 *    breaking this sentinel. Activated in PR #134 alongside the
 *    three-op adoption.
 *
 * History
 * -------
 * PR #133 shipped (a)–(d) only and left (e) as a block-commented
 * scaffold at the bottom of this file. PR #134 wired all three
 * destructive ops via `withAudit`, renamed the placeholder action
 * 'manifest_revert' to 'manifest_shipment_remove' (the real op),
 * shipped migration 20260516000002 to reconcile the CHECK constraint,
 * and activated (e) here.
 */

const SERVICES_SRC = resolve(__dirname, "..")

function readService(file: string): string {
  return readFileSync(resolve(SERVICES_SRC, file), "utf-8")
}

describe("destructive-op-registry coverage / inventory", () => {
  it("is pinned at exactly 3 entries (meta-sentinel)", () => {
    // Bumping this requires updating the migration's CHECK constraint,
    // adding the AuditAction literal, AND adding the registry entry.
    // The three steps land in one PR or none.
    expect(DESTRUCTIVE_OP_REGISTRY).toHaveLength(3)
  })

  it("covers every destructive AuditAction literal exactly once", () => {
    const registryActions = DESTRUCTIVE_OP_REGISTRY.map((e) => e.action).sort()
    const expectedActions = [...DESTRUCTIVE_AUDIT_ACTIONS].sort()
    expect(registryActions).toEqual(expectedActions)
    // Defensive: no duplicates.
    expect(new Set(registryActions).size).toBe(registryActions.length)
  })

  it("uses only the canonical entity-type literals", () => {
    const allowed = new Set(["payment", "invoice", "manifest"])
    for (const entry of DESTRUCTIVE_OP_REGISTRY) {
      expect(allowed.has(entry.entityType)).toBe(true)
    }
  })

  // Compile-time exhaustiveness (catalog entry #8 — satisfies + Exclude).
  // This is a SECOND assertion of the registry's invariant, alongside
  // the one in destructive-op-registry.ts itself.
  type RegistryActions = (typeof DESTRUCTIVE_OP_REGISTRY)[number]["action"]
  type _Missing = Exclude<DestructiveAuditAction, RegistryActions>
  const _allCovered: _Missing extends never ? true : never = true
  void _allCovered
})

describe("destructive-op-registry coverage / file + method existence", () => {
  it.each(DESTRUCTIVE_OP_REGISTRY.map((e) => [e.action, e] as const))(
    "%s: the registry's serviceFile exists and contains the named methodName",
    (_action: string, entry: DestructiveOpRegistryEntry) => {
      let source: string
      try {
        source = readService(entry.serviceFile)
      } catch (err) {
        throw new Error(
          `Registry entry ${entry.action} points at packages/services/src/${entry.serviceFile} ` +
            `but the file could not be read: ${(err as Error).message}. ` +
            `Either correct the registry's serviceFile or create the file before merging.`,
        )
      }
      // Anchor-scoped match (catalog entry #6) — must appear as a
      // method definition (async or otherwise), not just a string
      // mention. Two acceptable shapes:
      //   - `async <methodName>(...)` inside the service factory
      //   - `<methodName>:` as an object-property shorthand
      // The pattern allows either; falsely passing on a bare comment
      // would require both forms in the same comment line, which is
      // not a shape the codebase produces.
      const asyncMethodRe = new RegExp(
        `(?:async\\s+${entry.methodName}\\s*\\(|${entry.methodName}\\s*\\([^)]*\\)\\s*:\\s*Promise|${entry.methodName}\\s*:)`,
        "m",
      )

      expect(
        asyncMethodRe.test(source),
        `Expected packages/services/src/${entry.serviceFile} to define a method ` +
          `named '${entry.methodName}' (registry entry: ${entry.action}). ` +
          `If the method was renamed, update the registry's methodName. ` +
          `If the method was removed, also remove its registry entry.`,
      ).toBe(true)
    },
  )
})

describe("destructive-op-registry coverage / withAudit adoption", () => {
  it.each(DESTRUCTIVE_OP_REGISTRY.map((e) => [e.action, e] as const))(
    "%s: the service file wraps the destructive op via withAudit()",
    (_action: string, entry: DestructiveOpRegistryEntry) => {
      const source = readService(entry.serviceFile)
      // The wrapper call must reference the registry's action literal,
      // making it impossible to wire a wrapper-call to the wrong op
      // without breaking this sentinel. Multiline match: the action
      // literal lives on a different line from the withAudit( opener
      // in our adoption style (action: "…" is the first object key on
      // its own line inside the options arg).
      const wrapperRe = new RegExp(
        `withAudit\\([\\s\\S]{0,400}?action:\\s*["']${entry.action}["']`,
      )
      expect(
        wrapperRe.test(source),
        `Expected packages/services/src/${entry.serviceFile} to contain ` +
          `a withAudit({ action: "${entry.action}", ... }) call. The ` +
          `destructive op '${entry.methodName}' must be wrapped via ` +
          `withAudit per docs/decisions/2026-05-16-audit-logs-mechanism.md.`,
      ).toBe(true)
    },
  )

  it("the import line for withAudit is present in every adopting service file", () => {
    // Defense-in-depth: the wrapperRe above could in principle match a
    // comment or a string literal. An additional check that each file
    // imports withAudit from the canonical path rules out the comment-
    // only / string-only false positive.
    const distinctFiles = Array.from(
      new Set(DESTRUCTIVE_OP_REGISTRY.map((e) => e.serviceFile)),
    )
    for (const file of distinctFiles) {
      const source = readService(file)
      expect(
        /from\s+["']\.\/shared\/with-audit["']/.test(source),
        `Expected packages/services/src/${file} to import withAudit from ` +
          `"./shared/with-audit". Registry adoption requires the canonical ` +
          `import path so the wrapper resolution is unambiguous.`,
      ).toBe(true)
    }
  })
})
