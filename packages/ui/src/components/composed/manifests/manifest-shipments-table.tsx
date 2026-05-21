import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

interface ManifestShipmentRow {
  id: string
  awb_number: string
  status: string
  pieces: number
  chargeable_weight: number
}

interface ManifestShipmentsTableProps {
  shipments: ManifestShipmentRow[]
  isLoading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  IN_TRANSIT: "text-accent-warning border-accent-warning/30 bg-accent-warning/5",
  DELIVERED: "text-primary border-primary/30 bg-primary/5",
  EXCEPTION: "text-destructive border-destructive/30 bg-destructive/5",
  RECEIVED_AT_DEST: "text-primary border-primary/30 bg-primary/5",
}

export function ManifestShipmentsTable({ shipments, isLoading }: ManifestShipmentsTableProps) {
  if (isLoading) {
    return (
      <div className="border border-border bg-card p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (shipments.length === 0) {
    return (
      <div className="border border-dashed border-border h-24 flex items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">No shipments added</p>
      </div>
    )
  }

  return (
    <div className="border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] divide-y divide-border">
        {["AWB", "Status", "Pieces", "Weight (kg)"].map((h) => (
          <div key={h} className="bg-muted/50 px-3 py-2">
            <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{h}</span>
          </div>
        ))}
        {shipments.map((s) => {
          const color = STATUS_COLORS[s.status] ?? "text-muted-foreground border-border"
          return (
            <React.Fragment key={s.id}>
              <div className="px-3 py-2.5 flex items-center">
                <span className="font-mono text-xs text-foreground">{s.awb_number}</span>
              </div>
              <div className="px-3 py-2.5 flex items-center">
                <span className={cn("font-mono text-2xs uppercase tracking-wider border px-1.5 py-0.5", color)}>
                  {s.status.replace(/_/g, " ")}
                </span>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-end">
                <span className="font-mono text-xs text-foreground">{s.pieces}</span>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-end">
                <span className="font-mono text-xs text-foreground">{Number(s.chargeable_weight).toFixed(2)}</span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
