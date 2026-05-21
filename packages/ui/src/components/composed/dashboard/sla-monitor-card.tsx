"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { RiAlertFill, RiTimeFill, RiArrowRightLine } from "@workspace/ui/icons"
import type { SLABreach } from "@workspace/services/dashboard.service"
import { SkeletonRows } from "@workspace/ui/components/primitives/skeleton"

interface SLAMonitorCardProps {
  breaches?: SLABreach[]
  loading?: boolean
  className?: string
}

function hoursLabel(h: number): string {
  if (h < 1) return "< 1h"
  if (h < 24) return `${Math.round(h)}h`
  return `${(h / 24).toFixed(1)}d`
}

function BreachRow({ breach }: { breach: SLABreach }) {
  const severe = breach.hoursBreached >= 12
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border px-4 py-2.5 text-sm last:border-0">
      <div className="min-w-0">
        <p className="truncate font-mono text-xs font-medium text-foreground">
          {breach.awbNumber}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {breach.originHub} → {breach.destHub} · {breach.serviceLevel.replace("_", " ")}
        </p>
      </div>
      <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
        {breach.status.replace("_", " ")}
      </span>
      <span
        className={cn(
          "inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-2xs uppercase tracking-wider whitespace-nowrap",
          severe
            ? "border-accent-danger text-accent-danger animate-pulse"
            : "border-accent-warning text-accent-warning",
        )}
      >
        <RiTimeFill className="size-3" aria-hidden="true" />
        +{hoursLabel(breach.hoursBreached)}
      </span>
    </div>
  )
}

export function SLAMonitorCard({ breaches = [], loading, className }: SLAMonitorCardProps) {
  const criticalCount = breaches.filter((b) => b.hoursBreached >= 12).length
  const warnCount = breaches.length - criticalCount

  return (
    <div className={cn("tac-fui-panel overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <RiAlertFill
            className={cn(
              "size-4",
              breaches.length > 0 ? "text-accent-warning animate-pulse" : "text-muted-foreground",
            )}
            aria-hidden="true"
          />
          <span className="t-overline text-foreground tracking-widest">
            SLA Breach Monitor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="border border-accent-danger bg-accent-danger/10 px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-accent-danger">
              {criticalCount} critical
            </span>
          )}
          {warnCount > 0 && (
            <span className="border border-accent-warning bg-accent-warning/10 px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-accent-warning">
              {warnCount} warn
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="px-4 py-3">
          <SkeletonRows rows={4} />
        </div>
      ) : breaches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10">
          <span className="w-2 h-2 bg-accent-success animate-pulse" />
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            All shipments within SLA
          </p>
        </div>
      ) : (
        <div>
          {breaches.map((b) => (
            <BreachRow key={b.shipmentId} breach={b} />
          ))}
        </div>
      )}

      {/* Footer */}
      {breaches.length > 0 && (
        <div className="border-t border-border px-4 py-2">
          <a
            href="/ops-console/exceptions"
            className="inline-flex items-center gap-1 font-mono text-2xs uppercase tracking-wider text-primary hover:underline"
          >
            View all exceptions
            <RiArrowRightLine className="size-3" aria-hidden="true" />
          </a>
        </div>
      )}
    </div>
  )
}
