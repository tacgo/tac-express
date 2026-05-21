import type { UUID } from "./domain.types"

export type SavedViewEntity =
  | "shipments"
  | "manifests"
  | "exceptions"
  | "invoices"
  | "customers"

export interface SavedView {
  id: UUID
  userId: UUID
  entityType: SavedViewEntity
  name: string
  filters: Record<string, unknown>
  sort: { field?: string; direction?: "asc" | "desc" }
  isPinned: boolean
  isShared: boolean
  createdAt: string
  updatedAt: string
}

export interface SavedViewInput {
  entityType: SavedViewEntity
  name: string
  filters?: Record<string, unknown>
  sort?: { field?: string; direction?: "asc" | "desc" }
  isPinned?: boolean
  isShared?: boolean
}
