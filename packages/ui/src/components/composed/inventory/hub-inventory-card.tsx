import * as React from "react"
import type { HubInventoryItem } from "@workspace/types"

interface HubInventoryCardProps {
  item: HubInventoryItem
}

function StatRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-b-0">
      <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`font-mono text-sm font-semibold ${highlight ? "text-accent-warning" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  )
}

export function HubInventoryCard({ item }: HubInventoryCardProps) {
  return (
    <div className="border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold text-foreground uppercase tracking-wide">
          {item.hub.replace(/_/g, " ")}
        </h3>
        <div className="border border-border bg-muted/40 px-2 py-0.5">
          <span className="font-mono text-xs font-bold text-foreground">{item.total}</span>
          <span className="font-mono text-2xs text-muted-foreground ml-1">pcs</span>
        </div>
      </div>
      <div className="space-y-0">
        <StatRow label="Created / Pending" value={item.created} />
        <StatRow label="In Transit" value={item.inTransit} />
        <StatRow label="Arrived at Hub" value={item.receivedAtDest} />
        <StatRow label="Out for Delivery" value={item.outForDelivery} />
        <StatRow label="Exceptions" value={item.exception} highlight={item.exception > 0} />
      </div>
    </div>
  )
}
