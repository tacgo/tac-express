"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { UserRole } from "@workspace/types"
import { Button } from "@workspace/ui/components/button"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/primitives/table"

export interface StaffProfile {
  id: string
  email: string
  name: string
  role: UserRole
  hubCode?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "text-destructive border-destructive/40 bg-destructive/5",
  ADMIN: "text-primary border-primary/40 bg-primary/5",
  MANAGER: "text-accent-warning border-accent-warning/40 bg-accent-warning/5",
  OPS: "text-foreground border-border",
  INVOICE: "text-foreground border-border",
  SUPPORT: "text-muted-foreground border-border",
  WAREHOUSE_IMPHAL: "text-muted-foreground border-border",
  WAREHOUSE_DELHI: "text-muted-foreground border-border",
  WAREHOUSE_STAFF: "text-muted-foreground border-border",
  OPS_STAFF: "text-muted-foreground border-border",
  FINANCE_STAFF: "text-foreground border-border",
}

interface StaffTableProps {
  staff: StaffProfile[]
  onRoleChange?: (userId: string, role: UserRole) => void
  onToggleActive?: (userId: string, isActive: boolean) => void
  isLoading?: boolean
}

export function StaffTable({ staff, onRoleChange, onToggleActive, isLoading }: StaffTableProps) {
  const columns = React.useMemo<ColumnDef<StaffProfile>[]>(() => [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-mono text-sm uppercase tracking-wider text-foreground">
          {row.original.name || "—"}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const s = row.original
        if (onRoleChange) {
          return (
            // eslint-disable-next-line no-restricted-syntax -- Native select in table cell for role assignment; RHF register() doesn't compose with Radix Select without a Controller wrapper
            <select
              value={s.role}
              onChange={(e) => onRoleChange(s.id, e.target.value as UserRole)}
              className="h-7 border border-border bg-background font-mono text-2xs uppercase tracking-wider text-foreground px-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )
        }
        return (
          <span className={cn("font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5", ROLE_COLORS[s.role] ?? "text-muted-foreground border-border")}>
            {s.role}
          </span>
        )
      },
    },
    {
      accessorKey: "hubCode",
      header: "Hub",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.hubCode ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: () => <div className="text-right">Status</div>,
      cell: ({ row }) => {
        const s = row.original
        return (
          <div className="flex items-center justify-end">
            {onToggleActive ? (
              <Button
                variant={s.isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onToggleActive(s.id, !s.isActive)}
                className={cn(
                  "font-mono text-2xs uppercase tracking-wider px-2 py-0.5 h-auto",
                  s.isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {s.isActive ? "Active" : "Inactive"}
              </Button>
            ) : (
              <span className={cn("font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5", s.isActive ? "text-primary border-primary/30" : "text-muted-foreground border-border")}>
                {s.isActive ? "Active" : "Inactive"}
              </span>
            )}
          </div>
        )
      },
    },
  ], [onRoleChange, onToggleActive])

  const table = useReactTable({
    data: staff,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className="bg-card p-5 space-y-2 tac-fui-panel">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="tac-fui-panel overflow-hidden @container" data-density="compact">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className={cn(!row.original.isActive && "opacity-50")}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">No staff members found.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
