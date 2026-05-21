"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  useBookings,
  useApproveBooking,
  useRejectBooking,
  useConvertBookingToShipment,
} from "@workspace/services/hooks/use-bookings"
import { useNotificationStore } from "@workspace/services/stores/notification.store"

import { PageHeader } from "@workspace/ui/components/composed/page-header"
import {
  BookingsInbox,
  type BookingRow,
} from "@workspace/ui/components/composed/bookings/bookings-inbox"

export function BookingsClient() {
  const router = useRouter()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const { data: bookings = [], isLoading } = useBookings({ limit: 200 })
  const approve = useApproveBooking()
  const reject = useRejectBooking()
  const convert = useConvertBookingToShipment()

  const rows: BookingRow[] = React.useMemo(
    () =>
      bookings.map((b) => {
        const totalCount = b.volumeMatrix.reduce((s, r) => s + r.count, 0)
        const totalWeight = b.volumeMatrix.reduce(
          (s, r) => s + r.weight * r.count,
          0
        )
        return {
          id: b.id,
          status: b.status,
          whatsappNumber: b.whatsappNumber,
          consignor: {
            name: b.consignor.name,
            phone: b.consignor.phone,
            city: b.consignor.city,
            state: b.consignor.state,
          },
          consignee: {
            name: b.consignee.name,
            phone: b.consignee.phone,
            city: b.consignee.city,
            state: b.consignee.state,
          },
          totalCount,
          totalWeight,
          awbNumber: b.awbNumber,
          shipmentId: b.shipmentId,
          rejectedReason: b.rejectedReason,
          notes: b.notes,
          createdAt: b.createdAt,
        }
      }),
    [bookings]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        overline="Operations"
        title="Booking inbox"
        description="Public booking requests. Approve, reject, or convert to shipments."
      />

      <BookingsInbox
        bookings={rows}
        loading={isLoading}
        onApprove={async (id) => {
          try {
            await approve.mutateAsync(id)
            addNotification({
              type: "success",
              title: "Approved",
              message: "Booking approved. Ready to convert to shipment.",
            })
          } catch (err) {
            addNotification({
              type: "error",
              title: "Approve failed",
              message: String(err),
            })
          }
        }}
        onReject={async (id, reason) => {
          try {
            await reject.mutateAsync({ id, reason })
            addNotification({
              type: "success",
              title: "Rejected",
              message: "The customer will be notified via WhatsApp.",
            })
          } catch (err) {
            addNotification({
              type: "error",
              title: "Reject failed",
              message: String(err),
            })
          }
        }}
        onConvert={async (id) => {
          try {
            const result = await convert.mutateAsync(id)
            addNotification({
              type: "success",
              title: "Converted",
              message: `Shipment ${result.awbNumber} created.`,
            })
            router.push(`/shipments/${result.shipmentId}`)
          } catch (err) {
            addNotification({
              type: "error",
              title: "Convert failed",
              message: String(err),
            })
          }
        }}
      />
    </div>
  )
}
