/**
 * TAC Orbital · Telemetry Chart System
 *
 * A single, brutalist chart language for the entire TAC Express dashboard.
 * Spec: docs/CHARTS-ORBITAL.md
 *
 * Hard rules:
 *  - Two hues max per chart (--chart-primary + --chart-primary-muted).
 *  - --chart-ontime / --chart-late / --chart-breached are SLA-only.
 *  - No donuts. No smooth curves. stepAfter only.
 *  - N < minimum → ChartEmptyState (defaults: 3 / 2 / 1).
 *  - Zero radius (LAW 13). Brutalist offset shadows live on the FRAME, not the chart.
 */

export { ChartFrame, type ChartFrameProps } from "./chart-frame"
export { ChartEmptyState, type ChartEmptyStateProps } from "./chart-empty-state"
export { OrbitalTooltip } from "./chart-tooltip"
export { KpiTile, type KpiTileProps } from "./kpi-tile"
export { StepAreaChart, type StepAreaChartProps } from "./step-area-chart"
export { SegmentBar, type SegmentBarProps } from "./segment-bar"
export { RankBarChart, type RankBarChartProps } from "./rank-bar-chart"
export { ProgressMeter, type ProgressMeterProps } from "./progress-meter"
export {
  StackedColumnChart,
  type StackedColumnChartProps,
} from "./stacked-column-chart"
export { LaneHeatmap, type LaneHeatmapProps } from "./lane-heatmap"

export type {
  ChartTone,
  DualSeriesPoint,
  LaneCell,
  LaneHeatmapData,
  RankItem,
  Segment,
  SeriesPoint,
  SlaBucket,
  SparkPoint,
  Trend,
} from "./types"
