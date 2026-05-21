/**
 * TAC Orbital · Telemetry chart contracts.
 *
 * Canonical home for the data shapes that flow into the Orbital chart
 * primitives (`packages/ui/src/components/charts/`). Lives in @workspace/types
 * so that services can produce these shapes without depending on the UI
 * package — preserving the architecture-flow law (UI → services → database).
 *
 * Spec: docs/CHARTS-ORBITAL.md
 */

export type Trend = "up" | "down" | "flat"

export interface SeriesPoint {
  /** ISO date (`YYYY-MM-DD`) or numeric x. */
  x: string | number
  /** Numeric y value. */
  y: number
}

export interface DualSeriesPoint extends SeriesPoint {
  /** Optional secondary series — rendered in muted variant. */
  y2?: number
}

export type ChartTone =
  | "primary"
  | "muted"
  | "ramp-1"
  | "ramp-2"
  | "ramp-3"
  | "ramp-4"
  | "ramp-5"

export interface Segment {
  /** Machine key, lowercased. */
  key: string
  /** Display label. */
  label: string
  /** Numeric value. Sum of segments = denominator. */
  value: number
  /** Optional override; defaults to a ramp position by index. */
  tone?: ChartTone
}

export interface RankItem {
  key: string
  label: string
  value: number
  /** Optional sub-label rendered under the primary label. */
  caption?: string
}

export interface SlaBucket {
  /** ISO date string. Ordered ascending in input array. */
  date: string
  ontime: number
  late: number
  breached: number
}

export interface LaneCell {
  origin: string
  destination: string
  value: number
}

export interface LaneHeatmapData {
  origins: string[]
  destinations: string[]
  cells: LaneCell[]
  /** Cap for ramp normalization. Computed from cells when omitted. */
  max?: number
}

export interface SparkPoint {
  /** Bin label (date or index). */
  x: string | number
  /** Value. */
  y: number
}

/* ── KPI series + Command Center contracts ────────────────────────── */

export interface KpiSeries {
  value: number
  spark: SparkPoint[]
  delta?: { label: string; trend: Trend }
}

export interface DeliveredKpi extends KpiSeries {
  /** 0–1 fraction of delivered / total. */
  rate: number
}

export interface AvgDaysKpi {
  value: number | null
  spark: SparkPoint[]
}

export interface AnalyticsKpis {
  totalShipments: KpiSeries
  totalRevenue: KpiSeries
  delivered: DeliveredKpi
  inTransit: KpiSeries
  openExceptions: KpiSeries
  avgDeliveryDays: AvgDaysKpi
}

export interface CommandCenterKpis {
  active: KpiSeries
  inTransit: KpiSeries
  openExceptions: KpiSeries
}

export interface ProgressKpi {
  /** Current value, 0–max. */
  value: number
  /** Maximum (e.g. 100). */
  max: number
  /** Target tick, 0–max. */
  target: number
  /** Optional caption rendered as sublabel. */
  label?: string
}

export interface UpcomingOp {
  id: string
  title: string
  kind: string
  /** Pre-formatted ETA string. */
  eta: string
  /** Raw departure date as ISO `YYYY-MM-DD`, when available. */
  etaDate?: string | null
}
