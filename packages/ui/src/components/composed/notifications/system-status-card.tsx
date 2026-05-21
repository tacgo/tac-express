import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiSignalTowerLine } from "@workspace/ui/icons"

export type ServiceStatus = "ok" | "warn" | "down"
export interface ServiceState {
  label: string
  status: ServiceStatus
}

interface SystemStatusCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** When omitted, defaults to the canonical 5-service snapshot all-OK. */
  services?: ServiceState[]
}

const DEFAULT_SERVICES: ServiceState[] = [
  { label: "API", status: "ok" },
  { label: "Database", status: "ok" },
  { label: "Realtime", status: "ok" },
  { label: "PDF service", status: "ok" },
  { label: "Webhooks", status: "ok" },
]

/**
 * SystemStatusCard — operator-facing platform health snapshot. The
 * "did I miss something?" mental model maps to "is the platform OK?",
 * so the card lives in the notifications sidebar by default. Renders
 * an animate-skeleton-pulse dot tinted by overall status plus a list
 * of services with operational / degraded / incident state per row.
 *
 * Accepts a `services` prop so future wiring (Supabase realtime
 * heartbeat + edge-function health checks) can pass live data without
 * changing the consumer site.
 */
export function SystemStatusCard({
  services = DEFAULT_SERVICES,
  className,
  ...props
}: SystemStatusCardProps) {
  // Empty `services` must NOT report "all systems normal" — that's a
  // false-positive health signal. Treat the empty case as "unknown" so
  // an operator never reads a comforting status from a missing feed.
  const hasServices = services.length > 0
  const hasDown = services.some((s) => s.status === "down")
  const allOk = hasServices && services.every((s) => s.status === "ok")

  const overall = !hasServices
    ? "Status unavailable"
    : allOk
      ? "All systems normal"
      : hasDown
        ? "Service incident"
        : "Degraded performance"
  const pulseTone = !hasServices
    ? "bg-muted-foreground"
    : allOk
      ? "bg-accent-success"
      : hasDown
        ? "bg-accent-danger"
        : "bg-accent-warning"

  return (
    <div
      data-slot="system-status-card"
      className={cn("tac-fui-panel space-y-3 bg-card p-5", className)}
      {...props}
    >
      <p className="flex items-center gap-2 border-b border-border pb-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        <RiSignalTowerLine className="size-3.5" aria-hidden="true" />
        System status
      </p>

      <div className="flex items-center gap-2">
        <span className="relative inline-flex">
          <span className={cn("size-2", pulseTone)} aria-hidden="true" />
          <span
            className={cn("absolute inset-0 size-2 opacity-60 animate-skeleton-pulse", pulseTone)}
            aria-hidden="true"
          />
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-foreground">
          {overall}
        </span>
      </div>

      <ul className="space-y-1 pt-1">
        {services.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between py-0.5 font-mono text-2xs uppercase tracking-widest"
          >
            <span className="text-muted-foreground">{s.label}</span>
            <span
              className={
                s.status === "ok"
                  ? "text-accent-success"
                  : s.status === "warn"
                    ? "text-accent-warning"
                    : "text-accent-danger"
              }
            >
              {s.status === "ok"
                ? "● operational"
                : s.status === "warn"
                  ? "⚠ degraded"
                  : "✖ incident"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
