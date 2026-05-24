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
  // Horizontal-scroll wrapper so wide operational tables stay usable on narrow
  // screens instead of clipping (the old `overflow-hidden` on the table cut
  // columns off on mobile). The table keeps its border; the wrapper scrolls.
  return (
    <div className="w-full overflow-x-auto">
      <table
        data-slot="ops-table"
        className={cn(
          "w-full border-collapse bg-card border border-border",
          className,
        )}
        {...props}
      />
    </div>
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
        "hover:bg-muted transition-colors duration-fast ease-linear",
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
        "px-4 py-3 text-left bg-background border-b border-border",
        "font-mono font-medium uppercase",
        "text-ui-10 tracking-label",
        "text-muted-foreground",
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
        "px-4 py-3 border-b border-border last:border-b-0",
        "text-ui-13",
        mono && "font-mono",
        muted && "text-muted-foreground",
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
