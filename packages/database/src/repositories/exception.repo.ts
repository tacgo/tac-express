import type { SupabaseClient } from "@supabase/supabase-js"
import type { Exception, ExceptionFilters, PaginatedResult } from "@workspace/types"

export function createExceptionRepo(db: SupabaseClient) {
  return {
    async findMany(filters: ExceptionFilters = {}): Promise<PaginatedResult<Exception>> {
      const { page = 1, pageSize = 25, status, type, severity, search, dateFrom, dateTo } = filters

      let query = db.from("exceptions").select("*", { count: "exact" })

      if (status?.length) query = query.in("status", status)
      if (type?.length) query = query.in("type", type)
      if (severity?.length) query = query.in("severity", severity)
      if (search) query = query.ilike("awb_number", `%${search}%`)
      if (dateFrom) query = query.gte("created_at", dateFrom)
      if (dateTo) query = query.lte("created_at", dateTo)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order("created_at", { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: (data ?? []) as Exception[],
        total: count ?? 0,
        page,
        pageSize,
        hasMore: (count ?? 0) > page * pageSize,
      }
    },

    async findById(id: string): Promise<Exception | null> {
      const { data, error } = await db.from("exceptions").select("*").eq("id", id).single()
      if (error) throw error
      return data as Exception | null
    },

    async resolve(id: string, staffId: string, resolution: string): Promise<void> {
      const { error } = await db.rpc("resolve_exception", {
        p_exception_id: id,
        p_staff_id: staffId,
        p_resolution: resolution,
      })
      if (error) throw error
    },

    async countOpen(): Promise<number> {
      const { count, error } = await db
        .from("exceptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "OPEN")
      if (error) throw error
      return count ?? 0
    },
  }
}

export type ExceptionRepo = ReturnType<typeof createExceptionRepo>
