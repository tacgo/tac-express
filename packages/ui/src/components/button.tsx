import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Button — Violet Grid v6 primitive.
 *
 * v6 changes:
 * - Modern function component (React 19 forwards refs natively — `forwardRef` removed).
 * - Multi-axis hover signal via `.tac-hover-lift` (background shift + border activate +
 *   sub-pixel translate) for `default` / `destructive` / `outline` / `secondary`.
 * - Premium focus via `.tac-focus-premium` (1px outline + 8px primary bloom)
 *   replaces the generic Tailwind `ring-[3px] ring-ring/50`.
 * - Preserves the brutalist offset: still uses `shadow-sm` (= 3px brutalist offset),
 *   no soft drop shadows.
 * - Active state returns from the lift via `translate3d(0,0,0)` (managed by tac-hover-lift).
 *
 * See `docs/VIOLET-GRID-V6-EVOLUTION.md` § 2.1.
 */
const buttonVariants = cva(
  [
    "group/button inline-flex shrink-0 items-center justify-center",
    "border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap",
    "rounded-[var(--radius-control)] outline-none select-none",
    // v6: multi-axis transition handles bg + border + transform
    "transition-[background-color,border-color,transform,box-shadow] duration-fast ease-linear will-change-transform",
    // v6: premium focus signal
    "focus-visible:outline-1 focus-visible:outline-primary focus-visible:[outline-offset:1px] focus-visible:[box-shadow:0_0_8px_color-mix(in_oklch,var(--primary)_40%,transparent)]",
    // Disabled / aria-invalid carry over from v5 with the new bloom
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive aria-invalid:[box-shadow:0_0_8px_color-mix(in_oklch,var(--destructive)_40%,transparent)]",
    // Icon sizing rules
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // Premium hover: bg shifts to primary/85 + sub-pixel lift on the offset shadow
        default: [
          "bg-primary text-primary-foreground shadow-sm",
          // Single hover bg — `hover:bg-[color:var(--overlay-primary-strong)]`
          // and `hover:bg-primary/90` both targeted the same CSS property
          // with different values, so Tailwind's class-ordering picked one
          // non-deterministically. Kept the primary/90 variant — closes
          // Macroscope finding on button.json.
          "hover:bg-primary/90",
          "hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--border)]",
          "active:translate-x-0 active:translate-y-0 active:shadow-sm",
        ],
        destructive: [
          "bg-destructive text-destructive-foreground shadow-sm",
          "hover:bg-destructive/90",
          "hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--border)]",
          "active:translate-x-0 active:translate-y-0 active:shadow-sm",
        ],
        // Outline button — surface lifts on hover, border activates to primary
        outline: [
          "border-input bg-background text-foreground shadow-sm",
          "hover:bg-surface-hover hover:border-primary",
          "hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--border)]",
          "active:translate-x-0 active:translate-y-0 active:shadow-sm",
        ],
        secondary: [
          "bg-secondary text-secondary-foreground shadow-sm",
          "hover:bg-secondary/80",
          "hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_0_var(--border)]",
          "active:translate-x-0 active:translate-y-0 active:shadow-sm",
        ],
        // Ghost — no shadow, just hover-bg shift (lift would feel wrong without offset)
        ghost: "text-foreground hover:bg-primary-subtle hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Glow — primary CTA used in hero contexts
        glow: [
          "bg-primary text-primary-foreground shadow-sm",
          "hover:bg-primary/90 hover:shadow-[0_0_24px_color-mix(in_oklch,var(--primary)_45%,transparent)]",
          "hover:-translate-x-px hover:-translate-y-px",
          "active:translate-x-0 active:translate-y-0 active:shadow-sm",
        ],
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-control)] px-3 text-xs",
        lg: "h-12 rounded-[var(--radius-control)] px-8 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** React 19 supports `ref` as a normal prop on function components. */
  ref?: React.Ref<HTMLButtonElement>
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  )
}

export { Button, buttonVariants }
