import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { SavedView, SavedViewInput } from "@workspace/types"

function mapSavedView(row: Record<string, unknown>): SavedView {
  return {
    id: row.id as SavedView["id"],
    userId: row.user_id as SavedView["userId"],
    entityType: row.entity_type as SavedView["entityType"],
    name: row.name as string,
    filters: (row.filters as Record<string, unknown>) ?? {},
    sort: (row.sort as SavedView["sort"]) ?? {},
    isPinned: (row.is_pinned as boolean) ?? false,
    isShared: (row.is_shared as boolean) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function createSavedViewService(db: SupabaseClient) {
  return {
    async listForUser(userId: string, entityType?: SavedView["entityType"]): Promise<SavedView[]> {
      let query = db
        .from("saved_views")
        .select("*")
        .or(`user_id.eq.${userId},is_shared.eq.true`)
        .order("is_pinned", { ascending: false })
        .order("name")
      if (entityType) query = query.eq("entity_type", entityType)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map(mapSavedView)
    },

    async createView(userId: string, input: SavedViewInput): Promise<SavedView> {
      const { data, error } = await db
        .from("saved_views")
        .insert({
          user_id: userId,
          entity_type: input.entityType,
          name: input.name,
          filters: input.filters ?? {},
          sort: input.sort ?? {},
          is_pinned: input.isPinned ?? false,
          is_shared: input.isShared ?? false,
        })
        .select("*")
        .single()
      if (error) throw error
      return mapSavedView(data)
    },

    async updateView(id: string, patch: Partial<SavedViewInput>): Promise<SavedView> {
      const { data, error } = await db
        .from("saved_views")
        .update({
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.filters !== undefined && { filters: patch.filters }),
          ...(patch.sort !== undefined && { sort: patch.sort }),
          ...(patch.isPinned !== undefined && { is_pinned: patch.isPinned }),
          ...(patch.isShared !== undefined && { is_shared: patch.isShared }),
        })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw error
      return mapSavedView(data)
    },

    async deleteView(id: string): Promise<void> {
      const { error } = await db.from("saved_views").delete().eq("id", id)
      if (error) throw error
    },
  }
}

export type SavedViewService = ReturnType<typeof createSavedViewService>
