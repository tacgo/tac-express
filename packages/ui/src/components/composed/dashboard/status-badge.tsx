import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wider border",
  {
    variants: {
      variant: {
        // Neutral / pending states
        CREATED:           "bg-muted text-muted-foreground border-border",
        DRAFT:             "bg-muted text-muted-foreground border-border",
        CLOSED:            "bg-muted text-foreground border-border",
        PICKUP_SCHEDULED:  "bg-muted text-foreground border-border",
        // Active / in-progress states — primary teal
        PICKED_UP:         "bg-primary/10 text-primary border-primary/20",
        RECEIVED_AT_ORIGIN:"bg-primary/10 text-primary border-primary/20",
        RECEIVED_AT_DEST:  "bg-primary/10 text-primary border-primary/20",
        ARRIVED:           "bg-primary/10 text-primary border-primary/20",
        BUILDING:          "bg-primary/10 text-primary border-primary/20",
        OPEN:              "bg-primary/10 text-primary border-primary/20",
        ISSUED:            "bg-primary/10 text-primary border-primary/20",
        // Moving states — warning amber
        IN_TRANSIT:        "bg-accent-warning/10 text-accent-warning border-accent-warning/25",
        OUT_FOR_DELIVERY:  "bg-accent-warning/10 text-accent-warning border-accent-warning/25",
        DEPARTED:          "bg-accent-warning/10 text-accent-warning border-accent-warning/25",
        // Success states — jade green
        DELIVERED:         "bg-accent-success/10 text-accent-success border-accent-success/25",
        RECONCILED:        "bg-accent-success/10 text-accent-success border-accent-success/25",
        PAID:              "bg-accent-success/10 text-accent-success border-accent-success/25",
        // Danger states — alert red
        CANCELLED:         "bg-accent-danger/10 text-accent-danger border-accent-danger/25",
        RTO:               "bg-accent-danger/10 text-accent-danger border-accent-danger/25",
        EXCEPTION:         "bg-accent-danger/10 text-accent-danger border-accent-danger/25",
        OVERDUE:           "bg-accent-danger/15 text-accent-danger border-accent-danger/35",
      },
    },
  }
)

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  label?: string
}

function StatusBadge({ variant, label, className, ...props }: StatusBadgeProps) {
  const displayLabel = label ?? variant?.replace(/_/g, " ") ?? ""

  return (
    <span
      data-slot="status-badge"
      className={cn(statusBadgeVariants({ variant }), className)}
      {...props}
    >
      <span className="h-1.5 w-1.5 shrink-0 bg-current" aria-hidden />
      {displayLabel}
    </span>
  )
}

export { StatusBadge, statusBadgeVariants }
