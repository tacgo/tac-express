import type { SupabaseClient } from "@supabase/supabase-js"
import type { Manifest, ManifestSummary, ManifestFilters, PaginatedResult } from "@workspace/types"

export function createManifestRepo(db: SupabaseClient) {
  return {
    async findMany(
      filters: ManifestFilters = {}
    ): Promise<PaginatedResult<ManifestSummary>> {
      const { page = 1, pageSize = 25, status, originHub, destHub, search, dateFrom, dateTo } = filters

      let query = db.from("manifests").select("*", { count: "exact" })

      if (status?.length) query = query.in("status", status)
      if (originHub) query = query.eq("origin_hub", originHub)
      if (destHub) query = query.eq("dest_hub", destHub)
      if (search) query = query.ilike("manifest_number", `%${search}%`)
      if (dateFrom) query = query.gte("created_at", dateFrom)
      if (dateTo) query = query.lte("created_at", dateTo)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order("created_at", { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: (data ?? []) as ManifestSummary[],
        total: count ?? 0,
        page,
        pageSize,
        hasMore: (count ?? 0) > page * pageSize,
      }
    },

    async findById(id: string): Promise<Manifest | null> {
      const { data, error } = await db
        .from("manifests")
        .select("*, manifest_shipments(*, shipments(awb_number, status, pieces, chargeable_weight))")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as Manifest | null
    },

    async create(payload: Record<string, unknown>): Promise<Manifest> {
      const { data, error } = await db
        .from("manifests")
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Manifest
    },

    async addShipment(manifestId: string, awbNumber: string, staffId: string): Promise<void> {
      const { error } = await db.rpc("add_shipment_to_manifest", {
        p_manifest_id: manifestId,
        p_awb_number: awbNumber,
        p_staff_id: staffId,
      })
      if (error) throw error
    },

    async closeManifest(manifestId: string, staffId: string): Promise<void> {
      const { error } = await db.rpc("close_manifest_atomic", {
        p_manifest_id: manifestId,
        p_staff_id: staffId,
      })
      if (error) throw error
    },

    async departManifest(manifestId: string, staffId: string): Promise<void> {
      const { error } = await db.rpc("depart_manifest", {
        p_manifest_id: manifestId,
        p_staff_id: staffId,
      })
      if (error) throw error
    },

    async arriveManifest(manifestId: string, staffId: string): Promise<void> {
      const { error } = await db.rpc("arrive_manifest", {
        p_manifest_id: manifestId,
        p_staff_id: staffId,
      })
      if (error) throw error
    },
  }
}

export type ManifestRepo = ReturnType<typeof createManifestRepo>
