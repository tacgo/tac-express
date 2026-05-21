"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { Badge } from "@workspace/ui/components/primitives/badge"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/primitives/toggle-group"
import {
  RiCheckboxCircleLine,
  RiAlertLine,
  RiBox3Line,
} from "@workspace/ui/icons"

export type AuditShipmentStatus = "PENDING" | "SCANNED" | "EXCEPTION"

export interface ExpectedShipment {
  awbNumber: string
  consigneeName: string
  consigneeCity?: string
  pieces: number
  weightKg: number
  status: AuditShipmentStatus
  scannedAt?: string
}

type Filter = "all" | "pending" | "scanned" | "exception"

interface ExpectedShipmentsListProps {
  items: ExpectedShipment[]
  /** Mark an item as exception (shortage / damage). */
  onMarkException?: (awb: string) => void
  className?: string
}

export function ExpectedShipmentsList({
  items,
  onMarkException,
  className,
}: ExpectedShipmentsListProps) {
  const [filter, setFilter] = React.useState<Filter>("all")

  const filtered = React.useMemo(() => {
    if (filter === "all") return items
    if (filter === "pending") return items.filter((i) => i.status === "PENDING")
    if (filter === "scanned") return items.filter((i) => i.status === "SCANNED")
    return items.filter((i) => i.status === "EXCEPTION")
  }, [filter, items])

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === "PENDING").length,
    scanned: items.filter((i) => i.status === "SCANNED").length,
    exception: items.filter((i) => i.status === "EXCEPTION").length,
  }

  return (
    <section
      data-slot="expected-shipments-list"
      className={cn("flex flex-col gap-3", className)}
    >
      <header className="flex items-center justify-between gap-3">
        <p className="font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
          Expected shipments
        </p>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as Filter)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="all" aria-label="All">
            <span className="font-mono text-paper-10 uppercase tracking-widest">
              All · {counts.all}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem value="pending" aria-label="Pending">
            <span className="font-mono text-paper-10 uppercase tracking-widest">
              Pending · {counts.pending}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem value="scanned" aria-label="Scanned">
            <span className="font-mono text-paper-10 uppercase tracking-widest">
              Scanned · {counts.scanned}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem value="exception" aria-label="Exception">
            <span className="font-mono text-paper-10 uppercase tracking-widest">
              Exception · {counts.exception}
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </header>

      <div className="border border-border bg-background">
        <ScrollArea className="h-96">
          {filtered.length === 0 ? (
            <div className="flex h-96 items-center justify-center font-mono text-paper-10 uppercase tracking-widest text-muted-foreground">
              {items.length === 0 ? "No manifest loaded" : "No matches"}
            </div>
          ) : (
            <ul>
              {filtered.map((it) => (
                <li
                  key={it.awbNumber}
                  data-status={it.status}
                  className={cn(
                    "flex items-center gap-3 border-b border-border/50 px-3 py-2 last:border-b-0",
                    it.status === "SCANNED" && "bg-status-success/5",
                    it.status === "EXCEPTION" && "bg-destructive/5"
                  )}
                >
                  <span className="flex size-7 items-center justify-center border border-border bg-background">
                    {it.status === "SCANNED" ? (
                      <RiCheckboxCircleLine className="size-4 text-status-success" />
                    ) : it.status === "EXCEPTION" ? (
                      <RiAlertLine className="size-4 text-destructive" />
                    ) : (
                      <RiBox3Line className="size-4 text-muted-foreground" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <a
                      href={`/tracking?cn=${encodeURIComponent(it.awbNumber)}`}
                      className="block truncate font-mono text-paper-11 font-semibold tracking-widest hover:underline"
                    >
                      {it.awbNumber}
                    </a>
                    <p className="truncate text-xs text-muted-foreground">
                      {it.consigneeName}
                      {it.consigneeCity ? ` · ${it.consigneeCity}` : ""}
                    </p>
                  </div>

                  <span className="hidden font-mono text-paper-10 uppercase tracking-widest text-muted-foreground sm:inline">
                    {it.pieces} pcs · {it.weightKg.toFixed(1)}kg
                  </span>

                  {it.status === "PENDING" && onMarkException && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkException(it.awbNumber)}
                      className="font-mono text-paper-10 uppercase tracking-widest"
                    >
                      Mark exception
                    </Button>
                  )}
                  {it.status === "EXCEPTION" && (
                    <Badge variant="destructive" className="font-mono">
                      Exception
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </section>
  )
}
