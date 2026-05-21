import * as React from "react"
import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { RiArrowRightSLine } from "@remixicon/react"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      data-slot="breadcrumbs"
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1">
              {item.icon ? <span className="text-muted-foreground/70">{item.icon}</span> : null}
              {isLast || !item.href ? (
                <span className={cn("font-mono uppercase tracking-wider", isLast && "text-foreground")}>
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className="font-mono uppercase tracking-wider transition-colors hover:text-foreground"
                >
                  {item.label}
                </a>
              )}
              {!isLast && (
                <RiArrowRightSLine className="size-3 text-muted-foreground/60" aria-hidden="true" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export { Breadcrumbs }
