"use client"

import * as React from "react"
import { RadialBar, RadialBarChart } from "recharts"

import { cn } from "@workspace/ui/lib/utils"
import { RiArrowUpLine } from "@workspace/ui/icons"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/primitives/chart"

/**
 * OpsRevenueRadialChart — radial chart for the Paper Ops Analytics
 * "Revenue Trend" panel. Replaces the "Awaiting Signal" empty state with a
 * radial bar breakdown of revenue by service class (Standard / Express /
 * Priority / Returns / Other). Adapted from shadcn's `chart-radial-simple`
 * recipe, restyled with --paper-* tokens — no glassmorphism, no rounded
 * corners on the surrounding card (LAW 13). Mock data inline until a
 * service-class revenue aggregate hook lands.
 */

const chartData = [
  { service: "standard", revenue: 275, fill: "var(--color-standard)" },
  { service: "express", revenue: 200, fill: "var(--color-express)" },
  { service: "priority", revenue: 187, fill: "var(--color-priority)" },
  { service: "returns", revenue: 173, fill: "var(--color-returns)" },
  { service: "other", revenue: 90, fill: "var(--color-other)" },
]

// Calm monochrome violet ramp — service classes step down the --chart-1..5
// ramp (now the violet ramp) instead of a violet/blue/green/amber/grey
// rainbow. Aligns the radial with the bar charts + the operational palette
// (hybrid modernization: restrained accent, low-noise analytics).
const chartConfig = {
  revenue: { label: "Revenue" },
  standard: { label: "Standard", color: "var(--chart-1)" },
  express: { label: "Express", color: "var(--chart-2)" },
  priority: { label: "Priority", color: "var(--chart-3)" },
  returns: { label: "Returns", color: "var(--chart-4)" },
  other: { label: "Other", color: "var(--chart-5)" },
} satisfies ChartConfig

interface OpsRevenueRadialChartProps {
  className?: string
}

function OpsRevenueRadialChart({ className }: OpsRevenueRadialChartProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between">
        <h3 className="t-h4 text-foreground">Revenue Trend</h3>
        <span className="paper-label">Jan — Jun</span>
      </div>

      <div className="paper-label mt-2.5">Revenue by service class</div>

      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square h-[length:var(--spacing-chart-lg)] mt-3"
      >
        <RadialBarChart data={chartData} innerRadius={36} outerRadius={104}>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="service" />}
          />
          <RadialBar dataKey="revenue" background />
        </RadialBarChart>
      </ChartContainer>

      <div className="mt-3 border-t border-border pt-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 font-sans font-semibold text-ui-12 text-foreground">
          Trending up 5.2% this month
          <RiArrowUpLine aria-hidden className="size-3.5 text-accent-success" />
        </div>
        <div className="paper-label">Showing service-class revenue mix — last 6 months</div>
      </div>
    </div>
  )
}

export { OpsRevenueRadialChart }
export type { OpsRevenueRadialChartProps }
