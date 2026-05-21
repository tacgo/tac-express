"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { cn } from "@workspace/ui/lib/utils"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/primitives/chart"

/**
 * OpsGrowthAreaChart — stacked area chart for the Paper Ops "Growth" panel.
 * Shares the panel anatomy with OpsVolumeBarChart so the two cards read as
 * one design: title + 7D/30D/90D toggle on top, paper-label subtitle, 200px
 * chart, mono legend at bottom. Two-color palette: --paper-violet (primary
 * brand) + --paper-info (secondary). Mock 90-day dataset stays inline until
 * a real time-series hook lands in `@workspace/services`.
 */

const chartData = [
  { date: "2024-04-01", delivered: 222, exceptions: 150 },
  { date: "2024-04-02", delivered: 97, exceptions: 180 },
  { date: "2024-04-03", delivered: 167, exceptions: 120 },
  { date: "2024-04-04", delivered: 242, exceptions: 260 },
  { date: "2024-04-05", delivered: 373, exceptions: 290 },
  { date: "2024-04-06", delivered: 301, exceptions: 340 },
  { date: "2024-04-07", delivered: 245, exceptions: 180 },
  { date: "2024-04-08", delivered: 409, exceptions: 320 },
  { date: "2024-04-09", delivered: 59, exceptions: 110 },
  { date: "2024-04-10", delivered: 261, exceptions: 190 },
  { date: "2024-04-11", delivered: 327, exceptions: 350 },
  { date: "2024-04-12", delivered: 292, exceptions: 210 },
  { date: "2024-04-13", delivered: 342, exceptions: 380 },
  { date: "2024-04-14", delivered: 137, exceptions: 220 },
  { date: "2024-04-15", delivered: 120, exceptions: 170 },
  { date: "2024-04-16", delivered: 138, exceptions: 190 },
  { date: "2024-04-17", delivered: 446, exceptions: 360 },
  { date: "2024-04-18", delivered: 364, exceptions: 410 },
  { date: "2024-04-19", delivered: 243, exceptions: 180 },
  { date: "2024-04-20", delivered: 89, exceptions: 150 },
  { date: "2024-04-21", delivered: 137, exceptions: 200 },
  { date: "2024-04-22", delivered: 224, exceptions: 170 },
  { date: "2024-04-23", delivered: 138, exceptions: 230 },
  { date: "2024-04-24", delivered: 387, exceptions: 290 },
  { date: "2024-04-25", delivered: 215, exceptions: 250 },
  { date: "2024-04-26", delivered: 75, exceptions: 130 },
  { date: "2024-04-27", delivered: 383, exceptions: 420 },
  { date: "2024-04-28", delivered: 122, exceptions: 180 },
  { date: "2024-04-29", delivered: 315, exceptions: 240 },
  { date: "2024-04-30", delivered: 454, exceptions: 380 },
  { date: "2024-05-01", delivered: 165, exceptions: 220 },
  { date: "2024-05-02", delivered: 293, exceptions: 310 },
  { date: "2024-05-03", delivered: 247, exceptions: 190 },
  { date: "2024-05-04", delivered: 385, exceptions: 420 },
  { date: "2024-05-05", delivered: 481, exceptions: 390 },
  { date: "2024-05-06", delivered: 498, exceptions: 520 },
  { date: "2024-05-07", delivered: 388, exceptions: 300 },
  { date: "2024-05-08", delivered: 149, exceptions: 210 },
  { date: "2024-05-09", delivered: 227, exceptions: 180 },
  { date: "2024-05-10", delivered: 293, exceptions: 330 },
  { date: "2024-05-11", delivered: 335, exceptions: 270 },
  { date: "2024-05-12", delivered: 197, exceptions: 240 },
  { date: "2024-05-13", delivered: 197, exceptions: 160 },
  { date: "2024-05-14", delivered: 448, exceptions: 490 },
  { date: "2024-05-15", delivered: 473, exceptions: 380 },
  { date: "2024-05-16", delivered: 338, exceptions: 400 },
  { date: "2024-05-17", delivered: 499, exceptions: 420 },
  { date: "2024-05-18", delivered: 315, exceptions: 350 },
  { date: "2024-05-19", delivered: 235, exceptions: 180 },
  { date: "2024-05-20", delivered: 177, exceptions: 230 },
  { date: "2024-05-21", delivered: 82, exceptions: 140 },
  { date: "2024-05-22", delivered: 81, exceptions: 120 },
  { date: "2024-05-23", delivered: 252, exceptions: 290 },
  { date: "2024-05-24", delivered: 294, exceptions: 220 },
  { date: "2024-05-25", delivered: 201, exceptions: 250 },
  { date: "2024-05-26", delivered: 213, exceptions: 170 },
  { date: "2024-05-27", delivered: 420, exceptions: 460 },
  { date: "2024-05-28", delivered: 233, exceptions: 190 },
  { date: "2024-05-29", delivered: 78, exceptions: 130 },
  { date: "2024-05-30", delivered: 340, exceptions: 280 },
  { date: "2024-05-31", delivered: 178, exceptions: 230 },
  { date: "2024-06-01", delivered: 178, exceptions: 200 },
  { date: "2024-06-02", delivered: 470, exceptions: 410 },
  { date: "2024-06-03", delivered: 103, exceptions: 160 },
  { date: "2024-06-04", delivered: 439, exceptions: 380 },
  { date: "2024-06-05", delivered: 88, exceptions: 140 },
  { date: "2024-06-06", delivered: 294, exceptions: 250 },
  { date: "2024-06-07", delivered: 323, exceptions: 370 },
  { date: "2024-06-08", delivered: 385, exceptions: 320 },
  { date: "2024-06-09", delivered: 438, exceptions: 480 },
  { date: "2024-06-10", delivered: 155, exceptions: 200 },
  { date: "2024-06-11", delivered: 92, exceptions: 150 },
  { date: "2024-06-12", delivered: 492, exceptions: 420 },
  { date: "2024-06-13", delivered: 81, exceptions: 130 },
  { date: "2024-06-14", delivered: 426, exceptions: 380 },
  { date: "2024-06-15", delivered: 307, exceptions: 350 },
  { date: "2024-06-16", delivered: 371, exceptions: 310 },
  { date: "2024-06-17", delivered: 475, exceptions: 520 },
  { date: "2024-06-18", delivered: 107, exceptions: 170 },
  { date: "2024-06-19", delivered: 341, exceptions: 290 },
  { date: "2024-06-20", delivered: 408, exceptions: 450 },
  { date: "2024-06-21", delivered: 169, exceptions: 210 },
  { date: "2024-06-22", delivered: 317, exceptions: 270 },
  { date: "2024-06-23", delivered: 480, exceptions: 530 },
  { date: "2024-06-24", delivered: 132, exceptions: 180 },
  { date: "2024-06-25", delivered: 141, exceptions: 190 },
  { date: "2024-06-26", delivered: 434, exceptions: 380 },
  { date: "2024-06-27", delivered: 448, exceptions: 490 },
  { date: "2024-06-28", delivered: 149, exceptions: 200 },
  { date: "2024-06-29", delivered: 103, exceptions: 160 },
  { date: "2024-06-30", delivered: 446, exceptions: 400 },
]

const chartConfig = {
  shipments: { label: "Shipments" },
  delivered: { label: "Delivered", color: "var(--paper-violet)" },
  exceptions: { label: "Exceptions", color: "var(--paper-info)" },
} satisfies ChartConfig

type Range = "7d" | "30d" | "90d"
const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
]

interface OpsGrowthAreaChartProps {
  className?: string
}

function OpsGrowthAreaChart({ className }: OpsGrowthAreaChartProps) {
  const [range, setRange] = React.useState<Range>("90d")

  // Per-instance gradient IDs (see <defs> below). useId() produces a stable
  // unique ID per component mount; concat'd suffixes keep the two gradients
  // distinguishable from each other within the same instance. Closes #55.
  const reactId = React.useId()
  const deliveredFillId = `${reactId}-delivered`
  const exceptionsFillId = `${reactId}-exceptions`

  const filteredData = React.useMemo(() => {
    const referenceDate = new Date("2024-06-30")
    const daysToSubtract = range === "7d" ? 7 : range === "30d" ? 30 : 90
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return chartData.filter((item) => new Date(item.date) >= startDate)
  }, [range])

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Row 1: title + range pill toggle (mirrored in OpsVolumeBarChart) */}
      <div className="flex items-center justify-between">
        <div className="font-paper-display font-semibold text-ui-13 text-paper-fg-1">
          Growth
        </div>
        <div
          role="tablist"
          aria-label="Time range"
          className="inline-flex border border-paper-line bg-paper-card"
        >
          {RANGES.map((r) => {
            const active = r.value === range
            return (
              <button
                key={r.value}
                role="tab"
                aria-selected={active}
                onClick={() => setRange(r.value)}
                className={cn(
                  "px-2 py-1 font-paper-mono font-medium text-ui-10 tracking-badge uppercase transition-colors",
                  "border-l border-paper-line first:border-l-0",
                  active
                    ? "bg-paper-violet text-white"
                    : "text-paper-fg-2 hover:bg-paper-3",
                )}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row 2: paper-label subtitle (matches OpsVolumeBarChart) */}
      <div className="paper-label mt-2.5">
        Delivery activity — delivered vs. exceptions
      </div>

      {/* Row 3: 200px chart (matches OpsVolumeBarChart) */}
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[length:var(--spacing-chart-md)] w-full mt-3"
      >
        <AreaChart data={filteredData} margin={{ left: 0, right: 0, top: 4 }}>
          <defs>
            {/* Per-instance gradient IDs. SVG <defs> IDs are global in the
                document, so two charts mounted side-by-side (e.g. dashboard
                + analytics tile in a future A/B layout, or Storybook multi-
                instance) would have the second silently inherit the first's
                gradient fills. useId() scopes them. Closes #55. */}
            <linearGradient id={deliveredFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-delivered)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-delivered)" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id={exceptionsFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-exceptions)" stopOpacity={0.8} />
              <stop offset="95%" stopColor="var(--color-exceptions)" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--paper-line)" strokeDasharray="2 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            stroke="var(--paper-fg-3)"
            fontSize={10}
            tickFormatter={(value) => {
              const date = new Date(value)
              return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }
                indicator="dot"
              />
            }
          />
          <Area
            dataKey="exceptions"
            type="natural"
            fill={`url(#${exceptionsFillId})`}
            stroke="var(--color-exceptions)"
            stackId="a"
          />
          <Area
            dataKey="delivered"
            type="natural"
            fill={`url(#${deliveredFillId})`}
            stroke="var(--color-delivered)"
            stackId="a"
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

export { OpsGrowthAreaChart }
export type { OpsGrowthAreaChartProps }
