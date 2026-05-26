"use client"

import * as React from "react"
import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"

import { cn } from "@workspace/ui/lib/utils"
import { RiAddLine } from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { DataTableCard } from "@workspace/ui/components/composed/data-table-card"
import { DataTable } from "@workspace/ui/components/composed/data-table"
import { Button } from "@workspace/ui/components/button"

interface RateCardRow {
  route: string
  service: "Standard" | "Priority"
  slab: string
  rate: string
  docket: string
  fuelPct: string
  handling: string
}

interface V7OpsRateCardsProps {
  rows: RateCardRow[]
  className?: string
}

/**
 * V7OpsRateCards — Violet-Grid v7 layout for the Rate Cards list (Phase 3d).
 * Rendered when `useDesignVersion()` resolves to `"v7"`. v6 keeps
 * the Paper Ops Console `<OpsRateCardsView />`. Both consume the same
 * `useRateCards()` hook.
 */
function V7OpsRateCards({ rows, className }: V7OpsRateCardsProps) {
  const columns = React.useMemo<ColumnDef<RateCardRow>[]>(
    () => [
      {
        accessorKey: "route",
        header: "Route",
        meta: { flex: true },
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "service",
        header: "Service",
        size: 120,
        cell: ({ getValue }) => (
          <span className="t-caption uppercase tracking-wider text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "slab",
        header: "Weight Slab (kg)",
        size: 140,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "rate",
        header: "Rate / kg",
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "docket",
        header: "Docket",
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "fuelPct",
        header: "Fuel %",
        size: 90,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "handling",
        header: "Handling",
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Business"
        title="Rate Cards"
        description={`${rows.length} active rate cards across all routes.`}
        actions={
          <Button asChild type="button" variant="default" size="sm">
            <Link
              href="/ops-console/rates/create"
              aria-label="Create new rate card"
            >
              <RiAddLine className="size-4" aria-hidden="true" />
              New Rate Card
            </Link>
          </Button>
        }
      />

      <DataTableCard
        title="Active Rate Cards"
        subtitle={`${rows.length} records`}
      >
        <DataTable
          columns={columns}
          data={rows}
          searchKey="route"
          searchPlaceholder="Search by route…"
          pageSize={25}
        />
      </DataTableCard>
    </PageShell>
  )
}

export { V7OpsRateCards }
export type { V7OpsRateCardsProps, RateCardRow }
