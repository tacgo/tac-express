import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHubService } from "../hub.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"

const SAMPLE_HUB_ROW = {
  id: "hub-1",
  code: "IMP",
  name: "Imphal Hub",
  city: "Imphal",
  state: "Manipur",
  country: "IN",
  pincode: "795001",
  address: "Imphal Airport Road",
  manager_id: null,
  is_origin: true,
  is_destination: true,
  is_active: true,
  metadata: {},
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
}

function makeChain(result: object) {
  const c: Record<string, unknown> = {}
  ;["select", "eq", "order", "maybeSingle", "single", "insert", "update"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

describe("createHubService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  it("listHubs maps rows to Hub objects", async () => {
    const chain = makeChain({ data: [SAMPLE_HUB_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const service = createHubService(db)
    const hubs = await service.listHubs(true)

    expect(hubs).toHaveLength(1)
    expect(hubs[0]).toMatchObject({
      id: "hub-1",
      code: "IMP",
      name: "Imphal Hub",
      city: "Imphal",
      isActive: true,
    })
    expect(db.from).toHaveBeenCalledWith("hubs")
  })

  it("listHubs returns empty array when db returns null data", async () => {
    const chain = makeChain({ data: null, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const hubs = await createHubService(db).listHubs()
    expect(hubs).toEqual([])
  })

  it("listHubs throws on db error", async () => {
    const chain = makeChain({ data: null, error: { message: "DB failure" } })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(createHubService(db).listHubs()).rejects.toMatchObject({
      message: "DB failure",
    })
  })

  it("getHubByCode returns null when not found", async () => {
    const chain = makeChain({ data: null, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const hub = await createHubService(db).getHubByCode("XYZ")
    expect(hub).toBeNull()
  })

  it("getHubByCode maps a found row", async () => {
    const chain = makeChain({ data: SAMPLE_HUB_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const hub = await createHubService(db).getHubByCode("IMP")
    expect(hub).not.toBeNull()
    expect(hub!.code).toBe("IMP")
  })
})
