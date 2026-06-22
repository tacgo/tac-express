"use client"

import * as React from "react"

import {
  useNotificationsForUser,
  useUnreadNotificationCount,
} from "@workspace/services/hooks/use-notifications"
import { useSession } from "@workspace/ui/hooks/use-session"
import {
  V7OpsNotifications,
  type SystemService,
} from "@workspace/ui/components/composed/notifications/v7-ops-notifications"

// Channels + services are static reference data — not driven by an API yet.
const CHANNELS = [
  { key: "SYSTEM",   title: "System",     description: "Platform alerts, scheduled jobs, sync state" },
  { key: "OPS",      title: "Operations", description: "Manifests, scans, dispatch, exceptions" },
  { key: "FINANCE",  title: "Finance",    description: "Invoices, payments, COD, settlement" },
  { key: "CUSTOMER", title: "Customer",   description: "Customer-initiated bookings + WhatsApp replies" },
  { key: "SLA",      title: "SLA",        description: "Breach warnings, due-soon alerts, escalations" },
]

const SERVICES: SystemService[] = [
  { name: "API",         status: "Operational" },
  { name: "Database",    status: "Operational" },
  { name: "Realtime",    status: "Operational" },
  { name: "PDF Service", status: "Operational" },
  { name: "Webhooks",    status: "Operational" },
]

export function OpsNotificationsLive() {
  const { user } = useSession()
  const userId = user?.id
  const { data: all } = useNotificationsForUser(userId, { limit: 50 })
  const { data: unread = 0 } = useUnreadNotificationCount(userId)

  return (
    <V7OpsNotifications
      totalNotifications={(all ?? []).length}
      unreadNotifications={typeof unread === "number" ? unread : 0}
      channels={CHANNELS}
      services={SERVICES}
    />
  )
}
