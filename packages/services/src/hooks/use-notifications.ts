"use client"

import * as React from "react"
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"

import { createNotificationService } from "../notification.service"
import { createRealtimeService } from "../realtime.service"

const db = createBrowserClient()
const notificationService = createNotificationService(db)
const realtimeService = createRealtimeService(db)

interface ListOptions {
  unreadOnly?: boolean
  limit?: number
}

export function useNotificationsForUser(
  userId: string | undefined,
  opts: ListOptions = {}
) {
  return useQuery({
    queryKey: ["notifications", userId, opts],
    queryFn: () =>
      notificationService.listForUser(userId!, {
        unreadOnly: opts.unreadOnly,
        limit: opts.limit ?? 50,
      }),
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
  })
}

export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: ["notifications-unread", userId],
    queryFn: () => notificationService.unreadCount(userId!),
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; userId: string }) =>
      notificationService.markRead(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["notifications", vars.userId] })
      qc.invalidateQueries({ queryKey: ["notifications-unread", vars.userId] })
    },
  })
}

export function useMarkAllNotificationsRead(userId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      notificationService.markAllRead(userId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] })
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] })
    },
  })
}

/**
 * Subscribe to realtime notifications for the current user. Invalidates the
 * inbox query on every postgres_changes event so the UI stays current without
 * polling. Auto-unsubscribes on unmount.
 *
 * NOTE: realtime channel filter scope is broad (all rows on `notifications`).
 * In production we'd add a row-filter via Supabase Realtime per-row filter
 * once the table is provisioned with proper RLS. For now we filter client-side
 * by `userId`.
 */
export function useRealtimeNotifications(userId: string | undefined): void {
  const qc = useQueryClient()
  React.useEffect(() => {
    if (!userId) return
    const unsubscribe = realtimeService.subscribeToNotifications<{
      user_id?: string
    }>((event) => {
      const eventUser = event.new?.user_id ?? event.old?.user_id
      // RLS scopes server-side; defensively filter client-side too.
      if (eventUser && eventUser !== userId) return
      qc.invalidateQueries({ queryKey: ["notifications", userId] })
      qc.invalidateQueries({ queryKey: ["notifications-unread", userId] })
    })
    return unsubscribe
  }, [qc, userId])
}
