"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiBox3Line,
  RiBuilding4Line,
  RiAlertLine,
  RiRefreshLine,
} from "@workspace/ui/icons"
import { prettifyHubCode } from "@workspace/ui/lib/hub-config"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { StatCard } from "@workspace/ui/components/composed/stat-card"
import { Button } from "@workspace/ui/components/button"

interface HubInventory {
  hubCode: string
  pieces: number
  rows: Array<{ label: string; value: number }>
}

interface V7OpsInventoryProps {
  hubs: HubInventory[]
  isLoading?: boolean
  onRefresh?: () => void
  className?: string
}

/**
 * V7OpsInventory — Violet-Grid v7 layout for the Hub Inventory route.
 *
 * Rendered when `useDesignVersion()` resolves to `"v7"`. The Paper Ops
 * Console `<OpsInventoryView />` remains the v6 default. Both views
 * read from the same `useInventoryByHub()` service hook; only the
 * presentation changes.
 *
 * Composition:
 *   PageShell width="wide"
 *   PageHeader
 *   <grid cols=4>
 *     StatCard × 4 — Total Pieces / Hubs / Active Hubs / Exceptions
 *   </grid>
 *   <grid cols-auto-fit>
 *     V7HubCard × N — per-hub breakdown
 *   </grid>
 *
 * Phase 2d of the NextAdmin refactor. The hub-rename + hidden-hub
 * affordances live behind Settings → Hubs in v7 (kept off the main
 * inventory surface to reduce density). Refresh sits in PageHeader
 * actions.
 */

function V7OpsInventory({
  hubs,
  isLoading,
  onRefresh,
  className,
}: V7OpsInventoryProps) {
  const totals = React.useMemo(() => {
    const totalPieces = hubs.reduce((s, h) => s + h.pieces, 0)
    const activeHubs = hubs.filter((h) => h.pieces > 0).length
    const totalExceptions = hubs.reduce((sum, h) => {
      const row = h.rows.find((r) => r.label === "Exceptions")
      return sum + (row?.value ?? 0)
    }, 0)
    return { totalPieces, totalHubs: hubs.length, activeHubs, totalExceptions }
  }, [hubs])

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Operations"
        title="Hub Inventory"
        description="Live shipment count by hub. Excludes Delivered / Cancelled / RTO."
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh inventory"
          >
            <RiRefreshLine className="size-4" aria-hidden="true" />
            <span>Refresh</span>
          </Button>
        }
      />

      <div
        data-slot="v7-ops-inventory-kpis"
        className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Pieces"
          value={totals.totalPieces}
          visual={<RiBox3Line className="size-6 text-primary" aria-hidden="true" />}
        />
        <StatCard
          label="Total Hubs"
          value={totals.totalHubs}
          visual={
            <RiBuilding4Line className="size-6 text-primary" aria-hidden="true" />
          }
        />
        <StatCard
          label="Active Hubs"
          value={totals.activeHubs}
          visual={
            <RiBuilding4Line
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
        <StatCard
          label="Open Exceptions"
          value={totals.totalExceptions}
          visual={
            <RiAlertLine
              className={cn(
                "size-6",
                totals.totalExceptions > 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
          }
        />
      </div>

      <div
        data-slot="v7-ops-inventory-hubs"
        className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {hubs.map((hub) => (
          <V7HubCard key={hub.hubCode} hub={hub} />
        ))}
      </div>
    </PageShell>
  )
}

function V7HubCard({ hub }: { hub: HubInventory }) {
  return (
    <div
      data-slot="v7-hub-card"
      className="flex flex-col gap-3 border border-border bg-card text-card-foreground p-card-pad shadow-brutal-sm"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="t-h4 text-foreground">{prettifyHubCode(hub.hubCode)}</h3>
        <span
          className="t-mono text-muted-foreground"
          aria-label={`${hub.pieces} pieces`}
        >
          {hub.pieces} pcs
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-1 text-xs">
        {hub.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-t border-border pt-1 first:border-t-0 first:pt-0"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-mono tabular-nums text-foreground">
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export { V7OpsInventory }
export type { V7OpsInventoryProps, HubInventory }
