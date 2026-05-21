"use client"

import * as React from "react"
import Link from "next/link"
import { cva } from "class-variance-authority"
import { cn } from "@workspace/ui/lib/utils"
import {
  RiBox3Fill,
  RiFileList3Fill,
  RiAlertFill,
  RiScanFill,
  RiExchangeFundsFill,
  RiArrowRightSLine,
} from "@workspace/ui/icons"

export type ActivityTypeView =
  | "shipment"
  | "manifest"
  | "exception"
  | "scan"
  | "invoice"

export interface ActivityItemView {
  id: string
  type: ActivityTypeView
  title: string
  description: string
  timestamp: string
  link?: string
}

interface LiveActivityFeedProps {
  items?: ActivityItemView[]
  loading?: boolean
  maxHeight?: string
  className?: string
}

const ICON_MAP: Record<ActivityTypeView, React.ElementType> = {
  shipment: RiBox3Fill,
  manifest: RiFileList3Fill,
  exception: RiAlertFill,
  scan: RiScanFill,
  invoice: RiExchangeFundsFill,
}

const badgeVariants = cva(
  "inline-flex items-center gap-1 t-mono-sm uppercase tracking-widest px-1.5 py-0.5 border shrink-0",
  {
    variants: {
      type: {
        shipment: "border-primary/40 text-primary",
        manifest: "border-border text-muted-foreground",
        exception: "border-destructive/40 text-destructive",
        scan: "border-[var(--accent-warning)]/40 text-[var(--accent-warning)]",
        invoice: "border-[var(--accent-success)]/40 text-[var(--accent-success)]",
      },
    },
  }
)

function formatRelativeTime(iso: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

function LiveActivityFeed({
  items,
  loading,
  maxHeight = "24rem",
  className,
}: LiveActivityFeedProps) {
  return (
    <section
      data-slot="live-activity-feed"
      className={cn(
        "bg-card tac-fui-panel flex flex-col",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <p className="t-overline text-foreground tracking-widest">
          Live Activity
        </p>
        <span className="t-mono-sm text-muted-foreground">
          {items?.length ?? 0} events
        </span>
      </div>

      <div
        className="overflow-y-auto flex-1"
        style={{ maxHeight }}
        data-slot="activity-scroll"
      >
        {loading ? (
          <ul className="divide-y divide-border" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="p-4 animate-pulse">
                <div className="h-4 w-1/2 bg-muted mb-2" />
                <div className="h-3 w-3/4 bg-muted" />
              </li>
            ))}
          </ul>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              No recent activity
            </p>
            <p className="font-mono text-2xs text-muted-foreground/60 mt-1 uppercase tracking-widest">
              Events will appear here as your team works
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const Icon = ICON_MAP[item.type]
              const content = (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <span className={cn(badgeVariants({ type: item.type }))}>
                      {item.type}
                    </span>
                    <span className="t-overline text-foreground truncate">
                      {item.title}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="t-mono-sm text-muted-foreground truncate" style={{ fontSize: '0.625rem' }}>
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="t-mono-sm text-muted-foreground tabular-nums">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                      {item.link && (
                        <RiArrowRightSLine
                          className="h-3.5 w-3.5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>
                </>
              )

              return (
                <li key={item.id} data-slot="activity-item">
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="block p-4 tac-fui-hover"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="block p-4">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

export { LiveActivityFeed }
