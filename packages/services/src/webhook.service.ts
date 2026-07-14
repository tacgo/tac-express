import { randomBytes } from "node:crypto"
import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Webhook, WebhookInput, WebhookDelivery } from "@workspace/types"

function mapWebhook(row: Record<string, unknown>): Webhook {
  return {
    id: row.id as Webhook["id"],
    name: row.name as string,
    url: row.url as string,
    secret: row.secret as string,
    events: (row.events as Webhook["events"]) ?? [],
    isActive: (row.is_active as boolean) ?? true,
    lastSuccessAt: (row.last_success_at as string | null) ?? null,
    lastFailureAt: (row.last_failure_at as string | null) ?? null,
    failureCount: (row.failure_count as number) ?? 0,
    createdBy: (row.created_by as Webhook["createdBy"]) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createWebhookService(db: SupabaseClient) {
  return {
    async listWebhooks(): Promise<Webhook[]> {
      const { data, error } = await db
        .from("webhooks")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapWebhook)
    },

    async createWebhook(input: WebhookInput): Promise<Webhook> {
      const secret = generateSecret()
      const { data, error } = await db
        .from("webhooks")
        .insert({
          name: input.name,
          url: input.url,
          events: input.events,
          secret,
          is_active: input.isActive ?? true,
        })
        .select("*")
        .single()
      if (error) throw error
      return mapWebhook(data)
    },

    async updateWebhook(id: string, patch: Partial<WebhookInput>): Promise<Webhook> {
      const { data, error } = await db
        .from("webhooks")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.url !== undefined && { url: patch.url }),
          ...(patch.events !== undefined && { events: patch.events }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
        })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw error
      return mapWebhook(data)
    },

    async deleteWebhook(id: string): Promise<void> {
      const { error } = await db.from("webhooks").delete().eq("id", id)
      if (error) throw error
    },

    async listDeliveries(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
      const { data, error } = await db
        .from("webhook_deliveries")
        .select("*")
        .eq("webhook_id", webhookId)
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []).map(
        (row): WebhookDelivery => ({
          id: row.id as WebhookDelivery["id"],
          webhookId: row.webhook_id as WebhookDelivery["webhookId"],
          eventId: row.event_id as WebhookDelivery["eventId"],
          eventType: row.event_type as WebhookDelivery["eventType"],
          requestBody: row.request_body as Record<string, unknown>,
          responseStatus: row.response_status as number | null,
          responseBody: row.response_body as string | null,
          attempt: row.attempt as number,
          succeeded: row.succeeded as boolean,
          deliveredAt: row.delivered_at as string | null,
          createdAt: row.created_at as string,
        }),
      )
    },
  }
}

function generateSecret(): string {
  return randomBytes(32).toString("hex")
}

export type WebhookService = ReturnType<typeof createWebhookService>
