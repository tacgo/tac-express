"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@workspace/ui/lib/utils"

const opsButtonVariants = cva(
  // Base — mono uppercase, sharp corners, hairline border, paper hover.
  [
    "inline-flex items-center justify-center gap-1.5",
    "font-mono font-medium uppercase tracking-label",
    "border cursor-pointer",
    "transition-colors duration-fast ease-linear",
    "focus-visible:outline-none focus-visible:tac-focus-premium",
    "disabled:opacity-50 disabled:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        // a11y: `text-{color}` and `text-paper-NN` (font-size) both match
        // tailwind-merge's `text-*` group, so the size class from `size: ...`
        // strips the color set here. Using `[color:...]` keeps the color
        // outside tw-merge's `text-` group → it survives. Closes the
        // remaining R0 audit color-contrast nodes on OpsButton variants.
        default: "border-border bg-card [color:var(--paper-fg-1)] hover:bg-muted",
        primary:
          "border-primary bg-primary [color:white] hover:bg-primary shadow-[var(--shadow-paper-sticky)]",
        ghost: "border-transparent bg-transparent [color:var(--paper-fg-1)] hover:bg-muted",
        tab: "border-border bg-transparent [color:var(--paper-fg-1)] hover:bg-muted data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:[color:white]",
        danger:
          "border-destructive/40 bg-destructive/15 [color:var(--paper-err)] hover:bg-destructive/15",
        dark: "border-foreground bg-foreground [color:white] hover:opacity-90",
      },
      size: {
        default: "px-3.5 py-2 text-ui-11",
        sm: "px-2.5 py-1.5 text-ui-10",
        lg: "px-4 py-3 text-ui-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

interface OpsButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof opsButtonVariants> {
  asChild?: boolean
}

function OpsButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: OpsButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="ops-button"
      className={cn(opsButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { OpsButton, opsButtonVariants }
export type { OpsButtonProps }
