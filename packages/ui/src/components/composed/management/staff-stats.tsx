import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import type { StaffProfile } from "@workspace/ui/components/composed/admin/staff-table"

interface StaffStatsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  staff: StaffProfile[]
}

/**
 * StaffStats — KPI strip rendered above the StaffTable on the management
 * page. Reads off the same staff[] the table renders so it stays in sync
 * without an extra query. Surfaces the basic shape of the roster (total /
 * active / inactive / hubs covered) so an operator opening the page reads
 * "deliberate" rather than "empty" even when only one row exists.
 */
export function StaffStats({ staff, className, ...props }: StaffStatsProps) {
  const total = staff.length
  const active = staff.filter((s) => s.isActive).length
  const inactive = total - active
  const hubsCovered = new Set(
    staff.map((s) => s.hubCode).filter((c): c is string => Boolean(c)),
  ).size

  const tiles: { label: string; value: number }[] = [
    { label: "Total staff", value: total },
    { label: "Active", value: active },
    { label: "Inactive", value: inactive },
    { label: "Hubs covered", value: hubsCovered },
  ]

  return (
    <div
      data-slot="staff-stats"
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}
      {...props}
    >
      {tiles.map((t) => (
        <div key={t.label} className="tac-fui-panel space-y-1 bg-card p-4">
          <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">
            {t.label}
          </p>
          <p className="font-mono text-3xl font-light tabular-nums text-foreground">
            {t.value}
          </p>
        </div>
      ))}
    </div>
  )
}
