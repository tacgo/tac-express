"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { UniversalBarcode } from "@workspace/ui/components/primitives/universal-barcode"
import {
  RiPlaneLine,
  RiTruckLine,
  RiArrowRightLine,
  RiBox3Line,
} from "@workspace/ui/icons"
import type { ShipmentSummary } from "@workspace/types"

import { ShipmentStatusBadge } from "./shipment-status-badge"

/**
 * Upgraded shipment column set — ports the legacy portal-bu spec:
 * CN Number · Barcode · Customer · Route · Service · Pkgs/Weight · Status · Created · Actions
 *
 * Columns are designed for a TanStack Table consumer and rely on semantic
 * design tokens — no raw colors, no hard-coded sizes.
 */
export const shipmentColumns: ColumnDef<ShipmentSummary>[] = [
  {
    accessorKey: "awbNumber",
    header: () => <SortHeader>CN Number</SortHeader>,
    cell: ({ row }) => {
      const awb = row.getValue<string>("awbNumber")
      return (
        <a
          href={`/shipments/${row.original.id}`}
          className="group flex items-center gap-2 focus-visible:outline-none focus-visible:tac-focus-premium"
        >
          <RiBox3Line className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="t-mono font-semibold tracking-wider text-primary group-hover:underline">
            {awb}
          </span>
        </a>
      )
    },
  },
  {
    id: "barcode",
    header: () => <SortHeader>Barcode</SortHeader>,
    cell: ({ row }) => (
      <UniversalBarcode
        value={row.original.awbNumber}
        mode="compact"
        includeText={false}
        scale={1.5}
        height={6}
      />
    ),
  },
  {
    id: "customer",
    header: () => <SortHeader>Customer</SortHeader>,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground">
          {row.original.senderName}
        </span>
        <span className="t-mono-sm text-muted-foreground">
          → {row.original.receiverName}
        </span>
      </div>
    ),
  },
  {
    id: "route",
    header: () => <SortHeader>Route</SortHeader>,
    cell: ({ row }) => {
      const origin = row.original.originHub.replace(/_/g, " ")
      const dest = row.original.destHub.replace(/_/g, " ")
      return (
        <div className="flex items-center gap-1.5 tac-mono-label text-foreground">
          <span>{abbreviate(origin)}</span>
          <RiArrowRightLine className="size-3 text-muted-foreground" aria-hidden />
          <span>{abbreviate(dest)}</span>
        </div>
      )
    },
  },
  {
    id: "service",
    accessorKey: "manifestNumber",
    header: () => <SortHeader>Service</SortHeader>,
    cell: ({ row }) => {
      const isExpress = /express|priority/i.test(
        (row.original as unknown as { serviceLevel?: string }).serviceLevel ?? ""
      )
      return (
        <Badge
          variant={isExpress ? "default" : "secondary"}
          className="gap-1 font-mono"
        >
          {isExpress ? (
            <RiPlaneLine className="size-2.5" />
          ) : (
            <RiTruckLine className="size-2.5" />
          )}
          {isExpress ? "EXP" : "STD"}
        </Badge>
      )
    },
  },
  {
    id: "load",
    header: () => <SortHeader className="text-right">Pkgs · Weight</SortHeader>,
    cell: ({ row }) => (
      <div className="text-right t-mono-sm tabular-nums">
        <span>{row.original.pieces ?? 0}</span>
        <span className="mx-1 text-muted-foreground">·</span>
        <span>{row.original.chargeableWeight.toFixed(1)}kg</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: () => <SortHeader>Status</SortHeader>,
    cell: ({ row }) => (
      <ShipmentStatusBadge status={row.getValue("status")} />
    ),
  },
  {
    accessorKey: "createdAt",
    header: () => <SortHeader>Created</SortHeader>,
    cell: ({ row }) => {
      const d = new Date(row.getValue<string>("createdAt"))
      return (
        <span className="whitespace-nowrap tac-mono-label text-muted-foreground">
          {formatDistanceToNow(d, { addSuffix: true })}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <a
        href={`/shipments/${row.original.id}`}
        className={cn(
          "border border-border px-2 py-1 tac-mono-label text-muted-foreground transition-colors hover:border-foreground hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
        )}
      >
        View
      </a>
    ),
  },
]

function SortHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn("tac-mono-label text-muted-foreground", className)}
    >
      {children}
    </span>
  )
}

function abbreviate(name: string): string {
  // Use 3-letter codes when we recognize a hub, else first three uppercase letters
  const map: Record<string, string> = {
    IMPHAL: "IMF",
    "NEW DELHI": "DEL",
  }
  return map[name.toUpperCase()] ?? name.slice(0, 3).toUpperCase()
}
