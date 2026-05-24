"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import { cn } from "@workspace/ui/lib/utils"
import { RiArrowUpLine } from "@workspace/ui/icons"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/primitives/chart"

/**
 * OpsShipmentBarChart — multi-bar chart for the Paper Ops Analytics
 * "Shipment Trend" panel. Adapted from shadcn's `chart-bar-multiple`
 * recipe, restyled for Paper Ops tokens (zero-radius bars per LAW 13,
 * --paper-* fills, mono x-axis, mono trend footer with a RemixIcon glyph).
 * Six months of mock data — wire to a real time-series hook once the
 * service layer exposes monthly aggregates.
 */

const chartData = [
  { month: "January", delivered: 186, exceptions: 80 },
  { month: "February", delivered: 305, exceptions: 200 },
  { month: "March", delivered: 237, exceptions: 120 },
  { month: "April", delivered: 173, exceptions: 190 },
  { month: "May", delivered: 209, exceptions: 130 },
  { month: "June", delivered: 214, exceptions: 140 },
]

const chartConfig = {
  delivered: { label: "Delivered", color: "var(--primary)" },
  exceptions: { label: "Exceptions", color: "var(--accent-info)" },
} satisfies ChartConfig

interface OpsShipmentBarChartProps {
  className?: string
}

function OpsShipmentBarChart({ className }: OpsShipmentBarChartProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header row — title + period (matches the dashboard panel pattern) */}
      <div className="flex items-center justify-between">
        <h3 className="t-h4 text-foreground">Shipment Trend</h3>
        <span className="paper-label">Jan — Jun</span>
      </div>

      <div className="paper-label mt-2.5">
        Monthly delivered vs. exceptions
      </div>

      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[length:var(--spacing-chart-lg)] w-full mt-3"
      >
        <BarChart accessibilityLayer data={chartData} margin={{ left: 0, right: 0, top: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 3" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            stroke="var(--muted-foreground)"
            fontSize={10}
            tickFormatter={(value: string) => value.slice(0, 3).toUpperCase()}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dashed" />}
          />
          <Bar dataKey="delivered" fill="var(--color-delivered)" />
          <Bar dataKey="exceptions" fill="var(--color-exceptions)" />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>

      <div className="mt-3 border-t border-border pt-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 font-sans font-semibold text-ui-12 text-foreground">
          Trending up 5.2% this month
          <RiArrowUpLine aria-hidden className="size-3.5 text-accent-success" />
        </div>
        <div className="paper-label">Total shipments — last 6 months</div>
      </div>
    </div>
  )
}

export { OpsShipmentBarChart }
export type { OpsShipmentBarChartProps }
