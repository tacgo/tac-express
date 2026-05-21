"use client"

import * as React from "react"
import type { RateCard } from "@workspace/types"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

interface RateCardTableProps {
  rateCards: RateCard[]
  isLoading?: boolean
  onDeactivate?: (id: string) => void
}

const SERVICE_COLORS: Record<string, string> = {
  STANDARD: "text-muted-foreground border-border",
  PRIORITY: "text-accent-warning border-accent-warning/30 bg-accent-warning/5",
  EXPRESS: "text-primary border-primary/30 bg-primary/5",
}

export function RateCardTable({ rateCards, isLoading, onDeactivate }: RateCardTableProps) {
  if (isLoading) {
    return (
      <div className="border border-border bg-card p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-9 bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (rateCards.length === 0) {
    return (
      <div className="border border-dashed border-border h-24 flex items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">No rate cards configured</p>
      </div>
    )
  }

  return (
    <div className="border border-border overflow-hidden">
      <div className="bg-muted/50 grid grid-cols-[auto_auto_auto_auto_auto_auto_auto_auto] px-3 py-2 gap-3">
        {["Route", "Service", "Slab (kg)", "Rate/kg", "Docket", "Fuel %", "Handling", ""].map((h) => (
          <span key={h} className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{h}</span>
        ))}
      </div>
      <div className="divide-y divide-border">
        {rateCards.map((rc) => (
          <div
            key={rc.id}
            className={cn(
              "grid grid-cols-[auto_auto_auto_auto_auto_auto_auto_auto] px-3 py-2.5 gap-3 items-center",
              !rc.isActive && "opacity-40"
            )}
          >
            <span className="font-mono text-xs text-foreground whitespace-nowrap">
              {rc.originHub.replace(/_/g, " ")} → {rc.destHub.replace(/_/g, " ")}
            </span>
            <span className={cn("font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5 w-fit", SERVICE_COLORS[rc.serviceLevel] ?? "text-muted-foreground border-border")}>
              {rc.serviceLevel}
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {rc.weightSlabMin}–{rc.weightSlabMax >= 99999 ? "∞" : rc.weightSlabMax}
            </span>
            <span className="font-mono text-xs text-foreground">₹{rc.ratePerKg}</span>
            <span className="font-mono text-xs text-foreground">₹{rc.docketCharge}</span>
            <span className="font-mono text-xs text-foreground">{rc.fuelSurchargePct}%</span>
            <span className="font-mono text-xs text-foreground">₹{rc.handlingFee}</span>
            <div className="flex justify-end">
              {rc.isActive && onDeactivate && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onDeactivate(rc.id)}
                  className="h-auto px-2 py-0.5 font-mono text-2xs uppercase tracking-wider text-muted-foreground hover:border-destructive/30 hover:text-destructive"
                >
                  Deactivate
                </Button>
              )}
              {!rc.isActive && (
                <span className="font-mono text-2xs text-muted-foreground/50">Inactive</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
