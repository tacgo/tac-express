import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"
import type { InvoiceStatus } from "@workspace/types"

const invoiceStatusVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 font-mono text-2xs font-semibold uppercase tracking-wider border",
  {
    variants: {
      status: {
        DRAFT:     "bg-muted text-muted-foreground border-border",
        ISSUED:    "bg-primary/10 text-primary border-primary/20",
        PAID:      "bg-primary/10 text-primary border-primary/20",
        OVERDUE:   "bg-destructive/20 text-destructive border-destructive/30",
        CANCELLED: "bg-muted text-muted-foreground border-border",
      },
    },
    defaultVariants: { status: "DRAFT" },
  }
)

interface InvoiceStatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof invoiceStatusVariants> {
  status: InvoiceStatus
}

function InvoiceStatusBadge({ status, className, ...props }: InvoiceStatusBadgeProps) {
  return (
    <span
      data-slot="invoice-status-badge"
      className={cn(invoiceStatusVariants({ status }), className)}
      {...props}
    >
      <span className="h-1.5 w-1.5 shrink-0 bg-current" aria-hidden />
      {status}
    </span>
  )
}

export { InvoiceStatusBadge, invoiceStatusVariants }
