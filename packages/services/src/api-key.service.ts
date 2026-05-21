import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { ApiKey, ApiKeyInput, ApiKeyCreated } from "@workspace/types"

function mapApiKey(row: Record<string, unknown>): ApiKey {
  return {
    id: row.id as ApiKey["id"],
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    scope: row.scope as ApiKey["scope"],
    customerId: (row.customer_id as ApiKey["customerId"]) ?? null,
    isActive: (row.is_active as boolean) ?? true,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    createdBy: (row.created_by as ApiKey["createdBy"]) ?? null,
    revokedAt: (row.revoked_at as string | null) ?? null,
    revokedBy: (row.revoked_by as ApiKey["revokedBy"]) ?? null,
    createdAt: row.created_at as string,
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest("SHA-256", buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function generateRawKey(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const tail = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  return `tac_live_${tail}`
}

export function createApiKeyService(db: SupabaseClient) {
  return {
    async listApiKeys(): Promise<ApiKey[]> {
      const { data, error } = await db
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapApiKey)
    },

    async createApiKey(input: ApiKeyInput): Promise<ApiKeyCreated> {
      const plainKey = generateRawKey()
      const keyHash = await sha256Hex(plainKey)
      const keyPrefix = plainKey.slice(0, 12)

      const { data, error } = await db
        .from("api_keys")
        .insert({
          name: input.name,
          scope: input.scope,
          customer_id: input.customerId ?? null,
          expires_at: input.expiresAt ?? null,
          key_prefix: keyPrefix,
          key_hash: keyHash,
        })
        .select("*")
        .single()
      if (error) throw error

      return { ...mapApiKey(data), plainKey }
    },

    async revokeApiKey(id: string): Promise<void> {
      const { error } = await db
        .from("api_keys")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", id)
      if (error) throw error
    },
  }
}

export type ApiKeyService = ReturnType<typeof createApiKeyService>
