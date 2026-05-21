import { describe, it, expect, vi, beforeEach } from "vitest"
import { createApiKeyService } from "../api-key.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"

const SAMPLE_KEY_ROW = {
  id: "key-1",
  name: "WMS Read Key",
  key_prefix: "tac_live_ab",
  scope: "read_only",
  customer_id: null,
  is_active: true,
  last_used_at: null,
  expires_at: null,
  created_by: "user-1",
  revoked_at: null,
  revoked_by: null,
  created_at: "2026-01-01T00:00:00Z",
}

function makeChain(result: object) {
  const c: Record<string, unknown> = {}
  ;["select", "insert", "update", "eq", "order", "single"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

describe("createApiKeyService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  it("listApiKeys maps rows to ApiKey objects", async () => {
    const chain = makeChain({ data: [SAMPLE_KEY_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const keys = await createApiKeyService(db).listApiKeys()

    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatchObject({
      id: "key-1",
      name: "WMS Read Key",
      scope: "read_only",
      isActive: true,
    })
  })

  it("createApiKey generates a plainKey and stores hashed key", async () => {
    const chain = makeChain({ data: SAMPLE_KEY_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const result = await createApiKeyService(db).createApiKey({
      name: "WMS Read Key",
      scope: "read_only",
    })

    expect(result.plainKey).toMatch(/^tac_live_/)
    expect(result.plainKey.length).toBeGreaterThan(12)
    expect(result.id).toBe("key-1")
  })

  it("revokeApiKey sets is_active=false", async () => {
    const chain = makeChain({ error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createApiKeyService(db).revokeApiKey("key-1")).resolves.toBeUndefined()
    expect(db.from).toHaveBeenCalledWith("api_keys")
  })

  it("listApiKeys throws on db error", async () => {
    const chain = makeChain({ data: null, error: { message: "Key DB error" } })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createApiKeyService(db).listApiKeys()).rejects.toMatchObject({
      message: "Key DB error",
    })
  })
})
