"use client"

import * as React from "react"

import { useRateCards } from "@workspace/services/hooks/use-rate-cards"
import type { RateCard } from "@workspace/types"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"
import {
  OpsRateCardsView,
  type RateCardRow,
} from "@workspace/ui/components/composed/ops-console/pages"
import { V7OpsRateCards } from "@workspace/ui/components/composed/rates/v7-ops-rate-cards"

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
  const { data = [] } = useRateCards({ isActive: true })
  const { version } = useDesignVersion()
  const rows = data.map(toRow)
  if (version === "v7") return <V7OpsRateCards rows={rows} />
  return <OpsRateCardsView rows={rows} />
}
