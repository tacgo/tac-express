import type { SupabaseClient } from "@workspace/database/supabase.types"

export interface KPIData {
  activeShipments: number
  inTransit: number
  delivered: number
  openExceptions: number
  totalRevenueToday: number
  pendingInvoices: number
  activeManifests: number
  shipmentsCreatedToday: number
}

export type ActivityType = "shipment" | "manifest" | "exception" | "scan" | "invoice"

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  description: string
  timestamp: string
  link?: string
  userId?: string
}

export interface OperationalIndicator {
  key: string
  label: string
  value: number
  target: number
  status: "ok" | "warn" | "fail"
  unit?: "count" | "percent"
}

export interface OperationalHealth {
  score: number
  status: "healthy" | "degraded" | "critical"
  indicators: OperationalIndicator[]
}

export interface SLABreach {
  shipmentId: string
  awbNumber: string
  status: string
  originHub: string
  destHub: string
  serviceLevel: string
  expectedDelivery: string
  hoursBreached: number
}

export interface SidebarBadgeCounts {
  openExceptions: number
  openManifests: number
  pendingInvoices: number
  unreadNotifications: number
}

function mapActivity(row: Record<string, unknown>): ActivityItem {
  const entityType = (row.entity_type as string) ?? "shipment"
  const action = (row.action as string) ?? "UPDATE"
  const type: ActivityType =
    entityType === "shipment" ||
    entityType === "manifest" ||
    entityType === "exception" ||
    entityType === "invoice" ||
    entityType === "scan"
      ? (entityType as ActivityType)
      : "shipment"
  const entityId = row.entity_id as string | undefined
  return {
    id: row.id as string,
    type,
    title: action,
    description: (row.description as string) ?? `${action} on ${entityType}`,
    timestamp: row.created_at as string,
    link: entityId ? `/${entityType}s/${entityId}` : undefined,
    userId: (row.user_id as string) ?? undefined,
  }
}

function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function startOfWeekIso(): string {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export function createDashboardService(db: SupabaseClient) {
  return {
    async getKPIs(): Promise<KPIData> {
      const todayIso = startOfTodayIso()

      const [
        activeRes,
        inTransitRes,
        deliveredRes,
        exceptionsRes,
        revenueRes,
        invoicesRes,
        manifestsRes,
        createdTodayRes,
      ] = await Promise.all([
        db.from("shipments").select("*", { count: "exact", head: true }).not("status", "in", '("DELIVERED","CANCELLED")'),
        db.from("shipments").select("*", { count: "exact", head: true }).eq("status", "IN_TRANSIT"),
        db.from("shipments").select("*", { count: "exact", head: true }).eq("status", "DELIVERED").gte("delivered_at", todayIso),
        db.from("exceptions").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
        db.from("invoices").select("total_amount").eq("status", "PAID").gte("paid_at", todayIso),
        db.from("invoices").select("*", { count: "exact", head: true }).eq("status", "ISSUED"),
        db.from("manifests").select("*", { count: "exact", head: true }).not("status", "in", '("RECONCILED","CANCELLED")'),
        db.from("shipments").select("*", { count: "exact", head: true }).gte("created_at", todayIso),
      ])

      const totalRevenueToday = (revenueRes.data ?? []).reduce(
        (sum: number, row: { total_amount: number }) => sum + (row.total_amount ?? 0),
        0
      )

      return {
        activeShipments: activeRes.count ?? 0,
        inTransit: inTransitRes.count ?? 0,
        delivered: deliveredRes.count ?? 0,
        openExceptions: exceptionsRes.count ?? 0,
        totalRevenueToday,
        pendingInvoices: invoicesRes.count ?? 0,
        activeManifests: manifestsRes.count ?? 0,
        shipmentsCreatedToday: createdTodayRes.count ?? 0,
      }
    },

    async getActivityFeed(limit = 20): Promise<ActivityItem[]> {
      const { data, error } = await db
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) return []

      return (data ?? []).map((r) => mapActivity(r as Record<string, unknown>))
    },

    async getSidebarBadgeCounts(): Promise<SidebarBadgeCounts> {
      const [exceptionsRes, manifestsRes, invoicesRes] = await Promise.all([
        db.from("exceptions").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
        db.from("manifests").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
        db.from("invoices").select("*", { count: "exact", head: true }).eq("status", "ISSUED"),
      ])

      return {
        openExceptions: exceptionsRes.count ?? 0,
        openManifests: manifestsRes.count ?? 0,
        pendingInvoices: invoicesRes.count ?? 0,
        unreadNotifications: 0,
      }
    },

    async getOperationalHealth(): Promise<OperationalHealth> {
      const weekAgoIso = startOfWeekIso()

      const [totalWeekRes, deliveredWeekRes, exceptionsRes, inTransitRes, openManifestsRes] = await Promise.all([
        db.from("shipments").select("*", { count: "exact", head: true }).gte("created_at", weekAgoIso),
        db.from("shipments").select("*", { count: "exact", head: true }).eq("status", "DELIVERED").gte("delivered_at", weekAgoIso),
        db.from("exceptions").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
        db.from("shipments").select("*", { count: "exact", head: true }).eq("status", "IN_TRANSIT"),
        db.from("manifests").select("*", { count: "exact", head: true }).eq("status", "OPEN"),
      ])

      const total = totalWeekRes.count ?? 0
      const delivered = deliveredWeekRes.count ?? 0
      const openExceptions = exceptionsRes.count ?? 0
      const inTransit = inTransitRes.count ?? 0
      const openManifests = openManifestsRes.count ?? 0

      const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100
      const exceptionRate = total > 0 ? Math.round((openExceptions / total) * 100) : 0

      const indicators: OperationalIndicator[] = [
        {
          key: "delivery-rate",
          label: "Delivery Rate (7d)",
          value: deliveryRate,
          target: 85,
          unit: "percent",
          status: deliveryRate >= 85 ? "ok" : deliveryRate >= 70 ? "warn" : "fail",
        },
        {
          key: "exception-rate",
          label: "Exception Rate",
          value: exceptionRate,
          target: 5,
          unit: "percent",
          status: exceptionRate <= 5 ? "ok" : exceptionRate <= 10 ? "warn" : "fail",
        },
        {
          key: "in-transit-backlog",
          label: "In-Transit Volume",
          value: inTransit,
          target: 100,
          unit: "count",
          status: inTransit <= 100 ? "ok" : inTransit <= 200 ? "warn" : "fail",
        },
        {
          key: "open-manifests",
          label: "Open Manifests",
          value: openManifests,
          target: 10,
          unit: "count",
          status: openManifests <= 10 ? "ok" : openManifests <= 20 ? "warn" : "fail",
        },
      ]

      const okCount = indicators.filter((i) => i.status === "ok").length
      const score = Math.round((okCount / indicators.length) * 100)
      const failCount = indicators.filter((i) => i.status === "fail").length
      const status: OperationalHealth["status"] = failCount > 0 ? "critical" : score >= 75 ? "healthy" : "degraded"

      return { score, status, indicators }
    },

    async getSLABreaches(limit = 10): Promise<SLABreach[]> {
      try {
        // SENTRY-SILENT-BY-DESIGN (decision recorded #115, runbook § 4.1):
        // `detect_sla_breaches` is a non-critical dashboard-widget RPC. The
        // try/catch silent-degrade pattern is intentional — if the RPC is
        // missing/slow, the SLA-breaches panel renders empty and the rest
        // of the dashboard continues to work. The cost of NOT being silent:
        //   - every dashboard render during a migration window emits to
        //     Sentry, saturating rule 4 (Supabase RPC failures)
        //   - operators mute rule 4 → real RPC failures elsewhere lose their
        //     paging signal
        //   - false signal: "RPC failures" when really it's "RPC missing"
        //     (a different operational state)
        // Three follow-up options considered (audit § 3.3):
        //   (a) keep silent + document — CHOSEN here
        //   (b) emit at info level via a new emitTaggedInfo helper — over-
        //     engineering for one site; revisit if we accumulate ≥3 sites
        //     that want low-severity emission
        //   (c) emit at error level — contradicts the silent-degrade contract
        // The observability gap is real but explicit. If this widget starts
        // returning wrong data (vs. empty data) it surfaces via operator
        // feedback or downstream KPI mismatches, not via Sentry.
        const { data, error } = await db.rpc("detect_sla_breaches" as never)
        if (error) throw error
        return ((data as Record<string, unknown>[]) ?? []).slice(0, limit).map(
          (row): SLABreach => ({
            shipmentId: row.shipment_id as string,
            awbNumber: row.awb_number as string,
            status: row.status as string,
            originHub: row.origin_hub as string,
            destHub: row.dest_hub as string,
            serviceLevel: row.service_level as string,
            expectedDelivery: row.expected_delivery as string,
            hoursBreached: (row.hours_breached as number) ?? 0,
          }),
        )
      } catch {
        return []
      }
    },
  }
}

export type DashboardService = ReturnType<typeof createDashboardService>

