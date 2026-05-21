import { useQuery } from "@tanstack/react-query"
import { createBrowserClient } from "@workspace/database/client"
import { createDashboardService } from "../dashboard.service"

const db = createBrowserClient()
const dashboardService = createDashboardService(db)

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: () => dashboardService.getKPIs(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useActivityFeed(limit = 20) {
  return useQuery({
    queryKey: ["dashboard", "activity", limit],
    queryFn: () => dashboardService.getActivityFeed(limit),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  })
}

export function useSidebarBadges() {
  return useQuery({
    queryKey: ["dashboard", "sidebar-badges"],
    queryFn: () => dashboardService.getSidebarBadgeCounts(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function useOperationalHealth() {
  return useQuery({
    queryKey: ["dashboard", "operational-health"],
    queryFn: () => dashboardService.getOperationalHealth(),
    staleTime: 60 * 1000,
    refetchInterval: 120 * 1000,
  })
}

export function useSLABreaches(limit = 10) {
  return useQuery({
    queryKey: ["dashboard", "sla-breaches", limit],
    queryFn: () => dashboardService.getSLABreaches(limit),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}
