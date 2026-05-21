"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"

import { useInventoryByHub } from "@workspace/services/hooks/use-analytics"
import type { HubInventoryItem } from "@workspace/types"
import { useDesignVersion } from "@workspace/ui/hooks/use-design-version"
import {
  OpsInventoryView,
  type HubInventory,
} from "@workspace/ui/components/composed/ops-console/pages"
import { V7OpsInventory } from "@workspace/ui/components/composed/inventory/v7-ops-inventory"

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
 * Client wrapper. Branches on the design-version flag:
 *   - v6 (default) → Paper Ops Console `<OpsInventoryView />`
 *   - v7           → Violet-Grid v7 `<V7OpsInventory />` (Phase 2d)
 *
 * Both views consume the same `useInventoryByHub()` hook.
 * Rollback: `localStorage.setItem('tac-design','v6'); location.reload()`.
 */
export function OpsInventoryLive() {
  const queryClient = useQueryClient()
  const { data = [], isFetching } = useInventoryByHub()
  const { version } = useDesignVersion()

  const handleRefresh = React.useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["analytics", "inventory-by-hub"],
    })
  }, [queryClient])

  const hubs = data.map(toHub)

  if (version === "v7") {
    return (
      <V7OpsInventory
        hubs={hubs}
        isLoading={isFetching}
        onRefresh={handleRefresh}
      />
    )
  }

  return (
    <OpsInventoryView
      hubs={hubs}
      isLoading={isFetching}
      onRefresh={handleRefresh}
    />
  )
}
