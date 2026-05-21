"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import {
  RiBox3Line,
  RiFileList3Line,
  RiAlertLine,
  RiScanLine,
  RiTimeLine,
} from "@workspace/ui/icons"

interface ShiftReportData {
  periodStart: string
  periodEnd: string
  durationHours: number
  hubCode: string | null
  shipments: {
    total: number
    created: number
    delivered: number
    inTransit: number
    exceptions: number
  }
  manifests: {
    total: number
    closed: number
    departed: number
    arrived: number
  }
  exceptions: {
    total: number
    resolved: number
    pending: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
  }
  scans: {
    total: number
    uniqueShipments: number
    bySource: Record<string, number>
  }
  shipmentsByStatus: { status: string; count: number }[]
  pendingActions: {
    openManifests: number
    unresolvedExceptions: number
    awaitingPickup: number
  }
  recentActivity: { at: string; description: string; actor?: string }[]
}

interface ShiftReportViewProps {
  data: ShiftReportData
  loading?: boolean
  className?: string
}

export function ShiftReportView({
  data,
  loading,
  className,
}: ShiftReportViewProps) {
  return (
    <div
      data-slot="shift-report-view"
      className={cn("space-y-6", className)}
    >
      {/* Period banner */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Reporting period
          </p>
          <p className="mt-1 font-mono text-sm font-semibold tracking-widest">
            {fmtTime(data.periodStart)} → {fmtTime(data.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {data.durationHours} HRS
          </Badge>
          {data.hubCode && (
            <Badge variant="outline" className="font-mono">
              HUB · {data.hubCode}
            </Badge>
          )}
        </div>
      </header>

      {/* 4 KPI tiles */}
      <dl className="grid grid-cols-2 gap-px bg-border/40 lg:grid-cols-4">
        <KpiTile
          icon={<RiBox3Line />}
          label="Shipments"
          value={data.shipments.total}
          stats={[
            { label: "CR", value: data.shipments.created },
            { label: "DLV", value: data.shipments.delivered },
            { label: "EX", value: data.shipments.exceptions },
          ]}
        />
        <KpiTile
          icon={<RiFileList3Line />}
          label="Manifests"
          value={data.manifests.total}
          stats={[
            { label: "CLS", value: data.manifests.closed },
            { label: "DPT", value: data.manifests.departed },
            { label: "ARV", value: data.manifests.arrived },
          ]}
        />
        <KpiTile
          icon={<RiAlertLine />}
          label="Exceptions"
          value={data.exceptions.total}
          tone={data.exceptions.pending > 0 ? "warning" : "default"}
          stats={[
            { label: "RSV", value: data.exceptions.resolved },
            { label: "PND", value: data.exceptions.pending },
          ]}
        />
        <KpiTile
          icon={<RiScanLine />}
          label="Scans"
          value={data.scans.total}
          stats={[
            { label: "UQ", value: data.scans.uniqueShipments },
          ]}
        />
      </dl>

      {/* Detail sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Shipments by status">
          {data.shipmentsByStatus.length === 0 ? (
            <Empty>No shipments in period.</Empty>
          ) : (
            <ul className="grid gap-1">
              {data.shipmentsByStatus.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between border border-border bg-background px-3 py-2"
                >
                  <Badge variant="secondary" className="font-mono">
                    {row.status.replace(/_/g, " ")}
                  </Badge>
                  <span className="font-mono text-sm font-semibold tracking-widest">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Pending actions">
          <ul className="grid gap-1">
            <PendingActionRow
              label="Open manifests"
              value={data.pendingActions.openManifests}
            />
            <PendingActionRow
              label="Unresolved exceptions"
              value={data.pendingActions.unresolvedExceptions}
              tone={
                data.pendingActions.unresolvedExceptions > 0
                  ? "destructive"
                  : "default"
              }
            />
            <PendingActionRow
              label="Awaiting pickup"
              value={data.pendingActions.awaitingPickup}
              tone={
                data.pendingActions.awaitingPickup > 0 ? "warning" : "default"
              }
            />
          </ul>
        </Section>

        <Section title="Exceptions · severity">
          {Object.keys(data.exceptions.bySeverity).length === 0 ? (
            <Empty>No exceptions in period.</Empty>
          ) : (
            <ul className="grid gap-1">
              {Object.entries(data.exceptions.bySeverity)
                .sort((a, b) => b[1] - a[1])
                .map(([sev, count]) => (
                  <li
                    key={sev}
                    className="flex items-center justify-between border border-border bg-background px-3 py-2"
                  >
                    <Badge
                      variant={sev === "CRITICAL" ? "destructive" : "secondary"}
                      className="font-mono"
                    >
                      {sev}
                    </Badge>
                    <span className="font-mono text-sm font-semibold tracking-widest">
                      {count}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Section>

        <Section title="Exceptions · type">
          {Object.keys(data.exceptions.byType).length === 0 ? (
            <Empty>No exceptions in period.</Empty>
          ) : (
            <ul className="grid gap-1">
              {Object.entries(data.exceptions.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between border border-border bg-background px-3 py-2"
                  >
                    <span className="font-mono text-ui-11 uppercase tracking-widest">
                      {type.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono text-sm font-semibold tracking-widest">
                      {count}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Section>

        <Section title="Scans · source" className="lg:col-span-2">
          <ul className="flex flex-wrap gap-2">
            {Object.keys(data.scans.bySource).length === 0 && (
              <Empty>No scans in period.</Empty>
            )}
            {Object.entries(data.scans.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([src, count]) => (
                <li
                  key={src}
                  className="flex items-center gap-2 border border-border bg-background px-3 py-1.5"
                >
                  <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                    {src}
                  </span>
                  <span className="font-mono text-sm font-semibold tracking-widest">
                    {count}
                  </span>
                </li>
              ))}
          </ul>
        </Section>

        <Section title="Recent activity" className="lg:col-span-2">
          {data.recentActivity.length === 0 ? (
            <Empty>No activity in period.</Empty>
          ) : (
            <div className="border border-border bg-background">
              <ScrollArea className="max-h-72">
                <ol className="divide-y divide-border/60">
                  {data.recentActivity.map((row, i) => (
                    <li
                      key={`${row.at}-${i}`}
                      className="grid grid-cols-[80px_1fr_120px] gap-3 px-3 py-2"
                    >
                      <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                        <RiTimeLine className="mr-1 inline size-3" />
                        {fmtHHmm(row.at)}
                      </span>
                      <span className="text-xs">{row.description}</span>
                      <span className="truncate font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                        {row.actor ?? "system"}
                      </span>
                    </li>
                  ))}
                </ol>
              </ScrollArea>
            </div>
          )}
        </Section>
      </div>

      {loading && (
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          Refreshing…
        </p>
      )}
    </div>
  )
}

function KpiTile({
  icon,
  label,
  value,
  stats,
  tone = "default",
}: {
  icon: React.ReactNode
  label: string
  value: number
  stats?: { label: string; value: number }[]
  tone?: "default" | "warning"
}) {
  return (
    <div className="bg-background p-4">
      <div className="flex items-center gap-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
        <span className="flex size-5 items-center justify-center border border-border bg-muted text-muted-foreground">
          {icon}
        </span>
        {label}
      </div>
      <p
        className={cn(
          "mt-2 font-heading text-2xl font-semibold tracking-tight",
          tone === "warning" && "text-status-warning"
        )}
      >
        {value.toLocaleString()}
      </p>
      {stats && stats.length > 0 && (
        <ul className="mt-2 flex flex-wrap items-center gap-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          {stats.map((s) => (
            <li key={s.label}>
              {s.label}{" "}
              <span className="font-semibold text-foreground">{s.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Section({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("space-y-2", className)}>
      <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-border bg-muted/20 px-3 py-3 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

function PendingActionRow({
  label,
  value,
  tone = "default",
}: {
  label: string
  value: number
  tone?: "default" | "warning" | "destructive"
}) {
  return (
    <li className="flex items-center justify-between border border-border bg-background px-3 py-2">
      <span className="font-mono text-ui-11 uppercase tracking-widest">
        {label}
      </span>
      <Badge
        variant={
          tone === "destructive"
            ? "destructive"
            : tone === "warning"
              ? "secondary"
              : "outline"
        }
        className="font-mono"
      >
        {value}
      </Badge>
    </li>
  )
}

function fmtTime(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM · HH:mm")
  } catch {
    return iso
  }
}

function fmtHHmm(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm")
  } catch {
    return iso.slice(11, 16)
  }
}
