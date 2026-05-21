"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

interface ArrivalAuditStatsProps {
  total: number
  scanned: number
  exceptions?: number
  className?: string
}

export function ArrivalAuditStats({
  total,
  scanned,
  exceptions = 0,
  className,
}: ArrivalAuditStatsProps) {
  const pending = Math.max(0, total - scanned - exceptions)
  const progress = total > 0 ? Math.round((scanned / total) * 100) : 0

  return (
    <section
      data-slot="arrival-audit-stats"
      className={cn("grid gap-3", className)}
    >
      <dl className="grid grid-cols-2 gap-px bg-border/40 lg:grid-cols-4">
        <Tile label="Expected" value={total} />
        <Tile label="Scanned" value={scanned} tone="success" />
        <Tile label="Pending" value={pending} tone="warning" />
        <Tile label="Exceptions" value={exceptions} tone="error" />
      </dl>

      <div className="space-y-1">
        <div className="flex items-center justify-between font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          <span>Reconciliation progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full bg-muted">
          <div
            className={cn(
              "h-full transition-[width] duration-300",
              progress >= 100
                ? "bg-status-success"
                : progress >= 50
                  ? "bg-primary"
                  : "bg-status-warning"
            )}
            style={{ width: `${progress}%` }}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            role="progressbar"
          />
        </div>
      </div>
    </section>
  )
}

function Tile({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "success" | "warning" | "error"
}) {
  return (
    <div className="bg-background p-3">
      <p className="font-mono text-paper-9 uppercase tracking-paper-20 text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-heading text-lg font-semibold tracking-tight",
          tone === "success" && "text-status-success",
          tone === "warning" && "text-status-warning",
          tone === "error" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  )
}
