"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { cn } from "@workspace/ui/lib/utils"
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiInboxLine,
} from "@workspace/ui/icons"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  /**
   * Optional click handler — when provided, every body row becomes
   * clickable and forwards the row's `original` value to this
   * callback. Each caller decides what to do with it (navigation,
   * selection, drill-down, etc.); routing concerns stay outside the
   * generic table per LAW 5 / LAW 7.
   */
  onRowClick?: (row: TData) => void
  /**
   * Optional override for the empty-state row. Use this from callers that
   * need a domain-specific CTA (e.g., "Create shipment"). Falls back to a
   * generic Violet Grid empty pattern (icon + eyebrow + headline) when omitted.
   */
  emptyState?: React.ReactNode
}

/**
 * DataTable — Violet Grid v6, subgrid layout.
 *
 * Every level (`<table>`, `<thead>`, `<tbody>`, `<tr>`) is `display: grid`,
 * with each child level inheriting the parent's column tracks via
 * `grid-template-columns: subgrid`. Result: header cells, body cells, and
 * the empty-state row stay perfectly column-aligned regardless of content
 * width — and future nested grids (expansion rows, sub-tables) can align
 * with the parent table's columns the same way.
 *
 * Column widths come from `column.columnDef.size` when set; otherwise each
 * column gets `minmax(min-content, auto)` so it sizes to its content.
 *
 * Native `<table>` semantics are preserved. Explicit ARIA roles are added
 * as a safety net — most modern browsers retain table semantics under
 * `display: grid`, but a few older versions strip them.
 *
 * See `docs/VIOLET-GRID-V6-EVOLUTION.md` § 4 (Layout Intelligence).
 */
function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  pageSize = 20,
  onRowClick,
  emptyState,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageSize } },
  })

  // Build the parent grid's column tracks from visible leaf columns.
  // Honor `column.size` when explicitly defined; default to natural sizing.
  //
  // `useReactTable` returns a stable instance reference; `table.getVisibleLeafColumns()`
  // transitively reads `columnVisibility` and the `columns` prop, so we must list
  // those as deps explicitly. ESLint's static analysis can't see the transitive
  // read (it only sees `table.*`), so the suppression below is intentional and
  // necessary — without these deps, the grid track string goes stale when
  // columns are toggled at runtime (caught by Macroscope on PR #2).
  const gridTemplateColumns = React.useMemo(() => {
    return table
      .getVisibleLeafColumns()
      .map((c) => {
        const size = c.columnDef.size
        return typeof size === "number" ? `${size}px` : "minmax(min-content, auto)"
      })
      .join(" ")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, columnVisibility, columns])

  return (
    <div data-slot="data-table" className="space-y-3">
      {searchKey && (
        <div className="flex items-center gap-2">
          <label htmlFor="data-table-search" className="sr-only">
            {searchPlaceholder}
          </label>
          <input
            id="data-table-search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className={cn(
              "h-8 w-64 border border-border bg-background px-3 text-xs font-mono uppercase tracking-wider",
              "placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            )}
          />
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} result
            {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="bg-surface-elevated tac-fui-border overflow-hidden shadow-sm">
        <table
          role="table"
          aria-label="Data table"
          className="grid w-full caption-bottom t-mono"
          style={{ gridTemplateColumns }}
        >
          <thead
            role="rowgroup"
            className="col-span-full grid grid-cols-subgrid border-b border-border bg-muted/30"
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                role="row"
                className="col-span-full grid grid-cols-subgrid"
              >
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  const canSort = header.column.getCanSort()
                  const headerContent = (
                    <span className="inline-flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" && <RiArrowUpLine className="h-3 w-3" aria-hidden="true" />}
                      {sorted === "desc" && <RiArrowDownLine className="h-3 w-3" aria-hidden="true" />}
                    </span>
                  )
                  return (
                    <th
                      key={header.id}
                      role="columnheader"
                      aria-sort={
                        !canSort
                          ? undefined
                          : sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                          ? "descending"
                          : "none"
                      }
                      className="h-9 flex items-stretch text-left t-mono-sm uppercase tracking-wider text-muted-foreground"
                    >
                      {canSort ? (
                        // v6 a11y: sortable headers use a real <button> so keyboard
                        // users can trigger sort via Enter/Space. focus-visible
                        // lifts the project's standard premium focus utility.
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex h-full w-full items-center px-3 cursor-pointer select-none hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
                        >
                          {headerContent}
                        </button>
                      ) : (
                        <span className="flex h-full w-full items-center px-3">
                          {headerContent}
                        </span>
                      )}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody
            role="rowgroup"
            className="col-span-full grid grid-cols-subgrid divide-y divide-border"
          >
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  role="row"
                  // v6: subgrid passes column tracks down; surface-hover row tint + 2px primary edge on selection.
                  className={cn(
                    "col-span-full grid grid-cols-subgrid bg-card transition-[background-color,border-color] duration-fast ease-linear",
                    "hover:bg-surface-hover",
                    "data-[state=selected]:bg-primary-subtle data-[state=selected]:border-l-2 data-[state=selected]:border-l-primary",
                    onRowClick && "cursor-pointer",
                  )}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  aria-selected={row.getIsSelected() ? true : undefined}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      role="cell"
                      className="px-3 py-2.5 flex items-center min-w-0"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr role="row" className="col-span-full grid">
                <td
                  role="cell"
                  // v6: empty-state row spans the full grid via `col-span-full` (replaces colSpan).
                  // Renders the new Violet Grid 4-element pattern (icon + eyebrow + headline + CTA)
                  // when no `emptyState` override is provided by the caller.
                  className="col-span-full py-12 px-6 flex items-center justify-center"
                >
                  {emptyState ?? (
                    <div className="flex flex-col items-center text-center gap-2 max-w-sm">
                      <RiInboxLine aria-hidden className="size-8 text-muted-foreground" />
                      <span className="tac-mono-label">NO RECORDS</span>
                      <p className="t-body-sm text-muted-foreground">
                        No results match the current filters.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <div className="flex items-center gap-1">
          <button
            aria-label="Previous page"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="flex h-7 w-7 items-center justify-center border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            <RiArrowLeftSLine className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Next page"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="flex h-7 w-7 items-center justify-center border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            <RiArrowRightSLine className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { DataTable }
export type { DataTableProps }
