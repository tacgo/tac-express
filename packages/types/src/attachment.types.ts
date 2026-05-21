import type { UUID } from "./domain.types"

export type AttachmentEntityType =
  | "shipment"
  | "invoice"
  | "manifest"
  | "exception"
  | "customer"

export type AttachmentCategory =
  | "document"
  | "photo"
  | "signature"
  | "label"
  | "invoice_pdf"

export interface Attachment {
  id: UUID
  bucket: string
  storagePath: string
  entityType: AttachmentEntityType
  entityId: UUID
  filename: string
  mimeType: string
  sizeBytes: number
  category: AttachmentCategory
  uploadedBy: UUID | null
  uploadedAt: string
  metadata: Record<string, unknown>
}

export interface AttachmentUpload {
  bucket: string
  storagePath: string
  entityType: AttachmentEntityType
  entityId: UUID
  filename: string
  mimeType: string
  sizeBytes: number
  category?: AttachmentCategory
}
