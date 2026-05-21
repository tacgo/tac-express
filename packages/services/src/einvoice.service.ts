// India e-invoice (IRN) + e-waybill abstraction.
//
// Per the architecture decision (docs/ARCHITECTURAL-DECISIONS.md Decision 3) we
// ship the NIC-direct interface first and keep all real network calls behind a
// `provider` adapter. Swapping to a GSP (Cleartax / MasterGST / MasterIndia)
// later means writing a new provider that satisfies the same interface — zero
// UI changes.
//
// The actual NIC HTTP calls live in Supabase Edge Functions (see
// supabase/functions/einvoice-irn/, ewaybill-generate/) where the GST
// credentials and certificate-based signing are kept out of the browser.
// This module is the typed wrapper that the UI consumes.

import type { SupabaseClient } from "@workspace/database/supabase.types"

export interface IrnGenerationInput {
  invoiceId: string
}

export interface IrnRecord {
  id: string
  invoiceId: string
  irn: string
  ackNo: string
  ackDate: string
  signedQr: string
  signedInvoiceJson: Record<string, unknown> | null
  status: "PENDING" | "GENERATED" | "CANCELLED" | "FAILED"
  errorJson?: Record<string, unknown> | null
  createdAt: string
}

export interface EwbGenerationInput {
  shipmentId: string
  /** Distance in km — required by GSTN. */
  distanceKm: number
  /** Transporter ID (15-char GSTIN-equivalent). Optional when self-delivered. */
  transporterId?: string
  vehicleNumber?: string
  vehicleType?: "REGULAR" | "ODC"
}

export interface EwbRecord {
  id: string
  shipmentId: string
  ewbNo: string
  ewbDate: string
  validUpto: string
  status: "PENDING" | "GENERATED" | "CANCELLED" | "EXPIRED" | "FAILED"
  transporterId?: string
  vehicleNumber?: string
  errorJson?: Record<string, unknown> | null
  createdAt: string
}

function notDeployed(table: string): IrnRecord | EwbRecord | null {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[einvoice.service] '${table}' table not deployed yet. Returning null. Run migration 20260501000009_einvoice_ewaybill.sql.`
    )
  }
  return null
}

/**
 * E-invoice service — typed wrapper around the IRN + E-waybill Edge Functions.
 * The provider behind the Edge Function is currently NIC sandbox; production
 * cutover toggles a server-side env (`EINVOICE_PROVIDER=NIC|CLEARTAX|...`).
 */
export function createEinvoiceService(db: SupabaseClient) {
  return {
    /**
     * Look up a previously-generated IRN record for an invoice. Returns null
     * if no record exists (e.g. invoice has not been authorized for IRN yet).
     */
    async getIrnForInvoice(invoiceId: string): Promise<IrnRecord | null> {
      const { data, error } = await db
        .from("einvoice_records")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        if (/does not exist|relation/i.test(error.message)) {
          return notDeployed("einvoice_records") as IrnRecord | null
        }
        throw error
      }
      return data ? mapIrn(data as Record<string, unknown>) : null
    },

    /**
     * Generate an IRN by invoking the `einvoice-irn` Edge Function. The
     * function fetches the invoice + customer + shipment server-side, calls
     * IRP, and persists the result row. Returns the freshly-stored record.
     */
    async generateIrn(input: IrnGenerationInput): Promise<IrnRecord> {
      const { data, error } = await db.functions.invoke("einvoice-irn", {
        body: { invoiceId: input.invoiceId },
      })
      if (error) throw new Error(error.message)
      return mapIrn(data as Record<string, unknown>)
    },

    /**
     * Cancel an IRN within the 24h window (NIC rule). After 24h, only credit
     * notes can offset an issued IRN.
     */
    async cancelIrn(irn: string, reason: string): Promise<{ ok: true }> {
      const { error } = await db.functions.invoke("einvoice-irn", {
        body: { action: "cancel", irn, reason },
      })
      if (error) throw new Error(error.message)
      return { ok: true }
    },

    /** Look up the latest EWB for a shipment, if any. */
    async getEwbForShipment(shipmentId: string): Promise<EwbRecord | null> {
      const { data, error } = await db
        .from("ewaybill_records")
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) {
        if (/does not exist|relation/i.test(error.message)) {
          return notDeployed("ewaybill_records") as EwbRecord | null
        }
        throw error
      }
      return data ? mapEwb(data as Record<string, unknown>) : null
    },

    /** Generate an E-Way Bill via the `ewaybill-generate` Edge Function. */
    async generateEwb(input: EwbGenerationInput): Promise<EwbRecord> {
      const { data, error } = await db.functions.invoke("ewaybill-generate", {
        body: input,
      })
      if (error) throw new Error(error.message)
      return mapEwb(data as Record<string, unknown>)
    },

    async cancelEwb(
      ewbNo: string,
      reasonCode: number,
      reasonText: string
    ): Promise<{ ok: true }> {
      const { error } = await db.functions.invoke("ewaybill-generate", {
        body: { action: "cancel", ewbNo, reasonCode, reasonText },
      })
      if (error) throw new Error(error.message)
      return { ok: true }
    },
  }
}

export type EinvoiceService = ReturnType<typeof createEinvoiceService>

// ── row mappers ───────────────────────────────────────────────────────────

function mapIrn(row: Record<string, unknown>): IrnRecord {
  return {
    id: row.id as string,
    invoiceId: row.invoice_id as string,
    irn: row.irn as string,
    ackNo: row.ack_no as string,
    ackDate: row.ack_date as string,
    signedQr: row.signed_qr as string,
    signedInvoiceJson:
      (row.signed_invoice_json as Record<string, unknown> | null) ?? null,
    status: row.status as IrnRecord["status"],
    errorJson:
      (row.error_json as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
  }
}

function mapEwb(row: Record<string, unknown>): EwbRecord {
  return {
    id: row.id as string,
    shipmentId: row.shipment_id as string,
    ewbNo: row.ewb_no as string,
    ewbDate: row.ewb_date as string,
    validUpto: row.valid_upto as string,
    status: row.status as EwbRecord["status"],
    transporterId: row.transporter_id as string | undefined,
    vehicleNumber: row.vehicle_number as string | undefined,
    errorJson:
      (row.error_json as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
  }
}
