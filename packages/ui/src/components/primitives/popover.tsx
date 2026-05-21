"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  // Radix's `@radix-ui/react-id` shim wraps React.useId in useState + a
  // useLayoutEffect fallback. Under React 19 + Next 16 SSR the counter diverges
  // between server and client, producing a harmless `aria-controls` hydration
  // mismatch (React keeps the client value; popover a11y is intact). Suppressing
  // here is the centralized escape hatch — applies to every trigger consistently.
  return (
    <PopoverPrimitive.Trigger
      data-slot="popover-trigger"
      suppressHydrationWarning
      {...props}
    />
  )
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          // v6: bg-surface-floating + ring-fg-soft inner micro-contrast
          "z-50 w-72 origin-(--radix-popover-content-transform-origin) border border-border bg-surface-floating ring-1 ring-fg-soft p-4 text-popover-foreground shadow-[var(--shadow-brutal-sm)] outline-hidden data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger }
