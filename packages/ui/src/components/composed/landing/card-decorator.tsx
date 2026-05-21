import type { ReactNode } from "react"

/**
 * Shared icon decorator for the landing feature cards — ports the source
 * template's grid-mask decorator into Violet Grid: the `tac-fui-grid` utility
 * supplies the token-driven grid (no arbitrary gradient), a radial mask fades
 * its edges, and the icon sits in a sharp bordered square (no rounded-full).
 */
export function CardDecorator({ children }: { children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative mx-auto size-36 overflow-hidden"
    >
      <div className="tac-fui-grid absolute inset-0 opacity-60" />
      <div className="absolute inset-0 m-auto flex size-12 items-center justify-center border border-border bg-card text-primary">
        {children}
      </div>
    </div>
  )
}
