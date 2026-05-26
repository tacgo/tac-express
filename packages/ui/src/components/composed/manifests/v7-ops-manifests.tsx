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

interface ManifestRow {
  id: string
  from: string
  to: string
  shipments: number
  weight: string
  date: string
  status: "Draft" | "Building" | "Open" | "Closed" | "Departed" | "Arrived"
  detailHref?: string
}

interface V7OpsManifestsProps {
  items: ManifestRow[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  className?: string
}

/**
 * V7OpsManifests — Violet-Grid v7 layout for the Manifests list (Phase 3c).
 * Rendered when `useDesignVersion()` resolves to `"v7"`. v6 default keeps
 * the Paper Ops Console `<OpsManifestsView />`. Both consume the same
 * `useManifests()` hook + realtime subscription.
 */
function V7OpsManifests({
  items,
  isLoading,
  isError,
  onRetry,
  className,
}: V7OpsManifestsProps) {
  const router = useRouter()

  const columns = React.useMemo<ColumnDef<ManifestRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Manifest",
        size: 160,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "from",
        header: "Route",
        meta: { flex: true },
        cell: ({ row }) => (
          <span className="font-mono tabular-nums text-sm text-foreground">
            {row.original.from} → {row.original.to}
          </span>
        ),
      },
      {
        accessorKey: "shipments",
        header: "Shipments",
        size: 100,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<number>()}
          </span>
        ),
      },
      {
        accessorKey: "weight",
        header: "Weight (kg)",
        size: 110,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-right block">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        size: 120,
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums text-sm text-muted-foreground">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        cell: ({ getValue }) => (
          <span className="tac-mono-label-base text-foreground">
            {getValue<string>()}
          </span>
        ),
      },
    ],
    []
  )

  const handleRowClick = React.useCallback(
    (row: ManifestRow) => {
      router.push(row.detailHref ?? `/ops-console/manifests/${row.id}`)
    },
    [router]
  )

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Operations"
        title="Manifests"
        description={`${items.length} total manifests.`}
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
                href="/ops-console/manifests/create"
                aria-label="Create new manifest"
              >
                <RiAddLine className="size-4" aria-hidden="true" />
                New Manifest
              </Link>
            </Button>
          </div>
        }
      />

      <DataTableCard
        title="All Manifests"
        subtitle={isLoading ? "Loading…" : `${items.length} records`}
      >
        <DataTable
          columns={columns}
          data={items}
          searchKey="id"
          searchPlaceholder="Search by manifest #…"
          onRowClick={handleRowClick}
          pageSize={25}
        />
      </DataTableCard>
    </PageShell>
  )
}

export { V7OpsManifests }
export type { V7OpsManifestsProps, ManifestRow }
