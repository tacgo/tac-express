import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"

const heroBadgeVariants = cva(
  "inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        glass: "border-border bg-secondary text-foreground",
      },
    },
    defaultVariants: {
      variant: "glass",
    },
  }
)

interface HeroBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof heroBadgeVariants> {
  text: string
  showDot?: boolean
}

function HeroBadge({
  className,
  variant,
  text,
  showDot = true,
  ...props
}: HeroBadgeProps) {
  return (
    <div
      data-slot="hero-badge"
      className={cn(heroBadgeVariants({ variant }), className)}
      {...props}
    >
      {showDot && (
        <span className="mr-2 relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-none h-2 w-2 bg-primary"></span>
        </span>
      )}
      {text}
    </div>
  )
}

export { HeroBadge, heroBadgeVariants }
export type { HeroBadgeProps }
