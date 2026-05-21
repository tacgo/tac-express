// Audit-log service — read + write surface for public.audit_logs.
//
// Schema reference: supabase/migrations/20260515000001_baseline_from_production.sql
//   (audit_logs table) + 20260516000001_audit_logs_destructive_op_hardening.sql
//   (before_state column + destructive-action CHECK constraint).
//
// Decision doc: docs/decisions/2026-05-16-audit-logs-mechanism.md
//
// History note (cast-comment-as-bug-ticket pattern):
//   Prior to migration 20260516000001 this file's `logEvent` inserted
//   columns named `old_values`, `new_values`, `ip_address`, `user_agent`
//   that DID NOT EXIST in the audit_logs schema. The only caller of this
//   service was `listAuditLogs` (via the use-audit-logs hook), so the
//   broken `logEvent` was orphaned and the bug never fired. This rewrite
//   aligns the service with the schema as part of the audit-logs
//   destructive-op hardening (#102 risk-rank #1).

import type { SupabaseClient } from "@workspace/database/supabase.types"
import type {
  AuditAction,
  AuditLog,
  AuditLogFilters,
  PaginatedResult,
} from "@workspace/types"
import { clampPagination } from "@workspace/types"

function mapAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: row.id as AuditLog["id"],
    userId: (row.user_id as AuditLog["userId"]) ?? null,
    action: row.action as AuditLog["action"],
    entityType: row.entity_type as string,
    entityId: (row.entity_id as AuditLog["entityId"]) ?? null,
    description: (row.description as string) ?? "",
    beforeState: (row.before_state as AuditLog["beforeState"]) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }
}

export interface LogEventInput {
  action: AuditAction
  entityType: string
  entityId?: string | null
  description?: string
  /**
   * Row-snapshot of the destroyed / changed entity. REQUIRED for any
   * destructive AuditAction (`payment_delete`, `invoice_cancel`,
   * `manifest_revert`) — the database CHECK constraint will reject the
   * insert otherwise. NULL is permitted for non-destructive actions.
   */
  beforeState?: Record<string, unknown> | null
  metadata?: Record<string, unknown>
}

export function createAuditService(db: SupabaseClient) {
  return {
    async listAuditLogs(filters: AuditLogFilters = {}): Promise<PaginatedResult<AuditLog>> {
      const { page, pageSize } = clampPagination({
        page: filters.offset !== undefined ? Math.floor(filters.offset / (filters.limit ?? 25)) + 1 : 1,
        pageSize: filters.limit,
      })
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = db
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (filters.userId) query = query.eq("user_id", filters.userId)
      if (filters.entityType) query = query.eq("entity_type", filters.entityType)
      if (filters.entityId) query = query.eq("entity_id", filters.entityId)
      if (filters.action) query = query.eq("action", filters.action)
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom)
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo)

      const { data, error, count } = await query
      if (error) throw error

      const total = count ?? 0
      return {
        data: (data ?? []).map((row) => mapAuditLog(row as Record<string, unknown>)),
        total,
        page,
        pageSize,
        hasMore: from + (data?.length ?? 0) < total,
      }
    },

    /**
     * Insert a single audit-log row. Direct callers should be rare — the
     * canonical write path for destructive ops is the `withAudit()`
     * wrapper at packages/services/src/shared/with-audit.ts, which
     * delegates here. Surfacing the raw method is justified for
     * non-destructive cases (manual moderator actions, future event
     * types that don't fit the destructive-op shape).
     *
     * Throws on insert failure. The caller is responsible for deciding
     * whether to swallow the error or propagate; `withAudit()` propagates
     * (audit-first / fail-loud — see the decision doc).
     */
    async logEvent(input: LogEventInput): Promise<void> {
      const { error } = await db.from("audit_logs").insert({
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId ?? null,
        description: input.description ?? "",
        before_state: input.beforeState ?? null,
        metadata: input.metadata ?? {},
      })
      if (error) throw error
    },
  }
}

export type AuditService = ReturnType<typeof createAuditService>
