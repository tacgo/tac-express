import * as React from "react"
import { RiFileTextLine, RiMoneyDollarCircleLine, RiTimeLine, RiAlertLine } from "@workspace/ui/icons"

interface FinanceSummaryCardsProps {
  totalInvoiced: number
  totalPaid: number
  totalOutstanding: number
  overdueCount: number
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  variant,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "warning" | "success"
}) {
  const iconColor =
    variant === "warning"
      ? "text-accent-warning"
      : variant === "success"
        ? "text-primary"
        : "text-muted-foreground"

  return (
    <div className="border border-border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <p className="font-serif text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="font-mono text-2xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function FinanceSummaryCards({ totalInvoiced, totalPaid, totalOutstanding, overdueCount }: FinanceSummaryCardsProps) {
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`

  return (
    <div className="grid grid-cols-4 gap-3">
      <SummaryCard
        label="Total Invoiced"
        value={fmt(totalInvoiced)}
        icon={RiFileTextLine}
      />
      <SummaryCard
        label="Total Collected"
        value={fmt(totalPaid)}
        icon={RiMoneyDollarCircleLine}
        variant="success"
      />
      <SummaryCard
        label="Outstanding"
        value={fmt(totalOutstanding)}
        sub="Awaiting payment"
        icon={RiTimeLine}
      />
      <SummaryCard
        label="Overdue"
        value={String(overdueCount)}
        sub="Invoices past due"
        icon={RiAlertLine}
        variant="warning"
      />
    </div>
  )
}
