"use client"

import * as React from "react"
import { differenceInDays, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import type { Invoice } from "@workspace/types"

export interface AgingBucket {
  label: string
  /** Inclusive lower bound (in days past due). */
  minDays: number
  /** Inclusive upper bound (in days past due); use Infinity for the open-ended bucket. */
  maxDays: number
  count: number
  total: number
  tone: "ok" | "warning" | "danger" | "critical"
}

interface AgingBucketsProps {
  invoices: Invoice[]
  /** Locale for currency formatting. Defaults to en-IN with INR. */
  locale?: string
  currency?: string
  /** Optional click handler; receives the bucket so the consumer can apply
   * a list-page filter (e.g. setFilter({ aging: '31-60' })). */
  onSelect?: (bucket: AgingBucket) => void
  /** Currently active bucket label — for visual selection state. */
  activeLabel?: string
  className?: string
}

const BUCKET_DEFS: Pick<AgingBucket, "label" | "minDays" | "maxDays" | "tone">[] = [
  { label: "Current", minDays: -Infinity, maxDays: 0, tone: "ok" },
  { label: "0-30", minDays: 1, maxDays: 30, tone: "warning" },
  { label: "31-60", minDays: 31, maxDays: 60, tone: "warning" },
  { label: "61-90", minDays: 61, maxDays: 90, tone: "danger" },
  { label: "90+", minDays: 91, maxDays: Infinity, tone: "critical" },
]

export function computeAging(invoices: Invoice[]): AgingBucket[] {
  const now = new Date()
  const buckets: AgingBucket[] = BUCKET_DEFS.map((d) => ({
    ...d,
    count: 0,
    total: 0,
  }))

  for (const inv of invoices) {
    if (inv.status === "PAID" || inv.status === "CANCELLED") continue
    const due = inv.dueDate ? parseISO(inv.dueDate) : parseISO(inv.createdAt)
    const daysPastDue = differenceInDays(now, due)
    const bucket = buckets.find(
      (b) => daysPastDue >= b.minDays && daysPastDue <= b.maxDays
    )
    if (bucket) {
      bucket.count += 1
      bucket.total += inv.balance ?? inv.totalAmount ?? 0
    }
  }
  return buckets
}

export function AgingBuckets({
  invoices,
  locale = "en-IN",
  currency = "INR",
  onSelect,
  activeLabel,
  className,
}: AgingBucketsProps) {
  const buckets = React.useMemo(() => computeAging(invoices), [invoices])
  const totalOutstanding = buckets
    .filter((b) => b.label !== "Current")
    .reduce((s, b) => s + b.total, 0)
  const grandTotal = buckets.reduce((s, b) => s + b.total, 0)

  const fmt = React.useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }),
    [locale, currency]
  )

  return (
    <section
      data-slot="aging-buckets"
      className={cn(
        "tac-fui-panel relative",
        className
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-1 bg-primary"
          />
          <h2 className="font-mono text-ui-10 font-semibold uppercase tracking-subtitle text-foreground">
            Receivables aging
          </h2>
          <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            · {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            Outstanding
          </span>
          <span
            className={cn(
              "font-heading text-lg font-semibold tabular-nums tracking-tight",
              totalOutstanding > 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {fmt.format(totalOutstanding)}
          </span>
        </div>
      </header>

      <dl
        role="list"
        className="grid grid-cols-2 gap-px bg-border lg:grid-cols-5"
      >
        {buckets.map((b) => (
          <BucketTile
            key={b.label}
            bucket={b}
            fmt={fmt}
            grandTotal={grandTotal}
            isActive={activeLabel === b.label}
            onSelect={onSelect ? () => onSelect(b) : undefined}
          />
        ))}
      </dl>
    </section>
  )
}

function BucketTile({
  bucket,
  fmt,
  grandTotal,
  isActive,
  onSelect,
}: {
  bucket: AgingBucket
  fmt: Intl.NumberFormat
  grandTotal: number
  isActive: boolean
  onSelect?: () => void
}) {
  const sharePct = grandTotal > 0 ? Math.round((bucket.total / grandTotal) * 100) : 0
  const isCritical = bucket.tone === "critical"

  const accentClass = cn(
    bucket.tone === "ok" && "text-primary",
    bucket.tone === "warning" && "text-accent-warning",
    bucket.tone === "danger" && "text-destructive",
    bucket.tone === "critical" && "text-destructive"
  )

  const railClass = cn(
    "absolute inset-y-0 left-0 w-[length:var(--indicator-w)]",
    bucket.tone === "ok" && "bg-primary/40",
    bucket.tone === "warning" && "bg-accent-warning/50",
    bucket.tone === "danger" && "bg-destructive/60",
    bucket.tone === "critical" && "bg-destructive"
  )

  const Inner = (
    <div
      className={cn(
        "relative flex h-full flex-col gap-1.5 bg-card px-4 py-3 transition-colors",
        onSelect && "cursor-pointer hover:bg-primary-soft",
        isActive && "bg-primary-subtle"
      )}
    >
      <span aria-hidden="true" className={railClass} />

      <div className="flex items-baseline justify-between gap-2 pl-2">
        <p className="font-mono text-ui-9 font-semibold uppercase tracking-wordmark text-muted-foreground">
          {bucket.label}
          {bucket.label !== "Current" && (
            <span className="ml-1 font-normal opacity-70">days</span>
          )}
        </p>
        {bucket.count > 0 && (
          <span
            className={cn(
              "font-mono text-ui-9 font-semibold uppercase tracking-widest tabular-nums",
              accentClass
            )}
            aria-label={`${sharePct} percent of total`}
          >
            {sharePct}%
          </span>
        )}
      </div>

      <p
        className={cn(
          "pl-2 font-heading text-lg font-semibold tracking-tight tabular-nums",
          bucket.count === 0 && "text-muted-foreground/50",
          bucket.count > 0 && bucket.tone === "ok" && "text-foreground",
          bucket.count > 0 && bucket.tone === "warning" && "text-accent-warning",
          bucket.count > 0 && bucket.tone === "danger" && "text-destructive",
          bucket.count > 0 && isCritical && "text-destructive font-bold"
        )}
      >
        {fmt.format(bucket.total)}
      </p>

      <div className="flex items-center justify-between gap-2 pl-2">
        <p className="font-mono text-ui-9 uppercase tracking-subtitle text-muted-foreground">
          {bucket.count} invoice{bucket.count === 1 ? "" : "s"}
        </p>
        {isActive && (
          <span className="font-mono text-ui-9 font-semibold uppercase tracking-widest text-primary">
            ● filter
          </span>
        )}
      </div>

      {grandTotal > 0 && (
        <div
          aria-hidden="true"
          className="mt-1 ml-2 h-px w-full bg-border/50"
        >
          <div
            className={cn(
              "h-px transition-[width]",
              bucket.tone === "ok" && "bg-primary/40",
              bucket.tone === "warning" && "bg-accent-warning",
              bucket.tone === "danger" && "bg-destructive/70",
              isCritical && "bg-destructive"
            )}
            style={{ width: `${sharePct}%` }}
          />
        </div>
      )}
    </div>
  )

  return onSelect ? (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      aria-label={`Filter to ${bucket.label} aging bucket — ${bucket.count} invoice${
        bucket.count === 1 ? "" : "s"
      }`}
      className="text-left focus-visible:outline-none focus-visible:tac-focus-premium"
    >
      {Inner}
    </button>
  ) : (
    <div>{Inner}</div>
  )
}
