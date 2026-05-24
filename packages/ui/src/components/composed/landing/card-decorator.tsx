import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

/**
 * Shared icon decorator for the landing feature cards — ports the source
 * template's grid decorator into Violet Grid: the `tac-fui-grid` utility
 * supplies the token-driven grid (no arbitrary gradient), `overflow-hidden`
 * clips to the rectilinear boundary (LAW 13 — no curved masks), and the icon
 * sits in a sharp bordered square (no pill or circular mask).
 */
export function CardDecorator({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="card-decorator"
      aria-hidden
      className={cn("relative mx-auto size-36 overflow-hidden", className)}
    >
      <div className="tac-fui-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-0 m-auto flex size-12 items-center justify-center border border-border bg-card text-primary">
        {children}
      </div>
    </div>
  )
}
