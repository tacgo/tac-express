// withAudit — canonical wrapper for destructive service operations.
//
// Decision doc: docs/decisions/2026-05-16-audit-logs-mechanism.md (Option C)
// Registry: ./destructive-op-registry.ts
//
// Contract
// --------
// Every service method that performs an op in
// DESTRUCTIVE_OP_REGISTRY MUST wrap its destructive work via this
// function. The sentinel test
// `__tests__/destructive-op-registry-coverage.test.ts` asserts the
// adoption (PR 2 onwards).
//
// Ordering (load-bearing — see decision doc § 3)
// ----------------------------------------------
//   1. Caller captures before_state by reading the row to be destroyed.
//   2. Caller invokes withAudit({ ...meta, beforeState }, () => destructiveOp()).
//   3. withAudit INSERTs the audit row.
//   4. If audit INSERT fails → THROW. destructiveOp NEVER RUNS.
//      (no audit = no destruction)
//   5. withAudit invokes destructiveOp.
//   6. If destructiveOp fails → re-throw. Audit row is preserved as
//      forensic signal (an "attempt without effect" record).
//   7. If destructiveOp succeeds → return its result to the caller.
//
// Why audit-first (vs op-first)
// -----------------------------
// op-first leaves a window where the destructive write succeeded but
// the audit write didn't — silent destruction. That's exactly the
// failure mode an audit log exists to prevent. audit-first leaves a
// window where the audit row was written but the destructive write
// didn't — observable orphan, recoverable by the auditor noticing the
// attempt-vs-effect mismatch. Both are inconsistent records; the second
// is observable.
//
// Atomicity gap
// -------------
// The two writes (audit INSERT, destructive op) are separate PostgREST
// round-trips. True single-transaction atomicity requires Option A
// (SECURITY DEFINER RPC bundling both). For the three current
// destructive ops, the JS-side wrapper is the right tradeoff; see the
// decision doc § 4 for the full reasoning. Per-op upgrade to Option A
// is a one-line registry edit + one-line service edit.
//
// PII / Sentry posture
// --------------------
// On audit-INSERT failure we capture an exception via
// `emitTaggedException` with deterministic tags only (no row data).
// before_state is intentionally NOT captured to Sentry — it contains
// the destroyed record's full row, which may include customer PII /
// financial fields. If audit-write failure spikes in production,
// investigate via DB logs + structured server logs, not Sentry payload
// inspection.

import type { SupabaseClient } from "@workspace/database/supabase.types"
import type {
  DestructiveAuditAction,
  DestructiveAuditEntityType,
} from "@workspace/types"

import { createAuditService } from "../audit.service"
import { emitTaggedException, type TagMap } from "./sentry-tagger"

/**
 * Stable tag-key contract for audit-write failures emitted to Sentry.
 * Exported so a future cross-package sentinel test can verify that any
 * Sentry alert rule keyed off these tags references only keys actually
 * emitted here (same pattern as SUPABASE_RPC_TAG_KEYS).
 */
export const AUDIT_WRITE_TAG_KEYS = {
  audit: "audit.write_failed",
  action: "audit.action",
  entityType: "audit.entity_type",
} as const

/**
 * Discriminator for "the audit-row INSERT failed". Distinct from a
 * generic Error so callers / instrumentation can branch via
 * `.code === "AUDIT_WRITE_FAILED"` across package boundaries.
 *
 * This error is thrown BEFORE the destructive op runs. Treat it as a
 * hard refusal: the destructive op did not happen, and the user should
 * retry rather than assume the operation succeeded.
 */
export class AuditWriteFailedError extends Error {
  readonly code = "AUDIT_WRITE_FAILED" as const
  readonly action: DestructiveAuditAction
  readonly entityType: DestructiveAuditEntityType
  readonly entityId: string
  /** The underlying Postgres / PostgREST error (for diagnostics). */
  readonly cause: unknown

  constructor(input: {
    action: DestructiveAuditAction
    entityType: DestructiveAuditEntityType
    entityId: string
    cause: unknown
  }) {
    super(
      `Audit-write failed for ${input.action} on ${input.entityType} ${input.entityId}; ` +
        `destructive op was NOT executed. Retry the operation; if the failure persists, ` +
        `investigate audit_logs availability before bypassing this guard.`,
    )
    this.name = "AuditWriteFailedError"
    this.action = input.action
    this.entityType = input.entityType
    this.entityId = input.entityId
    this.cause = input.cause
  }
}

export interface WithAuditInput {
  action: DestructiveAuditAction
  entityType: DestructiveAuditEntityType
  entityId: string
  /**
   * Row-snapshot of the entity being destroyed / reverted. Required —
   * the DB CHECK constraint
   * `audit_logs_destructive_action_check` rejects destructive-action
   * inserts with a null before_state. The caller is responsible for
   * fetching this BEFORE invoking withAudit; passing a stale or
   * partial snapshot defeats the forensic purpose.
   */
  beforeState: Record<string, unknown>
  /**
   * Optional human-readable description (e.g., "Payment removed by
   * operator for refund processing"). Joined with the action +
   * entity_id for analyst readability; not load-bearing for
   * reconstruction (that's beforeState's job).
   */
  description?: string
  /**
   * Optional metadata bag for non-row context — reason codes,
   * upstream-request ids, the user-agent string of the operator,
   * anything that's signal-without-being-PII. Avoid putting the
   * destroyed row's fields here; they belong in beforeState.
   */
  metadata?: Record<string, unknown>
}

/**
 * Wrap a destructive service operation with audit-first / fail-loud
 * audit-logging.
 *
 * @example
 * ```ts
 * async deletePayment(id: string): Promise<void> {
 *   const { data: row } = await db
 *     .from("invoice_payments").select("*").eq("id", id).single()
 *   if (!row) return  // already gone — nothing to audit, nothing to delete
 *   await withAudit(db, {
 *     action: "payment_delete",
 *     entityType: "payment",
 *     entityId: id,
 *     beforeState: row,
 *   }, async () => {
 *     const { error } = await db.from("invoice_payments").delete().eq("id", id)
 *     if (error) throw error
 *   })
 * }
 * ```
 *
 * @throws AuditWriteFailedError if the audit row cannot be written.
 *         The destructive op did NOT run.
 * @throws Whatever the destructiveOp throws. The audit row IS preserved.
 */
export async function withAudit<T>(
  db: SupabaseClient,
  input: WithAuditInput,
  destructiveOp: () => Promise<T>,
): Promise<T> {
  const audit = createAuditService(db)

  try {
    await audit.logEvent({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      description: input.description,
      beforeState: input.beforeState,
      metadata: input.metadata,
    })
  } catch (err) {
    // Emit deterministic tags only — see the PII note at the top of
    // this file. Do NOT pass the err object verbatim; it may include
    // a Supabase response body that echoes the failed INSERT payload.
    const tags: TagMap = {
      [AUDIT_WRITE_TAG_KEYS.audit]: "true",
      [AUDIT_WRITE_TAG_KEYS.action]: input.action,
      [AUDIT_WRITE_TAG_KEYS.entityType]: input.entityType,
    }
    const wrapped = new AuditWriteFailedError({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      cause: err,
    })
    emitTaggedException(wrapped, tags)
    throw wrapped
  }

  // Audit row is committed. Now run the destructive op. If it throws,
  // the audit row stays — that's intentional (forensic "attempt"
  // record).
  return destructiveOp()
}
