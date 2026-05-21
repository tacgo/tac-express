import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Exception, ExceptionFilters } from "@workspace/types"

import { withRpc } from "./shared/with-rpc"

function mapException(row: Record<string, unknown>): Exception {
  return {
    id: row.id as unknown as Exception["id"],
    awbNumber: row.awb_number as unknown as Exception["awbNumber"],
    shipmentId: row.shipment_id as unknown as Exception["shipmentId"],
    type: row.type as Exception["type"],
    severity: row.severity as Exception["severity"],
    status: row.status as Exception["status"],
    description: row.description as string,
    resolution: (row.resolution as string) ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    reportedBy: row.reported_by as unknown as Exception["reportedBy"],
    resolvedBy: row.resolved_by ? (row.resolved_by as unknown as Exception["resolvedBy"]) : undefined,
    resolvedAt: (row.resolved_at as string) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createExceptionService(db: SupabaseClient) {
  return {
    async getExceptions(filters: ExceptionFilters = {}): Promise<Exception[]> {
      const { status, severity, type, search, dateFrom, dateTo, page = 1, pageSize = 50 } = filters
      let query = db.from("exceptions").select("*").order("created_at", { ascending: false })
      if (status?.length) query = query.in("status", status)
      if (severity?.length) query = query.in("severity", severity)
      if (type?.length) query = query.in("type", type)
      if (search) query = query.ilike("awb_number", `%${search}%`)
      if (dateFrom) query = query.gte("created_at", dateFrom)
      if (dateTo) query = query.lte("created_at", dateTo)
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map((r) => mapException(r as Record<string, unknown>))
    },

    async getExceptionById(id: string): Promise<Exception | null> {
      const { data, error } = await db.from("exceptions").select("*").eq("id", id).single()
      if (error) throw error
      return data ? mapException(data as Record<string, unknown>) : null
    },

    async resolveException(id: string, resolution: string): Promise<void> {
      const { error } = await withRpc("resolve_exception", () =>
        db.rpc("resolve_exception", {
          p_exception_id: id,
          p_staff_id: null,
          p_resolution: resolution,
        }),
      )
      if (error) throw error
    },

    async createException(payload: {
      awbNumber?: string
      shipmentId?: string
      type: string
      severity: string
      description: string
    }): Promise<Exception> {
      const { data, error } = await db
        .from("exceptions")
        .insert({
          awb_number: payload.awbNumber ?? null,
          shipment_id: payload.shipmentId ?? null,
          type: payload.type,
          severity: payload.severity,
          description: payload.description,
        })
        .select()
        .single()
      if (error) throw error
      return mapException(data as Record<string, unknown>)
    },

    async countOpen(): Promise<number> {
      const { count, error } = await db
        .from("exceptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["OPEN", "IN_PROGRESS"])
      if (error) throw error
      return count ?? 0
    },
  }
}

export type ExceptionService = ReturnType<typeof createExceptionService>

