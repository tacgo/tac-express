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
    "border bg-paper-card",
    "font-paper-mono font-medium text-paper-10 tracking-badge uppercase",
    // square dot before the label, sized by --status-dot token (R0 audit H5)
    "before:content-[''] before:w-[length:var(--status-dot)] before:h-[length:var(--status-dot)] before:shrink-0",
  ],
  {
    variants: {
      tone: {
        neutral: "border-paper-line text-paper-fg-2 before:bg-paper-fg-3",
        ok: "border-paper-ok/30 bg-paper-ok-bg text-paper-ok before:bg-paper-ok",
        warn: "border-paper-warn/30 bg-paper-warn-bg text-paper-warn before:bg-paper-warn",
        err: "border-paper-err/30 bg-paper-err-bg text-paper-err before:bg-paper-err",
        // Violet variant: bg-paper-card (off-white) instead of bg-paper-violet-50
        // (tinted lavender) so the `text-paper-violet` foreground clears WCAG
        // AA 4.5:1 at the 10px badge text size. The dot + border keep the
        // brand-violet signal even though the surface is neutral.
        violet:
          "border-paper-violet/40 bg-paper-card text-paper-violet before:bg-paper-violet",
        info: "border-paper-info/30 bg-paper-info-bg text-paper-info before:bg-paper-info",
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
