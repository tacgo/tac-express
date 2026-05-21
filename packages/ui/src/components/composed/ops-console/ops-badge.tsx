import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * OpsBadge — mono uppercase status pill with a leading 5×5px square dot.
 * Tone variants map to the Paper Console semantic palette (ok/warn/err/violet).
 */
const opsBadgeVariants = cva(
  [
    "inline-flex items-center gap-1.5 px-2 py-0.5",
    "border bg-card",
    "font-mono font-medium text-ui-10 tracking-badge uppercase",
    // square dot before the label, sized by --status-dot token (R0 audit H5)
    "before:content-[''] before:w-[length:var(--status-dot)] before:h-[length:var(--status-dot)] before:shrink-0",
  ],
  {
    variants: {
      tone: {
        neutral: "border-border text-foreground before:bg-muted-foreground",
        ok: "border-accent-success/30 bg-accent-success/15 text-accent-success before:bg-accent-success",
        warn: "border-accent-warning/30 bg-accent-warning/15 text-accent-warning before:bg-accent-warning",
        err: "border-destructive/30 bg-destructive/15 text-destructive before:bg-destructive",
        // Violet variant: bg-card (off-white) instead of bg-primary/10
        // (tinted lavender) so the `text-primary` foreground clears WCAG
        // AA 4.5:1 at the 10px badge text size. The dot + border keep the
        // brand-violet signal even though the surface is neutral.
        violet:
          "border-primary/40 bg-card text-primary before:bg-primary",
        info: "border-accent-info/30 bg-accent-info/15 text-accent-info before:bg-accent-info",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
)

interface OpsBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof opsBadgeVariants> {}

function OpsBadge({ className, tone, ...props }: OpsBadgeProps) {
  return (
    <span
      data-slot="ops-badge"
      className={cn(opsBadgeVariants({ tone, className }))}
      {...props}
    />
  )
}

export { OpsBadge, opsBadgeVariants }
export type { OpsBadgeProps }
