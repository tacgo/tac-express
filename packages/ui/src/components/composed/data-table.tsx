"use client"

import * as React from "react"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/primitives/dropdown-menu"
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCloseLine,
  RiFilterLine,
  RiInboxLine,
} from "@workspace/ui/icons"

/**
 * DataTableFacetedFilter — multi-select column filter sourced from the
 * column's faceted unique values. Selecting values sets an array filter
 * value; the column must declare a matching `filterFn` (e.g.
 * `(row, id, value: string[]) => value.includes(row.getValue(id))`).
 */
function DataTableFacetedFilter<TData>({
  column,
  title,
}: {
  column: Column<TData, unknown>
  title: string
}) {
  const facets = column.getFacetedUniqueValues()
  const selected = new Set((column.getFilterValue() as string[]) ?? [])
  const options = Array.from(facets.keys())
    .filter((v): v is string => typeof v === "string")
    .sort()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-dashed font-mono text-xs uppercase tracking-wider"
        >
          <RiFilterLine className="size-3.5" aria-hidden="true" />
          {title}
          {selected.size > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center bg-primary px-1 text-2xs tabular-nums text-primary-foreground">
              {selected.size}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          {title}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <DropdownMenuItem disabled>No values</DropdownMenuItem>
        ) : (
          options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt}
              checked={selected.has(opt)}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={(checked) => {
                const next = new Set(selected)
                if (checked) next.add(opt)
                else next.delete(opt)
                column.setFilterValue(next.size ? Array.from(next) : undefined)
              }}
              className="text-xs"
            >
              <span className="flex-1 truncate">{opt}</span>
              <span className="ml-2 font-mono text-2xs tabular-nums text-muted-foreground">
                {facets.get(opt)}
              </span>
            </DropdownMenuCheckboxItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
  /**
   * Optional faceted filters. Each entry renders a multi-select dropdown in
   * the toolbar, sourced from the column's faceted unique values. The named
   * column must declare a `filterFn` that accepts an array filter value.
   */
  facets?: { columnId: string; title: string }[]
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
  facets,
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
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
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
      {(searchKey || (facets && facets.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchKey && (
            <>
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
            </>
          )}
          {facets?.map((f) => {
            const column = table.getColumn(f.columnId)
            return column ? (
              <DataTableFacetedFilter
                key={f.columnId}
                column={column}
                title={f.title}
              />
            ) : null
          })}
          {table.getState().columnFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.resetColumnFilters()}
              className="h-8 gap-1 px-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"
            >
              Reset
              <RiCloseLine className="size-3.5" aria-hidden="true" />
            </Button>
          )}
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {table.getFilteredRowModel().rows.length} result
            {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      <div className="bg-surface-elevated tac-fui-border max-h-table-viewport overflow-auto shadow-sm">
        <table
          role="table"
          aria-label="Data table"
          className="grid w-full caption-bottom t-mono"
          style={{ gridTemplateColumns }}
        >
          <thead
            role="rowgroup"
            className="col-span-full grid grid-cols-subgrid border-b border-border bg-muted sticky top-0 z-20"
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
                        // v6 a11y: sortable headers use the Button primitive (ghost)
                        // so keyboard users can trigger sort via Enter/Space and get
                        // the project's standard premium focus ring for free.
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={header.column.getToggleSortingHandler()}
                          className="flex h-full w-full items-center justify-start rounded-none px-3 t-mono-sm font-normal uppercase tracking-wider text-muted-foreground select-none hover:bg-transparent hover:text-foreground"
                        >
                          {headerContent}
                        </Button>
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
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            <RiArrowLeftSLine className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="size-7 text-muted-foreground hover:text-foreground"
          >
            <RiArrowRightSLine className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export { DataTable }
export type { DataTableProps }
