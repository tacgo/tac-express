import type { UUID } from "./domain.types"

/**
 * AuditAction — the action types that may appear in audit_logs.action.
 *
 * The first three values are the CANONICAL DESTRUCTIVE ACTIONS — they
 * trigger the database CHECK constraint
 * `audit_logs_destructive_action_check` (added in migration
 * 20260516000001) that requires both entity_id and before_state to be
 * non-null. They are also the values listed in
 * `packages/services/src/shared/destructive-op-registry.ts`, and the
 * sentinel test fails if any service method handling these actions is
 * not wrapped by `withAudit()`.
 *
 * The remaining values are HISTORICAL non-destructive actions that
 * already exist in the schema via SECURITY DEFINER RPCs
 * (resolve_exception → 'RESOLVED', update_shipment_status →
 * 'STATUS_CHANGE'). The CHECK constraint does not constrain them.
 *
 * Adding a new destructive action requires:
 *   1. Extending the database CHECK constraint (new migration)
 *   2. Adding the literal here
 *   3. Adding a registry entry in destructive-op-registry.ts
 *   4. Wiring the corresponding service method via withAudit()
 *
 * The exhaustiveness sentinel in destructive-op-registry.test.ts will
 * fail compilation if (2) is done without (3).
 */
export type AuditAction =
  // Destructive (database-CHECK-constrained — require entity_id + before_state)
  | "payment_delete"
  | "invoice_cancel"
  // PR #134: renamed from 'manifest_revert' (placeholder that pointed at a
  // method that didn't exist) to 'manifest_shipment_remove' (the real
  // destructive op — removeShipmentFromManifest). Migration
  // 20260516000002 dropped the legacy value from the CHECK constraint
  // pre-flight-verifying zero existing rows used it. See the migration
  // header + the PR #134 PHASE-0 reconciliation for the full rationale.
  | "manifest_shipment_remove"
  // Historical non-destructive (kept for back-compat with existing RPC inserts)
  | "STATUS_CHANGE"
  | "RESOLVED"
  // Invoice lifecycle state-changes (non-destructive; audit-after pattern)
  | "invoice_issue"
  | "invoice_mark_paid"

export const DESTRUCTIVE_AUDIT_ACTIONS = [
  "payment_delete",
  "invoice_cancel",
  "manifest_shipment_remove",
] as const satisfies readonly AuditAction[]

export type DestructiveAuditAction = (typeof DESTRUCTIVE_AUDIT_ACTIONS)[number]

/**
 * AuditEntityType — the entity types that destructive-op audit rows
 * refer to. Free-form `string` is permitted at the DB layer (historical
 * inserts use 'shipment', 'exception'), but destructive-op rows are
 * constrained to these three at the TypeScript boundary.
 */
export type DestructiveAuditEntityType =
  | "payment"
  | "invoice"
  | "manifest"

export interface AuditLog {
  id: UUID
  userId: UUID | null
  action: AuditAction
  entityType: string
  entityId: UUID | null
  description: string
  /**
   * Row-snapshot of the destroyed / changed entity, captured at the
   * moment of the destructive op. NULL for non-destructive actions; the
   * DB CHECK constraint enforces NOT NULL for the three destructive
   * actions. JSONB at the storage layer.
   */
  beforeState: Record<string, unknown> | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AuditLogFilters {
  userId?: UUID
  entityType?: string
  entityId?: UUID
  action?: AuditAction
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}
