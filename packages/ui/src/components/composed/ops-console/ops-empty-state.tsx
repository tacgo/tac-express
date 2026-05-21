import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { type RemixiconComponentType } from "@workspace/ui/icons"

interface OpsEmptyStateProps {
  /** Eyebrow label (e.g. "NO RECORDS"). All caps mono. */
  eyebrow: string
  /** Headline (e.g. "No shipments yet."). 2-5 words ideal. */
  headline: string
  /** Helpful sentence explaining state + remedy. */
  description: string
  icon?: RemixiconComponentType
  /** Optional CTA — pass a React node so it can be Link or button. */
  cta?: React.ReactNode
  className?: string
}

/**
 * Paper-aesthetic empty state matching the 4-element pattern from
 * `docs/VIOLET-GRID-QUALITY.md` (icon + eyebrow + headline + CTA).
 * Inset with a dashed paper-line border so it reads as a slot, not a card.
 */
function OpsEmptyState({
  eyebrow,
  headline,
  description,
  icon: Icon,
  cta,
  className,
}: OpsEmptyStateProps) {
  return (
    <div
      data-slot="ops-empty-state"
      className={cn(
        "border border-dashed border-paper-line bg-paper-2/40",
        "py-12 px-6",
        "flex flex-col items-center text-center gap-2",
        className,
      )}
    >
      {Icon && (
        <Icon aria-hidden className="size-10 text-paper-fg-3" />
      )}
      <span className="paper-eyebrow">{eyebrow}</span>
      <h3 className="paper-h3">{headline}</h3>
      <p className="font-paper-display text-ui-13 text-paper-fg-3 max-w-prose">
        {description}
      </p>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  )
}

export { OpsEmptyState }
export type { OpsEmptyStateProps }
