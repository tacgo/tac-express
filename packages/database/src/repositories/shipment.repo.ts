import type { SupabaseClient } from "@supabase/supabase-js"
import type { ShipmentSummary, ShipmentFilters, PaginatedResult, Shipment } from "@workspace/types"

export function createShipmentRepo(db: SupabaseClient) {
  return {
    async findMany(
      filters: ShipmentFilters = {}
    ): Promise<PaginatedResult<ShipmentSummary>> {
      const {
        page = 1,
        pageSize = 25,
        status,
        originHub,
        destHub,
        paymentMode,
        serviceLevel,
        search,
        dateFrom,
        dateTo,
        manifestId,
      } = filters

      let query = db.from("shipments").select("*", { count: "exact" })

      if (status?.length) query = query.in("status", status)
      if (originHub) query = query.eq("origin_hub", originHub)
      if (destHub) query = query.eq("dest_hub", destHub)
      if (paymentMode) query = query.eq("payment_mode", paymentMode)
      if (serviceLevel) query = query.eq("service_level", serviceLevel)
      if (manifestId) query = query.eq("manifest_id", manifestId)
      if (search) query = query.ilike("awb_number", `%${search}%`)
      if (dateFrom) query = query.gte("created_at", dateFrom)
      if (dateTo) query = query.lte("created_at", dateTo)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order("created_at", { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: (data ?? []) as ShipmentSummary[],
        total: count ?? 0,
        page,
        pageSize,
        hasMore: (count ?? 0) > page * pageSize,
      }
    },

    async findById(id: string): Promise<Shipment | null> {
      const { data, error } = await db
        .from("shipments")
        .select("*, tracking_events(*)")
        .eq("id", id)
        .single()
      if (error) throw error
      return data as Shipment | null
    },

    async findByAwb(awb: string): Promise<Shipment | null> {
      const { data, error } = await db
        .from("shipments")
        .select("*, tracking_events(*)")
        .eq("awb_number", awb)
        .single()
      if (error) throw error
      return data as Shipment | null
    },

    async create(payload: Record<string, unknown>): Promise<Shipment> {
      const { data, error } = await db
        .from("shipments")
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Shipment
    },

    async updateStatus(
      id: string,
      status: string,
      staffId: string,
      notes?: string
    ): Promise<void> {
      const { error } = await db.rpc("update_shipment_status", {
        p_shipment_id: id,
        p_new_status: status,
        p_staff_id: staffId,
        p_notes: notes ?? null,
      })
      if (error) throw error
    },

    async countByStatus(): Promise<Record<string, number>> {
      const { data, error } = await db.rpc("count_shipments_by_status")
      if (error) throw error
      return data as Record<string, number>
    },
  }
}

export type ShipmentRepo = ReturnType<typeof createShipmentRepo>
