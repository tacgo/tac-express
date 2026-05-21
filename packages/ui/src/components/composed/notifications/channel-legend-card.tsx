import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiInformationLine } from "@workspace/ui/icons"

export interface NotificationChannel {
  code: string
  label: string
  description: string
}

interface ChannelLegendCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Override the default channel list (mirrors notification.service.ts). */
  channels?: NotificationChannel[]
}

const DEFAULT_CHANNELS: NotificationChannel[] = [
  { code: "SYSTEM", label: "System", description: "Platform alerts, scheduled jobs, sync state" },
  { code: "OPS", label: "Operations", description: "Manifests, scans, dispatch, exceptions" },
  { code: "FINANCE", label: "Finance", description: "Invoices, payments, COD, settlement" },
  { code: "CUSTOMER", label: "Customer", description: "Customer-initiated bookings + WhatsApp replies" },
  { code: "SLA", label: "SLA", description: "Breach warnings, due-soon alerts, escalations" },
]

/**
 * ChannelLegendCard — demystifies the badge variants the
 * NotificationInbox renders. Lists each channel taxonomy that the
 * notification.service.ts emits, with a code-tag + label +
 * one-sentence description per row. Keeps the legend honest as the
 * service evolves (consumer can override `channels` if the live
 * taxonomy diverges).
 */
export function ChannelLegendCard({
  channels = DEFAULT_CHANNELS,
  className,
  ...props
}: ChannelLegendCardProps) {
  return (
    <div
      data-slot="channel-legend-card"
      className={cn("tac-fui-panel space-y-3 bg-card p-5", className)}
      {...props}
    >
      <p className="flex items-center gap-2 border-b border-border pb-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        <RiInformationLine className="size-3.5" aria-hidden="true" />
        Notification channels
      </p>
      <ul className="space-y-2">
        {channels.map((c) => (
          <li key={c.code} className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-5 shrink-0 items-center border border-border bg-muted px-1.5 font-mono text-2xs uppercase tracking-wider text-foreground">
              {c.code}
            </span>
            <div className="min-w-0">
              <p className="font-mono text-2xs uppercase tracking-widest text-foreground">
                {c.label}
              </p>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
