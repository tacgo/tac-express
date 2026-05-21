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

interface CustomerRow {
  id: string
  name: string
  email: string
  phone: string
  location: string
  state: string
  gstin?: string
  shipments: number
  revenue: string
  outstanding: string
}

interface V7OpsCustomersProps {
  rows: CustomerRow[]
  className?: string
}

/**
 * V7OpsCustomers — Violet-Grid v7 layout for the Customers list.
 *
 * Phase 3a of the NextAdmin refactor. Rendered when `useDesignVersion()`
 * resolves to `"v7"`. The Paper Ops Console `<OpsCustomersView />`
 * remains the v6 default. Both consume the same `useCustomers()` hook.
 *
 * Composition:
 *   PageShell width="wide"
 *   PageHeader (overline + title + "+ New Customer" action)
 *   DataTableCard
 *     DataTable (TanStack — search by name, sortable columns, paginated,
 *                row click → /customers/:id)
 *
 * The inner DataTable owns search/sort/filter/pagination state. The
 * Card frame is presentational only — gives the list a v7-native
 * surface (sharp corners, brutalist offset shadow, card-pad spacing).
 */
function V7OpsCustomers({ rows, className }: V7OpsCustomersProps) {
  const router = useRouter()

  const columns = React.useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="t-data text-foreground">{row.original.name}</span>
            {row.original.email ? (
              <span className="font-mono tabular-nums text-xs text-muted-foreground">
                {row.original.email}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="t-data text-foreground">{row.original.location}</span>
            <span className="font-mono tabular-nums text-xs text-muted-foreground">
              {row.original.state}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "gstin",
        header: "GSTIN",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-muted-foreground">
            {getValue<string | undefined>() ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "shipments",
        header: "Shipments",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "outstanding",
        header: "Outstanding",
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<string>()}
          </span>
        ),
      },
    ],
    []
  )

  const handleRowClick = React.useCallback(
    (row: CustomerRow) => {
      router.push(`/ops-console/customers/${row.id}`)
    },
    [router]
  )

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Business"
        title="Customers"
        description={`${rows.length} total customers.`}
        actions={
          <Button asChild type="button" variant="default" size="sm">
            <Link
              href="/ops-console/customers/create"
              aria-label="Create new customer"
            >
              <RiAddLine className="size-4" aria-hidden="true" />
              New Customer
            </Link>
          </Button>
        }
      />

      <DataTableCard
        title="All Customers"
        subtitle={`${rows.length} records`}
      >
        <DataTable
          columns={columns}
          data={rows}
          searchKey="name"
          searchPlaceholder="Search customers by name…"
          onRowClick={handleRowClick}
          pageSize={20}
        />
      </DataTableCard>
    </PageShell>
  )
}

export { V7OpsCustomers }
export type { V7OpsCustomersProps, CustomerRow }
