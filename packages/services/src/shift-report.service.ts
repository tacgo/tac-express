// Shift report — operations summary for the trailing N hours, optionally
// filtered to a single hub. Aggregates shipment, manifest, exception, and
// scan activity into a single payload usable by the dashboard view + the
// scheduled `daily-statement` Edge Function (Phase 4.5+).
//
// Implementation strategy: this service derives the report from existing
// tables on the fly rather than depending on a dedicated `shift_reports`
// materialized view. Phase 9 polish can promote it to an RPC or view if the
// query cost gets noticeable.

import { differenceInHours, parseISO, subHours } from "date-fns"

import type { SupabaseClient } from "@workspace/database/supabase.types"

export interface ShiftReportRequest {
  /** Trailing hours to cover. Default 8. */
  hours?: number
  /** Filter by hub code (e.g. IMPHAL); omit for all hubs. */
  hubCode?: string
}

export interface ShiftReportPayload {
  periodStart: string
  periodEnd: string
  durationHours: number
  hubCode: string | null

  shipments: {
    total: number
    created: number
    delivered: number
    inTransit: number
    exceptions: number
  }
  manifests: {
    total: number
    closed: number
    departed: number
    arrived: number
  }
  exceptions: {
    total: number
    resolved: number
    pending: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
  }
  scans: {
    total: number
    uniqueShipments: number
    bySource: Record<string, number>
  }
  shipmentsByStatus: { status: string; count: number }[]
  pendingActions: {
    openManifests: number
    unresolvedExceptions: number
    awaitingPickup: number
  }
  recentActivity: {
    at: string
    description: string
    actor?: string
  }[]
}

interface ShipmentRow {
  id: string
  status: string
  origin_hub?: string
  dest_hub?: string
  created_at: string
  updated_at: string
}

interface ManifestRow {
  id: string
  status: string
  origin_hub?: string
  dest_hub?: string
  created_at: string
  closed_at?: string | null
  departed_at?: string | null
  arrived_at?: string | null
}

interface ExceptionRow {
  id: string
  shipment_id?: string
  type?: string
  severity?: string
  status?: string
  created_at: string
  resolved_at?: string | null
}

interface TrackingEventRow {
  id: string
  awb_number: string
  description?: string
  source?: string
  created_at: string
  staff_id?: string | null
  hub_code?: string | null
}

function safeRecord<T>(error: { message?: string }, fallback: T): T {
  if (/does not exist|relation/i.test(error.message ?? "")) return fallback
  throw error
}

export function createShiftReportService(db: SupabaseClient) {
  return {
    async getReport(req: ShiftReportRequest = {}): Promise<ShiftReportPayload> {
      const hours = req.hours ?? 8
      const periodEnd = new Date()
      const periodStart = subHours(periodEnd, hours)

      const startIso = periodStart.toISOString()

      // --- Shipments ---
      let shipmentsQuery = db
        .from("shipments")
        .select("id, status, origin_hub, dest_hub, created_at, updated_at")
        .gte("created_at", startIso)
      if (req.hubCode) {
        shipmentsQuery = shipmentsQuery.or(
          `origin_hub.eq.${req.hubCode},dest_hub.eq.${req.hubCode}`
        )
      }
      const shipmentsResp = await shipmentsQuery
      const shipments = shipmentsResp.error
        ? safeRecord<ShipmentRow[]>(shipmentsResp.error, [])
        : (shipmentsResp.data as ShipmentRow[])

      // --- Manifests ---
      let manifestsQuery = db
        .from("manifests")
        .select(
          "id, status, origin_hub, dest_hub, created_at, closed_at, departed_at, arrived_at"
        )
        .gte("created_at", startIso)
      if (req.hubCode) {
        manifestsQuery = manifestsQuery.or(
          `origin_hub.eq.${req.hubCode},dest_hub.eq.${req.hubCode}`
        )
      }
      const manifestsResp = await manifestsQuery
      const manifests = manifestsResp.error
        ? safeRecord<ManifestRow[]>(manifestsResp.error, [])
        : (manifestsResp.data as ManifestRow[])

      // --- Exceptions ---
      const exceptionsResp = await db
        .from("exceptions")
        .select("id, shipment_id, type, severity, status, created_at, resolved_at")
        .gte("created_at", startIso)
      const exceptions = exceptionsResp.error
        ? safeRecord<ExceptionRow[]>(exceptionsResp.error, [])
        : (exceptionsResp.data as ExceptionRow[])

      // --- Scans (tracking_events) ---
      const trackingResp = await db
        .from("tracking_events")
        .select(
          "id, awb_number, description, source, created_at, staff_id, hub_code"
        )
        .gte("created_at", startIso)
      const trackingEvents = trackingResp.error
        ? safeRecord<TrackingEventRow[]>(trackingResp.error, [])
        : (trackingResp.data as TrackingEventRow[])

      // ── Aggregations ────────────────────────────────────────────────
      const shipmentsByStatus: Record<string, number> = {}
      let createdCount = 0
      let deliveredCount = 0
      let inTransitCount = 0
      let exceptionShipments = 0
      for (const s of shipments) {
        shipmentsByStatus[s.status] = (shipmentsByStatus[s.status] ?? 0) + 1
        if (s.status === "DELIVERED") deliveredCount += 1
        else if (s.status === "EXCEPTION") exceptionShipments += 1
        else if (s.status === "IN_TRANSIT") inTransitCount += 1
        if (parseISO(s.created_at) >= periodStart) createdCount += 1
      }

      let closedManifests = 0
      let departedManifests = 0
      let arrivedManifests = 0
      let openManifests = 0
      for (const m of manifests) {
        if (m.closed_at && parseISO(m.closed_at) >= periodStart)
          closedManifests += 1
        if (m.departed_at && parseISO(m.departed_at) >= periodStart)
          departedManifests += 1
        if (m.arrived_at && parseISO(m.arrived_at) >= periodStart)
          arrivedManifests += 1
        if (m.status === "OPEN" || m.status === "BUILDING") openManifests += 1
      }

      const exceptionsBySeverity: Record<string, number> = {}
      const exceptionsByType: Record<string, number> = {}
      let resolvedExceptions = 0
      let pendingExceptions = 0
      for (const e of exceptions) {
        if (e.severity)
          exceptionsBySeverity[e.severity] =
            (exceptionsBySeverity[e.severity] ?? 0) + 1
        if (e.type)
          exceptionsByType[e.type] = (exceptionsByType[e.type] ?? 0) + 1
        if (e.resolved_at) resolvedExceptions += 1
        else pendingExceptions += 1
      }

      const scansBySource: Record<string, number> = {}
      const uniqueAwbs = new Set<string>()
      for (const t of trackingEvents) {
        const src = t.source ?? "UNKNOWN"
        scansBySource[src] = (scansBySource[src] ?? 0) + 1
        if (t.awb_number) uniqueAwbs.add(t.awb_number)
      }

      const recentActivity = trackingEvents
        .slice()
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 20)
        .map((t) => ({
          at: t.created_at,
          description: t.description ?? `${t.source ?? "EVENT"} · ${t.awb_number}`,
          actor: t.staff_id ?? undefined,
        }))

      const awaitingPickup = shipments.filter(
        (s) =>
          s.status === "CREATED" || s.status === "PICKUP_SCHEDULED"
      ).length

      return {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        durationHours: differenceInHours(periodEnd, periodStart),
        hubCode: req.hubCode ?? null,
        shipments: {
          total: shipments.length,
          created: createdCount,
          delivered: deliveredCount,
          inTransit: inTransitCount,
          exceptions: exceptionShipments,
        },
        manifests: {
          total: manifests.length,
          closed: closedManifests,
          departed: departedManifests,
          arrived: arrivedManifests,
        },
        exceptions: {
          total: exceptions.length,
          resolved: resolvedExceptions,
          pending: pendingExceptions,
          bySeverity: exceptionsBySeverity,
          byType: exceptionsByType,
        },
        scans: {
          total: trackingEvents.length,
          uniqueShipments: uniqueAwbs.size,
          bySource: scansBySource,
        },
        shipmentsByStatus: Object.entries(shipmentsByStatus)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
        pendingActions: {
          openManifests,
          unresolvedExceptions: pendingExceptions,
          awaitingPickup,
        },
        recentActivity,
      }
    },
  }
}

export type ShiftReportService = ReturnType<typeof createShiftReportService>
