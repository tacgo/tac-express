"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type ColumnDef } from "@tanstack/react-table"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiAddLine,
  RiEyeLine,
  RiFileCopyLine,
  RiFlashlightLine,
  RiMore2Line,
  RiTruckLine,
} from "@workspace/ui/icons"
import { ShipmentStatus } from "@workspace/types"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { DataTableCard } from "@workspace/ui/components/composed/data-table-card"
import { DataTable } from "@workspace/ui/components/composed/data-table"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/primitives/dropdown-menu"
import {
  ShipmentStatusBadge,
  SHIPMENT_STATUS_LABELS,
} from "./shipment-status-badge"

// The live wrapper title-cases the raw enum for the shared ShipmentRow shape
// (`IN_TRANSIT` -> "In Transit"); titleCase is reversible, so we map it back to
// the enum here to drive the signal-colored ShipmentStatusBadge. Unknown
// strings fall back to CREATED rather than throwing.
const SHIPMENT_STATUS_ENUMS = Object.keys(
  SHIPMENT_STATUS_LABELS,
) as ShipmentStatus[]

function toShipmentStatus(label: string): ShipmentStatus {
  const candidate = label.trim().toUpperCase().replace(/\s+/g, "_")
  return SHIPMENT_STATUS_ENUMS.includes(candidate as ShipmentStatus)
    ? (candidate as ShipmentStatus)
    : ShipmentStatus.CREATED
}

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
        size: 160,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        meta: { flex: true },
        cell: ({ row }) => (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground truncate">
              {row.original.customer}
            </span>
            <span className="font-mono tabular-nums text-xs text-muted-foreground truncate">
              → {row.original.receiver}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "route",
        header: "Route",
        size: 120,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "service",
        header: "Service",
        size: 100,
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
        cell: ({ getValue }) => {
          const isPriority = getValue<string>() === "PRIORITY"
          return (
            <Badge
              variant={isPriority ? "default" : "secondary"}
              className="gap-1 font-mono"
            >
              {isPriority ? (
                <RiFlashlightLine className="size-2.5" aria-hidden="true" />
              ) : (
                <RiTruckLine className="size-2.5" aria-hidden="true" />
              )}
              {getValue<string>()}
            </Badge>
          )
        },
      },
      {
        accessorKey: "weight",
        header: "Weight",
        size: 90,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
        filterFn: (row, id, value: string[]) =>
          value.includes(row.getValue<string>(id)),
        cell: ({ getValue }) => (
          <ShipmentStatusBadge status={toShipmentStatus(getValue<string>())} />
        ),
      },
      {
        accessorKey: "age",
        header: "Age",
        size: 72,
        cell: ({ getValue }) => (
          <span className="t-caption text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => (
          // stopPropagation so opening the menu doesn't trigger the row's
          // navigate-on-click handler.
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  aria-label={`Actions for ${row.original.id}`}
                >
                  <RiMore2Line className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
                  {row.original.id}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs"
                  onSelect={() =>
                    router.push(
                      row.original.detailHref ??
                        `/ops-console/shipments/${row.original.id}`,
                    )
                  }
                >
                  <RiEyeLine className="size-3.5" aria-hidden="true" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs"
                  onSelect={() => {
                    void navigator.clipboard?.writeText(row.original.id)
                  }}
                >
                  <RiFileCopyLine className="size-3.5" aria-hidden="true" />
                  Copy AWB
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [router]
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
          facets={[
            { columnId: "status", title: "Status" },
            { columnId: "service", title: "Service" },
          ]}
          onRowClick={handleRowClick}
          pageSize={25}
        />
      </DataTableCard>
    </PageShell>
  )
}

export { V7OpsShipments }
export type { V7OpsShipmentsProps, ShipmentRow }
