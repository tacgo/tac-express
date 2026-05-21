"use client"

import * as React from "react"
import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { RiCloseLine } from "@remixicon/react"

interface BulkActionBarProps {
  selectedCount: number
  onClear: () => void
  actions: ReactNode
  className?: string
}

function BulkActionBar({ selectedCount, onClear, actions, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null
  return (
    <div
      role="toolbar"
      data-slot="bulk-action-bar"
      className={cn(
        "fixed inset-x-0 bottom-6 z-40 mx-auto flex max-w-2xl items-center justify-between gap-3",
        "tac-fui-panel border border-primary/60 bg-card px-4 py-3 shadow-[var(--shadow-brutal)]",
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-base",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="inline-flex size-7 items-center justify-center border border-border tac-fui-hover"
        >
          <RiCloseLine className="size-4" aria-hidden="true" />
        </button>
        <p className="text-sm font-medium text-foreground">
          <span className="font-mono">{selectedCount}</span>{" "}
          <span className="text-muted-foreground">selected</span>
        </p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}

export { BulkActionBar }
