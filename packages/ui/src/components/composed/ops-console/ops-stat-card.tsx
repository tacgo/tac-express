import * as React from "react"
import Link from "next/link"

import { cn } from "@workspace/ui/lib/utils"
import { OpsCard } from "./ops-card"
import { RiArrowRightUpLine, type RemixiconComponentType } from "@workspace/ui/icons"

interface OpsStatCardProps {
  icon: RemixiconComponentType
  label: string
  value: string | number
  href?: string
  className?: string
}

/**
 * OpsStatCard — the "violet-underline" KPI tile from the Paper Console.
 * 1px hairline + 2px violet bottom border. Click target is the trailing
 * arrow-up-right tile when `href` is provided.
 */
function OpsStatCard({
  icon: Icon,
  label,
  value,
  href,
  className,
}: OpsStatCardProps) {
  return (
    <OpsCard accent="violet-under" className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 paper-label">
        <Icon aria-hidden className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="paper-stat-value mt-2.5">{value}</div>
      <div className="flex justify-end mt-1.5">
        {href ? (
          <Link
            href={href}
            aria-label={`Open ${label}`}
            className="size-6 border border-paper-line bg-paper-card grid place-items-center text-paper-fg-2 hover:bg-paper-3 transition-colors duration-fast ease-linear focus-visible:outline-none focus-visible:tac-focus-premium"
          >
            <RiArrowRightUpLine aria-hidden className="size-3" />
          </Link>
        ) : (
          <span aria-hidden className="size-6 border border-paper-line bg-paper-card grid place-items-center text-paper-fg-3">
            <RiArrowRightUpLine className="size-3" />
          </span>
        )}
      </div>
    </OpsCard>
  )
}

export { OpsStatCard }
export type { OpsStatCardProps }
