"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import type { ScanEvent } from "@workspace/types"

interface ScanLogProps {
  events: ScanEvent[]
  className?: string
}

function ScanLog({ events, className }: ScanLogProps) {
  return (
    <div data-slot="scan-log" className={cn("space-y-1", className)}>
      <p className="font-mono text-2xs uppercase tracking-wider text-muted-foreground mb-2">
        Recent Scans ({events.length})
      </p>
      <div className="border border-border overflow-hidden">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            <p className="font-mono text-xs text-muted-foreground">No scans yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border max-h-64 overflow-y-auto">
            {events.slice(0, 50).map((event) => (
              <div
                key={event.id}
                className={cn(
                  "flex items-center justify-between px-3 py-2",
                  event.error ? "bg-destructive/5" : "bg-card",
                  !event.synced && "opacity-70"
                )}
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="font-mono text-xs font-semibold text-foreground truncate">
                    {event.code}
                  </p>
                  {event.error && (
                    <p className="font-sans text-2xs text-destructive">{event.error}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="font-mono text-2xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                  {!event.synced && (
                    <p className="font-mono text-3xs text-muted-foreground uppercase">queued</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export { ScanLog }
