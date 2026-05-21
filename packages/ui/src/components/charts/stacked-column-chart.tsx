"use client"

import * as React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { cn } from "../../lib/utils"
import { OrbitalTooltip } from "./chart-tooltip"
import { ChartEmptyState } from "./chart-empty-state"
import type { SlaBucket } from "./types"

export interface StackedColumnChartProps {
  data: SlaBucket[]
  formatX?: (value: string) => string
  /** Override container height. Default 240. */
  height?: number
  /** Minimum buckets before rendering. Default 2. */
  minimumBuckets?: number
  className?: string
}

const SLA_KEYS = ["ontime", "late", "breached"] as const
const SLA_LABEL: Record<(typeof SLA_KEYS)[number], string> = {
  ontime: "On time",
  late: "Late",
  breached: "Breached",
}
const SLA_COLOR: Record<(typeof SLA_KEYS)[number], string> = {
  ontime: "var(--chart-ontime)",
  late: "var(--chart-late)",
  breached: "var(--chart-breached)",
}

/**
 * Per-day stacked column chart. Semantic tokens are bound to SLA state:
 * ontime / late / breached. These colors are reserved for this primitive
 * (and any future SLA-status component) — never used as decorative tones.
 */
export function StackedColumnChart({
  data,
  formatX,
  height = 240,
  minimumBuckets = 2,
  className,
}: StackedColumnChartProps) {
  if (data.length < minimumBuckets) {
    return <ChartEmptyState count={data.length} minimum={minimumBuckets} />
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid
            vertical={false}
            stroke="var(--chart-grid)"
            strokeDasharray="2 2"
          />
          <XAxis
            dataKey="date"
            tick={{
              fontSize: 11,
              fill: "var(--chart-axis)",
              fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)",
            }}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            tickFormatter={formatX}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{
              fontSize: 11,
              fill: "var(--chart-axis)",
              fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)",
            }}
            tickLine={false}
            axisLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-track)", opacity: 0.4 }}
            content={<OrbitalTooltip />}
          />
          <Legend
            verticalAlign="bottom"
            iconType="square"
            iconSize={8}
            wrapperStyle={{
              fontSize: 11,
              fontFamily: "var(--font-mono, ui-monospace, Menlo, monospace)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--chart-axis)",
              paddingTop: 8,
            }}
          />
          {SLA_KEYS.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              name={SLA_LABEL[key]}
              stackId="sla"
              fill={SLA_COLOR[key]}
              isAnimationActive={false}
              maxBarSize={32}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
