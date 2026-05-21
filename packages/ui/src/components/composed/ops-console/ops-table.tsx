import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * OpsTable — paper-aesthetic table with mono uppercase headers,
 * 12px x 16px cell padding, and a single 1px hairline border per row.
 */
function OpsTable({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table
      data-slot="ops-table"
      className={cn(
        "w-full border-collapse bg-paper-card border border-paper-line overflow-hidden",
        className,
      )}
      {...props}
    />
  )
}

function OpsTableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("", className)} {...props} />
}

function OpsTableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("", className)} {...props} />
}

function OpsTableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "hover:bg-paper-3 transition-colors duration-fast ease-linear",
        className,
      )}
      {...props}
    />
  )
}

function OpsTableHeader({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left bg-paper-bg border-b border-paper-line",
        "font-paper-mono font-medium uppercase",
        "text-[length:var(--text-ui-10)] tracking-[length:var(--tracking-label)]",
        "text-paper-fg-3",
        className,
      )}
      {...props}
    />
  )
}

function OpsTableCell({
  className,
  mono = false,
  muted = false,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  mono?: boolean
  muted?: boolean
}) {
  return (
    <td
      className={cn(
        "px-4 py-3 border-b border-paper-line last:border-b-0",
        "text-[length:var(--text-ui-13)]",
        mono && "font-paper-mono",
        muted && "text-paper-fg-3",
        className,
      )}
      {...props}
    />
  )
}

export {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
}
