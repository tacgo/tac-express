import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

interface SLABadgeProps {
  promisedAt: string | Date | null | undefined
  status?: string
  className?: string
}

function diffHours(target: Date) {
  return (target.getTime() - Date.now()) / 3_600_000
}

function SLABadge({ promisedAt, status, className }: SLABadgeProps) {
  if (!promisedAt) return null
  if (status === "delivered" || status === "cancelled" || status === "returned") return null
  const target = typeof promisedAt === "string" ? new Date(promisedAt) : promisedAt
  if (Number.isNaN(target.getTime())) return null

  const hours = diffHours(target)
  let tone: "ok" | "warn" | "danger" = "ok"
  let label: string
  if (hours < 0) {
    tone = "danger"
    label = `Overdue ${Math.abs(hours).toFixed(1)}h`
  } else if (hours < 6) {
    tone = "warn"
    label = `${hours.toFixed(1)}h to SLA`
  } else {
    tone = "ok"
    label = `${hours.toFixed(0)}h to SLA`
  }

  return (
    <span
      data-slot="sla-badge"
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider",
        tone === "ok" && "border-accent-success text-accent-success",
        tone === "warn" && "border-accent-warning text-accent-warning",
        tone === "danger" && "border-accent-danger text-accent-danger",
        className,
      )}
    >
      <span aria-hidden className={cn("inline-block size-1.5", tone === "ok" && "bg-accent-success", tone === "warn" && "bg-accent-warning", tone === "danger" && "bg-accent-danger animate-pulse")} />
      {label}
    </span>
  )
}

export { SLABadge }
