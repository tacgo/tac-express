import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

interface ShipmentRow {
  id: string
  awb_number: string
  status: string
  dest_hub: string
  total_amount: number
  created_at: string
}

interface CustomerShipmentHistoryProps {
  shipments: ShipmentRow[]
  isLoading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: "text-muted-foreground border-border",
  DELIVERED: "text-primary border-primary/30 bg-primary/5",
  IN_TRANSIT: "text-accent-warning border-accent-warning/30 bg-accent-warning/5",
  EXCEPTION: "text-destructive border-destructive/30 bg-destructive/5",
  CANCELLED: "text-muted-foreground border-border",
}

export function CustomerShipmentHistory({ shipments, isLoading }: CustomerShipmentHistoryProps) {
  if (isLoading) {
    return (
      <div className="border border-border bg-card p-4 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (shipments.length === 0) {
    return (
      <div className="border border-dashed border-border h-24 flex items-center justify-center">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">No shipments found</p>
      </div>
    )
  }

  return (
    <div className="border border-border overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 divide-y divide-border">
        <div className="contents">
          {["AWB", "Status", "Destination", "Amount"].map((h) => (
            <div key={h} className="bg-muted/50 px-3 py-2">
              <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{h}</span>
            </div>
          ))}
        </div>
        {shipments.map((s) => {
          const color = STATUS_COLORS[s.status] ?? STATUS_COLORS.CREATED
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
              <div className="px-3 py-2.5 flex items-center">
                <span className="font-mono text-xs text-muted-foreground">{s.dest_hub.replace(/_/g, " ")}</span>
              </div>
              <div className="px-3 py-2.5 flex items-center justify-end">
                <span className="font-mono text-xs text-foreground">
                  ₹{s.total_amount.toLocaleString("en-IN")}
                </span>
              </div>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
