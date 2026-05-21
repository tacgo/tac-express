import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const opsCardVariants = cva("bg-card border border-border", {
  variants: {
    pad: {
      default: "p-[length:var(--spacing-gutter-md)]",
      lg: "p-6",
      none: "p-0",
    },
    accent: {
      none: "",
      "violet-under": "border-b-2 border-b-paper-violet",
    },
    ticks: {
      false: "",
      true: "paper-card-ticks",
    },
  },
  defaultVariants: {
    pad: "default",
    accent: "none",
    ticks: false,
  },
})

interface OpsCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof opsCardVariants> {}

function OpsCard({ className, pad, accent, ticks, ...props }: OpsCardProps) {
  return (
    <div
      data-slot="ops-card"
      className={cn(opsCardVariants({ pad, accent, ticks, className }))}
      {...props}
    />
  )
}

export { OpsCard, opsCardVariants }
export type { OpsCardProps }
