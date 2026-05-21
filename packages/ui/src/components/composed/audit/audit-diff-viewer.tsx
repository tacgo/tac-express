"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

interface AuditDiffViewerProps {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  className?: string
}

type DiffStatus = "added" | "removed" | "changed" | "unchanged"

interface DiffRow {
  key: string
  status: DiffStatus
  before?: unknown
  after?: unknown
}

/**
 * Pure JSON-diff helper. Compares two flat-or-shallow records and returns a
 * row-per-key diff. Nested objects are stringified for v1 — Phase 9 polish
 * can introduce a recursive renderer once more-than-1-level diffs become
 * common in audit_log payloads.
 */
export function diffRecords(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): DiffRow[] {
  const a = before ?? {}
  const b = after ?? {}
  const keys = Array.from(
    new Set([...Object.keys(a), ...Object.keys(b)])
  ).sort()

  return keys.map((key) => {
    const inA = key in a
    const inB = key in b
    if (!inA && inB) {
      return { key, status: "added", after: b[key] }
    }
    if (inA && !inB) {
      return { key, status: "removed", before: a[key] }
    }
    if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) {
      return { key, status: "changed", before: a[key], after: b[key] }
    }
    return { key, status: "unchanged", before: a[key], after: b[key] }
  })
}

export function AuditDiffViewer({
  before,
  after,
  className,
}: AuditDiffViewerProps) {
  const rows = React.useMemo(() => diffRecords(before, after), [before, after])
  const changed = rows.filter((r) => r.status !== "unchanged")

  if (changed.length === 0) {
    return (
      <p
        data-slot="audit-diff-empty"
        className={cn(
          "border border-dashed border-border px-3 py-2 font-mono text-paper-10 uppercase tracking-widest text-muted-foreground",
          className
        )}
      >
        No payload changes recorded.
      </p>
    )
  }

  return (
    <section
      data-slot="audit-diff-viewer"
      className={cn("border border-border bg-background", className)}
    >
      <header className="grid grid-cols-[180px_1fr_1fr] gap-px border-b border-border bg-muted/30 px-3 py-2">
        <span className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Field
        </span>
        <span className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Before
        </span>
        <span className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          After
        </span>
      </header>
      <ul className="divide-y divide-border/60">
        {changed.map((row) => (
          <li
            key={row.key}
            data-status={row.status}
            className="grid grid-cols-[180px_1fr_1fr] gap-px px-3 py-2 align-top"
          >
            <span className="truncate font-mono text-paper-11 font-semibold tracking-widest">
              {row.key}
            </span>
            <DiffCell value={row.before} status={row.status} side="before" />
            <DiffCell value={row.after} status={row.status} side="after" />
          </li>
        ))}
      </ul>
    </section>
  )
}

function DiffCell({
  value,
  status,
  side,
}: {
  value: unknown
  status: DiffStatus
  side: "before" | "after"
}) {
  const text = render(value)
  const isHighlighted =
    (side === "before" && (status === "removed" || status === "changed")) ||
    (side === "after" && (status === "added" || status === "changed"))

  return (
    <pre
      className={cn(
        "max-h-32 overflow-auto whitespace-pre-wrap break-all border border-transparent px-2 py-1 font-mono text-paper-11 leading-snug",
        isHighlighted &&
          side === "before" &&
          "border-destructive/40 bg-destructive/10 text-destructive",
        isHighlighted &&
          side === "after" &&
          "border-status-success/40 bg-status-success/10 text-status-success",
        !isHighlighted && "text-muted-foreground"
      )}
    >
      {text}
    </pre>
  )
}

function render(value: unknown): string {
  if (value === undefined) return "—"
  if (value === null) return "null"
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}
