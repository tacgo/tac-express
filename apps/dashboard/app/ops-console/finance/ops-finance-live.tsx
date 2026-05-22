"use client"

import * as React from "react"

import { useInvoices } from "@workspace/services/hooks/use-invoices"
import type { InvoiceSummary } from "@workspace/types"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"
import {
  OpsFinanceView,
  type InvoiceRow,
  type AgingBucket,
} from "@workspace/ui/components/composed/ops-console/pages"
import { V7OpsFinance } from "@workspace/ui/components/composed/finance/v7-ops-finance"

const TONE_BY_STATUS: Record<string, InvoiceRow["tone"]> = {
  DRAFT: "warn",
  ISSUED: "violet",
  PAID: "ok",
  CANCELLED: "neutral",
  OVERDUE: "err",
}

function fmtINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`
}

function toRow(i: InvoiceSummary): InvoiceRow {
  return {
    id: i.invoiceNumber,
    customer: i.customerName,
    status: i.status.charAt(0) + i.status.slice(1).toLowerCase(),
    tone: TONE_BY_STATUS[i.status] ?? "neutral",
    amount: fmtINR(i.totalAmount),
    due: i.dueDate
      ? new Date(i.dueDate).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })
      : "—",
    detailHref: `/ops-console/finance/${i.id}`,
  }
}

/** Bucket invoices by age (days since createdAt). */
function deriveBuckets(invoices: InvoiceSummary[]): {
  outstanding: number
  buckets: AgingBucket[]
} {
  const now = Date.now()
  const days = (iso: string) => Math.floor((now - new Date(iso).getTime()) / 86_400_000)
  const current: InvoiceSummary[] = []
  const b1: InvoiceSummary[] = []
  const b2: InvoiceSummary[] = []
  const b3: InvoiceSummary[] = []
  for (const inv of invoices) {
    if (inv.status === "PAID" || inv.status === "CANCELLED") continue
    const age = days(inv.createdAt)
    if (age <= 0) current.push(inv)
    else if (age <= 30) b1.push(inv)
    else if (age <= 60) b2.push(inv)
    else b3.push(inv)
  }
  const sum = (xs: InvoiceSummary[]) => xs.reduce((acc, x) => acc + x.balance, 0)
  const outstanding = sum(current) + sum(b1) + sum(b2) + sum(b3)
  const totalCount = current.length + b1.length + b2.length + b3.length
  const pct = (xs: InvoiceSummary[]) =>
    totalCount === 0 ? 0 : Math.round((sum(xs) / Math.max(outstanding, 1)) * 100)
  return {
    outstanding,
    buckets: [
      {
        label: "Current",
        amount: fmtINR(sum(current)),
        sub: `${current.length} invoices${current.length ? ` · ${pct(current)}%` : ""}`,
        toneClass: "border-l-accent-success",
      },
      {
        label: "0–30 days",
        amount: fmtINR(sum(b1)),
        sub: `${b1.length} invoices${b1.length ? ` · ${pct(b1)}%` : ""}`,
        toneClass: "border-l-accent-warning",
      },
      {
        label: "31–60 days",
        amount: fmtINR(sum(b2)),
        sub: `${b2.length} invoices${b2.length ? ` · ${pct(b2)}%` : ""}`,
        toneClass: "border-l-muted-foreground",
      },
      {
        label: "61–90 days",
        amount: fmtINR(sum(b3)),
        sub: `${b3.length} invoices${b3.length ? ` · ${pct(b3)}%` : ""}`,
        toneClass: "border-l-muted-foreground",
      },
    ],
  }
}

export function OpsFinanceLive() {
  const query = useInvoices({})
  const { version } = useDesignVersion()
  // Memoise the data array so the useMemo for buckets has a stable reference
  // — otherwise `?? []` allocates a fresh empty array on every render and
  // the bucket derivation recomputes.
  const data = React.useMemo(() => query.data ?? [], [query.data])
  const { outstanding, buckets } = React.useMemo(() => deriveBuckets(data), [data])
  const rows = React.useMemo(() => data.map(toRow), [data])

  if (version === "v7") {
    return (
      <V7OpsFinance
        outstanding={fmtINR(outstanding)}
        totalInvoices={data.length}
        buckets={buckets}
        rows={rows}
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
      />
    )
  }

  return (
    <OpsFinanceView
      outstanding={fmtINR(outstanding)}
      totalInvoices={data.length}
      buckets={buckets}
      rows={rows}
      isLoading={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    />
  )
}
