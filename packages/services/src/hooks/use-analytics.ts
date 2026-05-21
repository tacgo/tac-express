"use client"

import { useQuery } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createAnalyticsService } from "../analytics.service"

const db = createBrowserClient()
const analyticsService = createAnalyticsService(db)

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => analyticsService.getSummary(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useShipmentTrend(days = 30) {
  return useQuery({
    queryKey: ["analytics", "shipment-trend", days],
    queryFn: () => analyticsService.getShipmentTrend(days),
    staleTime: 5 * 60 * 1000,
  })
}

export function useRevenueTrend(months = 6) {
  return useQuery({
    queryKey: ["analytics", "revenue-trend", months],
    queryFn: () => analyticsService.getRevenueTrend(months),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStatusDistribution() {
  return useQuery({
    queryKey: ["analytics", "status-distribution"],
    queryFn: () => analyticsService.getStatusDistribution(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useHubPerformance() {
  return useQuery({
    queryKey: ["analytics", "hub-performance"],
    queryFn: () => analyticsService.getHubPerformance(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useInventoryByHub() {
  return useQuery({
    queryKey: ["analytics", "inventory-by-hub"],
    queryFn: () => analyticsService.getInventoryByHub(),
    staleTime: 2 * 60 * 1000,
  })
}
