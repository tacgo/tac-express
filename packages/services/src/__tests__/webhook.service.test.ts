import { describe, it, expect, vi, beforeEach } from "vitest"
import { createWebhookService } from "../webhook.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"

const SAMPLE_WEBHOOK_ROW = {
  id: "wh-1",
  name: "WMS Integration",
  url: "https://wms.example.com/hooks/tac",
  secret: "abcdef1234567890",
  events: ["shipment.created", "shipment.delivered"],
  is_active: true,
  last_success_at: null,
  last_failure_at: null,
  failure_count: 0,
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function makeChain(result: object) {
  const c: Record<string, unknown> = {}
  ;["select", "insert", "update", "delete", "eq", "order", "limit", "single"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

describe("createWebhookService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  it("listWebhooks maps rows to Webhook objects", async () => {
    const chain = makeChain({ data: [SAMPLE_WEBHOOK_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const webhooks = await createWebhookService(db).listWebhooks()

    expect(webhooks).toHaveLength(1)
    expect(webhooks[0]).toMatchObject({
      id: "wh-1",
      name: "WMS Integration",
      isActive: true,
      events: ["shipment.created", "shipment.delivered"],
    })
  })

  it("listWebhooks returns empty array on null data", async () => {
    const chain = makeChain({ data: null, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    expect(await createWebhookService(db).listWebhooks()).toEqual([])
  })

  it("createWebhook inserts and returns mapped webhook", async () => {
    const chain = makeChain({ data: SAMPLE_WEBHOOK_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const wh = await createWebhookService(db).createWebhook({
      name: "WMS Integration",
      url: "https://wms.example.com/hooks/tac",
      events: ["shipment.created"],
    })

    expect(wh.name).toBe("WMS Integration")
    expect(wh.secret).toBeTruthy()
  })

  it("deleteWebhook calls delete on correct id", async () => {
    const chain = makeChain({ error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createWebhookService(db).deleteWebhook("wh-1")).resolves.toBeUndefined()
    expect(db.from).toHaveBeenCalledWith("webhooks")
  })

  it("listWebhooks throws on error", async () => {
    const chain = makeChain({ data: null, error: { message: "Webhook DB error" } })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createWebhookService(db).listWebhooks()).rejects.toMatchObject({
      message: "Webhook DB error",
    })
  })
})
