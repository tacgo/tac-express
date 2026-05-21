"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { createBrowserClient } from "@workspace/database/client"
import { createRealtimeService } from "../realtime.service"

const db = createBrowserClient()
const realtimeService = createRealtimeService(db)

/**
 * Subscribe to shipments postgres_changes and invalidate the relevant query
 * keys (`shipments`, `shipment-awb`, individual `shipment` by id, `dashboard`)
 * whenever something changes server-side. Auto-unsubscribes on unmount.
 */
export function useRealtimeShipments(): void {
  const qc = useQueryClient()
  React.useEffect(() => {
    const unsubscribe = realtimeService.subscribeToShipments<{
      id?: string
      awb_number?: string
    }>((event) => {
      qc.invalidateQueries({ queryKey: ["shipments"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      const id = event.new?.id ?? event.old?.id
      const awb = event.new?.awb_number ?? event.old?.awb_number
      if (id) qc.invalidateQueries({ queryKey: ["shipment", id] })
      if (awb) {
        qc.invalidateQueries({ queryKey: ["shipment-awb", awb] })
        qc.invalidateQueries({ queryKey: ["tracking", awb] })
      }
    })
    return unsubscribe
  }, [qc])
}

/**
 * Subscribe to manifests postgres_changes; invalidates list + detail queries.
 */
export function useRealtimeManifests(): void {
  const qc = useQueryClient()
  React.useEffect(() => {
    const unsubscribe = realtimeService.subscribeToManifests<{
      id?: string
    }>((event) => {
      qc.invalidateQueries({ queryKey: ["manifests"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      const id = event.new?.id ?? event.old?.id
      if (id) {
        qc.invalidateQueries({ queryKey: ["manifest", id] })
        qc.invalidateQueries({ queryKey: ["manifest-shipments", id] })
      }
    })
    return unsubscribe
  }, [qc])
}

/**
 * Subscribe to exceptions changes — invalidates list + dashboard widgets.
 */
export function useRealtimeExceptions(): void {
  const qc = useQueryClient()
  React.useEffect(() => {
    const unsubscribe = realtimeService.subscribeToExceptions<{
      id?: string
    }>((event) => {
      qc.invalidateQueries({ queryKey: ["exceptions"] })
      qc.invalidateQueries({ queryKey: ["dashboard"] })
      const id = event.new?.id ?? event.old?.id
      if (id) qc.invalidateQueries({ queryKey: ["exception", id] })
    })
    return unsubscribe
  }, [qc])
}

/**
 * Per-AWB tracking subscription. Invalidates ONLY the tracking query for the
 * given awbNumber, so the shipment list isn't refetched on every event row.
 */
export function useRealtimeTracking(awbNumber: string | undefined): void {
  const qc = useQueryClient()
  React.useEffect(() => {
    if (!awbNumber) return
    const unsubscribe = realtimeService.subscribeToShipments<{
      awb_number?: string
    }>((event) => {
      const eventAwb = event.new?.awb_number ?? event.old?.awb_number
      if (eventAwb !== awbNumber) return
      qc.invalidateQueries({ queryKey: ["tracking", awbNumber] })
      qc.invalidateQueries({ queryKey: ["shipment-awb", awbNumber] })
    })
    return unsubscribe
  }, [qc, awbNumber])
}

/**
 * Aggregate hook that subscribes to shipments + manifests + exceptions in one
 * mount. Use on `/home` Mission Control — invalidates the dashboard widgets
 * on any of those tables changing.
 */
export function useRealtimeDashboard(): void {
  useRealtimeShipments()
  useRealtimeManifests()
  useRealtimeExceptions()
}
