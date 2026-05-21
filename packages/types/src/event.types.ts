import type { UUID } from "./domain.types"

export const WEBHOOK_EVENTS = [
  "shipment.created",
  "shipment.status_changed",
  "shipment.delivered",
  "shipment.cancelled",
  "manifest.created",
  "manifest.closed",
  "manifest.departed",
  "manifest.arrived",
  "invoice.issued",
  "invoice.paid",
  "invoice.overdue",
  "exception.raised",
  "exception.resolved",
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export interface BusinessEvent<T = unknown> {
  id: UUID
  eventType: WebhookEvent
  entityType: string
  entityId: UUID
  payload: T
  emittedBy: UUID | null
  emittedAt: string
}
