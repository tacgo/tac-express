"use client"

import * as React from "react"

import { useAuditLogs } from "@workspace/services/hooks/use-audit-logs"
import type { AuditLog } from "@workspace/types"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { SkeletonTable } from "@workspace/ui/components/primitives/skeleton"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { AuditDiffViewer } from "@workspace/ui/components/composed/audit/audit-diff-viewer"
import {
  RiHistoryLine,
  RiSearchLine,
  RiFilterLine,
  RiArrowDownSLine,
} from "@workspace/ui/icons"

const ENTITIES = [
  "all",
  "shipments",
  "manifests",
  "invoices",
  "exceptions",
  "customers",
  "rate_cards",
  "webhooks",
  "api_keys",
  "hubs",
  "staff",
] as const

// Action filter options. The destructive trio (payment_delete /
// invoice_cancel / manifest_shipment_remove) is the canonical set
// from the audit-logs hardening arc (#102 risk-rank #1; migrations
// 20260516000001 + 20260516000002). STATUS_CHANGE and RESOLVED are
// the historical actions written by the existing SECURITY DEFINER
// RPCs (update_shipment_status, resolve_exception). Update
// audit.types.ts AuditAction in lock-step when adding more.
const ACTIONS = [
  "all",
  "payment_delete",
  "invoice_cancel",
  "manifest_shipment_remove",
  "STATUS_CHANGE",
  "RESOLVED",
] as const

export function AuditClient() {
  const [entityType, setEntityType] =
    React.useState<(typeof ENTITIES)[number]>("all")
  const [action, setAction] = React.useState<(typeof ACTIONS)[number]>("all")
  const [search, setSearch] = React.useState("")
  const deferredSearch = React.useDeferredValue(search)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const query = useAuditLogs({
    entityType: entityType === "all" ? undefined : entityType,
    action: action === "all" ? undefined : (action as AuditLog["action"]),
    limit: 100,
  })

  // Optimize search: Deferred value ensures typing remains responsive
  // even if the audit log list is large and filtering is expensive.
  const filtered = React.useMemo(() => {
    if (!query.data) return []
    const term = deferredSearch.trim().toLowerCase()
    if (!term) return query.data.data
    return query.data.data.filter(
      (row) =>
        row.description.toLowerCase().includes(term) ||
        row.entityType.toLowerCase().includes(term) ||
        (row.entityId ?? "").toLowerCase().includes(term) ||
        (row.userId ?? "").toLowerCase().includes(term)
    )
  }, [query.data, deferredSearch])

  return (
    <PageShell width="wide">
      <PageHeader
        overline="System"
        title="Audit Log"
        description="Append-only record of every change made through the dashboard."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <RiSearchLine
            className="absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, entity, ID, actor…"
            className="pl-8"
          />
        </div>
        <Filter
          label="Entity"
          options={ENTITIES.map((v) => ({
            value: v,
            label: v.replace("_", " "),
          }))}
          value={entityType}
          onChange={(v) => setEntityType(v as (typeof ENTITIES)[number])}
        />
        <Filter
          label="Action"
          options={ACTIONS.map((v) => ({ value: v, label: v }))}
          value={action}
          onChange={(v) => setAction(v as (typeof ACTIONS)[number])}
        />
      </div>

      {query.isLoading && <SkeletonTable columns={6} rows={10} />}

      {!query.isLoading && filtered.length === 0 && (
        <EmptyState
          icon={<RiHistoryLine className="size-6" aria-hidden="true" />}
          title="No audit events"
          description="Try widening the filters or expanding the time range."
        />
      )}

      {!query.isLoading && filtered.length > 0 && (
        <div className="border border-border bg-background">
          <div className="grid grid-cols-[150px_110px_140px_1fr_140px_140px_32px] border-b border-border bg-muted/40 px-3 py-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            <span>Time</span>
            <span>Action</span>
            <span>Entity</span>
            <span>Description</span>
            <span>Actor</span>
            <span>IP</span>
            <span />
          </div>
          {filtered.map((log) => {
            const isOpen = expandedId === log.id
            return (
              <React.Fragment key={log.id}>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setExpandedId((prev) => (prev === log.id ? null : log.id))
                  }
                  aria-expanded={isOpen}
                  className="grid h-auto w-full grid-cols-[150px_140px_140px_1fr_140px_32px] items-center border-b border-border px-3 py-2 text-left text-sm font-normal transition-colors last:border-0 hover:bg-muted/30 hover:text-foreground rounded-none"
                >
                  <span className="font-mono text-ui-11 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                  <span>
                    <ActionBadge action={log.action} />
                  </span>
                  <span className="truncate font-mono text-ui-11 uppercase tracking-widest">
                    {log.entityType}
                  </span>
                  <span className="truncate">{log.description}</span>
                  <span className="truncate font-mono text-ui-11 text-muted-foreground">
                    {log.userId ? log.userId.slice(0, 8) + "…" : "system"}
                  </span>
                  <span
                    className={`flex justify-center text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <RiArrowDownSLine className="size-3.5" />
                  </span>
                </Button>
                {isOpen && (
                  <div className="grid gap-3 border-b border-border bg-muted/10 px-4 py-4 last:border-0 md:grid-cols-[1fr_2fr]">
                    <div className="space-y-2 font-mono text-ui-11">
                      <Detail label="Audit ID" value={log.id} />
                      <Detail
                        label="Entity ID"
                        value={log.entityId ?? "—"}
                      />
                      <Detail
                        label="Actor"
                        value={log.userId ?? "system"}
                      />
                    </div>
                    {/* AuditDiffViewer accepts before / after state. For
                        destructive ops there is no after-state (the row
                        is gone); we render the before_state snapshot
                        alone so an auditor can see what was destroyed. */}
                    <AuditDiffViewer
                      before={log.beforeState}
                      after={null}
                    />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}

interface FilterProps {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

function Filter({ label, options, value, onChange }: FilterProps) {
  return (
    <label className="inline-flex items-center gap-2 border border-border bg-card px-2 py-1 text-xs">
      <RiFilterLine
        className="size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="font-mono uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {/* eslint-disable-next-line no-restricted-syntax -- Native select for audit filter; simple direct binding, Radix Select adds unnecessary Popover for this compact control */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground outline-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ActionBadge({ action }: { action: AuditLog["action"] }) {
  // The three destructive actions render as `destructive`; the
  // historical RPC-emitted actions render as `secondary`. Keeping the
  // variant decision local to this component lets us add new actions
  // by extending AuditAction + this switch in lockstep.
  const variant: React.ComponentProps<typeof Badge>["variant"] =
    action === "payment_delete" ||
    action === "invoice_cancel" ||
    action === "manifest_shipment_remove"
      ? "destructive"
      : "secondary"
  return (
    <Badge variant={variant} className="font-mono">
      {action}
    </Badge>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="break-all font-mono text-ui-11">{value}</p>
    </div>
  )
}
