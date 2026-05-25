"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatedGroup, AnimatedGroupItem } from "@workspace/ui/components/primitives/animated-text"

interface PageHeaderProps {
  overline?: string
  title: string
  description?: string
  actions?: React.ReactNode
  /** Apply gradient to title text */
  gradient?: boolean
  className?: string
}

function PageHeader({
  overline,
  title,
  description,
  actions,
  gradient = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn("flex flex-wrap items-start justify-between gap-4 mb-6", className)}
    >
      <AnimatedGroup stagger={0.06} className="min-w-0 flex-1 flex flex-col gap-1">
        {overline && (
          <AnimatedGroupItem distance={6} duration={0.35}>
            <p className="t-overline text-muted-foreground">{overline}</p>
          </AnimatedGroupItem>
        )}
        <AnimatedGroupItem distance={10} duration={0.45}>
          <h1 className={cn("t-h1 text-foreground", gradient && "t-gradient-primary")}>
            {title}
          </h1>
        </AnimatedGroupItem>
        {description && (
          <AnimatedGroupItem distance={6} duration={0.4}>
            <p className="t-caption max-w-prose">{description}</p>
          </AnimatedGroupItem>
        )}
      </AnimatedGroup>

      {actions && (
        <div
          data-slot="page-header-actions"
          className="flex items-center gap-2 shrink-0"
        >
          {actions}
        </div>
      )}
    </header>
  )
}

export { PageHeader }
