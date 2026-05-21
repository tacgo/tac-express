"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"

export interface OperationalIndicatorView {
  key: string
  label: string
  value: number
  target: number
  status: "ok" | "warn" | "fail"
  unit?: "count" | "percent"
}

export interface OperationalHealthView {
  score: number
  status: "healthy" | "degraded" | "critical"
  indicators: OperationalIndicatorView[]
}

interface OperationalHealthCardProps {
  data?: OperationalHealthView
  loading?: boolean
  className?: string
}

const statusVariants = cva("t-mono-sm uppercase tracking-widest px-2 py-0.5 border", {
  variants: {
    status: {
      healthy: "border-primary text-primary",
      degraded: "border-[var(--accent-warning)] text-[var(--accent-warning)]",
      critical: "border-destructive text-destructive",
    },
  },
})

const indicatorVariants = cva("h-1.5 w-full border border-border", {
  variants: {
    status: {
      ok: "bg-primary",
      warn: "bg-[var(--accent-warning)]",
      fail: "bg-destructive",
    },
  },
})

function formatValue(value: number, unit?: "count" | "percent"): string {
  if (unit === "percent") return `${value}%`
  return value.toLocaleString()
}

function OperationalHealthCard({ data, loading, className }: OperationalHealthCardProps) {
  if (loading || !data) {
    return (
      <div
        data-slot="operational-health-card"
        className={cn(
          "bg-card p-5 animate-pulse tac-fui-panel",
          className
        )}
      >
        <div className="h-4 w-32 bg-muted mb-4" />
        <div className="h-16 w-full bg-muted mb-3" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-full bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const { score, status, indicators } = data

  return (
    <section
      data-slot="operational-health-card"
      className={cn("bg-card p-5 tac-fui-panel", className)}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="t-overline text-foreground tracking-widest">
          Operational Health
        </p>
        <span className={cn(statusVariants({ status }))}>{status}</span>
      </div>

      <div className="flex items-end gap-3 mb-5">
        <span className="t-data text-foreground drop-shadow-sm" style={{ fontSize: '3.5rem' }}>
          {score}
        </span>
        <div className="flex flex-col gap-0.5 pb-2">
          <span className="t-mono-sm text-muted-foreground">/ 100</span>
          <span className="t-overline text-muted-foreground">Health Score</span>
        </div>
      </div>

      <ul className="flex flex-col gap-3" data-slot="health-indicators">
        {indicators.map((indicator) => (
          <li key={indicator.key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="t-mono-sm uppercase tracking-widest text-foreground">{indicator.label}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatValue(indicator.value, indicator.unit)}
                <span className="text-muted-foreground/50">
                  {" / "}
                  {formatValue(indicator.target, indicator.unit)}
                </span>
              </span>
            </div>
            <div
              className={cn(indicatorVariants({ status: indicator.status }))}
              role="progressbar"
              aria-valuenow={indicator.value}
              aria-valuemax={indicator.target}
              aria-label={indicator.label}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

export { OperationalHealthCard }
