"use client"

import * as React from "react"
import Link from "next/link"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/primitives/popover"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { useNotificationStore } from "@workspace/services/stores/notification.store"
import {
  RiNotification3Line,
  RiCheckLine,
  RiAlertLine,
  RiCloseLine,
  RiInformationLine,
} from "@workspace/ui/icons"

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })
}

function NotificationBell() {
  const { notifications, markRead, markAllRead, removeNotification } =
    useNotificationStore()
  const [open, setOpen] = React.useState(false)
  // Defer Popover mount until after hydration. The notification store
  // reads from persisted localStorage on the client (empty on server),
  // which shifts ancestor hook-call counts between SSR and CSR and
  // desyncs Radix's `useId()` outputs. Rendering a plain button on
  // the first pass — with no Radix tree underneath — avoids the
  // mismatch entirely.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length
  const recent = notifications.slice(0, 8)

  if (!mounted) {
    return (
      <Button
        data-slot="notifications-trigger"
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        aria-label="Notifications"
      >
        <RiNotification3Line className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* eslint-disable-next-line no-restricted-syntax -- Radix PopoverTrigger asChild requires a native element */}
        <button
          data-slot="notifications-trigger"
          type="button"
          className="relative flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:tac-focus-premium"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <RiNotification3Line className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5 min-w-3.5 h-3.5 px-1",
                "flex items-center justify-center",
                "font-mono text-2xs font-bold tabular-nums",
                "bg-destructive text-destructive-foreground",
                "border border-card"
              )}
              aria-hidden="true"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        data-slot="notifications-popover"
        align="end"
        sideOffset={8}
        className={cn(
          // w-panel-xl is 18.75rem (300px) — the project's defined panel
          // width token. Replaces the previous broken `w-90` class
          // (Tailwind ships no `90` spacing scale entry by default, so
          // it silently no-op'd) and the earlier `w-[360px]` arbitrary
          // value (LAW 11). The notification panel reads cleanly at
          // 300px alongside the rest of the dashboard surface.
          "w-panel-xl bg-card border border-border shadow-brutal p-0",
          "data-open:slide-in-from-top-2"
        )}
      >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="font-serif text-sm font-semibold text-foreground">
              Notifications
            </p>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={markAllRead}
                className="h-auto px-1 py-0.5 font-mono text-2xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Mark all read
              </Button>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="py-10 text-center">
              <RiNotification3Line
                className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2"
                aria-hidden="true"
              />
              <p className="font-sans text-sm text-muted-foreground">
                No notifications yet
              </p>
              <p className="font-sans text-xs text-muted-foreground/60 mt-0.5">
                You&apos;re all caught up
              </p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border">
              {recent.map((n) => {
                const Icon =
                  n.type === "success"
                    ? RiCheckLine
                    : n.type === "warning"
                      ? RiAlertLine
                      : n.type === "error"
                        ? RiCloseLine
                        : RiInformationLine
                const iconColor =
                  n.type === "success"
                    ? "text-primary"
                    : n.type === "warning"
                      ? "text-accent-warning"
                      : n.type === "error"
                        ? "text-destructive"
                        : "text-muted-foreground"

                // Main row body. Rendered inside either a Link (when n.link
                // is set) or a <button> (otherwise) so keyboard users can
                // activate it. Dismiss is a SIBLING — never nest a <button>
                // inside an <a>; it's invalid HTML and breaks focus order.
                const mainBody = (
                  <>
                    <Icon
                      className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "font-sans text-sm leading-snug",
                          !n.read
                            ? "font-medium text-foreground"
                            : "text-foreground/90"
                        )}
                      >
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="font-sans text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      )}
                      <p className="font-mono text-2xs text-muted-foreground/60 mt-1">
                        {relativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <span
                        className="shrink-0 h-1.5 w-1.5 mt-1.5 bg-primary"
                        aria-hidden="true"
                      />
                    )}
                  </>
                )

                const handleActivate = () => {
                  if (!n.read) markRead(n.id)
                }

                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 transition-colors",
                      !n.read ? "bg-primary/5" : "hover:bg-accent/50"
                    )}
                  >
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          handleActivate()
                          setOpen(false)
                        }}
                        className="flex flex-1 min-w-0 items-start gap-3 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {mainBody}
                      </Link>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={handleActivate}
                        className="flex flex-1 h-auto min-w-0 items-start gap-3 px-0 py-0 text-left font-normal hover:bg-transparent focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {mainBody}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNotification(n.id)}
                      className="shrink-0 h-5 w-5 text-muted-foreground/50 hover:text-destructive"
                      aria-label={`Dismiss ${n.title}`}
                    >
                      <RiCloseLine className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="border-t border-border px-4 py-2.5 flex items-center justify-between bg-muted/30">
            <span className="font-mono text-2xs text-muted-foreground tabular-nums">
              {notifications.length} total
            </span>
            <Link
              href="/ops-console/notifications"
              onClick={() => setOpen(false)}
              className="font-mono text-2xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              View all →
            </Link>
          </div>
      </PopoverContent>
    </Popover>
  )
}

export { NotificationBell }
