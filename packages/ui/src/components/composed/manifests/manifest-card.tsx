import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import type { ManifestSummary } from "@workspace/types"
import { ManifestStatusBadge } from "./manifest-status-badge"

interface ManifestCardProps {
  manifest: ManifestSummary
  onClick?: () => void
  className?: string
}

function ManifestCard({ manifest, onClick, className }: ManifestCardProps) {
  return (
    <div
      data-slot="manifest-card"
      onClick={onClick}
      className={cn(
        "bg-card tac-fui-panel p-4 space-y-3",
        onClick && "cursor-pointer hover:border-primary transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="font-mono text-sm font-semibold text-foreground tracking-wider">
            {manifest.manifestNumber}
          </p>
          <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground mt-1">
            {manifest.originHub} → {manifest.destHub}
          </p>
        </div>
        <ManifestStatusBadge status={manifest.status} />
      </div>
      <div className="flex items-center gap-4 pt-1 border-t border-border">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-3xs uppercase tracking-wider text-muted-foreground">Shipments</span>
          <span className="font-mono text-sm font-semibold text-foreground">{manifest.totalShipments}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-3xs uppercase tracking-wider text-muted-foreground">Weight</span>
          <span className="font-mono text-sm font-semibold text-foreground">{manifest.totalWeight.toFixed(1)} kg</span>
        </div>
        <div className="flex flex-col gap-0.5 ml-auto text-right">
          <span className="font-mono text-3xs uppercase tracking-wider text-muted-foreground">Created</span>
          <span className="font-mono text-xs text-muted-foreground">
            {new Date(manifest.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </span>
        </div>
      </div>
    </div>
  )
}

export { ManifestCard }
