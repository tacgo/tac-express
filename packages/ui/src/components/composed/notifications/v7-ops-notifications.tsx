"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import {
  RiNotification3Line,
  RiSignalTowerLine,
  RiInformationLine,
} from "@workspace/ui/icons"
import { PageShell } from "@workspace/ui/components/composed/page-shell"
import { PageHeader } from "@workspace/ui/components/composed/page-header"
import { SurfaceCard } from "@workspace/ui/components/composed/surface-card"
import { Badge } from "@workspace/ui/components/primitives/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"

interface Channel {
  key: string
  title: string
  description: string
}

interface SystemService {
  name: string
  status: "Operational" | "Degraded" | "Down"
}

interface V7OpsNotificationsProps {
  totalNotifications: number
  unreadNotifications: number
  channels: Channel[]
  services: SystemService[]
  className?: string
}

function serviceStatusTone(status: SystemService["status"]) {
  if (status === "Down")
    return { text: "text-destructive", dot: "bg-destructive" }
  if (status === "Degraded")
    return { text: "text-accent-warning", dot: "bg-accent-warning" }
  return { text: "text-accent-success", dot: "bg-accent-success" }
}

function aggregateStatusTitle(services: SystemService[]): string {
  if (services.some((s) => s.status === "Down")) return "Service disruption"
  if (services.some((s) => s.status === "Degraded")) return "Degraded performance"
  return "All systems normal"
}

/**
 * V7OpsNotifications — Violet Grid v7 layout for the Notifications route.
 *
 * Composition: PageShell + PageHeader, two-column body (inbox + right rail).
 * Inbox uses Radix Tabs (Unread / All) and a SurfaceCard empty state. The
 * right rail carries the System Status + Notification Channels panels.
 *
 * Replaces the Paper Ops Console `OpsNotificationsView`. Data shape and
 * caller wiring are unchanged.
 */
function V7OpsNotifications({
  totalNotifications,
  unreadNotifications,
  channels,
  services,
  className,
}: V7OpsNotificationsProps) {
  return (
    <PageShell width="wide" className={cn(className)}>
      <PageHeader
        overline="System"
        title="Notifications"
        description="System alerts and activity updates."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-card-gap">
        {/* Inbox column */}
        <SurfaceCard
          eyebrow={
            <span>
              {totalNotifications} total · {unreadNotifications} unread
            </span>
          }
          title="Inbox"
        >
          <Tabs defaultValue="Unread" className="gap-4">
            <TabsList>
              <TabsTrigger value="Unread">Unread</TabsTrigger>
              <TabsTrigger value="All">All</TabsTrigger>
            </TabsList>
            <TabsContent value="Unread">
              <NotificationsEmpty />
            </TabsContent>
            <TabsContent value="All">
              <NotificationsEmpty />
            </TabsContent>
          </Tabs>
        </SurfaceCard>

        {/* Right rail */}
        <div className="flex flex-col gap-card-gap">
          <SurfaceCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                <RiSignalTowerLine aria-hidden className="size-3.5" />
                System status
              </span>
            }
            title={aggregateStatusTitle(services)}
          >
            <div className="flex flex-col">
              {services.map((s) => {
                const tone = serviceStatusTone(s.status)
                return (
                  <div
                    key={s.name}
                    className="flex items-center justify-between py-2 border-t border-border first:border-t-0"
                  >
                    <span className="font-mono uppercase text-2xs tracking-badge text-muted-foreground">
                      {s.name}
                    </span>
                    <span className={cn("t-mono-sm inline-flex items-center gap-1.5", tone.text)}>
                      <span aria-hidden className={cn("size-1.5", tone.dot)} />
                      {s.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                <RiInformationLine aria-hidden className="size-3.5" />
                Notification channels
              </span>
            }
            title="Routed signals"
          >
            <div className="flex flex-col gap-3">
              {channels.map((c) => (
                <div key={c.key} className="flex items-start gap-3">
                  <Badge
                    variant="outline"
                    className="min-w-16 justify-center font-mono uppercase tracking-tag"
                  >
                    {c.key}
                  </Badge>
                  <div className="min-w-0">
                    <div className="t-h4 text-foreground">{c.title}</div>
                    <p className="t-caption text-muted-foreground mt-0.5">
                      {c.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageShell>
  )
}

function NotificationsEmpty() {
  return (
    <div className="min-h-[length:var(--spacing-chart-md)] grid place-items-center text-center">
      <div>
        <RiNotification3Line
          aria-hidden
          className="size-8 text-muted-foreground mx-auto"
        />
        <p className="tac-mono-label mt-3">Inbox clear</p>
        <p className="t-h4 text-foreground mt-1.5">No notifications yet</p>
        <p className="t-caption text-muted-foreground mt-1 max-w-sm">
          We&rsquo;ll surface alerts and shipment events here as they arrive.
        </p>
      </div>
    </div>
  )
}

export { V7OpsNotifications }
export type { V7OpsNotificationsProps, Channel, SystemService }
