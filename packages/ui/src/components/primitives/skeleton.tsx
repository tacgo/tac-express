import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "block" | "text" | "avatar"
}

function Skeleton({ className, variant = "block", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      data-variant={variant}
      role="presentation"
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden bg-muted",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-muted-foreground/10 before:to-transparent",
        "before:animate-[shimmer_1.6s_linear_infinite]",
        variant === "text" && "h-3 w-full",
        variant === "block" && "h-10 w-full",
        variant === "avatar" && "size-10",
        className,
      )}
      {...props}
    />
  )
}

interface SkeletonRowsProps {
  rows?: number
  className?: string
}

function SkeletonRows({ rows = 6, className }: SkeletonRowsProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)} data-slot="skeleton-rows">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="block" />
      ))}
    </div>
  )
}

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

function SkeletonTable({ rows = 8, columns = 6, className }: SkeletonTableProps) {
  return (
    <div className={cn("border border-border", className)} data-slot="skeleton-table">
      <div className="grid border-b border-border bg-muted/50" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, c) => (
          <div key={c} className="px-3 py-2">
            <Skeleton variant="text" className="h-3 w-24" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="grid border-b border-border last:border-0"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div key={c} className="px-3 py-3">
              <Skeleton variant="text" className="h-3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonRows, SkeletonTable }
