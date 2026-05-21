"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"
import { ManifestStatus } from "@workspace/types"

interface ManifestActionBarProps {
  status: ManifestStatus
  onClose?: () => void
  onDepart?: () => void
  onArrive?: () => void
  onReconcile?: () => void
  isLoading?: boolean
}

const NEXT_ACTION: Partial<Record<ManifestStatus, { label: string; key: "close" | "depart" | "arrive" | "reconcile" }>> = {
  [ManifestStatus.OPEN]: { label: "Close Manifest", key: "close" },
  [ManifestStatus.CLOSED]: { label: "Mark Departed", key: "depart" },
  [ManifestStatus.DEPARTED]: { label: "Mark Arrived", key: "arrive" },
  [ManifestStatus.ARRIVED]: { label: "Reconcile", key: "reconcile" },
}

export function ManifestActionBar({ status, onClose, onDepart, onArrive, onReconcile, isLoading }: ManifestActionBarProps) {
  const action = NEXT_ACTION[status]

  if (!action) return null

  const handlerMap = {
    close: onClose,
    depart: onDepart,
    arrive: onArrive,
    reconcile: onReconcile,
  }

  const handler = handlerMap[action.key]

  return (
    <div className="flex items-center justify-between border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">Next Action</span>
        <span className="font-mono text-xs text-foreground">→ {action.label}</span>
      </div>
      <Button
        onClick={handler}
        disabled={isLoading || !handler}
        className="h-8 px-5 font-mono text-xs uppercase tracking-wider"
      >
        {isLoading ? "Processing..." : action.label}
      </Button>
    </div>
  )
}
