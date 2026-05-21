"use client"

import * as React from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@workspace/ui/components/composed/data-table"
import type { FailedWhatsappSendRow, UUID } from "@workspace/types"

import { WhatsAppSendStatusBadge } from "./whatsapp-send-status-badge"
import { WhatsAppRetryButton } from "./whatsapp-retry-button"

/**
 * Pure table component for the failed-sends operator triage view
 * (backlog item W2 — issue #142). Built on the project's existing
 * `DataTable` (which wraps @tanstack/react-table); no table primitive
 * is rebuilt. Columns chosen for at-a-glance triage:
 *
 *   - status (always "failed" in this view but rendered so the badge
 *     is consistent + a future filter-by-status UI can drop in cleanly)
 *   - attempt_no (which try this was — 1 = original, 2+ = retry)
 *   - phone (E.164; PII, gated by the MANAGER+ role-check at the page layer)
 *   - endpoint (sendmessage vs sendtemplatemessage)
 *   - template_name (only meaningful for sendtemplatemessage rows)
 *   - error_message (the actionable signal — "WhatsApp rejected", "Network error", etc.)
 *   - completed_at (most-recent-first sort key)
 *
 * Fields intentionally OMITTED for V1:
 *   - raw_response (jsonb, verbose, PII-dense — belongs in a future
 *     per-row detail view, not in the list)
 *   - wamid (always null on failed rows by the migration's CHECK
 *     constraint — column would be useless)
 *   - invoice_id / original_send_id (linkage; future per-row drilldown)
 *
 * Component is PURE — receives rows, optionally emits onRowClick.
 * Zero DB / business logic per LAW 6 + LAW 7.
 *
 * Retry capability — added in W2 PR 2 (SB-1 / #153) via the OPTIONAL
 * `retryConfig` prop. When provided, the table renders a "Retry" column
 * holding a pure `<WhatsAppRetryButton>` per row, prop-drilled with the
 * per-row state from the caller. Without `retryConfig`, the table is
 * unchanged from PR 1 (visibility-only).
 */

/**
 * Per-row state for the optional retry column. Owned by the caller (the
 * `apps/dashboard` client wrapper); pure components don't own mutation
 * state.
 */
interface RetryRowState {
  /** Whether THIS row is retryable. False for template rows (V1 scope cut)
   *  and for non-MANAGER viewers (live wrapper passes false in that case). */
  canRetry: boolean
  /** Whether THIS row has a retry currently in-flight. */
  isInflight: boolean
  /** Last error from the most-recent retry attempt for THIS row. */
  lastError: string | null
  /** Tooltip text shown when canRetry is false. */
  disabledReason?: string
}

interface FailedSendsTableRetryConfig {
  /** Lookup function: row id → its current retry state. */
  rowState: (rowId: UUID) => RetryRowState
  /** Upward intent emit when the operator clicks Retry on a row. */
  onRetry: (row: FailedWhatsappSendRow) => void
}

interface FailedSendsTableProps {
  rows: FailedWhatsappSendRow[]
  /**
   * Optional retry config. When provided, the table appends a "Retry"
   * column wired to the parent's per-row state Map. When omitted, the
   * table renders exactly as it did in PR 1 (visibility only).
   */
  retryConfig?: FailedSendsTableRetryConfig
  /**
   * Optional row-click handler. PR 1 omits it (no row interaction yet);
   * PR 2 keeps it omitted but the prop is still accepted for forward-
   * compatible drilldown surfaces.
   */
  onRowClick?: (row: FailedWhatsappSendRow) => void
}

function formatTimestamp(value: string | null): string {
  if (!value) return "—"
  // Locale-aware short timestamp. Server-rendered (the live wrapper runs
  // server-side); no hydration mismatch risk for the locale-default format.
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z")
}

function truncate(text: string | null, max = 80): string {
  if (!text) return "—"
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function buildColumns(
  retryConfig?: FailedSendsTableRetryConfig,
): ColumnDef<FailedWhatsappSendRow>[] {
  const cols: ColumnDef<FailedWhatsappSendRow>[] = [
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <WhatsAppSendStatusBadge status={row.original.status} />,
      size: 96,
    },
    {
      accessorKey: "attempt_no",
      header: "Try",
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {row.original.attempt_no}
        </span>
      ),
      size: 56,
    },
    {
      accessorKey: "phone",
      header: "Phone",
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-foreground">
          +{row.original.phone}
        </span>
      ),
      size: 160,
    },
    {
      accessorKey: "endpoint",
      header: "Endpoint",
      cell: ({ row }) => (
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">
          {row.original.endpoint === "sendtemplatemessage" ? "template" : "message"}
        </span>
      ),
      size: 112,
    },
    {
      accessorKey: "template_name",
      header: "Template",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.template_name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "error_message",
      header: "Error",
      cell: ({ row }) => (
        <span
          className="text-xs text-foreground"
          title={row.original.error_message ?? undefined}
        >
          {truncate(row.original.error_message)}
        </span>
      ),
    },
    {
      accessorKey: "completed_at",
      header: "Failed at",
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {formatTimestamp(row.original.completed_at)}
        </span>
      ),
      size: 192,
    },
  ]

  if (retryConfig) {
    cols.push({
      id: "retry",
      header: "Retry",
      cell: ({ row }) => {
        const state = retryConfig.rowState(row.original.id)
        return (
          <WhatsAppRetryButton
            row={row.original}
            canRetry={state.canRetry}
            isInflight={state.isInflight}
            lastError={state.lastError}
            disabledReason={state.disabledReason}
            onRetry={retryConfig.onRetry}
          />
        )
      },
      size: 208,
    })
  }

  return cols
}

function FailedSendsTable({ rows, retryConfig, onRowClick }: FailedSendsTableProps) {
  const columns = React.useMemo(() => buildColumns(retryConfig), [retryConfig])
  return (
    <DataTable<FailedWhatsappSendRow, unknown>
      columns={columns}
      data={rows}
      pageSize={20}
      onRowClick={onRowClick}
    />
  )
}

export { FailedSendsTable }
export type {
  FailedSendsTableProps,
  FailedSendsTableRetryConfig,
  RetryRowState,
}
