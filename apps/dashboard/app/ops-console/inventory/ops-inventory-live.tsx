"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useInventoryByHub } from "@workspace/services/hooks/use-analytics"
import type { HubInventoryItem } from "@workspace/types"
import {
  V7OpsInventory,
  type HubInventory,
} from "@workspace/ui/components/composed/inventory/v7-ops-inventory"

function toHub(h: HubInventoryItem): HubInventory {
  return {
    // Normalize whitespace into underscores so the view can pin
    // defaults by canonical code (e.g. "NEW_DELHI").
    hubCode: h.hub.replace(/\s+/g, "_").toUpperCase(),
    pieces: h.total,
    rows: [
      { label: "Created / Pending", value: h.created },
      { label: "In Transit", value: h.inTransit },
      { label: "Arrived at Hub", value: h.receivedAtDest },
      { label: "Out for Delivery", value: h.outForDelivery },
      { label: "Exceptions", value: h.exception },
    ],
  }
}

/**
 * Client wrapper — renders the canonical v7 `<V7OpsInventory />`. The v6 paper
 * view was retired in the Phase 5 composition unification (one component per
 * route). Consumes `useInventoryByHub()`.
 */
export function OpsInventoryLive() {
  const queryClient = useQueryClient()
  const { data, isFetching } = useInventoryByHub()

  const handleRefresh = React.useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["analytics", "inventory-by-hub"],
    })
  }, [queryClient])

  // Memoize data mapping to prevent unnecessary re-renders
  const hubs = React.useMemo(() => (data ?? []).map(toHub), [data])

  return (
    <V7OpsInventory hubs={hubs} isLoading={isFetching} onRefresh={handleRefresh} />
  )
}
