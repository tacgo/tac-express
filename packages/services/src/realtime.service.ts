import type { SupabaseClient, RealtimeChannel } from "@workspace/database/supabase.types"

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE"

export interface RealtimeEvent<T = unknown> {
  table: string
  type: RealtimeEventType
  new: T | null
  old: T | null
  timestamp: string
}

type Callback<T = unknown> = (event: RealtimeEvent<T>) => void

/**
 * Realtime service wrapper around Supabase postgres_changes channels.
 * Returns an unsubscribe function from each subscribe call.
 */
export function createRealtimeService(db: SupabaseClient) {
  const subscribe = <T = unknown>(
    channelName: string,
    table: string,
    callback: Callback<T>
  ): (() => void) => {
    const channel: RealtimeChannel = db
      .channel(channelName)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        (payload: {
          eventType: RealtimeEventType
          new: T | null
          old: T | null
          commit_timestamp: string
        }) => {
          callback({
            table,
            type: payload.eventType,
            new: payload.new ?? null,
            old: payload.old ?? null,
            timestamp: payload.commit_timestamp,
          })
        }
      )
      .subscribe()

    return () => {
      db.removeChannel(channel)
    }
  }

  return {
    subscribeToShipments: <T = unknown>(cb: Callback<T>) =>
      subscribe<T>("realtime:shipments", "shipments", cb),

    subscribeToExceptions: <T = unknown>(cb: Callback<T>) =>
      subscribe<T>("realtime:exceptions", "exceptions", cb),

    subscribeToManifests: <T = unknown>(cb: Callback<T>) =>
      subscribe<T>("realtime:manifests", "manifests", cb),

    subscribeToAuditLogs: <T = unknown>(cb: Callback<T>) =>
      subscribe<T>("realtime:audit-logs", "audit_logs", cb),

    subscribeToNotifications: <T = unknown>(cb: Callback<T>) =>
      subscribe<T>("realtime:notifications", "notifications", cb),
  }
}

export type RealtimeService = ReturnType<typeof createRealtimeService>

