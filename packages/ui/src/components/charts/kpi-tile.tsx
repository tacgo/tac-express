import * as React from "react"
import {
  RiArrowDownLine,
  RiArrowRightLine,
  RiArrowUpLine,
  type RemixiconComponentType,
} from "../../icons"
import { cn } from "../../lib/utils"
import type { SparkPoint, Trend } from "./types"

export interface KpiTileProps {
  /** ALL-CAPS caption. */
  caption: string
  /** Pre-formatted display value (e.g. "₹1,588", "2", "N/A"). */
  value: string
  /** Optional accessory icon (Remixicon component) for the caption row. */
  icon?: RemixiconComponentType
  /** Optional time-series for the sparkline. < 2 points → no sparkline. */
  spark?: SparkPoint[]
  /** Optional delta chip. */
  delta?: {
    /** Pre-formatted delta string, e.g. "+12%" or "−3". */
    label: string
    trend: Trend
  }
  /** Optional sublabel. */
  sublabel?: string
  className?: string
}

const TREND_ICON: Record<Trend, RemixiconComponentType> = {
  up: RiArrowUpLine,
  down: RiArrowDownLine,
  flat: RiArrowRightLine,
}

/**
 * Mission-control KPI tile. Caption, large numeric readout, optional
 * step-sparkline and delta chip. No curves anywhere. Server-safe.
 */
export function KpiTile({
  caption,
  value,
  icon: Icon,
  spark,
  delta,
  sublabel,
  className,
}: KpiTileProps) {
  const sparkPath = spark && spark.length >= 2 ? buildStepPath(spark) : null

  return (
    <article
      className={cn(
        "flex flex-col gap-3 border border-chart-grid bg-card p-4",
        "text-card-foreground",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon ? (
            <Icon
              aria-hidden
              className="size-3.5 text-chart-axis"
            />
          ) : null}
          <h3 className="tac-caption">{caption}</h3>
        </div>
        {delta ? <DeltaChip {...delta} /> : null}
      </header>

      <p className="tac-readout text-3xl font-medium tracking-tight text-foreground">
        {value}
      </p>

      {sublabel ? <p className="tac-tag">{sublabel}</p> : null}

      {sparkPath ? <Spark path={sparkPath} /> : null}
    </article>
  )
}

function DeltaChip({ label, trend }: { label: string; trend: Trend }) {
  const Icon = TREND_ICON[trend]
  const tone =
    trend === "up"
      ? "text-chart-ontime"
      : trend === "down"
        ? "text-chart-breached"
        : "text-chart-axis"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border border-chart-grid",
        "px-1.5 py-0.5 tac-tag tac-readout",
        tone,
      )}
    >
      <Icon aria-hidden className="size-2.5" />
      {label}
    </span>
  )
}

function Spark({ path }: { path: { d: string; fillD: string } }) {
  return (
    <svg
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      role="img"
      aria-label="Sparkline trend"
      className="h-6 w-full"
    >
      <path d={path.fillD} fill="var(--chart-primary)" fillOpacity={0.16} />
      <path
        d={path.d}
        fill="none"
        stroke="var(--chart-primary)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/**
 * Build a stepAfter (right-angle) SVG path from a value series.
 * Output is normalized to a 0–100 × 0–24 viewBox.
 */
function buildStepPath(points: SparkPoint[]): { d: string; fillD: string } {
  // ⚡ Bolt: Use loop instead of Math.max/min(...array) to prevent call stack issues
  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < points.length; i++) {
    const y = points[i]!.y
    if (y < min) min = y
    if (y > max) max = y
  }
  const range = max - min || 1
  const stepX = points.length > 1 ? 100 / (points.length - 1) : 100

  const coords = points.map((p, i) => {
    const x = i * stepX
    const y = 22 - ((p.y - min) / range) * 20
    return { x, y }
  })

  let d = `M ${coords[0]!.x} ${coords[0]!.y}`
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!
    const cur = coords[i]!
    d += ` L ${cur.x} ${prev.y} L ${cur.x} ${cur.y}`
  }

  const fillD = `${d} L ${coords[coords.length - 1]!.x} 24 L ${coords[0]!.x} 24 Z`

  return { d, fillD }
}
