import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * OpsKbd — keyboard shortcut chip. The only rounded surface in the Paper
 * Console aside from the avatar (radius 4px via Tailwind's default).
 */
function OpsKbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="ops-kbd"
      className={cn(
        "inline-block px-1.5 py-0.5 ml-0.5",
        "border border-border bg-card text-foreground",
        "font-mono font-medium",
        "text-ui-11",
        className,
      )}
      {...props}
    />
  )
}

export { OpsKbd }
