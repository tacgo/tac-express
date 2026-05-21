// DESTRUCTIVE_OP_REGISTRY — canonical inventory of audit-required
// destructive operations.
//
// Decision doc: docs/decisions/2026-05-16-audit-logs-mechanism.md (Option C)
//
// What this is
// ------------
// A hardcoded, typed registry of every destructive operation that MUST
// be audited via `withAudit()`. The sentinel test
// `__tests__/destructive-op-registry-coverage.test.ts` is the forcing
// function: it fails CI if:
//
//   1. A new AuditAction destructive value is added to
//      packages/types/src/audit.types.ts without a matching registry
//      entry (compile-time enforced via the
//      `Exclude<DestructiveAuditAction, REGISTRY_ACTIONS[number]>`
//      exhaustiveness check below)
//
//   2. A registry entry's `serviceFile` does not contain a `withAudit(`
//      call paired with the registry's `action` literal (in PR 2 — this
//      half of the contract is asserted once adoption lands; PR 1 ships
//      the registry + wrapper + the meta-exhaustiveness check, and
//      defers the per-method adoption assertion to PR 2)
//
//   3. The registry shrinks below its committed minimum size without an
//      intentional release-note (the meta-sentinel asserts
//      REGISTRY.length === 3 — bumping requires updating the test)
//
// What this is NOT
// ----------------
// - Not a list of every destructive SQL statement in the codebase.
//   Status transitions, manifest-shipment removals, and other non-
//   primary-record mutations are intentionally excluded (see decision
//   doc § 5.2).
// - Not a runtime feature flag. The registry has no effect on app
//   behaviour; it exists purely to make the sentinel test possible.
//
// Adding a new destructive op
// ---------------------------
//   1. Add a new literal to AuditAction in packages/types/src/audit.types.ts
//      AND to DESTRUCTIVE_AUDIT_ACTIONS in the same file.
//   2. Extend the DB CHECK constraint
//      audit_logs_destructive_action_check in a new migration.
//   3. Add a registry entry below.
//   4. Wire the service method via withAudit() — the sentinel test will
//      go green once steps 1-4 are complete.

import type { DestructiveAuditAction, DestructiveAuditEntityType } from "@workspace/types"

export interface DestructiveOpRegistryEntry {
  /** The AuditAction literal that identifies this destructive op. */
  action: DestructiveAuditAction
  /** The entity type whose record is being destroyed / reverted. */
  entityType: DestructiveAuditEntityType
  /**
   * The service file (relative to packages/services/src/) where the
   * destructive method lives. The sentinel test reads this file and
   * asserts a `withAudit(` call is present, paired with the
   * `action` literal.
   */
  serviceFile: string
  /**
   * The exported function-property name on the service that performs
   * the destructive op. Used for documentation only — the sentinel
   * test matches by action literal, not by method name, so a rename
   * is mechanical (the registry entry is updated alongside).
   */
  methodName: string
  /**
   * One-line description for the registry's own readability and for
   * future contributors choosing where to add new entries.
   */
  description: string
}

/**
 * The registry. Each entry maps a destructive AuditAction to the
 * service method that performs the op. The order is documentation
 * only — the sentinel uses the action literal as the join key.
 */
export const DESTRUCTIVE_OP_REGISTRY: readonly DestructiveOpRegistryEntry[] = [
  {
    action: "payment_delete",
    entityType: "payment",
    serviceFile: "payment.service.ts",
    methodName: "deletePayment",
    description:
      "Hard-deletes a row from invoice_payments. Removes ledger entry; cannot be recovered without before_state forensic record.",
  },
  {
    action: "invoice_cancel",
    entityType: "invoice",
    serviceFile: "invoice.service.ts",
    methodName: "cancelInvoice",
    description:
      "Transitions an invoice to CANCELLED status from DRAFT or ISSUED. Reverses billing intent; downstream payments and receivables require manual reconciliation.",
  },
  {
    // PR #134 reconciliation: this entry was 'manifest_revert' in PR
    // #133, pointing at a method (revertManifest) that didn't exist in
    // the codebase. PR #134's PHASE-0 reconciliation decided NOT to
    // build that method — building destruction capability solely to
    // give the audit system a hook is backwards. The real destructive
    // op on manifest-shape state is removeShipmentFromManifest (hard-
    // delete of a join row), which now carries the audit hook.
    // Migration 20260516000002 renamed the CHECK constraint enum
    // value to match.
    action: "manifest_shipment_remove",
    entityType: "manifest",
    serviceFile: "manifest.service.ts",
    methodName: "removeShipmentFromManifest",
    description:
      "Hard-deletes a row from manifest_shipments (the join table linking a manifest to one of its AWBs). Removes operational record of the shipment-manifest association; before_state forensic record carries the join row + the affected awb_number + manifest_id so the association can be reconstructed.",
  },
] as const

/**
 * Compile-time exhaustiveness gate (catalog entry #8 — satisfies +
 * Exclude). If a new DestructiveAuditAction literal is added to
 * packages/types/src/audit.types.ts without a matching registry entry
 * above, this assertion fails to type-check.
 *
 * The `void` reference silences no-unused-vars; the type-check IS the
 * assertion.
 */
type RegistryActions = (typeof DESTRUCTIVE_OP_REGISTRY)[number]["action"]
type _MissingRegistryEntries = Exclude<DestructiveAuditAction, RegistryActions>
const _allDestructiveActionsRegistered: _MissingRegistryEntries extends never
  ? true
  : never = true
void _allDestructiveActionsRegistered
