// Public booking intake — customers submit booking requests without auth,
// staff review them in the admin /bookings inbox and convert approved ones
// into real shipments.
//
// The `bookings` table is added in migration 20260501000008_bookings_intake.sql.
// Until then, list returns [] and create surfaces a friendly error.

import type { SupabaseClient } from "@workspace/database/supabase.types"

import { isMissingRpcOrRelation } from "./shared/rpc-errors"
import { captureSupabaseRpcError } from "./shared/with-rpc"

export type BookingStatus = "PENDING" | "APPROVED" | "CONVERTED" | "REJECTED"

export interface VolumeMatrixRow {
  length: number
  width: number
  height: number
  weight: number
  count: number
}

export interface BookingParty {
  name: string
  phone: string
  email?: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  zip: string
}

export interface Booking {
  id: string
  status: BookingStatus
  whatsappNumber: string
  consignor: BookingParty
  consignee: BookingParty
  volumeMatrix: VolumeMatrixRow[]
  images: string[]
  notes?: string
  /** When the booking was converted into a real shipment. */
  shipmentId?: string
  /** AWB allocated when converted (mirror of shipments.awb_number). */
  awbNumber?: string
  rejectedReason?: string
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BookingInput {
  whatsappNumber: string
  consignor: BookingParty
  consignee: BookingParty
  volumeMatrix: VolumeMatrixRow[]
  images?: string[]
  notes?: string
}

export interface BookingFilters {
  status?: BookingStatus[]
  search?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}

function isMissingTable(error: { message?: string }): boolean {
  return /does not exist|relation/i.test(error.message ?? "")
}

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    status: (row.status as BookingStatus) ?? "PENDING",
    whatsappNumber: row.whatsapp_number as string,
    consignor: row.consignor as BookingParty,
    consignee: row.consignee as BookingParty,
    volumeMatrix: (row.volume_matrix as VolumeMatrixRow[]) ?? [],
    images: (row.images as string[]) ?? [],
    notes: row.notes as string | undefined,
    shipmentId: row.shipment_id as string | undefined,
    awbNumber: row.awb_number as string | undefined,
    rejectedReason: row.rejected_reason as string | undefined,
    reviewedBy: row.reviewed_by as string | undefined,
    reviewedAt: row.reviewed_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createBookingService(db: SupabaseClient) {
  return {
    async listBookings(filters: BookingFilters = {}): Promise<Booking[]> {
      let query = db
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 100)

      if (filters.status?.length) {
        query = query.in("status", filters.status)
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo)
      }

      const { data, error } = await query
      if (error) {
        if (isMissingTable(error)) return []
        throw error
      }
      return (data ?? []).map((row) =>
        mapBooking(row as Record<string, unknown>)
      )
    },

    async getBookingById(id: string): Promise<Booking | null> {
      const { data, error } = await db
        .from("bookings")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (error) {
        if (isMissingTable(error)) return null
        throw error
      }
      return data ? mapBooking(data as Record<string, unknown>) : null
    },

    /** Public-facing — anonymous insert. Returns the created row. */
    async createBooking(input: BookingInput): Promise<Booking> {
      const { data, error } = await db
        .from("bookings")
        .insert({
          whatsapp_number: input.whatsappNumber,
          consignor: input.consignor,
          consignee: input.consignee,
          volume_matrix: input.volumeMatrix,
          images: input.images ?? [],
          notes: input.notes ?? null,
          status: "PENDING",
        })
        .select("*")
        .single()
      if (error) throw error
      return mapBooking(data as Record<string, unknown>)
    },

    async approveBooking(id: string): Promise<Booking> {
      const { data, error } = await db
        .from("bookings")
        .update({
          status: "APPROVED",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw error
      return mapBooking(data as Record<string, unknown>)
    },

    async rejectBooking(id: string, reason: string): Promise<Booking> {
      const { data, error } = await db
        .from("bookings")
        .update({
          status: "REJECTED",
          rejected_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw error
      return mapBooking(data as Record<string, unknown>)
    },

    /**
     * Convert an APPROVED booking into a real shipment. Tries the
     * `convert_booking_to_shipment` Postgres RPC for atomic
     * (insert shipment + update booking) semantics; falls back to a
     * client-side two-step insert + update when the RPC isn't
     * deployed.
     *
     * Fallback discriminator (issue #19): only fall through when the
     * RPC is missing from the schema cache. RLS denials, constraint
     * violations, FK errors, and business-logic rejections all
     * re-throw — bypassing those via the JS path would silently void
     * future server-side rules.
     */
    async convertBookingToShipment(
      bookingId: string
    ): Promise<{ shipmentId: string; awbNumber: string }> {
      const rpc = await db.rpc("convert_booking_to_shipment", {
        p_booking_id: bookingId,
      })
      if (!rpc.error && rpc.data) {
        const out = rpc.data as { shipment_id: string; awb_number: string }
        return {
          shipmentId: out.shipment_id,
          awbNumber: out.awb_number,
        }
      }
      if (rpc.error && !isMissingRpcOrRelation(rpc.error)) {
        // SELECTIVE adoption per audit doc § 3.2: emit only on the real-error
        // branch. The fallback below is normal business state during issue
        // #19 migration window — instrumenting it would saturate rule 4.
        captureSupabaseRpcError("convert_booking_to_shipment", rpc.error)
        throw rpc.error
      }

      // Fallback: read the booking, build a minimal shipment, link the two.
      const booking = await this.getBookingById(bookingId)
      if (!booking) throw new Error("Booking not found")

      const totalWeight = booking.volumeMatrix.reduce(
        (s, r) => s + r.weight * r.count,
        0
      )
      const totalCount = booking.volumeMatrix.reduce(
        (s, r) => s + r.count,
        0
      )

      const { data: shipment, error: shipmentError } = await db
        .from("shipments")
        .insert({
          sender_name: booking.consignor.name,
          sender_phone: booking.consignor.phone,
          sender_pincode: booking.consignor.zip,
          receiver_name: booking.consignee.name,
          receiver_phone: booking.consignee.phone,
          receiver_pincode: booking.consignee.zip,
          pieces: totalCount || 1,
          dead_weight: totalWeight,
          chargeable_weight: totalWeight,
          status: "CREATED",
        })
        .select("id, awb_number")
        .single()
      if (shipmentError) throw shipmentError

      const sh = shipment as { id: string; awb_number: string }

      await db
        .from("bookings")
        .update({
          status: "CONVERTED",
          shipment_id: sh.id,
          awb_number: sh.awb_number,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", bookingId)

      return { shipmentId: sh.id, awbNumber: sh.awb_number }
    },
  }
}

export type BookingService = ReturnType<typeof createBookingService>
