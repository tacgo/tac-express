"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiBox3Line,
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiTruckLine,
  RiAlertLine,
  RiTimeLine,
  RiRefreshLine,
  RiSignalTowerLine,
  RiErrorWarningLine,
  RiAddLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { StatCard } from "@workspace/ui/components/composed/stat-card"
import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { Skeleton } from "@workspace/ui/components/primitives/skeleton"
import {
  AnimatedGroup,
  AnimatedGroupItem,
} from "@workspace/ui/components/primitives/animated-text"
import { OpsShipmentBarChart } from "@workspace/ui/components/composed/ops-console/ops-shipment-bar-chart"
import { OpsRevenueRadialChart } from "@workspace/ui/components/composed/ops-console/ops-revenue-radial-chart"

/**
 * V7OpsAnalytics — Violet Grid v7 layout for the Analytics overview route.
 *
 * Replaces the Paper Ops Console `OpsAnalyticsView` (Phase 7). Analytics is an
 * overview-class surface (peer to the dashboard), so it earns one display
 * moment — a `.t-display` + gradient page title — instead of the standard
 * `.t-h2` PageHeader. The v6 "two stacked 3-up grids" metrics-dump is replaced
 * by an asymmetric KPI constellation (one dominant metric + a graded
 * subordinate row) inside a `command` SurfaceCard, giving the primary KPI
 * surface the elevated depth tier while chart panels recede to `bg-card`.
 *
 * Charts are reused as-is from the Paper Ops Console; they own their internal
 * title/period/trend chrome (chart-internal redesign is a later phase, per the
 * dashboard precedent). Data shape (`AnalyticsKpis`) and caller wiring are
 * unchanged from v6.
 */

interface AnalyticsKpis {
  totalShipments: number
  totalRevenue: string
  delivered: number
  deliveryRate: number
  inTransit: number
  openExceptions: number
  avgDeliveryDays: string
}

interface V7OpsAnalyticsProps {
  kpis: AnalyticsKpis
  /** Query is in flight and no cached data is shown yet. */
  isLoading?: boolean
  /** Query failed and there is no usable data. */
  isError?: boolean
  /** Pre-formatted "last synced" timestamp (formatted by the caller). */
  lastUpdated?: string
  /** Re-run the analytics query. Wired to the query's `refetch`. */
  onRefresh?: () => void
  className?: string
}

function V7OpsAnalytics({
  kpis,
  isLoading = false,
  isError = false,
  lastUpdated,
  onRefresh,
  className,
}: V7OpsAnalyticsProps) {
  const isEmpty = kpis.totalShipments === 0

  return (
    <PageShell width="wide" className={cn(className)}>
      <AnalyticsHeader />

      {isError ? (
        <AnalyticsError onRefresh={onRefresh} />
      ) : isLoading ? (
        <AnalyticsSkeleton />
      ) : isEmpty ? (
        <AnalyticsEmpty />
      ) : (
        <>
          <SurfaceCard
            emphasis="command"
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-1.5 bg-accent-success tac-blink motion-reduce:animate-none"
                />
                Operational KPIs · Live
              </span>
            }
            actions={
              <div className="flex items-center gap-3">
                {lastUpdated ? (
                  <span className="t-mono-sm text-muted-foreground hidden sm:inline">
                    Synced {lastUpdated}
                  </span>
                ) : null}
                {onRefresh ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                  >
                    <RiRefreshLine className="size-4" aria-hidden />
                    Refresh
                  </Button>
                ) : null}
              </div>
            }
          >
            <KpiConstellation kpis={kpis} />
          </SurfaceCard>

          {/* Asymmetric panel row (12-col, 7/5) — the shipment trend leads,
              the revenue-mix radial compresses to the right. Charts own their
              own title/period chrome; the SurfaceCard supplies the depth tier
              (bg-card vs the elevated KPI surface above). */}
          <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-12">
            <SurfaceCard className="lg:col-span-7">
              <OpsShipmentBarChart />
            </SurfaceCard>
            <SurfaceCard className="lg:col-span-5">
              <OpsRevenueRadialChart />
            </SurfaceCard>
          </div>
        </>
      )}
    </PageShell>
  )
}

/**
 * AnalyticsHeader — the route's single display moment. Staggered entrance via
 * the shared AnimatedGroup choreography; `.t-display` + `.t-gradient-primary`
 * mark this as an overview-class title (not the standard `.t-h2` PageHeader).
 */
function AnalyticsHeader() {
  return (
    <AnimatedGroup stagger={0.06} className="flex flex-col gap-1">
      <AnimatedGroupItem distance={6} duration={0.35}>
        <p className="t-overline text-muted-foreground">Business · Operations</p>
      </AnimatedGroupItem>
      <AnimatedGroupItem distance={10} duration={0.45}>
        <h1 className="t-display t-gradient-primary">Analytics</h1>
      </AnimatedGroupItem>
      <AnimatedGroupItem distance={6} duration={0.4}>
        <p className="t-body-sm text-muted-foreground max-w-prose">
          Performance across all hubs and service classes.
        </p>
      </AnimatedGroupItem>
    </AnimatedGroup>
  )
}

/**
 * KpiConstellation — asymmetric 12-col KPI layout. Row 1 (5/4/3) leads with a
 * dominant `hero` metric; row 2 (4/4/4) carries the compact operational tier.
 * Three scale tiers (hero 40px · default 32px · compact 20px) create the
 * hierarchy the v6 flat 3+3 grid lacked.
 */
function KpiConstellation({ kpis }: { kpis: AnalyticsKpis }) {
  return (
    <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-12">
      <StatCard
        className="tac-hover-lift lg:col-span-5"
        variant="hero"
        label="Total Shipments"
        value={kpis.totalShipments}
        visual={<RiBox3Line className="size-7 text-primary" aria-hidden />}
      />
      <StatCard
        className="tac-hover-lift lg:col-span-4"
        label="Total Revenue"
        value={kpis.totalRevenue}
        visual={
          <RiMoneyDollarCircleLine className="size-6 text-primary" aria-hidden />
        }
      />
      <StatCard
        className="tac-hover-lift lg:col-span-3"
        label="Delivered"
        value={kpis.delivered}
        context={`${kpis.deliveryRate}% delivery rate`}
        visual={
          <RiCheckboxCircleLine
            className="size-6 text-accent-success"
            aria-hidden
          />
        }
      />
      <StatCard
        className="tac-hover-lift lg:col-span-4"
        variant="compact"
        label="In Transit"
        value={kpis.inTransit}
        visual={<RiTruckLine className="size-5 text-muted-foreground" aria-hidden />}
      />
      <StatCard
        className={cn(
          "tac-hover-lift lg:col-span-4",
          kpis.openExceptions > 0 && "border-l-2 border-l-destructive"
        )}
        variant="compact"
        label="Open Exceptions"
        value={kpis.openExceptions}
        context={kpis.openExceptions > 0 ? "Need attention" : "All clear"}
        visual={
          <RiAlertLine
            className={cn(
              "size-5",
              kpis.openExceptions > 0
                ? "text-destructive"
                : "text-muted-foreground"
            )}
            aria-hidden
          />
        }
      />
      <StatCard
        className="tac-hover-lift lg:col-span-4"
        variant="compact"
        label="Avg Delivery Days"
        value={kpis.avgDeliveryDays}
        monoValue={false}
        visual={<RiTimeLine className="size-5 text-muted-foreground" aria-hidden />}
      />
    </div>
  )
}

/**
 * AnalyticsEmpty — domain empty state. The operational DB is genuinely empty
 * until shipments process through the network; a wall of zeros is misleading,
 * so the route surfaces intent + the primary workflow launcher instead.
 */
function AnalyticsEmpty() {
  return (
    <EmptyState
      icon={<RiSignalTowerLine className="size-5" aria-hidden />}
      title="No telemetry yet"
      description="Analytics will populate as shipments process through the network. KPIs and trend charts come online with the first delivered manifest."
      action={
        <Button asChild size="sm">
          <Link href="/ops-console/shipments/create">
            <RiAddLine className="size-4" aria-hidden />
            Create shipment
          </Link>
        </Button>
      }
    />
  )
}

/**
 * AnalyticsError — full-surface error state with a recovery action (not a tiny
 * inline retry). Mirrors the EmptyState FUI bracket frame for visual parity.
 */
function AnalyticsError({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div
      data-slot="analytics-error"
      className="tac-fui-panel relative flex flex-col items-center justify-center px-8 py-16 text-center"
    >
      <span aria-hidden className="pointer-events-none absolute top-2 left-2 size-3 border-t-2 border-l-2 border-destructive/60" />
      <span aria-hidden className="pointer-events-none absolute top-2 right-2 size-3 border-t-2 border-r-2 border-destructive/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-destructive/60" />
      <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-destructive/60" />

      <div className="mb-4 flex size-12 items-center justify-center border border-border bg-muted text-destructive">
        <RiErrorWarningLine className="size-5" aria-hidden />
      </div>
      <p className="tac-mono-label mb-1 text-destructive">Signal lost</p>
      <h2 className="text-base font-semibold text-foreground">
        Couldn&rsquo;t load analytics
      </h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        The analytics service didn&rsquo;t respond. Your data is safe — retry
        the sync to bring the dashboard back online.
      </p>
      {onRefresh ? (
        <div className="mt-5">
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RiRefreshLine className="size-4" aria-hidden />
            Retry sync
          </Button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * AnalyticsSkeleton — loading state shaped to the final layout (elevated KPI
 * surface with a 5/4/3 + 4/4/4 tile grid, then a 7/5 chart-panel row), not
 * generic boxes. Uses the project `animate-skeleton-pulse` via the Skeleton
 * primitive.
 */
function AnalyticsSkeleton() {
  return (
    <>
      <SurfaceCard emphasis="command" aria-hidden>
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-12">
          {KPI_SKELETON_SPANS.map((span, i) => (
            <KpiTileSkeleton key={i} className={span} hero={i === 0} />
          ))}
        </div>
      </SurfaceCard>
      <div className="grid grid-cols-1 gap-card-gap lg:grid-cols-12">
        <ChartPanelSkeleton className="lg:col-span-7" />
        <ChartPanelSkeleton className="lg:col-span-5" />
      </div>
    </>
  )
}

const KPI_SKELETON_SPANS = [
  "lg:col-span-5",
  "lg:col-span-4",
  "lg:col-span-3",
  "lg:col-span-4",
  "lg:col-span-4",
  "lg:col-span-4",
] as const

function KpiTileSkeleton({
  className,
  hero = false,
}: {
  className?: string
  hero?: boolean
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-border bg-card p-[var(--spacing-card-pad)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="size-6" />
      </div>
      <Skeleton className={cn(hero ? "h-9 w-28" : "h-7 w-20")} />
    </div>
  )
}

function ChartPanelSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border border-border bg-card p-card-pad shadow-brutal-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-[length:var(--spacing-chart-lg)] w-full" />
    </div>
  )
}

export { V7OpsAnalytics }
export type { V7OpsAnalyticsProps, AnalyticsKpis }
