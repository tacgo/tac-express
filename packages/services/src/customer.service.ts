import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Customer, CustomerFilters } from "@workspace/types"

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: row.id as unknown as Customer["id"],
    name: row.name as string,
    phone: row.phone as string,
    email: (row.email as string) ?? undefined,
    gstin: (row.gstin as string) ?? undefined,
    addressLine1: (row.address_line1 as string) ?? "",
    addressLine2: (row.address_line2 as string) ?? undefined,
    city: (row.city as string) ?? "",
    state: (row.state as string) ?? "",
    zip: (row.zip as string) ?? "",
    totalShipments: (row.total_shipments as number) ?? 0,
    totalRevenue: (row.total_revenue as number) ?? 0,
    outstandingBalance: (row.outstanding_balance as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createCustomerService(db: SupabaseClient) {
  return {
    async getCustomers(filters: CustomerFilters = {}): Promise<Customer[]> {
      const { search, city, state, page = 1, pageSize = 50 } = filters
      let query = db.from("customers").select("*").order("name", { ascending: true })
      if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
      if (city) query = query.ilike("city", `%${city}%`)
      if (state) query = query.ilike("state", `%${state}%`)
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapCustomer)
    },

    async getCustomerById(id: string): Promise<Customer | null> {
      const { data, error } = await db.from("customers").select("*").eq("id", id).single()
      if (error) throw error
      return data ? mapCustomer(data as Record<string, unknown>) : null
    },

    async createCustomer(payload: Omit<Customer, "id" | "totalShipments" | "totalRevenue" | "outstandingBalance" | "createdAt" | "updatedAt">): Promise<Customer> {
      const { data, error } = await db
        .from("customers")
        .insert({
          name: payload.name,
          phone: payload.phone,
          email: payload.email ?? null,
          gstin: payload.gstin ?? null,
          address_line1: payload.addressLine1,
          address_line2: payload.addressLine2 ?? null,
          city: payload.city,
          state: payload.state,
          zip: payload.zip,
        })
        .select()
        .single()
      if (error) throw error
      return mapCustomer(data as Record<string, unknown>)
    },

    async updateCustomer(id: string, payload: Partial<Customer>): Promise<Customer> {
      const patch: Record<string, unknown> = {}
      if (payload.name !== undefined) patch.name = payload.name
      if (payload.phone !== undefined) patch.phone = payload.phone
      if (payload.email !== undefined) patch.email = payload.email
      if (payload.gstin !== undefined) patch.gstin = payload.gstin
      if (payload.addressLine1 !== undefined) patch.address_line1 = payload.addressLine1
      if (payload.addressLine2 !== undefined) patch.address_line2 = payload.addressLine2
      if (payload.city !== undefined) patch.city = payload.city
      if (payload.state !== undefined) patch.state = payload.state
      if (payload.zip !== undefined) patch.zip = payload.zip
      const { data, error } = await db.from("customers").update(patch).eq("id", id).select().single()
      if (error) throw error
      return mapCustomer(data as Record<string, unknown>)
    },

    async getShipmentsByCustomer(customerId: string) {
      const { data, error } = await db
        .from("shipments")
        .select("id, awb_number, status, dest_hub, total_amount, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as Array<{
        id: string
        awb_number: string
        status: string
        dest_hub: string
        total_amount: number
        created_at: string
      }>
    },
  }
}

export type CustomerService = ReturnType<typeof createCustomerService>

