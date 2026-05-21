import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Card — Violet Grid v6 primitive.
 *
 * v6 changes:
 * - Surface tier variants: `default` (elevated), `outline` (legacy),
 *   `surface` (explicit elevated), `floating` (popover-tier),
 *   `interactive` (interactive-tier + tac-hover-lift).
 * - Container query at root (`@container/card`) so children can write
 *   `@sm:grid-cols-2`, `@lg:grid-cols-4` etc — adapts to the card's
 *   own width, not the viewport.
 * - Optional `inner-border` modifier via the `microContrast` prop:
 *   adds a 1px overlay-fg-soft inset ring for depth without shadow.
 *
 * See `docs/VIOLET-GRID-V6-EVOLUTION.md` § 2.2.
 */
const cardVariants = cva(
  // v6: @container/card lets descendants use @sm/@lg etc. against the card width
  "group/card @container/card flex flex-col gap-4 overflow-hidden py-4 text-xs/relaxed text-card-foreground ring-1 ring-foreground/10 has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-2 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-[var(--radius-lg)] *:[img:last-child]:rounded-[var(--radius-lg)]",
  {
    variants: {
      variant: {
        default: "bg-card rounded-[var(--radius-lg)]",
        outline: "bg-card border border-border rounded-[var(--radius-xl)]",
        // v6: explicit surface tiers
        surface: "bg-surface-elevated border border-border rounded-[var(--radius-lg)]",
        floating: "bg-surface-floating border border-border ring-1 ring-fg-soft shadow-[var(--shadow-brutal-sm)] rounded-[var(--radius-lg)]",
        interactive: "bg-surface-interactive border border-border tac-hover-lift cursor-pointer rounded-[var(--radius-lg)]",
      },
      microContrast: {
        true: "ring-1 ring-fg-soft",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      microContrast: false,
    },
  }
)

interface CardProps extends React.ComponentProps<"div">, VariantProps<typeof cardVariants> {
  size?: "default" | "sm"
}

function Card({
  className,
  size = "default",
  variant,
  microContrast,
  role,
  tabIndex,
  onKeyDown,
  onClick,
  ...props
}: CardProps) {
  // v6: when the `interactive` variant is used and the consumer wires an onClick,
  // promote the div to a focusable, keyboard-activatable button-equivalent so
  // keyboard and AT users get parity with mouse users. Consumers can still
  // override role/tabIndex explicitly.
  const isInteractive = variant === "interactive"
  const resolvedRole = role ?? (isInteractive && onClick ? "button" : undefined)
  const resolvedTabIndex =
    tabIndex ?? (isInteractive && onClick ? 0 : undefined)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isInteractive && onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>)
    }
    onKeyDown?.(event)
  }

  return (
    <div
      data-slot="card"
      data-size={size}
      role={resolvedRole}
      tabIndex={resolvedTabIndex}
      onClick={onClick}
      onKeyDown={isInteractive && onClick ? handleKeyDown : onKeyDown}
      className={cn(cardVariants({ variant, microContrast, className }))}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-heading text-sm font-medium group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
