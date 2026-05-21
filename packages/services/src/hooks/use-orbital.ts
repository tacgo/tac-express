"use client"

import { useQuery } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createOrbitalService } from "../orbital.service"

const db = createBrowserClient()
const orbital = createOrbitalService(db)

const STALE_FAST = 30 * 1000
const STALE_MED = 2 * 60 * 1000
const STALE_SLOW = 5 * 60 * 1000

/* ── Analytics page ──────────────────────────────────────────────── */

export function useAnalyticsKpis() {
  return useQuery({
    queryKey: ["orbital", "analytics-kpis"],
    queryFn: () => orbital.getAnalyticsKpis(),
    staleTime: STALE_SLOW,
  })
}

export function useShipmentTrendSeries(days = 30) {
  return useQuery({
    queryKey: ["orbital", "shipment-trend", days],
    queryFn: () => orbital.getShipmentTrend({ days }),
    staleTime: STALE_SLOW,
  })
}

export function useRevenueTrendSeries(months = 6) {
  return useQuery({
    queryKey: ["orbital", "revenue-trend", months],
    queryFn: () => orbital.getRevenueTrend({ months }),
    staleTime: STALE_SLOW,
  })
}

export function useStatusSegments() {
  return useQuery({
    queryKey: ["orbital", "status-segments"],
    queryFn: () => orbital.getStatusDistribution(),
    staleTime: STALE_SLOW,
  })
}

export function useServiceMix() {
  return useQuery({
    queryKey: ["orbital", "service-mix"],
    queryFn: () => orbital.getServiceMix(),
    staleTime: STALE_SLOW,
  })
}

export function useHubRank() {
  return useQuery({
    queryKey: ["orbital", "hub-rank"],
    queryFn: () => orbital.getHubPerformance(),
    staleTime: STALE_SLOW,
  })
}

export function useTopCustomers(limit = 10) {
  return useQuery({
    queryKey: ["orbital", "top-customers", limit],
    queryFn: () => orbital.getTopCustomers({ limit }),
    staleTime: STALE_SLOW,
  })
}

export function useSlaBreachBuckets(days = 30) {
  return useQuery({
    queryKey: ["orbital", "sla-buckets", days],
    queryFn: () => orbital.getSlaBreachDistribution({ days }),
    staleTime: STALE_MED,
  })
}

export function useLaneHeatmap() {
  return useQuery({
    queryKey: ["orbital", "lane-heatmap"],
    queryFn: () => orbital.getLaneHeatmap(),
    staleTime: STALE_SLOW,
  })
}

/* ── Command Center / Overview page ──────────────────────────────── */

export function useCommandCenterKpis() {
  return useQuery({
    queryKey: ["orbital", "command-center-kpis"],
    queryFn: () => orbital.getCommandCenterKpis(),
    staleTime: STALE_FAST,
    refetchInterval: 60 * 1000,
  })
}

export function useDeliverySuccessGrowth() {
  return useQuery({
    queryKey: ["orbital", "delivery-growth"],
    queryFn: () => orbital.getDeliverySuccessGrowth(),
    staleTime: STALE_SLOW,
  })
}

export function useShipmentVolume(days = 30) {
  return useQuery({
    queryKey: ["orbital", "shipment-volume", days],
    queryFn: () => orbital.getShipmentVolume({ days }),
    staleTime: STALE_SLOW,
  })
}

export function useTopHubs() {
  return useQuery({
    queryKey: ["orbital", "top-hubs"],
    queryFn: () => orbital.getTopHubs(),
    staleTime: STALE_SLOW,
  })
}

export function useSuccessRate() {
  return useQuery({
    queryKey: ["orbital", "success-rate"],
    queryFn: () => orbital.getSuccessRate(),
    staleTime: STALE_SLOW,
  })
}

export function useUpcomingOperations(limit = 5) {
  return useQuery({
    queryKey: ["orbital", "upcoming-operations", limit],
    queryFn: () => orbital.getUpcomingOperations({ limit }),
    staleTime: STALE_MED,
  })
}
