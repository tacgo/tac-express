"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"

const db = createBrowserClient()

type Table = "shipments" | "exceptions" | "manifests" | "audit_logs" | "invoices"

interface UseRealtimeOptions {
  /** Query keys to invalidate whenever this table emits an event */
  invalidateKeys?: readonly unknown[][]
  /** Enable/disable subscription (defaults to true) */
  enabled?: boolean
}

/**
 * Subscribes to postgres_changes on a single table and invalidates the
 * provided React Query keys on every event. Unsubscribes on unmount.
 */
export function useRealtimeTable(
  table: Table,
  { invalidateKeys = [], enabled = true }: UseRealtimeOptions = {}
) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!enabled) return

    const channel = db
      .channel(`realtime:${table}`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on("postgres_changes" as any, { event: "*", schema: "public", table }, () => {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      })
      .subscribe()

    return () => {
      db.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, enabled])
}

/**
 * Enables all dashboard-related realtime subscriptions at once.
 * Invalidates KPIs, activity feed, sidebar badges, and operational health
 * when any relevant table changes.
 */
export function useRealtimeDashboard(enabled = true) {
  useRealtimeTable("shipments", {
    enabled,
    invalidateKeys: [
      ["dashboard", "kpis"],
      ["dashboard", "operational-health"],
      ["shipments"],
    ],
  })
  useRealtimeTable("exceptions", {
    enabled,
    invalidateKeys: [
      ["dashboard", "kpis"],
      ["dashboard", "operational-health"],
      ["sidebar-badges"],
      ["exceptions"],
    ],
  })
  useRealtimeTable("manifests", {
    enabled,
    invalidateKeys: [
      ["dashboard", "kpis"],
      ["dashboard", "operational-health"],
      ["sidebar-badges"],
      ["manifests"],
    ],
  })
  useRealtimeTable("audit_logs", {
    enabled,
    invalidateKeys: [["dashboard", "activity"]],
  })
}
