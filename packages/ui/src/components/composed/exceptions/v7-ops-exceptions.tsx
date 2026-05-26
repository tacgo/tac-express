"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiShieldCheckLine } from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { DataTableCard } from "@workspace/ui/components/composed/data-table-card"

interface ExceptionRow {
  awb: string
  status: string
  sender: string
  receiver: string
  route: string
}

interface V7OpsExceptionsProps {
  rows: ExceptionRow[]
  className?: string
}

/**
 * V7OpsExceptions — Violet Grid v7 layout for the Exceptions list.
 *
 * Replaces the Paper Ops Console `OpsExceptionsView`. When `rows` is
 * empty the page renders a centered "all clear" state inside the
 * standard data-table card; otherwise a token-themed table.
 */
function V7OpsExceptions({ rows, className }: V7OpsExceptionsProps) {
  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Operations"
        title="Exceptions"
        description="Shipment exceptions requiring attention."
      />

      <DataTableCard
        title="Open exceptions"
        subtitle={
          rows.length === 0
            ? "All shipments clear"
            : `${rows.length} record${rows.length === 1 ? "" : "s"}`
        }
      >
        {rows.length === 0 ? (
          <EmptyExceptions />
        ) : (
          <div className="bg-surface-elevated tac-fui-border overflow-x-auto shadow-sm">
            {/* eslint-disable-next-line no-restricted-syntax -- Display-only table with no interactive sorting or filtering; DataTable primitive is overkill for this read-only tabular output */}
            <table className="w-full border-collapse t-mono">
              <thead className="border-b border-border bg-muted">
                <tr>
                  {(
                    [
                      "AWB",
                      "Status",
                      "Severity",
                      "Type",
                      "Description",
                    ] as const
                  ).map((label) => (
                    <th
                      key={label}
                      scope="col"
                      className="px-3 py-2.5 text-left t-mono-sm uppercase tracking-wider text-muted-foreground"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr
                    key={r.awb + r.status + r.route}
                    className="bg-card hover:bg-surface-hover transition-colors duration-fast ease-linear"
                  >
                    <td className="px-3 py-2.5">
                      <span className="t-mono text-primary">{r.awb}</span>
                    </td>
                    <td className="px-3 py-2.5 t-mono-sm">{r.status}</td>
                    <td className="px-3 py-2.5 t-mono-sm">{r.sender}</td>
                    <td className="px-3 py-2.5 t-mono-sm">{r.receiver}</td>
                    <td className="px-3 py-2.5 t-body-sm">{r.route}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataTableCard>
    </PageShell>
  )
}

function EmptyExceptions() {
  return (
    <div className="flex flex-col items-center text-center gap-2 max-w-sm mx-auto py-12">
      <RiShieldCheckLine aria-hidden className="size-8 text-muted-foreground" />
      <span className="tac-mono-label">No exceptions</span>
      <p className="t-h4 text-foreground">All shipments are clear.</p>
      <p className="t-body-sm text-muted-foreground">
        No exceptions are open right now. If a shipment is delayed, damaged, or
        lost, it will appear here for action.
      </p>
    </div>
  )
}

export { V7OpsExceptions }
export type { V7OpsExceptionsProps, ExceptionRow }
