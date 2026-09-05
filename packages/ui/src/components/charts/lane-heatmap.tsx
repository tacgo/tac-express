import * as React from "react"
import { cn } from "../../lib/utils"
import { ChartEmptyState } from "./chart-empty-state"
import type { LaneHeatmapData } from "./types"

export interface LaneHeatmapProps extends LaneHeatmapData {
  /** Cell value formatter. Default integer. */
  formatValue?: (value: number) => string
  /** Minimum non-zero cells to render. Default 1. */
  minimumCells?: number
  className?: string
}

const RAMP_VARS = [
  "var(--chart-ramp-1)",
  "var(--chart-ramp-2)",
  "var(--chart-ramp-3)",
  "var(--chart-ramp-4)",
  "var(--chart-ramp-5)",
] as const

/**
 * Origin × destination heatmap. Square cells, single-hue intensity ramp,
 * monospace axis labels. A real heatmap — not a 1-cell table. Server-safe.
 */
export function LaneHeatmap({
  origins,
  destinations,
  cells,
  max,
  formatValue = (v) => v.toLocaleString(),
  minimumCells = 1,
  className,
}: LaneHeatmapProps) {
  let count = 0
  let computedMax = 1
  const lookup = new Map<string, number>()
  for (const c of cells) {
    if (c.value > 0) count++
    if (c.value > computedMax) computedMax = c.value
    lookup.set(`${c.origin}${c.destination}`, c.value)
  }

  if (count < minimumCells) {
    return <ChartEmptyState count={count} minimum={minimumCells} />
  }

  const cap = max ?? computedMax // ⚡ Bolt: Loop replaces Math.max(...cells) and .filter to prevent call stack size exceeded and GC spikes

  return (
    <div
      className={cn("w-full overflow-x-auto", className)}
      role="region"
      aria-label="Origin by destination shipment heatmap"
    >
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th aria-hidden className="w-24 border-b border-chart-grid" />
            {destinations.map((d) => (
              <th
                key={d}
                scope="col"
                className="border-b border-chart-grid px-1 py-1 text-center align-bottom"
              >
                <span className="tac-axis">{d}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {origins.map((origin) => (
            <tr key={origin}>
              <th
                scope="row"
                className="w-24 border-r border-chart-grid pr-2 text-right align-middle"
              >
                <span className="tac-axis">{origin}</span>
              </th>
              {destinations.map((destination) => {
                const value = lookup.get(`${origin}${destination}`) ?? 0
                const intensity = pickIntensity(value, cap)
                const tone = value === 0 ? "transparent" : RAMP_VARS[intensity]
                return (
                  <td
                    key={destination}
                    title={`${origin} → ${destination}: ${formatValue(value)}`}
                    className="h-9 border border-chart-grid p-0 align-middle text-center"
                    style={{ background: tone }}
                  >
                    <span
                      className={cn(
                        "tac-axis tac-readout",
                        intensity >= 3
                          ? "text-primary-foreground"
                          : "text-foreground",
                      )}
                    >
                      {value === 0 ? "·" : formatValue(value)}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Map a value to a ramp index 0..4. */
function pickIntensity(value: number, cap: number): 0 | 1 | 2 | 3 | 4 {
  if (cap <= 0 || value <= 0) return 0
  const f = value / cap
  if (f >= 0.85) return 4
  if (f >= 0.65) return 3
  if (f >= 0.4) return 2
  if (f >= 0.2) return 1
  return 0
}
