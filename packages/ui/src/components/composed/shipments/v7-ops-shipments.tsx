"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"

import { cn } from "@workspace/ui/lib/utils"
import { RiAddLine } from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { DataTableCard } from "@workspace/ui/components/composed/data-table-card"
import { DataTable } from "@workspace/ui/components/composed/data-table"
import { Button } from "@workspace/ui/components/button"

interface ShipmentRow {
  id: string
  customer: string
  receiver: string
  route: string
  service: "STD" | "PRIORITY"
  weight: string
  status: string
  age: string
  detailHref?: string
}

interface V7OpsShipmentsProps {
  rows: ShipmentRow[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  className?: string
}

/**
 * V7OpsShipments — Violet-Grid v7 layout for the Shipments list.
 *
 * Phase 3b of the NextAdmin refactor. Rendered when
 * `useDesignVersion()` resolves to `"v7"`. The Paper Ops Console
 * `<OpsShipmentsView />` remains the v6 default. Both consume the
 * same `useShipments()` hook + realtime subscription.
 *
 * Composition: PageShell wide + PageHeader (with "+ New Shipment"
 * action) + DataTableCard wrapping a TanStack DataTable. Search by
 * AWB; row-click navigates to /shipments/:id.
 */
function V7OpsShipments({
  rows,
  isLoading,
  isError,
  onRetry,
  className,
}: V7OpsShipmentsProps) {
  const router = useRouter()

  const columns = React.useMemo<ColumnDef<ShipmentRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "AWB",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="t-data text-foreground">{row.original.customer}</span>
            <span className="font-mono tabular-nums text-xs text-muted-foreground">
              → {row.original.receiver}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "route",
        header: "Route",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "service",
        header: "Service",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-xs text-muted-foreground uppercase tracking-wider">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "weight",
        header: "Weight",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => (
          <span className="t-caption uppercase tracking-wider text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "age",
        header: "Age",
        cell: ({ getValue }) => (
          <span className="t-caption text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
    ],
    []
  )

  const handleRowClick = React.useCallback(
    (row: ShipmentRow) => {
      router.push(row.detailHref ?? `/ops-console/shipments/${row.id}`)
    },
    [router]
  )

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Operations"
        title="Shipments"
        description={`${rows.length} total shipments.`}
        actions={
          <div className="flex items-center gap-2">
            {isError ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
              >
                Retry
              </Button>
            ) : null}
            <Button asChild type="button" variant="default" size="sm">
              <Link
                href="/ops-console/shipments/create"
                aria-label="Create new shipment"
              >
                <RiAddLine className="size-4" aria-hidden="true" />
                New Shipment
              </Link>
            </Button>
          </div>
        }
      />

      <DataTableCard
        title="All Shipments"
        subtitle={isLoading ? "Loading…" : `${rows.length} records`}
      >
        <DataTable
          columns={columns}
          data={rows}
          searchKey="id"
          searchPlaceholder="Search by AWB…"
          onRowClick={handleRowClick}
          pageSize={25}
        />
      </DataTableCard>
    </PageShell>
  )
}

export { V7OpsShipments }
export type { V7OpsShipmentsProps, ShipmentRow }
