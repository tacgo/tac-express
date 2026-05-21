/**
 * TAC Orbital · service-layer adapter.
 *
 * Composes existing analytics + dashboard services and transforms data
 * into the chart-primitive contracts defined in @workspace/types/orbital.
 * UI never derives chart shapes — it consumes these shapes directly.
 *
 * Spec: docs/CHARTS-ORBITAL.md
 */

import type { SupabaseClient } from "@workspace/database/supabase.types"
import type {
  AnalyticsKpis,
  CommandCenterKpis,
  DualSeriesPoint,
  KpiSeries,
  LaneCell,
  LaneHeatmapData,
  ProgressKpi,
  RankItem,
  Segment,
  SlaBucket,
  SparkPoint,
  Trend,
  UpcomingOp,
} from "@workspace/types/orbital"

import { createAnalyticsService } from "./analytics.service"
import { createDashboardService } from "./dashboard.service"

const SHIPMENT_TREND_DAYS = 30
const REVENUE_TREND_MONTHS = 6
const SHIPMENT_VOLUME_DAYS = 30

/**
 * Row cap for client-side aggregation queries (#11).
 *
 * The previous value was 2000, which truncated KPI inputs silently
 * the first time a tenant exceeded 2k rows in any of the three
 * affected tables. Bumped to 50000 so the cap covers realistic
 * dashboards (months of operational data for a mid-size 3PL) and
 * truncation hits become exceptional rather than routine.
 *
 * When truncation IS hit, `warnIfTruncated()` makes it loud — a
 * console.error with the row counts so deploy logs surface it. The
 * proper long-term fix is server-side aggregation (issue #11
 * Option A: move to RPCs that GROUP BY in Postgres). This module
 * stays on client-side JS aggregation for now to keep the chart
 * surface unchanged; follow-up: route through `analytics.service`
 * RPCs once Phase 6.5 lands `sla_breaches` etc.
 */
const ORBITAL_AGGREGATION_LIMIT = 50000

/**
 * Compare actual row count vs requested limit and emit a loud
 * warning when the cap was hit. Centralised so every aggregation
 * callsite reports truncation the same way.
 *
 * Logged via `console.error` (not warn) because silent KPI truncation
 * is a correctness bug, not a soft warning — ops should see this in
 * the production log stream and route the trace to whoever owns the
 * orbital → analytics migration.
 */
function warnIfTruncated(
  source: string,
  rowsReturned: number,
  totalRows: number | null,
): void {
  if (totalRows !== null && totalRows > ORBITAL_AGGREGATION_LIMIT) {
    console.error(
      `[orbital] ${source} TRUNCATED — aggregated ${rowsReturned} of ` +
        `${totalRows} rows (cap=${ORBITAL_AGGREGATION_LIMIT}). KPIs are ` +
        `partial. Migrate this query to a server-side aggregation RPC.`,
    )
  }
}

/**
 * Build a sparkline from a numeric series — keeps the trailing window.
 * Returns at most `points` entries; pads nothing.
 */
function buildSpark(
  series: ReadonlyArray<{ x: string | number; y: number }>,
  points = 14,
): SparkPoint[] {
  if (series.length === 0) return []
  const window = series.slice(-points)
  return window.map(({ x, y }) => ({ x, y }))
}

/**
 * Compute a delta chip from a value series. Compares the last value
 * against the median of the prior window. Returns null when there's
 * not enough data to be meaningful (< 4 points).
 */
function computeDelta(
  series: ReadonlyArray<number>,
): { label: string; trend: Trend } | undefined {
  if (series.length < 4) return undefined
  const cur = series[series.length - 1]!
  const prior = series.slice(0, -1)
  const sorted = [...prior].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  if (median === 0) return undefined
  const pct = ((cur - median) / median) * 100
  const rounded = Math.round(pct)
  if (Math.abs(rounded) < 1) return { label: "0%", trend: "flat" }
  const trend: Trend = rounded > 0 ? "up" : "down"
  const sign = rounded > 0 ? "+" : "−"
  return { label: `${sign}${Math.abs(rounded)}%`, trend }
}

export function createOrbitalService(db: SupabaseClient) {
  const analytics = createAnalyticsService(db)
  const dashboard = createDashboardService(db)

  return {
    /* ── Analytics page ────────────────────────────────────────── */

    async getAnalyticsKpis(): Promise<AnalyticsKpis> {
      const [summary, shipmentTrend, revenueTrend] = await Promise.all([
        analytics.getSummary(),
        analytics.getShipmentTrend(SHIPMENT_TREND_DAYS),
        analytics.getRevenueTrend(REVENUE_TREND_MONTHS),
      ])

      const shipmentSeries = shipmentTrend.map((d) => ({
        x: d.date,
        y: d.shipments,
      }))
      const deliveredSeries = shipmentTrend.map((d) => ({
        x: d.date,
        y: d.delivered,
      }))
      const revenueSeries = revenueTrend.map((d) => ({
        x: d.month,
        y: d.revenue,
      }))

      const totalShipments: KpiSeries = {
        value: summary.totalShipments,
        spark: buildSpark(shipmentSeries),
        delta: computeDelta(shipmentSeries.map((p) => p.y)),
      }
      const totalRevenue: KpiSeries = {
        value: summary.totalRevenue,
        spark: buildSpark(revenueSeries),
        delta: computeDelta(revenueSeries.map((p) => p.y)),
      }
      const delivered = {
        value: summary.deliveredCount,
        spark: buildSpark(deliveredSeries),
        rate:
          summary.totalShipments > 0
            ? summary.deliveredCount / summary.totalShipments
            : 0,
      }
      const inTransit: KpiSeries = {
        value: summary.inTransitCount,
        spark: buildSpark(shipmentSeries),
      }
      const openExceptions: KpiSeries = {
        value: summary.exceptionCount,
        spark: [],
      }
      const avgDeliveryDays = {
        value: summary.avgDeliveryDays > 0 ? summary.avgDeliveryDays : null,
        spark: [],
      }

      return {
        totalShipments,
        totalRevenue,
        delivered,
        inTransit,
        openExceptions,
        avgDeliveryDays,
      }
    },

    async getShipmentTrend({
      days = SHIPMENT_TREND_DAYS,
    }: { days?: number } = {}): Promise<DualSeriesPoint[]> {
      const trend = await analytics.getShipmentTrend(days)
      return trend.map((d) => ({
        x: d.date,
        y: d.shipments,
        y2: d.delivered,
      }))
    },

    async getRevenueTrend({
      months = REVENUE_TREND_MONTHS,
    }: { months?: number } = {}): Promise<DualSeriesPoint[]> {
      const trend = await analytics.getRevenueTrend(months)
      return trend.map((d) => ({ x: d.month, y: d.revenue }))
    },

    async getStatusDistribution(): Promise<Segment[]> {
      const dist = await analytics.getStatusDistribution()
      return dist.map((d) => ({
        key: d.status,
        label: d.label ?? d.status.replace(/_/g, " "),
        value: d.count,
      }))
    },

    async getServiceMix(): Promise<Segment[]> {
      const { data, error, count } = await db
        .from("shipments")
        .select("service_level", { count: "exact" })
        .limit(ORBITAL_AGGREGATION_LIMIT)
      if (error) throw error
      const rows = data ?? []
      warnIfTruncated("getServiceMix", rows.length, count)
      const counts: Record<string, number> = {}
      for (const row of rows as Array<{ service_level: string | null }>) {
        const key = row.service_level ?? "STANDARD"
        counts[key] = (counts[key] ?? 0) + 1
      }
      return Object.entries(counts).map(([key, value]) => ({
        key,
        label: key.charAt(0) + key.slice(1).toLowerCase(),
        value,
      }))
    },

    async getHubPerformance(): Promise<RankItem[]> {
      const hubs = await analytics.getHubPerformance()
      return hubs
        .map((h) => ({
          key: h.hub,
          label: h.hub,
          value: h.dispatched,
          caption: `${h.delivered.toLocaleString()} delivered`,
        }))
        .sort((a, b) => b.value - a.value)
    },

    async getTopCustomers({ limit = 10 }: { limit?: number } = {}): Promise<
      RankItem[]
    > {
      const { data, error, count } = await db
        .from("invoices")
        .select("customer_id, customer_name, total_amount, status", {
          count: "exact",
        })
        .eq("status", "PAID")
        .limit(ORBITAL_AGGREGATION_LIMIT)
      if (error) throw error
      const rows = data ?? []
      warnIfTruncated("getTopCustomers", rows.length, count)
      const byCustomer = new Map<
        string,
        { name: string; revenue: number; count: number }
      >()
      for (const row of rows as Array<{
        customer_id: string | null
        customer_name: string | null
        total_amount: number | null
      }>) {
        const id = row.customer_id ?? "unknown"
        const cur = byCustomer.get(id) ?? {
          name: row.customer_name ?? "—",
          revenue: 0,
          count: 0,
        }
        cur.revenue += row.total_amount ?? 0
        cur.count += 1
        byCustomer.set(id, cur)
      }
      return Array.from(byCustomer.entries())
        .map(([key, v]): RankItem => ({
          key,
          label: v.name,
          value: v.revenue,
          caption: `${v.count} invoice${v.count === 1 ? "" : "s"}`,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit)
    },

    async getSlaBreachDistribution({
      days = SHIPMENT_TREND_DAYS,
    }: { days?: number } = {}): Promise<SlaBucket[]> {
      // Heuristic v1 — promoted from analytics-client.tsx until the
      // sla_breaches table ships in Phase 6.5. Derives ontime/late/breached
      // from the shipment trend series.
      const trend = await analytics.getShipmentTrend(days)
      return trend.slice(-12).map((d): SlaBucket => {
        const total = d.shipments
        const delivered = d.delivered
        const late = Math.max(0, total - delivered)
        const breached = Math.round(late * 0.2)
        return {
          date: d.date,
          ontime: delivered,
          late: Math.max(0, late - breached),
          breached,
        }
      })
    },

    async getLaneHeatmap(): Promise<LaneHeatmapData> {
      const { data, error, count } = await db
        .from("shipments")
        .select("origin_hub, dest_hub", { count: "exact" })
        .limit(ORBITAL_AGGREGATION_LIMIT)
      if (error) throw error
      const rows = data ?? []
      warnIfTruncated("getLaneHeatmap", rows.length, count)
      const originSet = new Set<string>()
      const destSet = new Set<string>()
      const cellMap = new Map<string, LaneCell>()
      for (const row of rows as Array<{
        origin_hub: string
        dest_hub: string
      }>) {
        originSet.add(row.origin_hub)
        destSet.add(row.dest_hub)
        const key = `${row.origin_hub}→${row.dest_hub}`
        const cur = cellMap.get(key) ?? {
          origin: row.origin_hub,
          destination: row.dest_hub,
          value: 0,
        }
        cur.value += 1
        cellMap.set(key, cur)
      }
      return {
        origins: Array.from(originSet).sort(),
        destinations: Array.from(destSet).sort(),
        cells: Array.from(cellMap.values()),
      }
    },

    /* ── Command Center / Overview page ───────────────────────── */

    async getCommandCenterKpis(): Promise<CommandCenterKpis> {
      const [kpis, shipmentTrend] = await Promise.all([
        dashboard.getKPIs(),
        analytics.getShipmentTrend(SHIPMENT_VOLUME_DAYS),
      ])
      const shipmentSeries = shipmentTrend.map((d) => ({
        x: d.date,
        y: d.shipments,
      }))
      const inTransitSeries = shipmentTrend.map((d) => ({
        x: d.date,
        y: Math.max(0, d.shipments - d.delivered),
      }))

      return {
        active: {
          value: kpis.activeShipments,
          spark: buildSpark(shipmentSeries),
          delta: computeDelta(shipmentSeries.map((p) => p.y)),
        },
        inTransit: {
          value: kpis.inTransit,
          spark: buildSpark(inTransitSeries),
        },
        openExceptions: {
          value: kpis.openExceptions,
          spark: [],
        },
      }
    },

    async getDeliverySuccessGrowth(): Promise<ProgressKpi> {
      const trend = await analytics.getShipmentTrend(REVENUE_TREND_MONTHS * 30)
      if (trend.length === 0) {
        return { value: 0, max: 100, target: 85, label: "No data" }
      }
      const totals = trend.reduce(
        (acc, d) => {
          acc.shipments += d.shipments
          acc.delivered += d.delivered
          return acc
        },
        { shipments: 0, delivered: 0 },
      )
      const rate =
        totals.shipments > 0
          ? Math.round((totals.delivered / totals.shipments) * 100)
          : 0
      return {
        value: rate,
        max: 100,
        target: 85,
        label: `${totals.delivered.toLocaleString()} of ${totals.shipments.toLocaleString()} delivered`,
      }
    },

    async getShipmentVolume({
      days = SHIPMENT_VOLUME_DAYS,
    }: { days?: number } = {}): Promise<DualSeriesPoint[]> {
      // Current period vs prior period (same-length window).
      const [current, prior] = await Promise.all([
        analytics.getShipmentTrend(days),
        analytics.getShipmentTrend(days * 2),
      ])
      const priorWindow = prior.slice(0, prior.length - current.length)
      const priorByOffset = new Map<number, number>()
      priorWindow.forEach((d, i) => priorByOffset.set(i, d.shipments))
      return current.map((d, i) => ({
        x: d.date,
        y: d.shipments,
        y2: priorByOffset.get(i),
      }))
    },

    async getTopHubs(): Promise<RankItem[]> {
      const hubs = await analytics.getHubPerformance()
      return hubs
        .map(
          (h): RankItem => ({
            key: h.hub,
            label: h.hub,
            value: h.delivered,
            caption: `${h.dispatched.toLocaleString()} dispatched`,
          }),
        )
        .sort((a, b) => b.value - a.value)
    },

    async getSuccessRate(): Promise<ProgressKpi> {
      const summary = await analytics.getSummary()
      const rate =
        summary.totalShipments > 0
          ? Math.round((summary.deliveredCount / summary.totalShipments) * 100)
          : 0
      return {
        value: rate,
        max: 100,
        target: 90,
        label: "Delivered on commit",
      }
    },

    async getUpcomingOperations({
      limit = 5,
    }: { limit?: number } = {}): Promise<UpcomingOp[]> {
      const todayIso = new Date().toISOString().slice(0, 10)
      const { data, error } = await db
        .from("manifests")
        .select("id, manifest_number, status, departure_date, origin_hub, dest_hub")
        .gte("departure_date", todayIso)
        .order("departure_date", { ascending: true })
        .limit(limit)
      if (error) return []
      return ((data ?? []) as Array<{
        id: string
        manifest_number: string
        status: string
        departure_date: string | null
        origin_hub: string
        dest_hub: string
      }>).map((row): UpcomingOp => {
        const eta = row.departure_date
          ? new Date(row.departure_date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "—"
        return {
          id: row.id,
          title: row.manifest_number,
          kind: `${row.origin_hub} → ${row.dest_hub} · ${row.status}`,
          eta,
          etaDate: row.departure_date,
        }
      })
    },
  }
}

export type OrbitalService = ReturnType<typeof createOrbitalService>
