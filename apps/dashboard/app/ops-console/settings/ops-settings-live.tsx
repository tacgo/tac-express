"use client"

import * as React from "react"

import { useSession } from "@workspace/ui/hooks/use-session"
import { useInventoryByHub } from "@workspace/services/hooks/use-analytics"
import { V7OpsSettings } from "@workspace/ui/components/composed/settings/v7-ops-settings"

export function OpsSettingsLive() {
  const { user } = useSession()
  // Profile fields come from `user.user_metadata` on the Supabase user record.
  const email = user?.email ?? "admin@tac.app"
  const meta = (user?.user_metadata ?? {}) as { display_name?: string; hub_code?: string }
  const displayName = meta.display_name ?? ""
  const hubCode = meta.hub_code ?? ""

  const pendingItems = [
    !displayName ? "Display name" : null,
    !hubCode ? "Hub code" : null,
  ].filter(Boolean) as string[]
  const completionPct = Math.round(
    ((2 - pendingItems.length) / 2) * 100,
  )

  // Pull the same hub data the Inventory page uses so the Hubs settings tab
  // can list external hubs (those discovered from shipment data but not yet
  // in the operator's configured list) for delete/rename.
  const inventoryQuery = useInventoryByHub()
  const discoveredHubs = React.useMemo<string[]>(() => {
    const list = inventoryQuery.data ?? []
    return list.map((h) => h.hub.replace(/\s+/g, "_").toUpperCase())
  }, [inventoryQuery.data])

  return (
    <V7OpsSettings
      email={email}
      displayName={displayName}
      hubCode={hubCode}
      completionPct={completionPct}
      pendingItems={pendingItems}
      version="TAC Express v1.0"
      environment={process.env.NODE_ENV === "production" ? "production" : "development"}
      discoveredHubs={discoveredHubs}
    />
  )
}
