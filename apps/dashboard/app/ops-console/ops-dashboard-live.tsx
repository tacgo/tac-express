"use client"

import * as React from "react"

import { useDashboardKPIs } from "@workspace/services/hooks/use-dashboard"
import { useUpcomingOperations } from "@workspace/services/hooks/use-orbital"
import type { KPIData } from "@workspace/services/dashboard.service"
import type { UpcomingOp } from "@workspace/types/orbital"
import { useRealtimeDashboard } from "@workspace/ui/hooks/use-realtime"

import { V7OpsDashboard } from "@workspace/ui/components/composed/dashboard/v7-ops-dashboard"

interface OpsDashboardLiveProps {
  initialKpis: KPIData
}

/**
 * Client wrapper bridging the dashboard service hooks to the canonical v7
 * `<V7OpsDashboard />`. The v6 paper OpsDashboard was retired in the Phase 5
 * composition unification (one component per route).
 *
 * The server `page.tsx` does a single initial KPI fetch and seeds
 * `initialKpis`; the hooks below take over for live updates + realtime
 * cache invalidation.
 */
export function OpsDashboardLive({ initialKpis }: OpsDashboardLiveProps) {
  useRealtimeDashboard()
  const kpisQuery = useDashboardKPIs()
  const upcomingQuery = useUpcomingOperations(5)
  const kpis = kpisQuery.data ?? initialKpis

  // BOLT OPTIMIZATION: Memoize mapped upcoming items to prevent
  // V7OpsDashboard (and its children) from re-rendering on every poll.
  const upcomingItems = React.useMemo(() => {
    return (upcomingQuery.data ?? []).map((op: UpcomingOp) => ({
      id: op.id,
      label: op.title,
      eta: op.eta,
      etaDate: op.etaDate,
    }))
  }, [upcomingQuery.data])

  // Canonical v7 — v6 paper OpsDashboard retired in Phase 5 composition unification.
  return (
    <V7OpsDashboard
      activeShipments={kpis.activeShipments ?? 0}
      inTransit={kpis.inTransit ?? 0}
      openExceptions={kpis.openExceptions ?? 0}
      nextFlightEta={upcomingItems[0]?.eta}
      upcoming={upcomingItems}
    />
  )
}
