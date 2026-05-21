import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"
import type { ManifestStatus } from "@workspace/types"

const manifestStatusVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wider border",
  {
    variants: {
      status: {
        DRAFT:       "bg-muted text-muted-foreground border-border",
        BUILDING:    "bg-primary/10 text-primary border-primary/20",
        OPEN:        "bg-primary/10 text-primary border-primary/20",
        CLOSED:      "bg-muted text-foreground border-border",
        DEPARTED:    "bg-primary/20 text-primary border-primary/30",
        ARRIVED:     "bg-primary/10 text-primary border-primary/20",
        RECONCILED:  "bg-primary/10 text-primary border-primary/20",
      },
    },
    defaultVariants: { status: "DRAFT" },
  }
)

interface ManifestStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof manifestStatusVariants> {
  status: ManifestStatus
}

function ManifestStatusBadge({ status, className, ...props }: ManifestStatusBadgeProps) {
  return (
    <span
      data-slot="manifest-status-badge"
      className={cn(manifestStatusVariants({ status }), className)}
      {...props}
    >
      <span className="h-1.5 w-1.5 shrink-0 bg-current" aria-hidden />
      {status.replace(/_/g, " ")}
    </span>
  )
}

export { ManifestStatusBadge, manifestStatusVariants }
