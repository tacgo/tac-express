"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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
 * OpsVolumeBarChart — stacked bar chart for the Paper Ops "Shipment Volume"
 * panel. Shares the panel anatomy with OpsGrowthAreaChart so the two cards
 * read as one design: title + 7D/30D/90D toggle on top, paper-label
 * subtitle, 200px chart, mono legend at bottom. Two-color palette:
 * --paper-violet (outbound, primary brand) + --paper-info (inbound). Both
 * series stack so the operator sees total daily throughput. Mock 90-day
 * dataset stays inline until a real time-series hook lands.
 */

const chartData = [
  { date: "2024-04-01", inbound: 150, outbound: 222 },
  { date: "2024-04-02", inbound: 180, outbound: 97 },
  { date: "2024-04-03", inbound: 120, outbound: 167 },
  { date: "2024-04-04", inbound: 260, outbound: 242 },
  { date: "2024-04-05", inbound: 290, outbound: 373 },
  { date: "2024-04-06", inbound: 340, outbound: 301 },
  { date: "2024-04-07", inbound: 180, outbound: 245 },
  { date: "2024-04-08", inbound: 320, outbound: 409 },
  { date: "2024-04-09", inbound: 110, outbound: 59 },
  { date: "2024-04-10", inbound: 190, outbound: 261 },
  { date: "2024-04-11", inbound: 350, outbound: 327 },
  { date: "2024-04-12", inbound: 210, outbound: 292 },
  { date: "2024-04-13", inbound: 380, outbound: 342 },
  { date: "2024-04-14", inbound: 220, outbound: 137 },
  { date: "2024-04-15", inbound: 170, outbound: 120 },
  { date: "2024-04-16", inbound: 190, outbound: 138 },
  { date: "2024-04-17", inbound: 360, outbound: 446 },
  { date: "2024-04-18", inbound: 410, outbound: 364 },
  { date: "2024-04-19", inbound: 180, outbound: 243 },
  { date: "2024-04-20", inbound: 150, outbound: 89 },
  { date: "2024-04-21", inbound: 200, outbound: 137 },
  { date: "2024-04-22", inbound: 170, outbound: 224 },
  { date: "2024-04-23", inbound: 230, outbound: 138 },
  { date: "2024-04-24", inbound: 290, outbound: 387 },
  { date: "2024-04-25", inbound: 250, outbound: 215 },
  { date: "2024-04-26", inbound: 130, outbound: 75 },
  { date: "2024-04-27", inbound: 420, outbound: 383 },
  { date: "2024-04-28", inbound: 180, outbound: 122 },
  { date: "2024-04-29", inbound: 240, outbound: 315 },
  { date: "2024-04-30", inbound: 380, outbound: 454 },
  { date: "2024-05-01", inbound: 220, outbound: 165 },
  { date: "2024-05-02", inbound: 310, outbound: 293 },
  { date: "2024-05-03", inbound: 190, outbound: 247 },
  { date: "2024-05-04", inbound: 420, outbound: 385 },
  { date: "2024-05-05", inbound: 390, outbound: 481 },
  { date: "2024-05-06", inbound: 520, outbound: 498 },
  { date: "2024-05-07", inbound: 300, outbound: 388 },
  { date: "2024-05-08", inbound: 210, outbound: 149 },
  { date: "2024-05-09", inbound: 180, outbound: 227 },
  { date: "2024-05-10", inbound: 330, outbound: 293 },
  { date: "2024-05-11", inbound: 270, outbound: 335 },
  { date: "2024-05-12", inbound: 240, outbound: 197 },
  { date: "2024-05-13", inbound: 160, outbound: 197 },
  { date: "2024-05-14", inbound: 490, outbound: 448 },
  { date: "2024-05-15", inbound: 380, outbound: 473 },
  { date: "2024-05-16", inbound: 400, outbound: 338 },
  { date: "2024-05-17", inbound: 420, outbound: 499 },
  { date: "2024-05-18", inbound: 350, outbound: 315 },
  { date: "2024-05-19", inbound: 180, outbound: 235 },
  { date: "2024-05-20", inbound: 230, outbound: 177 },
  { date: "2024-05-21", inbound: 140, outbound: 82 },
  { date: "2024-05-22", inbound: 120, outbound: 81 },
  { date: "2024-05-23", inbound: 290, outbound: 252 },
  { date: "2024-05-24", inbound: 220, outbound: 294 },
  { date: "2024-05-25", inbound: 250, outbound: 201 },
  { date: "2024-05-26", inbound: 170, outbound: 213 },
  { date: "2024-05-27", inbound: 460, outbound: 420 },
  { date: "2024-05-28", inbound: 190, outbound: 233 },
  { date: "2024-05-29", inbound: 130, outbound: 78 },
  { date: "2024-05-30", inbound: 280, outbound: 340 },
  { date: "2024-05-31", inbound: 230, outbound: 178 },
  { date: "2024-06-01", inbound: 200, outbound: 178 },
  { date: "2024-06-02", inbound: 410, outbound: 470 },
  { date: "2024-06-03", inbound: 160, outbound: 103 },
  { date: "2024-06-04", inbound: 380, outbound: 439 },
  { date: "2024-06-05", inbound: 140, outbound: 88 },
  { date: "2024-06-06", inbound: 250, outbound: 294 },
  { date: "2024-06-07", inbound: 370, outbound: 323 },
  { date: "2024-06-08", inbound: 320, outbound: 385 },
  { date: "2024-06-09", inbound: 480, outbound: 438 },
  { date: "2024-06-10", inbound: 200, outbound: 155 },
  { date: "2024-06-11", inbound: 150, outbound: 92 },
  { date: "2024-06-12", inbound: 420, outbound: 492 },
  { date: "2024-06-13", inbound: 130, outbound: 81 },
  { date: "2024-06-14", inbound: 380, outbound: 426 },
  { date: "2024-06-15", inbound: 350, outbound: 307 },
  { date: "2024-06-16", inbound: 310, outbound: 371 },
  { date: "2024-06-17", inbound: 520, outbound: 475 },
  { date: "2024-06-18", inbound: 170, outbound: 107 },
  { date: "2024-06-19", inbound: 290, outbound: 341 },
  { date: "2024-06-20", inbound: 450, outbound: 408 },
  { date: "2024-06-21", inbound: 210, outbound: 169 },
  { date: "2024-06-22", inbound: 270, outbound: 317 },
  { date: "2024-06-23", inbound: 530, outbound: 480 },
  { date: "2024-06-24", inbound: 180, outbound: 132 },
  { date: "2024-06-25", inbound: 190, outbound: 141 },
  { date: "2024-06-26", inbound: 380, outbound: 434 },
  { date: "2024-06-27", inbound: 490, outbound: 448 },
  { date: "2024-06-28", inbound: 200, outbound: 149 },
  { date: "2024-06-29", inbound: 160, outbound: 103 },
  { date: "2024-06-30", inbound: 400, outbound: 446 },
]

const chartConfig = {
  volume: { label: "Volume" },
  outbound: { label: "Outbound", color: "var(--primary)" },
  inbound: { label: "Inbound", color: "var(--accent-info)" },
} satisfies ChartConfig

type Range = "7d" | "30d" | "90d"
const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
]

interface OpsVolumeBarChartProps {
  className?: string
}

function OpsVolumeBarChart({ className }: OpsVolumeBarChartProps) {
  const [range, setRange] = React.useState<Range>("90d")

  const filteredData = React.useMemo(() => {
    const referenceDate = new Date("2024-06-30")
    const daysToSubtract = range === "7d" ? 7 : range === "30d" ? 30 : 90
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return chartData.filter((item) => new Date(item.date) >= startDate)
  }, [range])

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Row 1: title + range pill toggle (mirrored in OpsGrowthAreaChart) */}
      <div className="flex items-center justify-between">
        <h3 className="t-h4 text-foreground">Shipment Volume</h3>
        <div
          role="tablist"
          aria-label="Time range"
          className="inline-flex border border-border bg-card"
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
                  "px-2 py-1 font-mono font-medium text-ui-10 tracking-badge uppercase transition-colors",
                  "border-l border-border first:border-l-0",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Row 2: paper-label subtitle (matches OpsGrowthAreaChart) */}
      <div className="paper-label mt-2.5">
        Daily flow — outbound vs. inbound
      </div>

      {/* Row 3: 200px chart (matches OpsGrowthAreaChart) */}
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[length:var(--spacing-chart-md)] w-full mt-3"
      >
        <BarChart accessibilityLayer data={filteredData} margin={{ left: 0, right: 0, top: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="2 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            stroke="var(--muted-foreground)"
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
          <Bar dataKey="inbound" stackId="a" fill="var(--color-inbound)" />
          <Bar dataKey="outbound" stackId="a" fill="var(--color-outbound)" />
          <ChartLegend content={<ChartLegendContent />} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}

export { OpsVolumeBarChart }
export type { OpsVolumeBarChartProps }
