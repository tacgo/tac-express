import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import type { ExceptionSeverity, ExceptionStatus } from "@workspace/types"

const SEVERITY_STYLES: Record<ExceptionSeverity, string> = {
  LOW: "text-muted-foreground border-border",
  MEDIUM: "text-accent-warning border-accent-warning/40 bg-accent-warning/5",
  HIGH: "text-accent-warning border-accent-warning/60 bg-accent-warning/10",
  CRITICAL: "text-destructive border-destructive/40 bg-destructive/5",
}

const STATUS_STYLES: Record<ExceptionStatus, string> = {
  OPEN: "text-destructive border-destructive/40 bg-destructive/5",
  IN_PROGRESS: "text-accent-warning border-accent-warning/40 bg-accent-warning/5",
  RESOLVED: "text-primary border-primary/40 bg-primary/5",
  CLOSED: "text-muted-foreground border-border",
}

interface SeverityBadgeProps {
  severity: ExceptionSeverity
  className?: string
}

interface StatusBadgeProps {
  status: ExceptionStatus
  className?: string
}

export function ExceptionSeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span className={cn("font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5", SEVERITY_STYLES[severity], className)}>
      {severity}
    </span>
  )
}

export function ExceptionStatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn("font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5", STATUS_STYLES[status], className)}>
      {status.replace("_", " ")}
    </span>
  )
}
