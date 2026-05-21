import type { UUID } from "./domain.types"
import type { WebhookEvent } from "./event.types"

export interface Webhook {
  id: UUID
  name: string
  url: string
  secret: string
  events: WebhookEvent[]
  isActive: boolean
  lastSuccessAt: string | null
  lastFailureAt: string | null
  failureCount: number
  createdBy: UUID | null
  createdAt: string
  updatedAt: string
}

export interface WebhookInput {
  name: string
  url: string
  events: WebhookEvent[]
  isActive?: boolean
}

export interface WebhookDelivery {
  id: UUID
  webhookId: UUID
  eventId: UUID | null
  eventType: WebhookEvent
  requestBody: Record<string, unknown>
  responseStatus: number | null
  responseBody: string | null
  attempt: number
  succeeded: boolean
  deliveredAt: string | null
  createdAt: string
}
