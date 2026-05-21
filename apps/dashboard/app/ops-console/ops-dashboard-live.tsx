"use client"

import * as React from "react"

import { useDashboardKPIs } from "@workspace/services/hooks/use-dashboard"
import { useUpcomingOperations } from "@workspace/services/hooks/use-orbital"
import type { KPIData } from "@workspace/services/dashboard.service"
import type { UpcomingOp } from "@workspace/types/orbital"
import { useRealtimeDashboard } from "@workspace/ui/hooks/use-realtime"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"

import { OpsDashboard } from "@workspace/ui/components/composed/ops-console"
import { V7OpsDashboard } from "@workspace/ui/components/composed/dashboard/v7-ops-dashboard"

interface OpsDashboardLiveProps {
  initialKpis: KPIData
}

/**
 * Client wrapper that bridges the dashboard service hooks to one of two
 * views, selected by the `tac-design` flag:
 *
 *   - v6 (default) → Paper Ops Console `<OpsDashboard />`
 *   - v7           → Violet-Grid v7 `<V7OpsDashboard />` (Phase 2b)
 *
 * The server `page.tsx` does a single initial KPI fetch and seeds
 * `initialKpis`; the hooks below take over for live updates + realtime
 * cache invalidation. Both views consume the same KPI shape, so the
 * data layer is unchanged.
 *
 * Rollback: `localStorage.setItem('tac-design','v6'); location.reload()`
 * reverts a session to the Paper Ops Console without a redeploy. See
 * docs/ROLLBACK-PLAYBOOK.md § NextAdmin Refactor.
 */
export function OpsDashboardLive({ initialKpis }: OpsDashboardLiveProps) {
  useRealtimeDashboard()
  const kpisQuery = useDashboardKPIs()
  const upcomingQuery = useUpcomingOperations(5)
  const { version } = useDesignVersion()

  const kpis = kpisQuery.data ?? initialKpis

  if (version === "v7") {
    const upcomingItems = (upcomingQuery.data ?? []).map((op: UpcomingOp) => ({
      id: op.id,
      label: op.title,
      eta: op.eta,
      etaDate: op.etaDate,
    }))
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

  return (
    <OpsDashboard
      activeShipments={kpis.activeShipments ?? 0}
      inTransit={kpis.inTransit ?? 0}
      openExceptions={kpis.openExceptions ?? 0}
      upcoming={(upcomingQuery.data ?? []).map((op: UpcomingOp) => ({
        id: op.id,
        label: op.title,
        eta: op.eta,
        etaDate: op.etaDate,
      }))}
    />
  )
}
