"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"
import { ShipmentStatus } from "@workspace/types"

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

interface ShipmentStepperProps {
  currentStatus: ShipmentStatus
  className?: string
}

function ShipmentStepper({ currentStatus, className }: ShipmentStepperProps) {
  const isTerminal =
    currentStatus === ShipmentStatus.CANCELLED ||
    currentStatus === ShipmentStatus.RTO ||
    currentStatus === ShipmentStatus.EXCEPTION

  if (isTerminal) {
    return (
      <div className={cn("flex items-center gap-2 py-3", className)}>
        <span className="h-4 w-4 bg-destructive flex-shrink-0" />
        <span className="font-mono text-2xs text-destructive uppercase tracking-wider">
          {STATUS_LABELS[currentStatus]}
        </span>
      </div>
    )
  }

  const currentIndex = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div data-slot="shipment-stepper" className={cn("flex items-start gap-0 overflow-x-auto", className)}>
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
                  isDone && "bg-primary border-primary",
                  isCurrent && "bg-primary/30 border-primary",
                  isFuture && "bg-background border-border"
                )}
              />
              <span
                className={cn(
                  "font-mono text-3xs uppercase tracking-wider whitespace-nowrap max-w-14 text-center leading-tight",
                  isDone && "text-primary",
                  isCurrent && "text-primary font-bold",
                  isFuture && "text-muted-foreground"
                )}
              >
                {STATUS_LABELS[status]}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-px w-8 mb-4 flex-shrink-0",
                  idx < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export { ShipmentStepper }
