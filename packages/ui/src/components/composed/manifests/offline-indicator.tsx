"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { RiWifiOffLine, RiRefreshLine } from "@workspace/ui/icons"

interface OfflineIndicatorProps {
  queueCount: number
  isSyncing?: boolean
  onSync?: () => void
  className?: string
}

function OfflineIndicator({ queueCount, isSyncing, onSync, className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  if (isOnline && queueCount === 0) return null

  return (
    <div
      data-slot="offline-indicator"
      className={cn(
        "flex items-center gap-2 border px-3 py-2",
        !isOnline
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-border bg-muted/30 text-muted-foreground",
        className
      )}
    >
      <RiWifiOffLine className="h-4 w-4 shrink-0" />
      <span className="font-mono text-xs">
        {!isOnline ? "Offline" : "Sync pending"}
        {queueCount > 0 && (
          <span className="ml-1 font-bold">— {queueCount} queued</span>
        )}
      </span>
      {isOnline && queueCount > 0 && onSync && (
        <Button
          type="button"
          variant="ghost"
          onClick={onSync}
          disabled={isSyncing}
          className="ml-auto h-auto gap-1 px-1 py-0.5 font-mono text-2xs uppercase tracking-wider hover:bg-transparent hover:text-foreground"
        >
          <RiRefreshLine className={cn("h-3 w-3", isSyncing && "animate-spin")} />
          {isSyncing ? "Syncing" : "Sync now"}
        </Button>
      )}
    </div>
  )
}

export { OfflineIndicator }
