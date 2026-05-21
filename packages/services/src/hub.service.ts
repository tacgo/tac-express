import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Hub, HubInput } from "@workspace/types"

function mapHub(row: Record<string, unknown>): Hub {
  return {
    id: row.id as Hub["id"],
    code: row.code as string,
    name: row.name as string,
    city: row.city as string,
    state: row.state as string,
    country: row.country as string,
    pincode: row.pincode as string,
    address: row.address as string,
    managerId: (row.manager_id as Hub["managerId"]) ?? null,
    isOrigin: (row.is_origin as boolean) ?? true,
    isDestination: (row.is_destination as boolean) ?? true,
    isActive: (row.is_active as boolean) ?? true,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createHubService(db: SupabaseClient) {
  return {
    async listHubs(activeOnly = true): Promise<Hub[]> {
      let query = db.from("hubs").select("*").order("code")
      if (activeOnly) query = query.eq("is_active", true)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapHub)
    },

    async getHubByCode(code: string): Promise<Hub | null> {
      const { data, error } = await db
        .from("hubs")
        .select("*")
        .eq("code", code)
        .maybeSingle()
      if (error) throw error
      return data ? mapHub(data) : null
    },

    async createHub(input: HubInput): Promise<Hub> {
      const { data, error } = await db
        .from("hubs")
        .insert({
          code: input.code,
          name: input.name,
          city: input.city,
          state: input.state,
          country: input.country ?? "IN",
          pincode: input.pincode,
          address: input.address,
          manager_id: input.managerId ?? null,
          is_origin: input.isOrigin ?? true,
          is_destination: input.isDestination ?? true,
          is_active: input.isActive ?? true,
        })
        .select("*")
        .single()
      if (error) throw error
      return mapHub(data)
    },

    async updateHub(id: string, patch: Partial<HubInput>): Promise<Hub> {
      const { data, error } = await db
        .from("hubs")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.city !== undefined && { city: patch.city }),
          ...(patch.state !== undefined && { state: patch.state }),
          ...(patch.pincode !== undefined && { pincode: patch.pincode }),
          ...(patch.address !== undefined && { address: patch.address }),
          ...(patch.managerId !== undefined && { manager_id: patch.managerId }),
          ...(patch.isOrigin !== undefined && { is_origin: patch.isOrigin }),
          ...(patch.isDestination !== undefined && { is_destination: patch.isDestination }),
          ...(patch.isActive !== undefined && { is_active: patch.isActive }),
        })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw error
      return mapHub(data)
    },
  }
}

export type HubService = ReturnType<typeof createHubService>
