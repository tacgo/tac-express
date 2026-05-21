import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { UserRole } from "@workspace/types"

export interface StaffProfile {
  id: string
  email: string
  name: string
  role: UserRole
  hubCode?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}


export interface AuditLogEntry {
  id: string
  entityType: string
  entityId?: string
  action: string
  description: string
  userId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

function mapProfile(row: Record<string, unknown>): StaffProfile {
  return {
    id: row.id as string,
    email: (row.email as string) ?? "",
    name: (row.name as string) ?? "",
    role: (row.role as UserRole) ?? "OPS",
    hubCode: (row.hub_code as string) ?? undefined,
    isActive: (row.is_active as boolean) ?? true,
    lastLoginAt: (row.last_login_at as string) ?? undefined,
    createdAt: row.created_at as string,
  }
}

export function createAdminService(db: SupabaseClient) {
  return {
    async getStaffList(): Promise<StaffProfile[]> {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .order("name", { ascending: true })
      if (error) throw error
      return (data ?? []).map((r) => mapProfile(r as Record<string, unknown>))
    },

    async getProfileById(userId: string): Promise<StaffProfile | null> {
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle()
      if (error) throw error
      return data ? mapProfile(data as Record<string, unknown>) : null
    },

    async updateRole(userId: string, role: UserRole): Promise<void> {
      const { error } = await db.from("profiles").update({ role }).eq("id", userId)
      if (error) throw error
    },

    async setActiveStatus(userId: string, isActive: boolean): Promise<void> {
      const { error } = await db.from("profiles").update({ is_active: isActive }).eq("id", userId)
      if (error) throw error
    },

    async updateProfile(userId: string, payload: { name?: string; hubCode?: string }): Promise<void> {
      const patch: Record<string, unknown> = {}
      if (payload.name !== undefined) patch.name = payload.name
      if (payload.hubCode !== undefined) patch.hub_code = payload.hubCode
      const { error } = await db.from("profiles").update(patch).eq("id", userId)
      if (error) throw error
    },

    async getAuditLogs(filters: { page?: number; pageSize?: number } = {}): Promise<AuditLogEntry[]> {
      const { page = 1, pageSize = 50 } = filters
      const from = (page - 1) * pageSize
      const { data, error } = await db
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1)
      if (error) throw error
      return (data ?? []).map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: row.id as string,
          entityType: row.entity_type as string,
          entityId: (row.entity_id as string) ?? undefined,
          action: row.action as string,
          description: (row.description as string) ?? "",
          userId: (row.user_id as string) ?? undefined,
          metadata: (row.metadata as Record<string, unknown>) ?? undefined,
          createdAt: row.created_at as string,
        }
      })
    },
  }
}

export type AdminService = ReturnType<typeof createAdminService>

