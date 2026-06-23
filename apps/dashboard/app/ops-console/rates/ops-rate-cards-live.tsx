"use client"

import * as React from "react"

import { useRateCards } from "@workspace/services/hooks/use-rate-cards"
import type { RateCard } from "@workspace/types"
import {
  V7OpsRateCards,
  type RateCardRow,
} from "@workspace/ui/components/composed/rates/v7-ops-rate-cards"

function toRow(rc: RateCard): RateCardRow {
  return {
    route: `${rc.originHub.replace(/_/g, " ")} → ${rc.destHub.replace(/_/g, " ")}`,
    service: rc.serviceLevel === "PRIORITY" || rc.serviceLevel === "EXPRESS" ? "Priority" : "Standard",
    slab:
      rc.weightSlabMax === Number.POSITIVE_INFINITY
        ? `${rc.weightSlabMin}–∞`
        : `${rc.weightSlabMin}–${rc.weightSlabMax}`,
    rate: `₹${rc.ratePerKg}`,
    docket: `₹${rc.docketCharge}`,
    fuelPct: `${rc.fuelSurchargePct}%`,
    handling: `₹${rc.handlingFee}`,
  }
}

export function OpsRateCardsLive() {
  const { data } = useRateCards({ isActive: true })
  // Memoise the data mapping so the array reference remains stable across renders.
  // This prevents the composed v7 list components from triggering expensive
  // deep updates or resetting internal state while the query is refetching.
  const rows = React.useMemo(() => (data ?? []).map(toRow), [data])
  // Canonical v7 composition — the v6 paper view was retired in the Phase 4
  // composition unification (one component per route, no design-version fork).
  return <V7OpsRateCards rows={rows} />
}
