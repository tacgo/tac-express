import type { Metadata } from "next"
import { cookies } from "next/headers"

import { createDashboardServerService } from "@workspace/services/server"

import { OpsDashboardLive } from "./ops-dashboard-live"

export const metadata: Metadata = {
  title: "Dashboard — TAC Express Ops Console",
}

export const dynamic = "force-dynamic"

export default async function OpsConsoleDashboardPage() {
  // Server-fetch the initial KPI snapshot exactly like apps/(dashboard)/home
  // does so the page paints with real numbers; the client live wrapper takes
  // over from there.
  const cookieStore = await cookies()
  const dashboardService = createDashboardServerService(cookieStore)
  const initialKpis = await dashboardService.getKPIs().catch(() => ({
    activeShipments: 0,
    inTransit: 0,
    delivered: 0,
    openExceptions: 0,
    totalRevenueToday: 0,
    pendingInvoices: 0,
    activeManifests: 0,
    shipmentsCreatedToday: 0,
  }))

  return <OpsDashboardLive initialKpis={initialKpis} />
}
