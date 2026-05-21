"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { RiCheckLine, RiCloseLine, RiAlertLine } from "@workspace/ui/icons"

type ScanResult = "success" | "error" | "duplicate" | "idle"

interface ScanFeedbackProps {
  result: ScanResult
  awb?: string
  message?: string
  className?: string
}

const RESULT_CONFIG: Record<
  Exclude<ScanResult, "idle">,
  { icon: React.ElementType; label: string; classes: string }
> = {
  success:   { icon: RiCheckLine,  label: "Scanned",    classes: "bg-primary/10 border-primary/30 text-primary" },
  duplicate: { icon: RiAlertLine,  label: "Duplicate",  classes: "bg-muted border-border text-muted-foreground" },
  error:     { icon: RiCloseLine,  label: "Error",      classes: "bg-destructive/10 border-destructive/30 text-destructive" },
}

function ScanFeedback({ result, awb, message, className }: ScanFeedbackProps) {
  if (result === "idle") {
    return (
      <div
        data-slot="scan-feedback"
        className={cn(
          "border-2 border-dashed border-border h-24 flex items-center justify-center",
          className
        )}
      >
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Ready to scan
        </p>
      </div>
    )
  }

  const config = RESULT_CONFIG[result]
  const Icon = config.icon

  return (
    <div
      data-slot="scan-feedback"
      className={cn(
        "border h-24 flex items-center gap-4 px-4",
        config.classes,
        className
      )}
    >
      <Icon className="h-8 w-8 shrink-0" />
      <div className="space-y-0.5">
        <p className="font-mono text-xs uppercase tracking-wider opacity-70">{config.label}</p>
        {awb && (
          <p className="font-mono text-base font-bold tracking-widest">{awb}</p>
        )}
        {message && (
          <p className="font-sans text-xs opacity-80">{message}</p>
        )}
      </div>
    </div>
  )
}

export { ScanFeedback }
export type { ScanResult }
