"use client"

import * as React from "react"

import { useShiftReport } from "@workspace/services/hooks/use-shift-report"
import { useHubs } from "@workspace/services/hooks/use-hubs"

import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { Button } from "@workspace/ui/components/button"
import { Combobox } from "@workspace/ui/components/primitives/combobox"
import { Label } from "@workspace/ui/components/primitives/label"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/primitives/toggle-group"
import { ShiftReportView } from "@workspace/ui/components/composed/shift-report/shift-report-view"
import {
  RiRefreshLine,
  RiDownloadLine,
} from "@workspace/ui/icons"

const DURATIONS = [4, 8, 12, 24] as const

type Duration = (typeof DURATIONS)[number]

export function ShiftReportClient() {
  const [hours, setHours] = React.useState<Duration>(8)
  const [hubCode, setHubCode] = React.useState<string>("")
  const { data: hubsData } = useHubs(true)
  const hubs = React.useMemo(() => hubsData ?? [], [hubsData])
  const report = useShiftReport({
    hours,
    hubCode: hubCode || undefined,
  })
  // Canonical v7 — widened canvas to match Dashboard/Inventory rhythm. The
  // design-version fork was removed in the Phase 5 composition unification.
  const pageShellWidth = "wide"

  const exportCsv = () => {
    if (!report.data) return
    const rows: string[] = []
    rows.push("Section,Key,Value")
    rows.push(
      `Period,Start,${report.data.periodStart}`,
      `Period,End,${report.data.periodEnd}`,
      `Period,Duration (hrs),${report.data.durationHours}`,
      `Period,Hub,${report.data.hubCode ?? "all"}`
    )
    rows.push(
      `Shipments,Total,${report.data.shipments.total}`,
      `Shipments,Created,${report.data.shipments.created}`,
      `Shipments,Delivered,${report.data.shipments.delivered}`,
      `Shipments,In transit,${report.data.shipments.inTransit}`,
      `Shipments,Exceptions,${report.data.shipments.exceptions}`
    )
    rows.push(
      `Manifests,Total,${report.data.manifests.total}`,
      `Manifests,Closed,${report.data.manifests.closed}`,
      `Manifests,Departed,${report.data.manifests.departed}`,
      `Manifests,Arrived,${report.data.manifests.arrived}`
    )
    for (const s of report.data.shipmentsByStatus) {
      rows.push(`Shipment status,${s.status},${s.count}`)
    }
    for (const [type, count] of Object.entries(report.data.exceptions.byType)) {
      rows.push(`Exception type,${type},${count}`)
    }
    for (const [src, count] of Object.entries(report.data.scans.bySource)) {
      rows.push(`Scan source,${src},${count}`)
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")
    link.download = `tac-shift-report-${hubCode || "all"}-${hours}h-${stamp}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const hubOptions = React.useMemo(() => {
    return [
      { value: "", label: "All hubs" },
      ...hubs.map((h) => ({
        value: h.code,
        label: `${h.name} · ${h.code}`,
      })),
    ]
  }, [hubs])

  return (
    <PageShell width={pageShellWidth}>
      <PageHeader
        overline="Operations"
        title="Shift Report"
        description="Trailing operations summary. Updates every 60 seconds."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => report.refetch()}
              disabled={report.isFetching}
            >
              <RiRefreshLine
                className={report.isFetching ? "animate-spin" : ""}
              />
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={exportCsv}
              disabled={!report.data}
            >
              <RiDownloadLine />
              Export CSV
            </Button>
          </div>
        }
      />

      <section className="grid gap-3 border border-border bg-card p-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <div className="grid gap-1.5">
          <Label>Duration</Label>
          <ToggleGroup
            type="single"
            value={String(hours)}
            onValueChange={(v) => v && setHours(Number(v) as Duration)}
            variant="outline"
            size="sm"
          >
            {DURATIONS.map((d) => (
              <ToggleGroupItem
                key={d}
                value={String(d)}
                aria-label={`${d} hours`}
              >
                <span className="font-mono text-ui-11 uppercase tracking-widest">
                  {d} HRS
                </span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="grid gap-1.5 sm:max-w-xs sm:justify-self-end">
          <Label>Hub</Label>
          <Combobox
            options={hubOptions}
            value={hubCode}
            onChange={setHubCode}
            placeholder="All hubs"
            emptyMessage="No hubs configured"
          />
        </div>
      </section>

      {report.data && (
        <ShiftReportView data={report.data} loading={report.isFetching} />
      )}
      {!report.data && report.isLoading && (
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          Loading shift report…
        </p>
      )}
    </PageShell>
  )
}
