import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Notification, NotificationInput } from "@workspace/types"

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as Notification["id"],
    userId: (row.user_id as Notification["userId"]) ?? null,
    channel: (row.channel as Notification["channel"]) ?? "in_app",
    title: row.title as string,
    body: row.body as string,
    link: (row.link as string | null) ?? null,
    entityType: (row.entity_type as string | null) ?? null,
    entityId: (row.entity_id as Notification["entityId"]) ?? null,
    isRead: (row.is_read as boolean) ?? false,
    readAt: (row.read_at as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
  }
}

export function createNotificationService(db: SupabaseClient) {
  return {
    async listForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}): Promise<Notification[]> {
      let query = db
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(opts.limit ?? 50)
      if (opts.unreadOnly) query = query.eq("is_read", false)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapNotification)
    },

    async unreadCount(userId: string): Promise<number> {
      const { count, error } = await db
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false)
      if (error) throw error
      return count ?? 0
    },

    async markRead(id: string): Promise<void> {
      const { error } = await db
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
    },

    async markAllRead(userId: string): Promise<void> {
      const { error } = await db
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false)
      if (error) throw error
    },

    async create(input: NotificationInput): Promise<Notification> {
      const { data, error } = await db
        .from("notifications")
        .insert({
          user_id: input.userId ?? null,
          channel: input.channel ?? "in_app",
          title: input.title,
          body: input.body,
          link: input.link ?? null,
          entity_type: input.entityType ?? null,
          entity_id: input.entityId ?? null,
        })
        .select("*")
        .single()
      if (error) throw error
      return mapNotification(data)
    },
  }
}

export type NotificationService = ReturnType<typeof createNotificationService>
