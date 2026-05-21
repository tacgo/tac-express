// Threaded notes per entity (shipment / manifest / invoice / customer / exception).
// Backed by the `notes` table added in migration 20260501000005_notes_threads.sql.
//
// Notes carry both an HTML rendering (for read-only display) and the source
// JSON (for edit-back into TipTap). Storing both keeps the round-trip
// lossless and avoids re-running TipTap to render existing notes.

import type { SupabaseClient } from "@workspace/database/supabase.types"

export type NoteEntityType =
  | "SHIPMENT"
  | "MANIFEST"
  | "INVOICE"
  | "CUSTOMER"
  | "EXCEPTION"

export interface Note {
  id: string
  entityType: NoteEntityType
  entityId: string
  bodyJson: object
  bodyHtml: string
  bodyText: string
  isInternal: boolean
  createdBy: string
  createdByName?: string
  createdAt: string
  updatedAt: string
}

export interface CreateNoteInput {
  entityType: NoteEntityType
  entityId: string
  bodyJson: object
  bodyHtml: string
  bodyText: string
  isInternal?: boolean
}

export interface UpdateNoteInput {
  bodyJson?: object
  bodyHtml?: string
  bodyText?: string
  isInternal?: boolean
}

function mapNote(row: Record<string, unknown>): Note {
  return {
    id: row.id as string,
    entityType: row.entity_type as NoteEntityType,
    entityId: row.entity_id as string,
    bodyJson: (row.body_json as object) ?? {},
    bodyHtml: (row.body_html as string) ?? "",
    bodyText: (row.body_text as string) ?? "",
    isInternal: (row.is_internal as boolean) ?? true,
    createdBy: row.created_by as string,
    createdByName: row.created_by_name as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function isMissingTable(error: { message?: string }): boolean {
  return /does not exist|relation|notes/i.test(error.message ?? "")
}

export function createNoteService(db: SupabaseClient) {
  return {
    /** List notes for an entity, newest first. Returns [] if table missing. */
    async listForEntity(
      entityType: NoteEntityType,
      entityId: string
    ): Promise<Note[]> {
      const { data, error } = await db
        .from("notes")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false })
      if (error) {
        if (isMissingTable(error)) return []
        throw error
      }
      return (data ?? []).map((row) => mapNote(row as Record<string, unknown>))
    },

    async createNote(input: CreateNoteInput): Promise<Note> {
      const { data, error } = await db
        .from("notes")
        .insert({
          entity_type: input.entityType,
          entity_id: input.entityId,
          body_json: input.bodyJson,
          body_html: input.bodyHtml,
          body_text: input.bodyText,
          is_internal: input.isInternal ?? true,
        })
        .select("*")
        .single()
      if (error) throw error
      return mapNote(data as Record<string, unknown>)
    },

    async updateNote(id: string, patch: UpdateNoteInput): Promise<Note> {
      const { data, error } = await db
        .from("notes")
        .update({
          ...(patch.bodyJson !== undefined && { body_json: patch.bodyJson }),
          ...(patch.bodyHtml !== undefined && { body_html: patch.bodyHtml }),
          ...(patch.bodyText !== undefined && { body_text: patch.bodyText }),
          ...(patch.isInternal !== undefined && {
            is_internal: patch.isInternal,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("*")
        .single()
      if (error) throw error
      return mapNote(data as Record<string, unknown>)
    },

    async deleteNote(id: string): Promise<void> {
      const { error } = await db.from("notes").delete().eq("id", id)
      if (error) throw error
    },
  }
}

export type NoteService = ReturnType<typeof createNoteService>
