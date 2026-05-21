"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Tailwind v4 attribute-variant syntax: data-[state=checked]. The
        // earlier v3-style `data-state-checked:` never matched, so the
        // toggle thumb never slid and the colored bg never applied — the
        // Switch APPEARED non-functional even though radix-ui state worked.
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center border border-border bg-muted outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 bg-background shadow-[var(--shadow-brutal-sm)] transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
