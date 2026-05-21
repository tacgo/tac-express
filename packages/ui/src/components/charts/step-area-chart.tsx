"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { cn } from "../../lib/utils"
import { OrbitalTooltip } from "./chart-tooltip"
import { ChartEmptyState } from "./chart-empty-state"
import type { DualSeriesPoint } from "./types"

export interface StepAreaChartProps {
  data: DualSeriesPoint[]
  /** Series labels for tooltip + a11y. */
  labels: { y: string; y2?: string }
  /** Tick formatter for x axis. */
  formatX?: (value: string | number) => string
  /** Tick formatter for y axis. */
  formatY?: (value: number) => string
  /** Tooltip value formatter (overrides formatY for tooltip rows). */
  formatTooltipValue?: (value: number, name: string) => string
  /** Minimum points required before rendering the chart. Default 3. */
  minimumPoints?: number
  /** Override container height. Default 220. */
  height?: number
  className?: string
}

/**
 * Right-angled step area chart. Honours discrete-event semantics: each
 * value persists until the next observation. Curves are forbidden by the
 * design system; this primitive is the only allowed time-series shape on
 * the dashboard.
 */
export function StepAreaChart({
  data,
  labels,
  formatX,
  formatY,
  formatTooltipValue,
  minimumPoints = 3,
  height = 220,
  className,
}: StepAreaChartProps) {
  if (data.length < minimumPoints) {
    return <ChartEmptyState count={data.length} minimum={minimumPoints} />
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--chart-grid)"
            strokeDasharray="2 2"
          />
          <XAxis
            dataKey="x"
            tick={{
              fontSize: 11,
              fill: "var(--chart-axis)",
              fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)",
            }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tickFormatter={formatX}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            tick={{
              fontSize: 11,
              fill: "var(--chart-axis)",
              fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)",
            }}
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={formatY}
          />
          <Tooltip
            cursor={{ stroke: "var(--chart-grid)", strokeDasharray: "2 2" }}
            content={<OrbitalTooltip formatValue={formatTooltipValue} />}
          />
          {labels.y2 ? (
            <Area
              type="stepAfter"
              dataKey="y2"
              name={labels.y2}
              stroke="var(--chart-primary-muted)"
              strokeWidth={1}
              fill="var(--chart-primary-muted)"
              fillOpacity={0.4}
              isAnimationActive={false}
              dot={false}
            />
          ) : null}
          <Area
            type="stepAfter"
            dataKey="y"
            name={labels.y}
            stroke="var(--chart-primary)"
            strokeWidth={1.5}
            fill="var(--chart-primary)"
            fillOpacity={0.18}
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 3,
              fill: "var(--chart-primary)",
              stroke: "var(--background)",
              strokeWidth: 1,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
