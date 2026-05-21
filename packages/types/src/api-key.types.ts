import type { UUID } from "./domain.types"

export type ApiKeyScope = "read_only" | "read_write" | "admin"

export interface ApiKey {
  id: UUID
  name: string
  keyPrefix: string
  scope: ApiKeyScope
  customerId: UUID | null
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdBy: UUID | null
  revokedAt: string | null
  revokedBy: UUID | null
  createdAt: string
}

export interface ApiKeyInput {
  name: string
  scope: ApiKeyScope
  customerId?: UUID | null
  expiresAt?: string | null
}

export interface ApiKeyCreated extends ApiKey {
  /**
   * Plain-text key value. Returned exactly once at creation time. Never stored.
   */
  plainKey: string
}
