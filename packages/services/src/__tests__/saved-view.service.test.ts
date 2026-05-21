import { describe, it, expect, vi, beforeEach } from "vitest"
import { createSavedViewService } from "../saved-view.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"

const SAMPLE_VIEW_ROW = {
  id: "view-1",
  user_id: "user-1",
  entity_type: "shipments",
  name: "My Open Shipments",
  filters: { status: "BOOKED" },
  sort: { field: "created_at", dir: "desc" },
  is_pinned: true,
  is_shared: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function makeChain(result: object) {
  const c: Record<string, unknown> = {}
  ;["select", "insert", "update", "delete", "eq", "or", "order", "single"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

describe("createSavedViewService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  it("listForUser returns mapped views", async () => {
    const chain = makeChain({ data: [SAMPLE_VIEW_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const views = await createSavedViewService(db).listForUser("user-1")

    expect(views).toHaveLength(1)
    expect(views[0]).toMatchObject({
      id: "view-1",
      name: "My Open Shipments",
      isPinned: true,
      entityType: "shipments",
    })
  })

  it("listForUser with entityType filter", async () => {
    const chain = makeChain({ data: [SAMPLE_VIEW_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const views = await createSavedViewService(db).listForUser("user-1", "shipments")
    expect(views).toHaveLength(1)
  })

  it("createView inserts and returns mapped view", async () => {
    const chain = makeChain({ data: SAMPLE_VIEW_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const view = await createSavedViewService(db).createView("user-1", {
      entityType: "shipments",
      name: "My Open Shipments",
    })

    expect(view.name).toBe("My Open Shipments")
    expect(view.userId).toBe("user-1")
  })

  it("deleteView calls delete on correct id", async () => {
    const chain = makeChain({ error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createSavedViewService(db).deleteView("view-1")).resolves.toBeUndefined()
    expect(db.from).toHaveBeenCalledWith("saved_views")
  })

  it("listForUser throws on error", async () => {
    const chain = makeChain({ data: null, error: { message: "View DB error" } })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createSavedViewService(db).listForUser("user-1")).rejects.toMatchObject({
      message: "View DB error",
    })
  })
})
