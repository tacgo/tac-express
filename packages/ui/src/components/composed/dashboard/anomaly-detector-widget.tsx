"use client"

import * as React from "react"
import { differenceInHours, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import {
  RiAlertLine,
  RiBugLine,
  RiTimeLine,
  RiSparkling2Line,
  RiArrowRightLine,
  RiBubbleChartLine,
  type RemixiconComponentType,
} from "@workspace/ui/icons"

export type AnomalyType =
  | "STALLED"
  | "DELAY"
  | "ROUTE_MISMATCH"
  | "VOLUME_SPIKE"
  | "MISSED_SLA"

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  awbNumber?: string
  shipmentId?: string
  description: string
  detectedAt: string
  /** 0..1 confidence — drives the bar fill. Rules-based defaults to 1; ML can
   *  feed real probabilities later. */
  confidence?: number
}

interface AnomalyDetectorWidgetProps {
  anomalies: Anomaly[]
  loading?: boolean
  /** Refresh handler — usually wired to a TanStack Query refetch. */
  onRefresh?: () => void
  /** Resolve / dismiss a single anomaly. */
  onResolve?: (anomalyId: string) => void
  /** Investigate handler — usually navigates to /shipments/[id]. */
  onInvestigate?: (anomaly: Anomaly) => void
  className?: string
  /** When true, lists raw rules-based detections only (default). When false
   *  the widget hints that the upstream feed is ML-augmented. Phase 6 ships
   *  rules-only; Phase 9+ will plug in an ML signal. */
  rulesBasedOnly?: boolean
}

interface ShipmentRowMinimal {
  id: string
  awbNumber: string
  status: string
  originHub: string
  destHub: string
  createdAt: string
  updatedAt: string
}

/**
 * Pure helper: derive anomalies from a list of shipment rows using a small
 * set of rules. Exposed separately so it can be unit-tested and reused by
 * Edge Functions later.
 */
export function detectAnomaliesFromShipments(
  shipments: ShipmentRowMinimal[],
  now: Date = new Date()
): Anomaly[] {
  const out: Anomaly[] = []
  for (const s of shipments) {
    if (s.status === "DELIVERED" || s.status === "CANCELLED") continue
    const hoursSinceUpdate = differenceInHours(
      now,
      parseISO(s.updatedAt ?? s.createdAt)
    )

    // STALLED — no update in 24h while still in active flow
    if (hoursSinceUpdate >= 24) {
      out.push({
        id: `stalled-${s.id}`,
        type: "STALLED",
        severity:
          hoursSinceUpdate >= 72
            ? "CRITICAL"
            : hoursSinceUpdate >= 48
              ? "HIGH"
              : "MEDIUM",
        awbNumber: s.awbNumber,
        shipmentId: s.id,
        description: `No status update for ${hoursSinceUpdate}h on ${s.originHub} → ${s.destHub}.`,
        detectedAt: now.toISOString(),
        confidence: 1,
      })
    }

    // EXCEPTION-flagged shipments are auto-promoted to a CRITICAL anomaly
    if (s.status === "EXCEPTION") {
      out.push({
        id: `exception-${s.id}`,
        type: "DELAY",
        severity: "CRITICAL",
        awbNumber: s.awbNumber,
        shipmentId: s.id,
        description: "Shipment flagged with an exception — needs operator review.",
        detectedAt: now.toISOString(),
        confidence: 1,
      })
    }
  }
  return out
}

const TYPE_LABEL: Record<AnomalyType, string> = {
  STALLED: "Stalled",
  DELAY: "Delay",
  ROUTE_MISMATCH: "Route mismatch",
  VOLUME_SPIKE: "Volume spike",
  MISSED_SLA: "SLA breach",
}

const TYPE_ICON: Record<AnomalyType, RemixiconComponentType> = {
  STALLED: RiTimeLine,
  DELAY: RiAlertLine,
  ROUTE_MISMATCH: RiBubbleChartLine,
  VOLUME_SPIKE: RiSparkling2Line,
  MISSED_SLA: RiAlertLine,
}

export function AnomalyDetectorWidget({
  anomalies,
  loading,
  onRefresh,
  onResolve,
  onInvestigate,
  className,
  rulesBasedOnly = true,
}: AnomalyDetectorWidgetProps) {
  const counts = React.useMemo(() => {
    return {
      total: anomalies.length,
      critical: anomalies.filter((a) => a.severity === "CRITICAL").length,
      high: anomalies.filter((a) => a.severity === "HIGH").length,
    }
  }, [anomalies])

  return (
    <section
      data-slot="anomaly-detector-widget"
      className={cn(
        "tac-fui-panel flex flex-col bg-card",
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            <RiBugLine className="size-3" />
            Anomaly Detector
            <Badge
              variant={rulesBasedOnly ? "outline" : "default"}
              className="font-mono"
            >
              {rulesBasedOnly ? "Rules · v1" : "ML · v1"}
            </Badge>
          </p>
          <p className="mt-1 font-heading text-lg font-semibold tracking-tight">
            {counts.total} detection{counts.total === 1 ? "" : "s"}
            {counts.critical > 0 && (
              <span className="ml-2 font-mono text-xs text-destructive">
                · {counts.critical} critical
              </span>
            )}
            {counts.high > 0 && (
              <span className="ml-1 font-mono text-xs text-status-warning">
                · {counts.high} high
              </span>
            )}
          </p>
        </div>
        {onRefresh && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            className="font-mono text-ui-10 uppercase tracking-widest"
          >
            Refresh
          </Button>
        )}
      </header>

      <ScrollArea className="max-h-80">
        {loading ? (
          <div className="flex items-center justify-center py-12 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Scanning telemetry…
          </div>
        ) : anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <RiSparkling2Line className="size-6 text-status-success" />
            <p className="font-heading text-sm font-semibold">
              All clear
            </p>
            <p className="px-6 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
              No anomalies detected across the active fleet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {anomalies.map((a) => (
              <AnomalyRow
                key={a.id}
                anomaly={a}
                onResolve={onResolve}
                onInvestigate={onInvestigate}
              />
            ))}
          </ul>
        )}
      </ScrollArea>
    </section>
  )
}

function AnomalyRow({
  anomaly,
  onResolve,
  onInvestigate,
}: {
  anomaly: Anomaly
  onResolve?: (id: string) => void
  onInvestigate?: (a: Anomaly) => void
}) {
  const Icon = TYPE_ICON[anomaly.type]
  const conf = Math.max(0, Math.min(1, anomaly.confidence ?? 1))

  return (
    <li
      data-severity={anomaly.severity}
      className={cn(
        "grid gap-2 px-4 py-3",
        anomaly.severity === "CRITICAL" && "border-l-2 border-l-destructive",
        anomaly.severity === "HIGH" && "border-l-2 border-l-status-warning",
        anomaly.severity === "MEDIUM" &&
          "border-l-2 border-l-status-warning/50"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex size-7 items-center justify-center border border-border bg-muted",
              anomaly.severity === "CRITICAL" &&
                "bg-destructive/10 text-destructive",
              anomaly.severity === "HIGH" &&
                "bg-status-warning/10 text-status-warning"
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <Badge
            variant={anomaly.severity === "CRITICAL" ? "destructive" : "secondary"}
            className="font-mono"
          >
            {anomaly.severity}
          </Badge>
          <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            {TYPE_LABEL[anomaly.type]}
          </span>
          {anomaly.awbNumber && (
            <span className="font-mono text-ui-11 font-semibold tracking-widest">
              {anomaly.awbNumber}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onResolve && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onResolve(anomaly.id)}
              className="font-mono text-ui-10 uppercase tracking-widest"
            >
              Dismiss
            </Button>
          )}
          {onInvestigate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onInvestigate(anomaly)}
              className="font-mono text-ui-10 uppercase tracking-widest"
            >
              Investigate
              <RiArrowRightLine />
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{anomaly.description}</p>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          <span>AI confidence</span>
          <span>{(conf * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className={cn(
              "h-full transition-[width] duration-500",
              anomaly.severity === "CRITICAL"
                ? "bg-destructive"
                : anomaly.severity === "HIGH"
                  ? "bg-status-warning"
                  : "bg-primary"
            )}
            style={{ width: `${conf * 100}%` }}
          />
        </div>
      </div>
    </li>
  )
}
