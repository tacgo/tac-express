"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import type {
  ContactLeadRow,
  ContactLeadStatus,
} from "@workspace/types"
import {
  RiSearchLine,
  RiInboxLine,
  RiErrorWarningLine,
  RiArrowDownSLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { DataTableCard } from "@workspace/ui/components/composed/data-table-card"
import { Input } from "@workspace/ui/components/primitives/input"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import { SkeletonTable } from "@workspace/ui/components/primitives/skeleton"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"

/**
 * V7ContactLeads — Violet Grid v7 layout for the Support / Contact Inbox.
 *
 * Replaces the Paper Ops Console `ContactLeadsView`. Search + tab filtering
 * stay client-side (low lead volume); the inline detail-expansion pattern is
 * preserved. Status / notification chips use the shared Badge primitive with
 * semantic class overrides for the four states.
 */

const STATUS_TONE_CLASS: Record<ContactLeadStatus, string> = {
  new: "border-accent-info/30 bg-accent-info/15 text-accent-info",
  contacted: "border-accent-warning/30 bg-accent-warning/15 text-accent-warning",
  closed: "border-accent-success/30 bg-accent-success/15 text-accent-success",
}

const NOTIFICATION_TONE_CLASS: Record<
  ContactLeadRow["notification_status"],
  string
> = {
  sent: "border-accent-success/30 bg-accent-success/15 text-accent-success",
  failed: "border-destructive/30 bg-destructive/15 text-destructive",
  pending: "border-border text-muted-foreground",
}

const STATUS_TABS = ["all", "new", "contacted", "closed"] as const
type StatusTab = (typeof STATUS_TABS)[number]

interface V7ContactLeadsProps {
  leads: ContactLeadRow[]
  isLoading?: boolean
  isError?: boolean
  onStatusChange: (id: string, status: ContactLeadStatus) => void
  updatingId?: string | null
  className?: string
}

function V7ContactLeads({
  leads,
  isLoading = false,
  isError = false,
  onStatusChange,
  updatingId = null,
  className,
}: V7ContactLeadsProps) {
  const [query, setQuery] = React.useState("")
  const [tab, setTab] = React.useState<StatusTab>("all")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const filtered = leads.filter((lead) => {
    if (tab !== "all" && lead.status !== tab) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      lead.name.toLowerCase().includes(q) ||
      lead.email.toLowerCase().includes(q) ||
      (lead.company ?? "").toLowerCase().includes(q)
    )
  })

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Support"
        title="Contact Inbox"
        description={`${leads.length} lead${leads.length === 1 ? "" : "s"}`}
      />

      <DataTableCard title="Leads" subtitle="Filter by status or search">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative max-w-xl">
            <RiSearchLine
              aria-hidden
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <Input
              aria-label="Search leads"
              placeholder="Search by name, email, or company…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* Status tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as StatusTab)}
            className="gap-2"
          >
            <TabsList>
              {STATUS_TABS.map((s) => (
                <TabsTrigger key={s} value={s}>
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* States */}
          {isLoading && <SkeletonTable columns={6} rows={8} />}

          {!isLoading && isError && (
            <EmptyState
              icon={<RiErrorWarningLine className="size-5" aria-hidden />}
              title="Couldn't load leads"
              description="The contact inbox is temporarily unavailable. Refresh to try again."
            />
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <EmptyState
              icon={<RiInboxLine className="size-5" aria-hidden />}
              title={
                query || tab !== "all" ? "No matching leads" : "No leads yet"
              }
              description={
                query || tab !== "all"
                  ? "Widen the search or status filter."
                  : "Submissions from the public contact form will appear here."
              }
            />
          )}

          {!isLoading && !isError && filtered.length > 0 && (
            <div className="bg-surface-elevated tac-fui-border overflow-x-auto shadow-sm">
              <table className="w-full border-collapse t-mono">
                <thead className="border-b border-border bg-muted">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-2.5 t-mono-sm uppercase tracking-wider text-muted-foreground"
                    >
                      <span className="sr-only">Expand</span>
                    </th>
                    {(["Received", "Name", "Reason", "Status", "Notify"] as const).map(
                      (label) => (
                        <th
                          key={label}
                          scope="col"
                          className="px-3 py-2.5 text-left t-mono-sm uppercase tracking-wider text-muted-foreground"
                        >
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((lead) => {
                    const isOpen = expandedId === lead.id
                    return (
                      <React.Fragment key={lead.id}>
                        <tr className="bg-card hover:bg-surface-hover transition-colors duration-fast ease-linear">
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              aria-expanded={isOpen}
                              aria-label={`${isOpen ? "Collapse" : "Expand"} details for ${lead.name}`}
                              onClick={() =>
                                setExpandedId((prev) =>
                                  prev === lead.id ? null : lead.id,
                                )
                              }
                              className="flex items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:tac-focus-premium"
                            >
                              <RiArrowDownSLine
                                aria-hidden
                                className={cn(
                                  "size-4 transition-transform",
                                  isOpen && "rotate-180",
                                )}
                              />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 t-mono-sm text-muted-foreground">
                            {new Date(lead.created_at).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="t-body-sm font-medium text-foreground">
                              {lead.name}
                            </div>
                            <div className="t-mono-sm text-muted-foreground">
                              {lead.email}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 t-mono-sm uppercase">
                            {lead.reason}
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono uppercase tracking-tag",
                                STATUS_TONE_CLASS[lead.status],
                              )}
                            >
                              {lead.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-mono uppercase tracking-tag",
                                NOTIFICATION_TONE_CLASS[lead.notification_status],
                              )}
                            >
                              {lead.notification_status}
                            </Badge>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr
                            data-slot="lead-detail"
                            className="bg-surface-hover/30"
                          >
                            <td className="px-3 py-3" colSpan={6}>
                              <div className="grid gap-4 py-2 md:grid-cols-[2fr_1fr]">
                                <div className="space-y-2">
                                  <p className="tac-mono-label">Message</p>
                                  <p className="t-body-sm whitespace-pre-wrap text-foreground">
                                    {lead.message}
                                  </p>
                                  {lead.company && (
                                    <p className="t-mono-sm text-muted-foreground">
                                      Company: {lead.company}
                                    </p>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <label
                                    htmlFor={`lead-status-${lead.id}`}
                                    className="tac-mono-label block"
                                  >
                                    Triage status
                                  </label>
                                  <select
                                    id={`lead-status-${lead.id}`}
                                    value={lead.status}
                                    disabled={updatingId === lead.id}
                                    onChange={(e) =>
                                      onStatusChange(
                                        lead.id,
                                        e.target.value as ContactLeadStatus,
                                      )
                                    }
                                    className="w-full border border-border bg-background px-2.5 h-9 t-body-sm focus-visible:outline-none focus-visible:tac-focus-premium focus-visible:border-primary disabled:opacity-50"
                                  >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="closed">Closed</option>
                                  </select>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </DataTableCard>
    </PageShell>
  )
}

export { V7ContactLeads }
export type { V7ContactLeadsProps }
