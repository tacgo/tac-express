import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { TablesInsert } from "@workspace/database/database.types"
import type { Shipment, ShipmentSummary, ShipmentFilters, TrackingEvent } from "@workspace/types"
import { ShipmentStatus } from "@workspace/types"

import { isMissingRpcOrRelation } from "./shared/rpc-errors"
import { captureSupabaseRpcError, withRpc } from "./shared/with-rpc"

/**
 * The canonical insert shape for `shipments` rows, derived from the generated
 * Supabase `Database` type. Use this at the service boundary instead of a
 * loose `Record<string, unknown>` so consumers get column-name typo detection
 * and required-field checks at compile time.
 */
export type CreateShipmentDbInput = TablesInsert<"shipments">

export function createShipmentService(db: SupabaseClient) {
  return {
    async getShipments(filters: ShipmentFilters = {}): Promise<ShipmentSummary[]> {
      let query = db
        .from("shipments")
        .select(`
          id, awb_number, status, sender_name, receiver_name,
          origin_hub, dest_hub, chargeable_weight, total_amount,
          pieces, manifest_number, created_at, updated_at
        `)
        .order("created_at", { ascending: false })
        .limit(filters.pageSize ?? 50)

      if (filters.status?.length) query = query.in("status", filters.status)
      if (filters.originHub) query = query.eq("origin_hub", filters.originHub)
      if (filters.destHub) query = query.eq("dest_hub", filters.destHub)
      if (filters.search) {
        query = query.or(
          `awb_number.ilike.%${filters.search}%,sender_name.ilike.%${filters.search}%,receiver_name.ilike.%${filters.search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapSummary)
    },

    async getShipmentById(id: string): Promise<Shipment | null> {
      const { data, error } = await db
        .from("shipments")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data ? mapShipment(data) : null
    },

    async getShipmentByAwb(awb: string): Promise<Shipment | null> {
      const { data, error } = await db
        .from("shipments")
        .select("*")
        .eq("awb_number", awb)
        .single()
      if (error) throw error
      return data ? mapShipment(data) : null
    },

    /**
     * Fetch multiple shipments in a single query to avoid N+1 issues when
     * resolving lists of AWBs (e.g., manifest details, arrival audit).
     */
    async getShipmentsByAwbs(awbs: string[]): Promise<Shipment[]> {
      if (awbs.length === 0) return []
      const { data, error } = await db
        .from("shipments")
        .select("*")
        .in("awb_number", awbs)
      if (error) throw error
      return (data ?? []).map(mapShipment)
    },

    async getTrackingEvents(awbNumber: string): Promise<TrackingEvent[]> {
      const { data, error } = await db
        .from("tracking_events")
        .select("*")
        .eq("awb_number", awbNumber)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapTrackingEvent)
    },

    async createShipment(input: CreateShipmentDbInput): Promise<Shipment> {
      const { data, error } = await db
        .from("shipments")
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return mapShipment(data)
    },

    /**
     * Reserve a fresh AWB number from the server-side `generate_awb_number()`
     * RPC. Used by the invoice-create wizard to pre-fill the AWB field so the
     * user never has to type one. The DB function guarantees uniqueness via a
     * sequence + prefix (e.g. `TAC26043010002`).
     */
    async generateAwbNumber(): Promise<string> {
      const { data, error } = await withRpc("generate_awb_number", () =>
        db.rpc("generate_awb_number"),
      )
      if (error) throw error
      if (typeof data !== "string" || !data) {
        throw new Error("generate_awb_number returned an empty value")
      }
      return data
    },

    /**
     * Bulk-create shipments. Tries `bulk_create_shipments` RPC first
     * (validation + atomic batch); falls back to a chunked .insert()
     * if the RPC isn't deployed yet. Returns per-row outcome so the
     * UI can surface partial-success cleanly.
     *
     * Fallback discriminator (issue #19): only fall through when the
     * RPC is missing from the schema cache. RLS denials, FK errors,
     * and business-rule rejections re-throw — letting them bypass to
     * the JS path would silently void future server-side validation.
     */
    async bulkCreateShipments(
      inputs: CreateShipmentDbInput[]
    ): Promise<{
      inserted: number
      failed: number
      errors: { row: number; message: string }[]
    }> {
      // Prefer the RPC when available — it enforces server-side validation
      // and emits one notification batch instead of N.
      const rpc = await db.rpc("bulk_create_shipments", {
        p_payload: inputs as unknown as Record<string, unknown>,
      })
      if (!rpc.error && rpc.data) {
        const out = rpc.data as {
          inserted: number
          failed: number
          errors?: { row: number; message: string }[]
        }
        return {
          inserted: out.inserted ?? 0,
          failed: out.failed ?? 0,
          errors: out.errors ?? [],
        }
      }
      if (rpc.error && !isMissingRpcOrRelation(rpc.error)) {
        // SELECTIVE adoption per audit doc § 3.2: real-error branch only.
        captureSupabaseRpcError("bulk_create_shipments", rpc.error)
        throw rpc.error
      }

      // Fallback: client-side chunked inserts of 100 rows each.
      let inserted = 0
      const errors: { row: number; message: string }[] = []
      for (let i = 0; i < inputs.length; i += 100) {
        const chunk = inputs.slice(i, i + 100)
        const { data, error } = await db
          .from("shipments")
          .insert(chunk)
          .select("id")
        if (error) {
          for (let j = 0; j < chunk.length; j++) {
            errors.push({ row: i + j + 1, message: error.message })
          }
        } else {
          inserted += data?.length ?? chunk.length
        }
      }
      return {
        inserted,
        failed: errors.length,
        errors,
      }
    },

    async updateStatus(id: string, status: ShipmentStatus): Promise<void> {
      const { error } = await db
        .from("shipments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
    },

    async countByStatus(): Promise<Record<ShipmentStatus, number>> {
      const { data, error } = await db
        .from("shipments")
        .select("status")
      if (error) throw error
      const counts = {} as Record<ShipmentStatus, number>
      for (const row of data ?? []) {
        counts[row.status as ShipmentStatus] = (counts[row.status as ShipmentStatus] ?? 0) + 1
      }
      return counts
    },
  }
}

function mapSummary(row: Record<string, unknown>): ShipmentSummary {
  return {
    id: row.id,
    awbNumber: row.awb_number,
    status: row.status,
    senderName: row.sender_name,
    receiverName: row.receiver_name,
    originHub: row.origin_hub,
    destHub: row.dest_hub as string,
    chargeableWeight: (row.chargeable_weight as number) ?? 0,
    totalAmount: (row.total_amount as number) ?? 0,
    pieces: (row.pieces as number) ?? 1,
    manifestNumber: row.manifest_number as string | undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  } as unknown as ShipmentSummary
}

function mapShipment(row: Record<string, unknown>): Shipment {
  return {
    id: row.id,
    awbNumber: row.awb_number,
    status: row.status,
    serviceLevel: row.service_level,
    paymentMode: row.payment_mode,
    transportMode: row.transport_mode,
    originHub: row.origin_hub,
    destHub: row.dest_hub as string,
    sender: {
      name: row.sender_name,
      phone: row.sender_phone,
      email: row.sender_email,
      address: {
        line1: row.sender_address,
        city: row.sender_city,
        state: row.sender_state,
        zip: row.sender_pincode,
      },
      gstin: row.sender_gstin,
    },
    receiver: {
      name: row.receiver_name,
      phone: row.receiver_phone,
      email: row.receiver_email,
      address: {
        line1: row.receiver_address,
        city: row.receiver_city,
        state: row.receiver_state,
        zip: row.receiver_pincode,
      },
      gstin: row.receiver_gstin,
    },
    weight: {
      dead: (row.dead_weight as number) ?? 0,
      volumetric: (row.volumetric_weight as number) ?? 0,
      chargeable: (row.chargeable_weight as number) ?? 0,
    },
    pieces: (row.pieces as number) ?? 1,
    description: row.description,
    financials: row.financials ?? {
      ratePerKg: 0, baseFreight: 0, docketCharge: 0, pickupCharge: 0,
      packingCharge: 0, fuelSurcharge: 0, handlingFee: 0, insurance: 0,
      tax: { cgst: 0, sgst: 0, igst: 0, total: 0 },
      discount: 0, totalAmount: 0, advancePaid: 0, balance: 0,
    },
    manifestId: row.manifest_id,
    manifestNumber: row.manifest_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    deliveredAt: row.delivered_at,
    cancelledAt: row.cancelled_at,
  } as unknown as Shipment
}

function mapTrackingEvent(row: Record<string, unknown>): TrackingEvent {
  return {
    id: row.id,
    awbNumber: row.awb_number,
    status: row.status,
    description: row.description ?? "",
    location: row.location ?? "",
    hubCode: row.hub_code,
    source: row.source,
    staffId: row.staff_id,
    staffName: row.staff_name,
    metadata: row.metadata,
    createdAt: row.created_at,
  } as TrackingEvent
}

