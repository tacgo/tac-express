"use client"



import * as React from "react"
import Link from "next/link"
import { format, parseISO } from "date-fns"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/primitives/input"
import { Label } from "@workspace/ui/components/primitives/label"
import { Textarea } from "@workspace/ui/components/primitives/textarea"
import { Badge } from "@workspace/ui/components/primitives/badge"
import { ScrollArea } from "@workspace/ui/components/primitives/scroll-area"
import { EmptyState } from "@workspace/ui/components/primitives/empty-state"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/primitives/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/primitives/alert-dialog"
import {
  RiSendPlaneLine,
  RiCheckLine,
  RiCloseLine,
  RiArrowRightLine,
  RiBox3Line,
  RiPhoneLine,
} from "@workspace/ui/icons"

export type BookingStatus = "PENDING" | "APPROVED" | "CONVERTED" | "REJECTED"

export interface BookingRow {
  id: string
  status: BookingStatus
  whatsappNumber: string
  consignor: { name: string; phone: string; city: string; state: string }
  consignee: { name: string; phone: string; city: string; state: string }
  totalCount: number
  totalWeight: number
  awbNumber?: string
  shipmentId?: string
  rejectedReason?: string
  notes?: string
  createdAt: string
}

interface BookingsInboxProps {
  bookings: BookingRow[]
  loading?: boolean
  onApprove?: (id: string) => Promise<void> | void
  onReject?: (id: string, reason: string) => Promise<void> | void
  onConvert?: (id: string) => Promise<void> | void
  className?: string
}

const STATUS_TONE: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  APPROVED: "secondary",
  CONVERTED: "default",
  REJECTED: "destructive",
}

export function BookingsInbox({
  bookings,
  loading,
  onApprove,
  onReject,
  onConvert,
  className,
}: BookingsInboxProps) {
  const [tab, setTab] = React.useState<BookingStatus | "ALL">("PENDING")
  const [rejectingId, setRejectingId] = React.useState<string | null>(null)
  const [rejectReason, setRejectReason] = React.useState("")
  const [search, setSearch] = React.useState("")

  const counts = React.useMemo(() => {
    const c: Record<BookingStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      CONVERTED: 0,
      REJECTED: 0,
    }
    for (const b of bookings) c[b.status] += 1
    return c
  }, [bookings])

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase()
    return bookings.filter((b) => {
      if (tab !== "ALL" && b.status !== tab) return false
      if (!term) return true
      return (
        b.consignor.name.toLowerCase().includes(term) ||
        b.consignee.name.toLowerCase().includes(term) ||
        b.whatsappNumber.includes(term) ||
        b.awbNumber?.toLowerCase().includes(term)
      )
    })
  }, [bookings, tab, search])

  return (
    <section
      data-slot="bookings-inbox"
      className={cn("space-y-4", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid grid-cols-5">
            <TabsTrigger value="PENDING">
              Pending
              {counts.PENDING > 0 && (
                <Badge variant="destructive" className="ml-1.5 font-mono">
                  {counts.PENDING}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="APPROVED">
              Approved
              {counts.APPROVED > 0 && (
                <Badge variant="secondary" className="ml-1.5 font-mono">
                  {counts.APPROVED}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="CONVERTED">Converted</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            <TabsTrigger value="ALL">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, phone, AWB…"
          className="w-full max-w-xs"
        />
      </div>

      <Tabs value={tab}>
        <TabsContent value={tab}>
          <div className="border border-border bg-background">
            {/* eslint-disable-next-line no-restricted-syntax -- design-locked: see docs/design-exceptions.md */}
            <ScrollArea className="max-h-[70vh]">
              {loading ? (
                <div className="flex items-center justify-center py-12 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
                  Loading bookings…
                </div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  label={tab === "PENDING" ? "Queue clear" : "No results"}
                  icon={<RiBox3Line />}
                  title="No bookings"
                  description={
                    tab === "PENDING"
                      ? "Inbox is clear. New booking requests will land here."
                      : "Nothing to show in this view."
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((b) => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      onApprove={onApprove}
                      onReject={(id) => {
                        setRejectingId(id)
                        setRejectReason("")
                      }}
                      onConvert={onConvert}
                    />
                  ))}
                </ul>
              )}
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={rejectingId !== null}
        onOpenChange={(o) => !o && setRejectingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject booking?</AlertDialogTitle>
            <AlertDialogDescription>
              The customer will be notified via WhatsApp with your reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. We don't currently service this corridor."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (rejectingId && rejectReason.trim() && onReject) {
                  await onReject(rejectingId, rejectReason.trim())
                  setRejectingId(null)
                  setRejectReason("")
                }
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

function BookingRow({
  booking,
  onApprove,
  onReject,
  onConvert,
}: {
  booking: BookingRow
  onApprove?: (id: string) => Promise<void> | void
  onReject?: (id: string) => void
  onConvert?: (id: string) => Promise<void> | void
}) {
  return (
    <li className="grid gap-3 px-4 py-3 lg:grid-cols-[220px_1fr_auto] lg:items-center">
      {/* Left: party summary */}
      <div className="grid gap-1">
        <Badge variant={STATUS_TONE[booking.status]} className="w-fit font-mono">
          {booking.status}
        </Badge>
        <p className="font-mono text-ui-11 tracking-widest">
          {format(parseISO(booking.createdAt), "dd MMM · HH:mm")}
        </p>
        <p className="flex items-center gap-1 font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          <RiPhoneLine className="size-3" />
          {booking.whatsappNumber}
        </p>
      </div>

      {/* Middle: route + cargo */}
      <div className="grid gap-1">
        <p className="text-sm">
          <span className="font-semibold">{booking.consignor.name}</span>
          <span className="font-mono text-ui-10 uppercase text-muted-foreground">
            {" "}
            · {booking.consignor.city}, {booking.consignor.state}
          </span>
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <RiArrowRightLine className="size-3" />
          <span className="font-semibold text-foreground">
            {booking.consignee.name}
          </span>
          <span className="font-mono text-ui-10 uppercase">
            · {booking.consignee.city}, {booking.consignee.state}
          </span>
        </p>
        <p className="font-mono text-ui-10 uppercase tracking-widest text-muted-foreground">
          {booking.totalCount} pcs · {booking.totalWeight.toFixed(1)} kg
          {booking.awbNumber && (
            <>
              {" "}· AWB{" "}
              <Link
                href={`/shipments/${booking.shipmentId ?? ""}`}
                className="font-mono font-semibold text-primary hover:underline"
              >
                {booking.awbNumber}
              </Link>
            </>
          )}
        </p>
        {booking.notes && (
          <p className="text-xs text-muted-foreground">{booking.notes}</p>
        )}
        {booking.rejectedReason && (
          <p className="font-mono text-ui-11 text-destructive">
            Rejected · {booking.rejectedReason}
          </p>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {booking.status === "PENDING" && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onApprove?.(booking.id)}
              disabled={!onApprove}
            >
              <RiCheckLine />
              Approve
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onReject?.(booking.id)}
              disabled={!onReject}
            >
              <RiCloseLine />
              Reject
            </Button>
          </>
        )}
        {booking.status === "APPROVED" && (
          <Button
            type="button"
            size="sm"
            onClick={() => onConvert?.(booking.id)}
            disabled={!onConvert}
          >
            <RiSendPlaneLine />
            Convert to shipment
          </Button>
        )}
        {booking.status === "CONVERTED" && booking.shipmentId && (
          <Link
            href={`/shipments/${booking.shipmentId}`}
            className="inline-flex h-8 items-center gap-2 border border-border px-3 font-mono text-ui-10 uppercase tracking-widest text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            View shipment
            <RiArrowRightLine className="size-3.5" />
          </Link>
        )}
      </div>
    </li>
  )
}
