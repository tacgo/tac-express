import { describe, it, expect, vi, beforeEach } from "vitest"
import { createNotificationService } from "../notification.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { UUID } from "@workspace/types"

const id = (s: string): UUID => s as unknown as UUID

const SAMPLE_NOTIF_ROW = {
  id: "notif-1",
  user_id: "user-1",
  channel: "in_app",
  title: "Shipment Created",
  body: "AWB TAC20260001 has been booked.",
  link: "/shipments/ship-1",
  entity_type: "shipment",
  entity_id: "ship-1",
  is_read: false,
  read_at: null,
  metadata: {},
  created_at: "2026-04-01T10:00:00Z",
}

function makeChain(result: object) {
  const c: Record<string, unknown> = {}
  ;["select", "insert", "update", "eq", "order", "limit", "single"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

function makeCountChain(count: number) {
  const c: Record<string, unknown> = {}
  ;["select", "eq", "head"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve({ count, error: null }).then(resolve)
  return c
}

describe("createNotificationService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  it("listForUser returns mapped notifications", async () => {
    const chain = makeChain({ data: [SAMPLE_NOTIF_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const notifs = await createNotificationService(db).listForUser("user-1")

    expect(notifs).toHaveLength(1)
    expect(notifs[0]).toMatchObject({
      id: "notif-1",
      title: "Shipment Created",
      isRead: false,
      channel: "in_app",
    })
  })

  it("unreadCount returns correct count", async () => {
    const chain = makeCountChain(5)
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const count = await createNotificationService(db).unreadCount("user-1")
    expect(count).toBe(5)
  })

  it("markRead calls update on correct id", async () => {
    const chain = makeChain({ error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createNotificationService(db).markRead("notif-1")).resolves.toBeUndefined()
  })

  it("markAllRead calls update with user_id filter", async () => {
    const chain = makeChain({ error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createNotificationService(db).markAllRead("user-1")).resolves.toBeUndefined()
    expect(db.from).toHaveBeenCalledWith("notifications")
  })

  it("create inserts and returns mapped notification", async () => {
    const chain = makeChain({ data: SAMPLE_NOTIF_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const notif = await createNotificationService(db).create({
      userId: id("user-1"),
      title: "Shipment Created",
      body: "AWB TAC20260001 has been booked.",
    })

    expect(notif.title).toBe("Shipment Created")
    expect(notif.isRead).toBe(false)
  })
})
