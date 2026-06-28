"use client"

import * as React from "react"

import { useAnalyticsKpis } from "@workspace/services/hooks/use-orbital"
import type { AnalyticsKpis as DomainAnalyticsKpis } from "@workspace/types/orbital"
import {
  V7OpsAnalytics,
  type AnalyticsKpis,
} from "@workspace/ui/components/composed/analytics/v7-ops-analytics"

function toKpis(k: DomainAnalyticsKpis | undefined): AnalyticsKpis {
  return {
    totalShipments: k?.totalShipments.value ?? 0,
    totalRevenue: `₹${(k?.totalRevenue.value ?? 0).toLocaleString("en-IN")}`,
    delivered: k?.delivered.value ?? 0,
    deliveryRate: Math.round((k?.delivered.rate ?? 0) * 100),
    inTransit: k?.inTransit.value ?? 0,
    openExceptions: k?.openExceptions.value ?? 0,
    avgDeliveryDays:
      k?.avgDeliveryDays.value == null
        ? "N/A"
        : String(k.avgDeliveryDays.value),
  }
}

export function OpsAnalyticsLive() {
  const { data, isLoading, isError, dataUpdatedAt, refetch } =
    useAnalyticsKpis()
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : undefined

  return (
    <V7OpsAnalytics
      kpis={toKpis(data)}
      isLoading={isLoading}
      isError={isError}
      lastUpdated={lastUpdated}
      onRefresh={() => void refetch()}
    />
  )
}
