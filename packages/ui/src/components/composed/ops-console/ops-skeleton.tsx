import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { OpsCard } from "./ops-card"

/** A single skeleton pulse block. Uses the project-wide `animate-skeleton-pulse` keyframe. */
function OpsSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="ops-skeleton"
      className={cn(
        "animate-skeleton-pulse motion-reduce:animate-none bg-sidebar h-4 w-full",
        className,
      )}
      {...props}
    />
  )
}

/** Skeleton table row — 6 cells of varying widths. */
function OpsSkeletonRow({ cols = 6 }: { cols?: number }) {
  // Deterministic varied widths so the table doesn't shimmer uniformly.
  const widths = ["w-2/5", "w-1/3", "w-1/4", "w-1/5", "w-2/5", "w-1/6", "w-1/3", "w-1/4"]
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-b border-border">
          <OpsSkeleton className={cn("h-3", widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  )
}

/** Skeleton card matching the OpsStatCard footprint (icon + value + arrow). */
function OpsSkeletonStatCard() {
  return (
    <OpsCard accent="violet-under" className="flex flex-col">
      <div className="flex items-center gap-2">
        <OpsSkeleton className="size-3.5" />
        <OpsSkeleton className="h-3 w-24" />
      </div>
      <OpsSkeleton className="h-8 w-16 mt-2.5" />
      <div className="flex justify-end mt-1.5">
        <OpsSkeleton className="size-6" />
      </div>
    </OpsCard>
  )
}

export { OpsSkeleton, OpsSkeletonRow, OpsSkeletonStatCard }
