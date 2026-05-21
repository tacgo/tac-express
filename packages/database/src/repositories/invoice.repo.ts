import type { SupabaseClient } from "@supabase/supabase-js"
import type { Invoice, InvoiceSummary, InvoiceFilters, PaginatedResult, Customer, CustomerFilters } from "@workspace/types"

export function createInvoiceRepo(db: SupabaseClient) {
  return {
    async findMany(filters: InvoiceFilters = {}): Promise<PaginatedResult<InvoiceSummary>> {
      const { page = 1, pageSize = 25, status, paymentMode, customerId, search, dateFrom, dateTo } = filters

      let query = db.from("invoices").select("*", { count: "exact" })

      if (status?.length) query = query.in("status", status)
      if (paymentMode?.length) query = query.in("payment_mode", paymentMode)
      if (customerId) query = query.eq("customer_id", customerId)
      if (search) query = query.or(`invoice_number.ilike.%${search}%,awb_number.ilike.%${search}%`)
      if (dateFrom) query = query.gte("created_at", dateFrom)
      if (dateTo) query = query.lte("created_at", dateTo)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order("created_at", { ascending: false })

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: (data ?? []) as InvoiceSummary[],
        total: count ?? 0,
        page,
        pageSize,
        hasMore: (count ?? 0) > page * pageSize,
      }
    },

    async findById(id: string): Promise<Invoice | null> {
      const { data, error } = await db.from("invoices").select("*").eq("id", id).single()
      if (error) throw error
      return data as Invoice | null
    },

    async create(shipmentId: string, staffId: string, discount = 0): Promise<Invoice> {
      const { data, error } = await db.rpc("generate_invoice", {
        p_shipment_id: shipmentId,
        p_staff_id: staffId,
        p_discount: discount,
      })
      if (error) throw error
      return data as Invoice
    },

    async getFinanceSummary(): Promise<{ totalRevenue: number; outstanding: number; paidCount: number }> {
      const { data, error } = await db.rpc("get_finance_summary")
      if (error) throw error
      return data
    },
  }
}

export function createCustomerRepo(db: SupabaseClient) {
  return {
    async findMany(filters: CustomerFilters = {}): Promise<PaginatedResult<Customer>> {
      const { page = 1, pageSize = 25, search, city, state } = filters

      let query = db.from("customers").select("*", { count: "exact" })

      if (search) query = query.ilike("name", `%${search}%`)
      if (city) query = query.eq("city", city)
      if (state) query = query.eq("state", state)

      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1).order("name")

      const { data, error, count } = await query
      if (error) throw error

      return {
        data: (data ?? []) as Customer[],
        total: count ?? 0,
        page,
        pageSize,
        hasMore: (count ?? 0) > page * pageSize,
      }
    },

    async findById(id: string): Promise<Customer | null> {
      const { data, error } = await db.from("customers").select("*").eq("id", id).single()
      if (error) throw error
      return data as Customer | null
    },
  }
}

export type InvoiceRepo = ReturnType<typeof createInvoiceRepo>
export type CustomerRepo = ReturnType<typeof createCustomerRepo>
