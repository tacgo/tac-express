/**
 * Re-export shim. The canonical Orbital chart contracts live in
 * @workspace/types so that services can produce these shapes without
 * depending on the UI package.
 *
 * Spec: docs/CHARTS-ORBITAL.md
 */

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
} from "@workspace/types"
