"use client"

import * as React from "react"
import { useHubs } from "@workspace/services/hooks/use-hubs"
import { useHubStore } from "@workspace/services/stores/hub.store"
import { RiBuilding4Line, RiArrowDownSLine } from "@workspace/ui/icons"
import { cn } from "@workspace/ui/lib/utils"

export function HubContextSwitcher({ className }: { className?: string }) {
  const { data: rawHubs, isLoading } = useHubs()
  const hubs = React.useMemo(() => rawHubs ?? [], [rawHubs])
  const { activeHubCode, setActiveHub } = useHubStore()

  const activeHub = hubs.find((h) => h.code === activeHubCode) ?? null

  if (isLoading) {
    return (
      <div className={cn("h-8 w-32 animate-pulse bg-muted border border-border", className)} />
    )
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <label className="sr-only" htmlFor="hub-switcher">Active hub</label>
      <div className="pointer-events-none absolute left-2 flex items-center">
        <RiBuilding4Line className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      </div>
      {/* eslint-disable-next-line no-restricted-syntax -- Native select preserves OS accessibility contract for hub switching; Radix Select adds unnecessary Popover overhead for this compact ops-bar control */}
      <select
        id="hub-switcher"
        value={activeHubCode ?? ""}
        onChange={(e) => setActiveHub(e.target.value || null)}
        className={cn(
          "h-8 pl-7 pr-6 border border-border bg-background",
          "font-mono text-xs uppercase tracking-[0.15em] text-foreground",
          "hover:border-primary/50 focus:outline-none focus:border-primary",
          "appearance-none cursor-pointer transition-colors",
        )}
        aria-label="Switch active hub"
      >
        <option value="">ALL HUBS</option>
        {hubs.map((hub) => (
          <option key={hub.code} value={hub.code}>
            {hub.code} — {hub.city}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-1.5 flex items-center">
        <RiArrowDownSLine className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </div>
      {activeHub && (
        <span className="ml-2 hidden xl:flex items-center gap-1 font-mono text-ui-10 text-muted-foreground tracking-widest uppercase">
          <span className="w-1 h-1 bg-accent-success animate-pulse" />
          {activeHub.name}
        </span>
      )}
    </div>
  )
}
