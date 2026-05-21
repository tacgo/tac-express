import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"
import type { ShipmentStatus } from "@workspace/types"

const shipmentStatusVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wider border",
  {
    variants: {
      // Backgrounds flattened to `bg-card` (off-white) so the colored text
      // foreground clears WCAG AA 4.5:1 at the 10px badge size. Visual
      // gradation between in-progress vs delivered states now lives in the
      // BORDER opacity (decorative, no contrast requirement) + the filled
      // dot (size 1.5 × 1.5 = doesn't trip large-text rules).
      status: {
        CREATED:           "bg-card text-muted-foreground border-border",
        PICKUP_SCHEDULED:  "bg-card text-foreground border-border",
        PICKED_UP:         "bg-card text-primary border-primary/30",
        RECEIVED_AT_ORIGIN:"bg-card text-primary border-primary/30",
        IN_TRANSIT:        "bg-card text-primary border-primary/60",
        RECEIVED_AT_DEST:  "bg-card text-primary border-primary/30",
        OUT_FOR_DELIVERY:  "bg-card text-primary border-primary/50",
        DELIVERED:         "bg-card text-primary border-primary/30",
        CANCELLED:         "bg-card text-destructive border-destructive/30",
        RTO:               "bg-card text-destructive border-destructive/30",
        EXCEPTION:         "bg-card text-destructive border-destructive/60",
      },
    },
    defaultVariants: { status: "CREATED" },
  }
)

const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED: "Created",
  PICKUP_SCHEDULED: "Pickup Scheduled",
  PICKED_UP: "Picked Up",
  RECEIVED_AT_ORIGIN: "At Origin Hub",
  IN_TRANSIT: "In Transit",
  RECEIVED_AT_DEST: "At Dest. Hub",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RTO: "RTO",
  EXCEPTION: "Exception",
}

interface ShipmentStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof shipmentStatusVariants> {
  status: ShipmentStatus
}

function ShipmentStatusBadge({ status, className, ...props }: ShipmentStatusBadgeProps) {
  return (
    <span
      data-slot="shipment-status-badge"
      className={cn(shipmentStatusVariants({ status }), className)}
      {...props}
    >
      <span className="h-1.5 w-1.5 shrink-0 bg-current" aria-hidden />
      {SHIPMENT_STATUS_LABELS[status]}
    </span>
  )
}

export { ShipmentStatusBadge, shipmentStatusVariants, SHIPMENT_STATUS_LABELS }
