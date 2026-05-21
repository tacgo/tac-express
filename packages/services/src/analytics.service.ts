import type { SupabaseClient } from "@workspace/database/supabase.types"
import type {
  AnalyticsSummary,
  HubInventoryItem,
  ShipmentTrendPoint,
  RevenueTrendPoint,
  StatusDistPoint,
  HubPerfPoint,
} from "@workspace/types"

export function createAnalyticsService(db: SupabaseClient) {
  return {
    async getSummary(): Promise<AnalyticsSummary> {
      const [shipmentsRes, deliveredRes, inTransitRes, exceptionsRes, revenueRes] = await Promise.all([
        db.from("shipments").select("id", { count: "exact", head: true }),
        db.from("shipments").select("id", { count: "exact", head: true }).eq("status", "DELIVERED"),
        db.from("shipments").select("id", { count: "exact", head: true }).eq("status", "IN_TRANSIT"),
        db.from("exceptions").select("id", { count: "exact", head: true }).in("status", ["OPEN", "IN_PROGRESS"]),
        db.from("invoices").select("total_amount").eq("status", "PAID"),
      ])
      const totalRevenue = (revenueRes.data ?? []).reduce((s, r) => s + ((r as Record<string, number>).total_amount ?? 0), 0)
      return {
        totalShipments: shipmentsRes.count ?? 0,
        totalRevenue,
        deliveredCount: deliveredRes.count ?? 0,
        inTransitCount: inTransitRes.count ?? 0,
        exceptionCount: exceptionsRes.count ?? 0,
        avgDeliveryDays: 0,
      }
    },

    async getShipmentTrend(days = 30): Promise<ShipmentTrendPoint[]> {
      const since = new Date()
      since.setDate(since.getDate() - days)
      const { data, error } = await db
        .from("shipments")
        .select("created_at, status")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: true })
      if (error) throw error
      const byDay: Record<string, { shipments: number; delivered: number }> = {}
      for (const row of (data ?? []) as Array<{ created_at: string; status: string }>) {
        const day = row.created_at.slice(0, 10)
        if (!byDay[day]) byDay[day] = { shipments: 0, delivered: 0 }
        byDay[day]!.shipments++
        if (row.status === "DELIVERED") byDay[day]!.delivered++
      }
      return Object.entries(byDay).map(([date, v]) => ({ date, shipments: v.shipments, delivered: v.delivered }))
    },

    async getRevenueTrend(months = 6): Promise<RevenueTrendPoint[]> {
      const since = new Date()
      since.setMonth(since.getMonth() - months)
      const { data, error } = await db
        .from("invoices")
        .select("created_at, total_amount")
        .eq("status", "PAID")
        .gte("created_at", since.toISOString())
      if (error) throw error
      const byMonth: Record<string, number> = {}
      for (const row of (data ?? []) as Array<{ created_at: string; total_amount: number }>) {
        const month = row.created_at.slice(0, 7)
        byMonth[month] = (byMonth[month] ?? 0) + (row.total_amount ?? 0)
      }
      return Object.entries(byMonth).map(([month, revenue]) => ({ month, revenue }))
    },

    async getStatusDistribution(): Promise<StatusDistPoint[]> {
      const { data, error } = await db.from("shipments").select("status")
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of (data ?? []) as Array<{ status: string }>) {
        counts[row.status] = (counts[row.status] ?? 0) + 1
      }
      return Object.entries(counts).map(([status, count]) => ({ status, count, label: status.replace(/_/g, " ") }))
    },

    async getHubPerformance(): Promise<HubPerfPoint[]> {
      const { data, error } = await db.from("shipments").select("origin_hub, status")
      if (error) throw error
      const hubs: Record<string, { dispatched: number; delivered: number }> = {}
      for (const row of (data ?? []) as Array<{ origin_hub: string; status: string }>) {
        if (!hubs[row.origin_hub]) hubs[row.origin_hub] = { dispatched: 0, delivered: 0 }
        hubs[row.origin_hub]!.dispatched++
        if (row.status === "DELIVERED") hubs[row.origin_hub]!.delivered++
      }
      return Object.entries(hubs).map(([hub, v]) => ({ hub, dispatched: v.dispatched, delivered: v.delivered }))
    },

    async getInventoryByHub(): Promise<HubInventoryItem[]> {
      const { data, error } = await db
        .from("shipments")
        .select("dest_hub, status")
        .not("status", "in", '("DELIVERED","CANCELLED","RTO")')
      if (error) throw error
      const hubs: Record<string, HubInventoryItem> = {}
      for (const row of (data ?? []) as Array<{ dest_hub: string; status: string }>) {
        const { dest_hub: hub, status } = row
        if (!hubs[hub]) hubs[hub] = { hub, created: 0, inTransit: 0, receivedAtDest: 0, outForDelivery: 0, exception: 0, total: 0 }
        hubs[hub]!.total++
        if (["CREATED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED_AT_ORIGIN"].includes(status)) hubs[hub]!.created++
        else if (status === "IN_TRANSIT") hubs[hub]!.inTransit++
        else if (status === "RECEIVED_AT_DEST") hubs[hub]!.receivedAtDest++
        else if (status === "OUT_FOR_DELIVERY") hubs[hub]!.outForDelivery++
        else if (status === "EXCEPTION") hubs[hub]!.exception++
      }
      return Object.values(hubs)
    },
  }
}

export type AnalyticsService = ReturnType<typeof createAnalyticsService>

