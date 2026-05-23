import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiSubtractLine,
} from "@workspace/ui/icons"

/**
 * StatCard — Violet Grid v6 KPI surface.
 *
 * Information architecture is a homage to NextAdmin's CRM card (label →
 * value → trend → visual) but every visual cue is translated into the
 * Violet Grid voice: 0rem radius (LAW 13), brutalist offset shadow
 * (LAW 11), violet signal palette (LAW 9), IBM Plex Mono tabular numerals
 * (LAW 12), token-driven padding (LAW 1).
 *
 * Phase 1 of the NextAdmin refactor. Replaces ad-hoc KPI cards across
 * dashboards. Domain-agnostic: callers source `value` / `trend` from
 * service hooks; the card does no fetching (LAW 6/7).
 */

const statCardVariants = cva(
  "group/stat relative flex w-full flex-col gap-3 border border-border bg-card text-card-foreground transition-[box-shadow,transform] duration-[var(--duration-fast)] ease-[var(--ease-smooth)]",
  {
    variants: {
      variant: {
        default: "p-[var(--spacing-card-pad)] shadow-[var(--shadow-brutal-sm)]",
        compact: "p-[var(--spacing-card-pad)] shadow-[var(--shadow-brutal-sm)]",
        hero: "p-[var(--spacing-card-pad-lg)] shadow-[var(--shadow-brutal)]",
      },
      interactive: {
        true: "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-x-0.5 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-brutal)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
    },
  }
)

type TrendDirection = "up" | "down" | "neutral"

interface TrendDescriptor {
  /** Absolute percent change. Sign is inferred from `direction`. */
  value: number
  direction: TrendDirection
  /** Comparison window — e.g. "last week", "yesterday". */
  since?: string
  /** Optional pre-formatted string ("+2.5%"); overrides default formatting. */
  label?: string
}

interface StatCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onClick">,
    VariantProps<typeof statCardVariants> {
  label: string
  value: React.ReactNode
  trend?: TrendDescriptor
  /** Right-aligned visual slot — sparkline, donut, or icon. */
  visual?: React.ReactNode
  onClick?: () => void
  /**
   * Renders the value in IBM Plex Mono with tabular numerals. Default
   * `true` for KPI cards; disable only when the value is non-numeric
   * (e.g., "Active" / "Idle" status strings).
   */
  monoValue?: boolean
}

function StatCard({
  className,
  variant,
  label,
  value,
  trend,
  visual,
  onClick,
  monoValue = true,
  onKeyDown: userOnKeyDown,
  ...props
}: StatCardProps) {
  const isInteractive = Boolean(onClick)
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    userOnKeyDown?.(event)
    if (!isInteractive || event.defaultPrevented) return
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      data-slot="stat-card"
      data-variant={variant ?? "default"}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onClick : undefined}
      onKeyDown={isInteractive || userOnKeyDown ? handleKeyDown : undefined}
      className={cn(
        statCardVariants({ variant, interactive: isInteractive }),
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-col gap-1">
          <p
            data-slot="stat-card-label"
            className="t-overline text-muted-foreground"
          >
            {label}
          </p>
          <p
            data-slot="stat-card-value"
            className={cn(
              // Hero KPIs carry real visual gravity — the value steps up to
              // the .t-data display scale (40px mono) so a dominant primary
              // metric reads first. Non-hero cards stay at .t-h2.
              variant === "hero"
                ? monoValue
                  ? "t-data text-foreground"
                  : "t-h1 text-foreground"
                : cn(
                    "t-h2 text-foreground",
                    monoValue && "font-mono tabular-nums tracking-tight"
                  )
            )}
          >
            {value}
          </p>
        </div>
        {visual ? (
          <div
            data-slot="stat-card-visual"
            aria-hidden="true"
            className="shrink-0 self-start"
          >
            {visual}
          </div>
        ) : null}
      </div>
      {trend ? <StatCardTrend {...trend} /> : null}
    </div>
  )
}

function StatCardTrend({ value, direction, since, label }: TrendDescriptor) {
  const Icon =
    direction === "up"
      ? RiArrowUpLine
      : direction === "down"
        ? RiArrowDownLine
        : RiSubtractLine
  const colorClass =
    direction === "up"
      ? "text-accent-success"
      : direction === "down"
        ? "text-destructive"
        : "text-muted-foreground"
  const formatted =
    label ??
    (direction === "neutral"
      ? "—"
      : `${direction === "up" ? "+" : "−"}${formatPercent(value)}`)
  const ariaLabel =
    direction === "neutral"
      ? since
        ? `No change since ${since}`
        : "No change"
      : `${direction === "up" ? "Increased" : "Decreased"} by ${formatPercent(value)}${
          since ? ` since ${since}` : ""
        }`

  return (
    <p
      data-slot="stat-card-trend"
      data-direction={direction}
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium",
        colorClass
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      <span className="t-mono">{formatted}</span>
      {since ? (
        <span className="text-muted-foreground font-sans">since {since}</span>
      ) : null}
    </p>
  )
}

function formatPercent(value: number): string {
  const abs = Math.abs(value)
  const fixed = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1)
  return `${fixed}%`
}

export { StatCard, statCardVariants }
export type { StatCardProps, TrendDescriptor, TrendDirection }
