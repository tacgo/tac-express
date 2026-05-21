import type { UUID } from "./domain.types"

export type NotificationChannel = "in_app" | "email" | "sms" | "push" | "webhook"

export interface Notification {
  id: UUID
  userId: UUID | null
  channel: NotificationChannel
  title: string
  body: string
  link: string | null
  entityType: string | null
  entityId: UUID | null
  isRead: boolean
  readAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface NotificationInput {
  userId?: UUID
  channel?: NotificationChannel
  title: string
  body: string
  link?: string
  entityType?: string
  entityId?: UUID
}
