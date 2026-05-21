import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { Attachment, AttachmentEntityType, AttachmentUpload } from "@workspace/types"

function mapAttachment(row: Record<string, unknown>): Attachment {
  return {
    id: row.id as Attachment["id"],
    bucket: row.bucket as string,
    storagePath: row.storage_path as string,
    entityType: row.entity_type as Attachment["entityType"],
    entityId: row.entity_id as Attachment["entityId"],
    filename: row.filename as string,
    mimeType: row.mime_type as string,
    sizeBytes: (row.size_bytes as number) ?? 0,
    category: (row.category as Attachment["category"]) ?? "document",
    uploadedBy: (row.uploaded_by as Attachment["uploadedBy"]) ?? null,
    uploadedAt: row.uploaded_at as string,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  }
}

export function createAttachmentService(db: SupabaseClient) {
  return {
    async listForEntity(entityType: AttachmentEntityType, entityId: string): Promise<Attachment[]> {
      const { data, error } = await db
        .from("attachments")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("uploaded_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapAttachment)
    },

    async uploadFile(input: AttachmentUpload, file: Blob): Promise<Attachment> {
      const { error: uploadErr } = await db.storage
        .from(input.bucket)
        .upload(input.storagePath, file, { contentType: input.mimeType, upsert: false })
      if (uploadErr) throw uploadErr

      const { data, error } = await db
        .from("attachments")
        .insert({
          bucket: input.bucket,
          storage_path: input.storagePath,
          entity_type: input.entityType,
          entity_id: input.entityId,
          filename: input.filename,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
          category: input.category ?? "document",
        })
        .select("*")
        .single()
      if (error) throw error
      return mapAttachment(data)
    },

    async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
      const { data, error } = await db.storage.from(bucket).createSignedUrl(path, expiresIn)
      if (error) throw error
      return data.signedUrl
    },

    async deleteAttachment(id: string): Promise<void> {
      const { data: row, error: fetchErr } = await db
        .from("attachments")
        .select("bucket, storage_path")
        .eq("id", id)
        .single()
      if (fetchErr) throw fetchErr
      if (row) {
        await db.storage.from(row.bucket).remove([row.storage_path])
      }
      const { error } = await db.from("attachments").delete().eq("id", id)
      if (error) throw error
    },
  }
}

export type AttachmentService = ReturnType<typeof createAttachmentService>
