"use client"



import * as React from "react"

import {
  RiNotification3Line,
  RiSignalTowerLine,
  RiInformationLine,
} from "@workspace/ui/icons"
import { OpsFrame } from "../ops-frame"
import { OpsPageHead } from "../ops-page-head"
import { OpsBadge } from "../ops-badge"
import { OpsCard } from "../ops-card"
import { OpsTabs } from "../ops-tabs"

interface Channel {
  key: string
  title: string
  description: string
}

interface SystemService {
  name: string
  status: "Operational" | "Degraded" | "Down"
}

interface OpsNotificationsViewProps {
  totalNotifications: number
  unreadNotifications: number
  channels: Channel[]
  services: SystemService[]
}

const TABS = ["Unread", "All"] as const

function OpsNotificationsView({
  totalNotifications,
  unreadNotifications,
  channels,
  services,
}: OpsNotificationsViewProps) {
  const [tab, setTab] = React.useState<string>("Unread")

  return (
    <OpsFrame>
      <OpsPageHead
        eyebrow="System"
        title="Notifications"
        sub="System alerts and activity updates"
      />
      <div className="grid grid-cols-[1.4fr_1fr] gap-[length:var(--spacing-gutter-md)]">
        {/* Inbox */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-sans font-bold text-ui-16">
                Inbox
              </div>
              <div className="paper-label">
                {totalNotifications} Total · {unreadNotifications} Unread
              </div>
            </div>
          </div>
          <OpsTabs items={[...TABS]} value={tab} onChange={setTab} />
          <OpsCard
            ticks
            className="min-h-[length:var(--spacing-chart-lg)] grid place-items-center text-center"
          >
            <div>
              <RiNotification3Line aria-hidden className="size-7 text-muted-foreground mx-auto" />
              <div className="paper-label mt-2">No Data</div>
              <div className="font-sans font-bold text-ui-16 mt-1">
                No notifications yet
              </div>
              <div className="font-sans text-ui-13 text-muted-foreground mt-1 max-w-sm">
                We&rsquo;ll surface alerts and shipment events here as they arrive.
              </div>
            </div>
          </OpsCard>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-3.5">
          <OpsCard ticks>
            <div className="paper-label flex items-center gap-2">
              <RiSignalTowerLine aria-hidden className="size-3.5" />
              System Status
            </div>
            <div className="flex items-center gap-2 mt-2.5 mb-2">
              <span aria-hidden className="size-1.5 bg-accent-success" />
              <span className="paper-label text-accent-success tracking-label">
                All Systems Normal
              </span>
            </div>
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center justify-between py-1.5 border-t border-border"
              >
                <span className="font-mono uppercase text-muted-foreground text-ui-11 tracking-badge">
                  {s.name}
                </span>
                <span className="font-mono text-accent-success text-ui-11">
                  ● {s.status}
                </span>
              </div>
            ))}
          </OpsCard>

          <OpsCard ticks>
            <div className="paper-label flex items-center gap-2">
              <RiInformationLine aria-hidden className="size-3.5" />
              Notification Channels
            </div>
            <div className="mt-2.5 flex flex-col gap-2.5">
              {channels.map((c) => (
                <div key={c.key} className="flex items-start gap-3">
                  {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
                  <OpsBadge className="min-w-[74px] justify-center">
                    {c.key}
                  </OpsBadge>
                  <div className="min-w-0">
                    <div className="font-mono font-semibold uppercase text-ui-12 tracking-tag">
                      {c.title}
                    </div>
                    <div className="font-sans text-ui-13 text-muted-foreground mt-0.5">
                      {c.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </OpsCard>
        </div>
      </div>
    </OpsFrame>
  )
}

export { OpsNotificationsView }
export type { OpsNotificationsViewProps, Channel, SystemService }
