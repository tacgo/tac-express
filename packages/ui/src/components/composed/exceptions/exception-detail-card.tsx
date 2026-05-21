import * as React from "react"
import type { Exception } from "@workspace/types"
import { ExceptionSeverityBadge, ExceptionStatusBadge } from "./exception-severity-badge"

interface ExceptionDetailCardProps {
  exception: Exception
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-b-0">
      <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <span className="font-sans text-sm text-foreground flex-1">{value}</span>
    </div>
  )
}

export function ExceptionDetailCard({ exception }: ExceptionDetailCardProps) {
  return (
    <div className="border border-border bg-card p-4 space-y-1">
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="space-y-0.5">
          <p className="font-mono text-xs text-muted-foreground">Exception Report</p>
          <p className="font-serif text-base font-bold text-foreground">{exception.type.replace(/_/g, " ")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExceptionSeverityBadge severity={exception.severity} />
          <ExceptionStatusBadge status={exception.status} />
        </div>
      </div>
      <Row label="AWB Number" value={exception.awbNumber ?? "—"} />
      <Row label="Description" value={exception.description} />
      {exception.resolution && <Row label="Resolution" value={exception.resolution} />}
      <Row
        label="Reported At"
        value={new Date(exception.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      />
      {exception.resolvedAt && (
        <Row
          label="Resolved At"
          value={new Date(exception.resolvedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
        />
      )}
    </div>
  )
}
