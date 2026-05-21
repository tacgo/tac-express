"use client"

import * as React from "react"
import Link from "next/link"

import { RiAddLine, RiMoneyDollarCircleLine } from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsButton } from "../ops-button"
import { OpsBadge } from "../ops-badge"
import { OpsCard } from "../ops-card"
import { OpsTabs } from "../ops-tabs"
import {
  OpsTable,
  OpsTableHead,
  OpsTableBody,
  OpsTableRow,
  OpsTableHeader,
  OpsTableCell,
} from "../ops-table"
import { OpsSkeletonRow } from "../ops-skeleton"
import { OpsEmptyState } from "../ops-empty-state"
import { OpsErrorState } from "../ops-error-state"

type InvoiceTone = "ok" | "warn" | "violet" | "err" | "neutral"

interface InvoiceRow {
  id: string
  customer: string
  status: string
  tone: InvoiceTone
  amount: string
  due: string
  /** Detail page href (typically `/ops-console/finance/<uuid>`). */
  detailHref?: string
}

interface AgingBucket {
  label: string
  amount: string
  sub: string
  toneClass: string
}

interface OpsFinanceViewProps {
  outstanding: string
  totalInvoices: number
  buckets: AgingBucket[]
  rows: InvoiceRow[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
}

const TABS = ["All", "Draft", "Issued", "Paid", "Overdue"] as const

function OpsFinanceView({
  outstanding,
  totalInvoices,
  buckets,
  rows,
  isLoading,
  isError,
  onRetry,
}: OpsFinanceViewProps) {
  const [tab, setTab] = React.useState<string>("All")
  const [pageIndex, setPageIndex] = React.useState(0)
  React.useEffect(() => setPageIndex(0), [tab])
  const filtered =
    tab === "All"
      ? rows
      : rows.filter((r) => r.status.toLowerCase() === tab.toLowerCase())

  const PAGE_SIZE = 25
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePageIndex = Math.min(pageIndex, totalPages - 1)
  const pageStart = safePageIndex * PAGE_SIZE
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="Business"
        title="Finance"
        sub="Invoices, billing and financial reports"
        actions={
          // Links to v6 invoice wizard (customer pick → AWB autofill → rate
          // lookup → line items → preview → submit with autosave). The paper
          // variant is a single-page MVP missing the rate-lookup + line-item
          // breakdown.
          <OpsButton asChild variant="primary">
            <Link href="/ops-console/finance/create">
              <RiAddLine aria-hidden className="size-3" />
              New Invoice
            </Link>
          </OpsButton>
        }
      />

      <OpsCard ticks className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span aria-hidden className="w-1.5 h-3.5 bg-paper-err" />
            <div className="paper-label text-paper-fg-1 tracking-nav">
              Receivables Aging · {totalInvoices} invoices
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="paper-label">Outstanding</span>
            <b className="text-paper-err font-paper-display font-bold text-ui-16">
              {outstanding}
            </b>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mt-3.5">
          {buckets.map((b) => (
            <div
              key={b.label}
              className={`px-3.5 py-2.5 bg-paper-2 border-l-[length:var(--indicator-w)] ${b.toneClass}`}
            >
              <div className="paper-label">{b.label}</div>
              <div className="font-paper-display font-bold text-ui-22 mt-1">
                {b.amount}
              </div>
              <div className="font-paper-mono text-paper-fg-3 text-ui-11 mt-0.5">
                {b.sub}
              </div>
            </div>
          ))}
        </div>
      </OpsCard>

      <OpsTabs items={[...TABS]} value={tab} onChange={setTab} />

      {isError ? (
        <OpsErrorState
          code="FINANCE · FETCH FAILED"
          headline="Could not load invoices"
          message="The invoices API didn't respond. Retry the request, or contact support if the issue persists."
          onRetry={onRetry}
        />
      ) : !isLoading && filtered.length === 0 ? (
        <OpsEmptyState
          icon={RiMoneyDollarCircleLine}
          eyebrow={tab === "All" ? "NO INVOICES" : `NO "${tab.toUpperCase()}" INVOICES`}
          headline={
            tab === "All"
              ? "No invoices yet"
              : `Nothing matches the ${tab} filter`
          }
          description={
            tab === "All"
              ? "Create the first invoice for a completed shipment to start tracking receivables."
              : "Try switching to the All tab, or issue a new invoice."
          }
          cta={
            <OpsButton asChild variant="primary">
              <Link href="/ops-console/finance/create">
                <RiAddLine aria-hidden className="size-3" />
                New Invoice
              </Link>
            </OpsButton>
          }
        />
      ) : (
      <OpsTable>
        <OpsTableHead>
          <tr>
            <OpsTableHeader>Invoice #</OpsTableHeader>
            <OpsTableHeader>Customer</OpsTableHeader>
            <OpsTableHeader>Status</OpsTableHeader>
            <OpsTableHeader>Amount</OpsTableHeader>
            <OpsTableHeader>Due</OpsTableHeader>
            <OpsTableHeader>
              <span className="sr-only">Actions</span>
            </OpsTableHeader>
          </tr>
        </OpsTableHead>
        <OpsTableBody>
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <OpsSkeletonRow key={`f-sk-${i}`} cols={6} />
              ))
            : paginated.map((r) => (
            <OpsTableRow key={r.id}>
              <OpsTableCell>
                <span className="paper-id">{r.id}</span>
              </OpsTableCell>
              <OpsTableCell>{r.customer}</OpsTableCell>
              <OpsTableCell>
                <OpsBadge tone={r.tone === "neutral" ? "neutral" : r.tone}>
                  {r.status}
                </OpsBadge>
              </OpsTableCell>
              <OpsTableCell mono>{r.amount}</OpsTableCell>
              <OpsTableCell mono muted>
                {r.due}
              </OpsTableCell>
              <OpsTableCell>
                {r.detailHref ? (
                  <OpsButton asChild size="sm">
                    <Link href={r.detailHref}>View</Link>
                  </OpsButton>
                ) : (
                  <OpsButton size="sm" disabled>View</OpsButton>
                )}
              </OpsTableCell>
            </OpsTableRow>
          ))}
        </OpsTableBody>
      </OpsTable>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="flex items-center justify-between mt-3.5">
          <div className="paper-label">
            Page {safePageIndex + 1} of {totalPages} · {filtered.length}{" "}
            invoice{filtered.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2">
            <OpsButton
              size="sm"
              aria-label="Previous page"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={safePageIndex === 0}
            >
              ‹
            </OpsButton>
            <OpsButton
              size="sm"
              aria-label="Next page"
              onClick={() =>
                setPageIndex((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePageIndex >= totalPages - 1}
            >
              ›
            </OpsButton>
          </div>
        </div>
      )}
    </OpsFrame>
  )
}

export { OpsFinanceView }
export type { OpsFinanceViewProps, InvoiceRow, AgingBucket }
