"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiBox3Line,
  RiTruckLine,
  RiAlertLine,
  RiFlightTakeoffLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { StatCard } from "@workspace/ui/components/composed/stat-card"
import { OpsGrowthAreaChart } from "@workspace/ui/components/composed/ops-console/ops-growth-chart"
import { OpsVolumeBarChart } from "@workspace/ui/components/composed/ops-console/ops-volume-chart"
import {
  OpsUpcomingCalendar,
  type UpcomingOpItem,
} from "@workspace/ui/components/composed/ops-console/ops-upcoming-calendar"

/**
 * V7OpsDashboard — NextAdmin-inspired Violet Grid v7 reference layout.
 *
 * Rendered when `useDesignVersion()` resolves to `"v7"`. The Paper Ops
 * Console `<OpsDashboard />` remains the v6 default. Both share the same
 * service hooks via `ops-dashboard-live.tsx`; only the view changes.
 *
 * Composition contract:
 *   PageShell width="wide"  (1536px cap — accommodates 4-across KPI row)
 *   PageHeader              (existing v6 primitive, design-token compliant)
 *   <grid cols=4 gap=card-gap>
 *     StatCard × 4 — Active Shipments / In Transit / Open Exceptions / Next Flight
 *   </grid>
 *   <grid cols=3 gap=card-gap>
 *     Card: <OpsGrowthAreaChart />
 *     Card: <OpsVolumeBarChart />
 *     Card: <OpsUpcomingCalendar />
 *   </grid>
 *
 * Phase 2c adds the chart-panel row (chart components reused as-is from
 * the Paper Ops Console; their internal Paper aesthetic is a
 * transitional state — chart redesign is queued for a later phase).
 * See docs/REFACTOR-PHASE-1-SPEC.md for the full StatCard contract.
 */

interface V7OpsDashboardProps {
  activeShipments: number
  inTransit: number
  openExceptions: number
  nextFlightEta?: string
  upcoming?: UpcomingOpItem[]
  className?: string
}

function V7OpsDashboard({
  activeShipments,
  inTransit,
  openExceptions,
  nextFlightEta,
  upcoming = [],
  className,
}: V7OpsDashboardProps) {
  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Platform"
        title="Dashboard"
        description="Real-time operations overview across the network."
      />

      {/* Asymmetric KPI constellation (12-col, 5/3/2/2) — a dominant primary
          metric carries operational gravity instead of four equal tiles.
          Open Exceptions gets a destructive left-edge when non-zero so the
          alert reads pre-attentively regardless of its compact width. */}
      <div
        data-slot="v7-ops-dashboard-kpis"
        className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-12"
      >
        <StatCard
          className="lg:col-span-5"
          variant="hero"
          label="Active Shipments"
          value={activeShipments}
          visual={<RiBox3Line className="size-7 text-primary" aria-hidden="true" />}
        />
        <StatCard
          className="lg:col-span-3"
          label="In Transit"
          value={inTransit}
          visual={<RiTruckLine className="size-6 text-primary" aria-hidden="true" />}
        />
        <StatCard
          className={cn(
            "lg:col-span-2",
            openExceptions > 0 && "border-l-2 border-l-destructive"
          )}
          label="Open Exceptions"
          value={openExceptions}
          visual={
            <RiAlertLine
              className={cn(
                "size-6",
                openExceptions > 0 ? "text-destructive" : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
          }
        />
        <StatCard
          className="lg:col-span-2"
          label="Next Flight ETA"
          value={nextFlightEta ?? "—"}
          monoValue={Boolean(nextFlightEta)}
          visual={
            <RiFlightTakeoffLine
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
      </div>

      {/* Chart panel row — reuses Paper Ops Console chart primitives in
          Violet Grid v6 frames. The recharts content + 7D/30D/90D toggle
          are universal; the outer "Card" surface is the v7 vocabulary
          (sharp corners, brutalist offset shadow, --spacing-card-pad).
          Chart-component v7 redesign is Phase 2d/e. */}
      {/* Asymmetric panel row (12-col, 5/4/3) — the primary trend leads,
          the departure calendar compresses to the right rail. */}
      <div
        data-slot="v7-ops-dashboard-panels"
        className="grid grid-cols-1 gap-card-gap lg:grid-cols-12"
      >
        <V7Panel className="lg:col-span-5" data-testid="v7-panel-growth">
          <OpsGrowthAreaChart />
        </V7Panel>
        <V7Panel className="lg:col-span-4" data-testid="v7-panel-volume">
          <OpsVolumeBarChart />
        </V7Panel>
        <V7Panel className="lg:col-span-3" data-testid="v7-panel-upcoming">
          <OpsUpcomingCalendar upcoming={upcoming} />
        </V7Panel>
      </div>
    </PageShell>
  )
}

function V7Panel({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="v7-panel"
      className={cn(
        "border border-border bg-card text-card-foreground p-card-pad shadow-brutal-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { V7OpsDashboard }
export type { V7OpsDashboardProps }
