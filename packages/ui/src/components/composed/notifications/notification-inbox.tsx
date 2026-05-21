"use client"



import * as React from "react"
import Link from "next/link"
import { formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import {
  RiNotification3Line,
  RiCheckLine,
  RiExternalLinkLine,
} from "@workspace/ui/icons"

export interface InboxNotification {
  id: string
  title: string
  body: string
  link: string | null
  channel: string
  entityType: string | null
  entityId: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationInboxProps {
  notifications: InboxNotification[]
  unreadCount: number
  loading?: boolean
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  className?: string
}

export function NotificationInbox({
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  className,
}: NotificationInboxProps) {
  const [tab, setTab] = React.useState<"unread" | "all">(
    unreadCount > 0 ? "unread" : "all"
  )

  const filtered = React.useMemo(
    () =>
      tab === "unread"
        ? notifications.filter((n) => !n.isRead)
        : notifications,
    [tab, notifications]
  )

  const grouped = React.useMemo(() => groupByDay(filtered), [filtered])

  return (
    <section
      data-slot="notification-inbox"
      className={cn("flex flex-col gap-4", className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Inbox
          </h2>
          <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
            {notifications.length} total · {unreadCount} unread
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onMarkAllRead}
          >
            <RiCheckLine />
            Mark all read
          </Button>
        )}
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 font-mono">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-3">
          <div className="border border-border bg-background">
            {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
            <ScrollArea className="max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-12 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                  Loading inbox…
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<RiNotification3Line />}
                  title={
                    tab === "unread"
                      ? "All caught up"
                      : "No notifications yet"
                  }
                  description={
                    tab === "unread"
                      ? "You've read everything in your inbox."
                      : "We'll surface alerts and shipment events here as they arrive."
                  }
                />
              ) : (
                <div>
                  {grouped.map(({ day, items }) => (
                    <section key={day}>
                      <header className="border-y border-border bg-muted/30 px-4 py-1.5">
                        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                          {day}
                        </p>
                      </header>
                      <ul className="divide-y divide-border/60">
                        {items.map((n) => (
                          <NotificationRow
                            key={n.id}
                            notification={n}
                            onMarkRead={onMarkRead}
                          />
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  )
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: InboxNotification
  onMarkRead: (id: string) => void
}) {
  const when = (() => {
    try {
      return formatDistanceToNow(parseISO(notification.createdAt), {
        addSuffix: true,
      })
    } catch {
      return notification.createdAt
    }
  })()

  return (
    <li
      data-read={notification.isRead}
      className={cn(
        "grid gap-1 px-4 py-3 transition-colors",
        !notification.isRead && "bg-primary/[0.04]"
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!notification.isRead && (
            <span className="size-1.5 bg-primary" aria-label="Unread" />
          )}
          <span className="font-heading text-sm font-semibold">
            {notification.title}
          </span>
          <Badge variant="secondary" className="font-mono">
            {notification.channel.toUpperCase()}
          </Badge>
          {notification.entityType && (
            <Badge variant="outline" className="font-mono">
              {notification.entityType}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          <span>{when}</span>
          {!notification.isRead && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMarkRead(notification.id)}
              aria-label="Mark read"
              className="h-6 px-2"
            >
              <RiCheckLine className="size-3" />
            </Button>
          )}
        </div>
      </header>
      <p className="text-xs text-muted-foreground">{notification.body}</p>
      {notification.link && (
        <Link
          href={notification.link}
          className="inline-flex items-center gap-1 font-mono text-ui-10 uppercase tracking-widest text-primary hover:underline"
        >
          View
          <RiExternalLinkLine className="size-3" />
        </Link>
      )}
    </li>
  )
}

function groupByDay(items: InboxNotification[]) {
  const map = new Map<string, InboxNotification[]>()
  for (const item of items) {
    let key = "Earlier"
    try {
      const d = parseISO(item.createdAt)
      if (isToday(d)) key = "Today"
      else if (isYesterday(d)) key = "Yesterday"
    } catch {
      /* fall through to "Earlier" */
    }
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }
  // Stable order: Today → Yesterday → Earlier
  const order = ["Today", "Yesterday", "Earlier"]
  return order
    .filter((k) => map.has(k))
    .map((k) => ({ day: k, items: map.get(k)! }))
}
