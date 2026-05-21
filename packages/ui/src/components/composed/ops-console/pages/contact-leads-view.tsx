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
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsTabs } from "../ops-tabs"
import { OpsBadge } from "../ops-badge"
import { OpsEmptyState } from "../ops-empty-state"
import { OpsFieldInput, OpsFieldSelect } from "../ops-field"
import { SkeletonTable } from "../../../primitives/skeleton"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"

/**
 * <ContactLeadsView> — operator-side support inbox for /contact submissions
 * (WS-4B PR-WS-4B-b). Pure + props-driven so the Live wrapper owns the hooks.
 *
 * Reads contact_leads (RLS: MANAGER+); a row's CRM `status` (new → contacted →
 * closed) is the triage state. Search + status-tab filtering are client-side
 * over the supplied rows (lead volume is low for a launching product). The
 * detail expands inline (audit-log pattern) to show the full message + a
 * status control; `onStatusChange` bubbles the transition to the Live.
 */

const STATUS_TONE: Record<ContactLeadStatus, React.ComponentProps<typeof OpsBadge>["tone"]> = {
  new: "info",
  contacted: "warn",
  closed: "ok",
}

const NOTIFICATION_TONE: Record<
  ContactLeadRow["notification_status"],
  React.ComponentProps<typeof OpsBadge>["tone"]
> = {
  sent: "ok",
  failed: "err",
  pending: "neutral",
}

const STATUS_TABS = ["all", "new", "contacted", "closed"] as const
type StatusTab = (typeof STATUS_TABS)[number]

interface ContactLeadsViewProps {
  leads: ContactLeadRow[]
  isLoading?: boolean
  isError?: boolean
  /** Called when an operator changes a lead's CRM status. */
  onStatusChange: (id: string, status: ContactLeadStatus) => void
  /** Id currently being mutated — disables that row's control. */
  updatingId?: string | null
}

function ContactLeadsView({
  leads,
  isLoading = false,
  isError = false,
  onStatusChange,
  updatingId = null,
}: ContactLeadsViewProps) {
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
    <OpsFrame>
      <OpsPageHead
        eyebrow="Support"
        title="Contact Inbox"
        sub={`${leads.length} lead${leads.length === 1 ? "" : "s"}`}
      />

      <div className="relative mb-3.5 max-w-xl">
        <RiSearchLine
          aria-hidden
          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-paper-fg-4"
        />
        <OpsFieldInput
          aria-label="Search leads"
          placeholder="SEARCH.DB(NAME, EMAIL, COMPANY)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="mb-3.5">
        <OpsTabs
          items={STATUS_TABS.map((s) => s.toUpperCase())}
          value={tab.toUpperCase()}
          onChange={(v) => setTab(v.toLowerCase() as StatusTab)}
        />
      </div>

      {isLoading && <SkeletonTable columns={6} rows={8} />}

      {!isLoading && isError && (
        <OpsEmptyState
          icon={RiErrorWarningLine}
          eyebrow="ERROR"
          headline="Couldn't load leads"
          description="The contact inbox is temporarily unavailable. Refresh to try again."
        />
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <OpsEmptyState
          icon={RiInboxLine}
          eyebrow="EMPTY"
          headline={query || tab !== "all" ? "No matching leads" : "No leads yet"}
          description={
            query || tab !== "all"
              ? "Widen the search or status filter."
              : "Submissions from the public contact form will appear here."
          }
        />
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <OpsTable>
          <OpsTableHead>
            <tr>
              <OpsTableHeader>
                <span className="sr-only">Expand</span>
              </OpsTableHeader>
              <OpsTableHeader>Received</OpsTableHeader>
              <OpsTableHeader>Name</OpsTableHeader>
              <OpsTableHeader>Reason</OpsTableHeader>
              <OpsTableHeader>Status</OpsTableHeader>
              <OpsTableHeader>Notify</OpsTableHeader>
            </tr>
          </OpsTableHead>
          <OpsTableBody>
            {filtered.map((lead) => {
              const isOpen = expandedId === lead.id
              return (
                <React.Fragment key={lead.id}>
                  <OpsTableRow>
                    <OpsTableCell>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Collapse" : "Expand"} details for ${lead.name}`}
                        onClick={() =>
                          setExpandedId((prev) =>
                            prev === lead.id ? null : lead.id,
                          )
                        }
                        className="flex items-center justify-center text-paper-fg-3 hover:text-paper-fg-1 focus-visible:outline-none focus-visible:tac-focus-premium"
                      >
                        <RiArrowDownSLine
                          aria-hidden
                          className={cn(
                            "size-4 transition-transform",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                    </OpsTableCell>
                    <OpsTableCell mono muted>
                      {new Date(lead.created_at).toLocaleString()}
                    </OpsTableCell>
                    <OpsTableCell>
                      <div className="font-paper-mono font-semibold uppercase text-[length:var(--text-ui-12)]">
                        {lead.name}
                      </div>
                      <div className="font-paper-mono text-paper-fg-3 text-[length:var(--text-ui-11)]">
                        {lead.email}
                      </div>
                    </OpsTableCell>
                    <OpsTableCell mono>{lead.reason.toUpperCase()}</OpsTableCell>
                    <OpsTableCell>
                      <OpsBadge tone={STATUS_TONE[lead.status]}>
                        {lead.status}
                      </OpsBadge>
                    </OpsTableCell>
                    <OpsTableCell>
                      <OpsBadge tone={NOTIFICATION_TONE[lead.notification_status]}>
                        {lead.notification_status}
                      </OpsBadge>
                    </OpsTableCell>
                  </OpsTableRow>
                  {isOpen && (
                    <tr data-slot="lead-detail">
                      <OpsTableCell colSpan={6}>
                        <div className="grid gap-4 py-2 md:grid-cols-[2fr_1fr]">
                          <div className="space-y-2">
                            <p className="paper-label">Message</p>
                            <p className="font-paper-mono text-[length:var(--text-ui-12)] whitespace-pre-wrap text-paper-fg-2">
                              {lead.message}
                            </p>
                            {lead.company && (
                              <p className="font-paper-mono text-paper-fg-3 text-[length:var(--text-ui-11)]">
                                Company: {lead.company}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor={`lead-status-${lead.id}`}
                              className="paper-label"
                            >
                              Triage status
                            </label>
                            <OpsFieldSelect
                              id={`lead-status-${lead.id}`}
                              value={lead.status}
                              disabled={updatingId === lead.id}
                              onChange={(e) =>
                                onStatusChange(
                                  lead.id,
                                  e.target.value as ContactLeadStatus,
                                )
                              }
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="closed">Closed</option>
                            </OpsFieldSelect>
                          </div>
                        </div>
                      </OpsTableCell>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </OpsTableBody>
        </OpsTable>
      )}
    </OpsFrame>
  )
}

export { ContactLeadsView }
export type { ContactLeadsViewProps }
