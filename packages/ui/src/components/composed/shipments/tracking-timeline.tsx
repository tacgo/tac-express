import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import type { TrackingEvent } from "@workspace/types"

interface TrackingTimelineProps {
  events: TrackingEvent[]
  className?: string
}

function TrackingTimeline({ events, className }: TrackingTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div data-slot="tracking-timeline" className={cn("space-y-0", className)}>
      {sorted.map((event, idx) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 shrink-0 bg-primary mt-1" />
            {idx < sorted.length - 1 && (
              <div className="w-px flex-1 min-h-6 bg-border mt-1" />
            )}
          </div>
          <div className="pb-5 min-w-0">
            <p className="font-sans text-sm font-medium text-foreground leading-tight">
              {event.status.replace(/_/g, " ")}
            </p>
            {event.location && (
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                {event.location}
              </p>
            )}
            {event.description && (
              <p className="font-sans text-xs text-muted-foreground mt-0.5">
                {event.description}
              </p>
            )}
            <p className="font-mono text-2xs text-muted-foreground mt-1">
              {new Date(event.createdAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
      {sorted.length === 0 && (
        <p className="font-sans text-sm text-muted-foreground py-4">
          No tracking events yet.
        </p>
      )}
    </div>
  )
}

export { TrackingTimeline }
