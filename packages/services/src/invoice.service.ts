import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { TablesInsert } from "@workspace/database/database.types"
import type { Invoice, InvoiceFilters } from "@workspace/types"
import { InvoiceStatus } from "@workspace/types"

import { withAudit } from "./shared/with-audit"

/** Canonical insert shape for `invoices` rows, derived from generated DB types. */
export type CreateInvoiceDbInput = TablesInsert<"invoices">

export function createInvoiceService(db: SupabaseClient) {
  return {
    async getInvoices(filters: InvoiceFilters = {}): Promise<Invoice[]> {
      let query = db
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.pageSize ?? 50)

      if (filters.status?.length) query = query.in("status", filters.status.map(toDbInvoiceStatus))
      if (filters.search) {
        query = query.or(`invoice_number.ilike.%${filters.search}%,awb_number.ilike.%${filters.search}%`)
      }
      if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom)
      if (filters.dateTo) query = query.lte("created_at", filters.dateTo)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapInvoice)
    },

    async getInvoiceById(id: string): Promise<Invoice | null> {
      const { data, error } = await db
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      return data ? mapInvoice(data) : null
    },

    async createInvoice(input: CreateInvoiceDbInput): Promise<Invoice> {
      const awbNumber = input.awb_number?.trim().toUpperCase() || null
      const customerId = input.customer_id || null
      const shipment = awbNumber
        ? await findShipmentForInvoice(db, awbNumber)
        : null
      const customerExists = customerId
        ? await customerExistsForInvoice(db, customerId)
        : false
      const payload: CreateInvoiceDbInput = {
        ...input,
        status: toDbInvoiceStatus(InvoiceStatus.DRAFT),
        payment_mode: toDbPaymentMode(input.payment_mode),
        awb_number: shipment?.awb_number ?? null,
        shipment_id: input.shipment_id ?? shipment?.id ?? null,
        customer_id: customerExists ? customerId : null,
        notes: mergeInvoiceNotes(input.notes, {
          externalAwbNumber: shipment ? undefined : awbNumber,
          invalidCustomerId: customerExists ? undefined : customerId,
        }),
      }
      const { data, error } = await db
        .from("invoices")
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return mapInvoice(data)
    },

    async issueInvoice(id: string): Promise<void> {
      const { error } = await db
        .from("invoices")
        .update({ status: toDbInvoiceStatus(InvoiceStatus.ISSUED), issued_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", toDbInvoiceStatus(InvoiceStatus.DRAFT))
      if (error) throw error
    },

    async markPaid(id: string, paidAt?: string): Promise<void> {
      const { error } = await db
        .from("invoices")
        .update({ status: toDbInvoiceStatus(InvoiceStatus.PAID), paid_at: paidAt ?? new Date().toISOString() })
        .eq("id", id)
        .eq("status", toDbInvoiceStatus(InvoiceStatus.ISSUED))
      if (error) throw error
    },

    async cancelInvoice(id: string): Promise<void> {
      // Read the row first so the audit row carries a forensic
      // before_state snapshot. If the invoice doesn't exist, surface
      // a clean noop (no audit, no update) — matches the prior
      // behavior where the UPDATE would also affect zero rows.
      const { data: row, error: readErr } = await db
        .from("invoices")
        .select("*")
        .eq("id", id)
        .maybeSingle()
      if (readErr) throw readErr
      if (!row) return

      // AUDIT-WRAPPED: every invoice cancellation produces exactly
      // one audit_logs row before the destructive op runs. The
      // existing status guard (DRAFT or ISSUED) is preserved inside
      // the wrapper. If the guard rejects the update (the invoice is
      // in PAID / CANCELLED / OVERDUE), the destructive op completes
      // with zero affected rows but the audit row is still committed
      // — recording the operator's attempt. This is intentional
      // forensic signal: a no-op cancellation attempt may be worth
      // investigating (operator confusion, replayed request).
      await withAudit(
        db,
        {
          action: "invoice_cancel",
          entityType: "invoice",
          entityId: id,
          beforeState: row as Record<string, unknown>,
        },
        async () => {
          const { error } = await db
            .from("invoices")
            .update({ status: toDbInvoiceStatus(InvoiceStatus.CANCELLED) })
            .eq("id", id)
            .in("status", [
              toDbInvoiceStatus(InvoiceStatus.DRAFT),
              toDbInvoiceStatus(InvoiceStatus.ISSUED),
            ])
          if (error) throw error
        },
      )
    },

    async getOverdueCount(): Promise<number> {
      const { count, error } = await db
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("status", toDbInvoiceStatus(InvoiceStatus.OVERDUE))
      if (error) throw error
      return count ?? 0
    },
  }
}

async function findShipmentForInvoice(
  db: SupabaseClient,
  awbNumber: string
): Promise<{ id: string; awb_number: string } | null> {
  const { data, error } = await db
    .from("shipments")
    .select("id, awb_number")
    .eq("awb_number", awbNumber)
    .maybeSingle()

  if (error) throw error
  return data as { id: string; awb_number: string } | null
}

/** RFC-4122 UUID regex — PostgREST rejects non-UUID values with 400. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function customerExistsForInvoice(
  db: SupabaseClient,
  customerId: string
): Promise<boolean> {
  // Guard: never send a malformed UUID to PostgREST — it returns 400.
  if (!UUID_RE.test(customerId)) return false

  const { data, error } = await db
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}

function toDbInvoiceStatus(status: unknown): string {
  if (typeof status !== "string") return InvoiceStatus.DRAFT
  return status.toUpperCase()
}

function toDbPaymentMode(mode: unknown): string {
  if (mode === "topay") return "TO_PAY"
  if (mode === "credit") return "TBB"
  if (mode === "prepaid") return "PAID"
  if (typeof mode === "string") return mode.toUpperCase()
  return "TO_PAY"
}

function toDomainInvoiceStatus(status: unknown): string {
  if (typeof status !== "string") return InvoiceStatus.DRAFT
  return status.toUpperCase()
}

function toDomainPaymentMode(mode: unknown): string {
  if (mode === "topay") return "TO_PAY"
  if (mode === "credit") return "TBB"
  if (mode === "prepaid") return "PAID"
  if (typeof mode === "string") return mode.toUpperCase()
  return "PAID"
}

function mergeInvoiceNotes(
  notes: string | null | undefined,
  metadata: Record<string, string | null | undefined>
): string | null {
  const entries = Object.entries(metadata).filter(([, value]) => Boolean(value))
  if (!entries.length) return notes ?? null

  try {
    const parsed = notes ? JSON.parse(notes) as Record<string, unknown> : {}
    return JSON.stringify({
      ...parsed,
      ...Object.fromEntries(entries),
    })
  } catch {
    return JSON.stringify({
      notes,
      ...Object.fromEntries(entries),
    })
  }
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    awbNumber: row.awb_number,
    shipmentId: row.shipment_id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? "",
    customerGstin: row.customer_gstin,
    status: toDomainInvoiceStatus(row.status),
    paymentMode: toDomainPaymentMode(row.payment_mode),
    baseFreight: (row.base_freight as number) ?? 0,
    docketCharge: (row.docket_charge as number) ?? 0,
    pickupCharge: (row.pickup_charge as number) ?? 0,
    packingCharge: (row.packing_charge as number) ?? 0,
    fuelSurcharge: (row.fuel_surcharge as number) ?? 0,
    handlingFee: (row.handling_fee as number) ?? 0,
    insurance: (row.insurance as number) ?? 0,
    discount: (row.discount as number) ?? 0,
    tax: row.tax ?? { cgst: 0, sgst: 0, igst: 0, total: 0 },
    totalAmount: (row.total_amount as number) ?? 0,
    advancePaid: (row.advance_paid as number) ?? 0,
    balance: (row.balance as number) ?? 0,
    pdfPath: row.pdf_path as string | undefined,
    issuedAt: row.issued_at as string | undefined,
    paidAt: row.paid_at as string | undefined,
    dueDate: row.due_date as string | undefined,
    notes: row.notes as string | undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as unknown as Invoice
}

