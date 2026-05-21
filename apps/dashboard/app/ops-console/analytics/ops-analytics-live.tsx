"use client"

import * as React from "react"

import { useAnalyticsKpis } from "@workspace/services/hooks/use-orbital"
import type { AnalyticsKpis as DomainAnalyticsKpis } from "@workspace/types/orbital"
import {
  OpsAnalyticsView,
  type AnalyticsKpis,
} from "@workspace/ui/components/composed/ops-console/pages"

function toKpis(k: DomainAnalyticsKpis | undefined): AnalyticsKpis {
  return {
    totalShipments: k?.totalShipments.value ?? 0,
    totalRevenue: `₹${(k?.totalRevenue.value ?? 0).toLocaleString("en-IN")}`,
    delivered: k?.delivered.value ?? 0,
    deliveryRate: Math.round((k?.delivered.rate ?? 0) * 100),
    inTransit: k?.inTransit.value ?? 0,
    openExceptions: k?.openExceptions.value ?? 0,
    avgDeliveryDays:
      k?.avgDeliveryDays.value == null ? "N/A" : String(k.avgDeliveryDays.value),
  }
}

export function OpsAnalyticsLive() {
  const { data } = useAnalyticsKpis()
  return <OpsAnalyticsView kpis={toKpis(data)} />
}
