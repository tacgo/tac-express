import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

/**
 * SurfaceCard — the canonical composition primitive for the ops-console.
 *
 * Every operational block lives in a SurfaceCard: a contained surface with a
 * consistent header cadence (mono eyebrow → serif title → muted subtitle →
 * actions), body, and optional footer. This is the primitive that turns
 * "floating cards on a giant canvas" into grouped, layered, operational
 * composition (see docs/playbooks/PRESET-CONVERGENCE-PLAYBOOK.md).
 *
 * Emphasis tiers create the asymmetric weight the operational shell needs —
 * a page leads with one `command` surface (the orchestration layer), supported
 * by `default` intelligence panels and `tactical` side-rails. Identity stays
 * Violet Grid: 0 radius, brutalist offset shadows, violet signal accent.
 */
const surfaceCardVariants = cva(
  [
    "flex w-full flex-col border border-border text-card-foreground",
    "transition-[box-shadow,border-color] duration-[var(--duration-fast)] ease-[var(--ease-smooth)]",
  ],
  {
    variants: {
      emphasis: {
        /** Secondary intelligence panel — the default grouped surface. */
        default: "bg-card shadow-[var(--shadow-brutal-sm)]",
        /** Dominant command surface — leads the page (orchestration layer). */
        command:
          "bg-surface-elevated border-t-2 border-t-primary shadow-[var(--shadow-brutal)]",
        /** Tactical side-rail — muted, recedes behind primary surfaces. */
        tactical: "bg-muted/30",
      },
      density: {
        default: "gap-3 p-[var(--spacing-card-pad)]",
        compact: "gap-2 p-[var(--spacing-gutter-md)]",
      },
    },
    defaultVariants: { emphasis: "default", density: "default" },
  }
)

interface SurfaceCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title">,
    VariantProps<typeof surfaceCardVariants> {
  /** Mono uppercase eyebrow above the title (operational label). */
  eyebrow?: React.ReactNode
  /** Serif card title (Noto Serif cadence). */
  title?: React.ReactNode
  /** Muted subtitle beneath the title. */
  subtitle?: React.ReactNode
  /** Right-aligned header slot — actions, live indicator. */
  actions?: React.ReactNode
  /** Optional footer slot — aggregates, secondary actions. */
  footer?: React.ReactNode
}

function SurfaceCard({
  className,
  emphasis,
  density,
  eyebrow,
  title,
  subtitle,
  actions,
  footer,
  children,
  ...props
}: SurfaceCardProps) {
  const reactId = React.useId()
  const titleId = title ? `${reactId}-title` : undefined
  const hasHeader = Boolean(eyebrow || title || subtitle || actions)

  return (
    <section
      data-slot="surface-card"
      data-emphasis={emphasis ?? "default"}
      aria-labelledby={titleId}
      className={cn(surfaceCardVariants({ emphasis, density }), className)}
      {...props}
    >
      {hasHeader ? (
        <header
          data-slot="surface-card-header"
          className="flex flex-wrap items-start justify-between gap-3"
        >
          <div className="min-w-0 flex flex-col gap-0.5">
            {eyebrow ? <span className="tac-mono-label">{eyebrow}</span> : null}
            {title ? (
              <h2 id={titleId} className="t-h4 text-foreground">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="t-caption text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {actions ? (
            <div
              data-slot="surface-card-actions"
              className="flex items-center gap-2 shrink-0"
            >
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      <div data-slot="surface-card-body" className="min-w-0 flex-1">
        {children}
      </div>

      {footer ? (
        <footer
          data-slot="surface-card-footer"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"
        >
          {footer}
        </footer>
      ) : null}
    </section>
  )
}

export { SurfaceCard, surfaceCardVariants }
export type { SurfaceCardProps }
