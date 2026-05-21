"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { ShipmentStatus } from "@workspace/types"

/**
 * Paper-aesthetic shipment status stepper. Mirrors v6 `ShipmentStepper` 1:1 in
 * sequence + terminal handling, restyled in paper tokens (square dots, violet
 * trail, mono uppercase labels).
 */

const STATUS_ORDER: ShipmentStatus[] = [
  ShipmentStatus.CREATED,
  ShipmentStatus.PICKUP_SCHEDULED,
  ShipmentStatus.PICKED_UP,
  ShipmentStatus.RECEIVED_AT_ORIGIN,
  ShipmentStatus.IN_TRANSIT,
  ShipmentStatus.RECEIVED_AT_DEST,
  ShipmentStatus.OUT_FOR_DELIVERY,
  ShipmentStatus.DELIVERED,
]

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED: "Created",
  PICKUP_SCHEDULED: "Pickup",
  PICKED_UP: "Picked Up",
  RECEIVED_AT_ORIGIN: "Origin Hub",
  IN_TRANSIT: "In Transit",
  RECEIVED_AT_DEST: "Dest. Hub",
  OUT_FOR_DELIVERY: "OFD",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RTO: "RTO",
  EXCEPTION: "Exception",
}

interface OpsShipmentStepperProps {
  currentStatus: ShipmentStatus
  className?: string
}

export function OpsShipmentStepper({
  currentStatus,
  className,
}: OpsShipmentStepperProps) {
  const isTerminal =
    currentStatus === ShipmentStatus.CANCELLED ||
    currentStatus === ShipmentStatus.RTO ||
    currentStatus === ShipmentStatus.EXCEPTION

  if (isTerminal) {
    return (
      <div
        data-slot="ops-shipment-stepper-terminal"
        className={cn("flex items-center gap-2 py-3", className)}
      >
        <span aria-hidden className="h-4 w-4 bg-paper-err flex-shrink-0" />
        <span className="font-paper-mono text-paper-err uppercase tracking-[length:var(--tracking-badge)] text-[length:var(--text-ui-12)]">
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>
    )
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div
      data-slot="ops-shipment-stepper"
      className={cn(
        "flex items-start gap-0 overflow-x-auto pb-1",
        className,
      )}
    >
      {STATUS_ORDER.map((status, idx) => {
        const isDone = idx < currentIndex
        const isCurrent = idx === currentIndex
        const isFuture = idx > currentIndex
        const isLast = idx === STATUS_ORDER.length - 1
        return (
          <div key={status} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "h-3 w-3 border flex-shrink-0",
                  isDone && "bg-paper-violet border-paper-violet",
                  isCurrent && "bg-paper-violet-50 border-paper-violet",
                  isFuture && "bg-paper-card border-paper-line",
                )}
              />
              <span
                className={cn(
                  "font-paper-mono uppercase tracking-[length:var(--tracking-badge)] whitespace-nowrap max-w-14 text-center leading-tight",
                  "text-[length:var(--text-ui-10)]",
                  isDone && "text-paper-violet",
                  isCurrent && "text-paper-violet font-bold",
                  isFuture && "text-paper-fg-3",
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-px w-8 mb-4 flex-shrink-0",
                  idx < currentIndex ? "bg-paper-violet" : "bg-paper-line",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
