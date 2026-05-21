"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiMoneyDollarCircleLine,
  RiFileList3Line,
  RiTimeLine,
  RiAlertLine,
  RiArrowRightLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { StatCard } from "@workspace/ui/components/composed/stat-card"
import { Button } from "@workspace/ui/components/button"

type InvoiceTone = "ok" | "warn" | "violet" | "err" | "neutral"

interface InvoiceRow {
  id: string
  customer: string
  status: string
  tone: InvoiceTone
  amount: string
  due: string
  detailHref?: string
}

interface AgingBucket {
  label: string
  amount: string
  sub: string
  toneClass: string
}

interface V7OpsFinanceProps {
  outstanding: string
  totalInvoices: number
  buckets: AgingBucket[]
  rows: InvoiceRow[]
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  className?: string
}

/**
 * V7OpsFinance — Violet-Grid v7 layout for the Finance route.
 *
 * Phase 2e of the NextAdmin refactor. Rendered when `useDesignVersion()`
 * resolves to `"v7"`. The Paper Ops Console `<OpsFinanceView />` remains
 * the v6 default. Both consume the same `useInvoices()` service hook;
 * only the presentation differs.
 *
 * Composition:
 *   PageShell width="wide"
 *   PageHeader
 *   <grid cols=4> StatCard × 4 — Outstanding / Total Invoices / Current / Overdue
 *   <grid cols=4> V7AgingCard × 4 — aging buckets
 *   V7RecentInvoices — first 10 rows with links into detail pages
 *
 * Tab filtering + pagination are deferred to Phase 3 (DataTableCard).
 * v7 users can revert to v6 for full filtered tables.
 */

const TONE_BADGE_CLASS: Record<InvoiceTone, string> = {
  ok: "border-accent-success text-accent-success",
  warn: "border-accent-warning text-accent-warning",
  violet: "border-primary text-primary",
  err: "border-destructive text-destructive",
  neutral: "border-border text-muted-foreground",
}

function V7OpsFinance({
  outstanding,
  totalInvoices,
  buckets,
  rows,
  isLoading,
  isError,
  onRetry,
  className,
}: V7OpsFinanceProps) {
  const currentBucket = buckets.find((b) => b.label === "Current")
  const overdueBucket = buckets.find((b) => b.label === "61–90 days")
  const recent = rows.slice(0, 10)

  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="Business"
        title="Finance"
        description="Outstanding receivables, invoice aging, and recent activity."
        actions={
          isError ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isLoading}
              aria-label="Retry loading invoices"
            >
              Retry
            </Button>
          ) : undefined
        }
      />

      <div
        data-slot="v7-ops-finance-kpis"
        className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Outstanding"
          value={outstanding}
          monoValue
          visual={
            <RiMoneyDollarCircleLine
              className="size-6 text-primary"
              aria-hidden="true"
            />
          }
        />
        <StatCard
          label="Total Invoices"
          value={totalInvoices}
          visual={
            <RiFileList3Line className="size-6 text-primary" aria-hidden="true" />
          }
        />
        <StatCard
          label="Current Bucket"
          value={currentBucket?.amount ?? "—"}
          monoValue={Boolean(currentBucket?.amount && currentBucket.amount !== "—")}
          visual={
            <RiTimeLine
              className="size-6 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
        <StatCard
          label="61–90 Days Overdue"
          value={overdueBucket?.amount ?? "—"}
          monoValue={Boolean(overdueBucket?.amount && overdueBucket.amount !== "—")}
          visual={
            <RiAlertLine
              className={cn(
                "size-6",
                overdueBucket && overdueBucket.amount !== "₹0"
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
              aria-hidden="true"
            />
          }
        />
      </div>

      <section
        data-slot="v7-ops-finance-aging"
        className="border border-border bg-card text-card-foreground p-card-pad shadow-brutal-sm"
        aria-labelledby="v7-finance-aging-heading"
      >
        <h2
          id="v7-finance-aging-heading"
          className="t-overline text-muted-foreground mb-3"
        >
          Aging Breakdown
        </h2>
        <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-4">
          {buckets.map((bucket) => (
            <V7AgingCard key={bucket.label} bucket={bucket} />
          ))}
        </div>
      </section>

      <section
        data-slot="v7-ops-finance-recent"
        className="border border-border bg-card text-card-foreground p-card-pad shadow-brutal-sm"
        aria-labelledby="v7-finance-recent-heading"
      >
        <div className="flex items-baseline justify-between mb-3">
          <h2
            id="v7-finance-recent-heading"
            className="t-overline text-muted-foreground"
          >
            Recent Invoices
          </h2>
          <Link
            href="/ops-console/finance/create"
            className="t-caption text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            + New Invoice
          </Link>
        </div>
        {isLoading ? (
          <p className="t-caption text-muted-foreground">Loading invoices…</p>
        ) : recent.length === 0 ? (
          <p className="t-caption text-muted-foreground">No invoices to display.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border-y border-border">
            {recent.map((row) => (
              <li key={row.id}>
                <Link
                  href={row.detailHref ?? `/ops-console/finance/${row.id}`}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-1 py-2 hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex flex-col">
                    <span className="t-data text-foreground truncate">
                      {row.customer}
                    </span>
                    <span className="font-mono tabular-nums text-xs text-muted-foreground">
                      {row.id} · due {row.due}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "border px-2 py-0.5 t-caption uppercase tracking-wider",
                      TONE_BADGE_CLASS[row.tone]
                    )}
                  >
                    {row.status}
                  </span>
                  <span className="font-mono tabular-nums text-sm text-foreground min-w-24 text-right">
                    {row.amount}
                  </span>
                  <RiArrowRightLine
                    className="size-3 text-muted-foreground col-start-3 hidden"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}

function V7AgingCard({ bucket }: { bucket: AgingBucket }) {
  return (
    <div
      data-slot="v7-aging-card"
      className="flex flex-col gap-1 border border-border bg-surface-elevated p-3"
    >
      <span className="t-overline text-muted-foreground">{bucket.label}</span>
      <span className="font-mono tabular-nums text-lg font-bold text-foreground">
        {bucket.amount}
      </span>
      <span className="t-caption text-muted-foreground">{bucket.sub}</span>
    </div>
  )
}

export { V7OpsFinance }
export type { V7OpsFinanceProps, InvoiceRow, AgingBucket }
