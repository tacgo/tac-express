import { describe, it, expect, vi, beforeEach } from "vitest"
import { createOrbitalService } from "../orbital.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"

/**
 * Orbital service-layer tests. The orbital service composes
 * analytics + dashboard services and transforms data into chart-primitive
 * shapes. We verify shape correctness — not Supabase wire behavior, which
 * the underlying services already cover.
 */

function chainOf(result: { data?: unknown; error?: unknown; count?: number | null }) {
  const c: Record<string, unknown> = {}
  ;[
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "not", "is",
    "order", "limit", "range", "single", "head",
  ].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

describe("createOrbitalService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  describe("getStatusDistribution", () => {
    it("maps analytics status counts into Segment[] with humanised labels", async () => {
      // Two queries fire: shipments fetch + status reduce. The mock returns
      // empty for the first call and we override the second.
      vi.mocked(db.from).mockImplementation(((_table: string) =>
        chainOf({
          data: [
            { status: "IN_TRANSIT" },
            { status: "IN_TRANSIT" },
            { status: "DELIVERED" },
          ],
          error: null,
        })) as unknown as SupabaseClient["from"])

      const segments = await createOrbitalService(db).getStatusDistribution()

      expect(segments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ key: "IN_TRANSIT", value: 2, label: "IN TRANSIT" }),
          expect.objectContaining({ key: "DELIVERED", value: 1, label: "DELIVERED" }),
        ]),
      )
      // Segment keys are stable machine identifiers, not display labels.
      for (const seg of segments) {
        expect(seg.key).toMatch(/^[A-Z_]+$/)
      }
    })
  })

  describe("getServiceMix", () => {
    it("buckets shipments by service_level and title-cases the label", async () => {
      vi.mocked(db.from).mockReturnValue(
        chainOf({
          data: [
            { service_level: "EXPRESS" },
            { service_level: "EXPRESS" },
            { service_level: "STANDARD" },
            { service_level: null }, // falls back to STANDARD
          ],
          error: null,
        }) as unknown as ReturnType<SupabaseClient["from"]>,
      )

      const mix = await createOrbitalService(db).getServiceMix()

      const standard = mix.find((s) => s.key === "STANDARD")
      const express = mix.find((s) => s.key === "EXPRESS")
      expect(standard?.value).toBe(2)
      expect(express?.value).toBe(2)
      expect(standard?.label).toBe("Standard")
      expect(express?.label).toBe("Express")
    })
  })

  describe("getLaneHeatmap", () => {
    it("dedups origins/destinations, sums per-lane cells, sorts axes", async () => {
      vi.mocked(db.from).mockReturnValue(
        chainOf({
          data: [
            { origin_hub: "DEL", dest_hub: "BLR" },
            { origin_hub: "DEL", dest_hub: "BLR" },
            { origin_hub: "BOM", dest_hub: "BLR" },
            { origin_hub: "DEL", dest_hub: "MAA" },
          ],
          error: null,
        }) as unknown as ReturnType<SupabaseClient["from"]>,
      )

      const heat = await createOrbitalService(db).getLaneHeatmap()

      expect(heat.origins).toEqual(["BOM", "DEL"])
      expect(heat.destinations).toEqual(["BLR", "MAA"])
      const delBlr = heat.cells.find(
        (c) => c.origin === "DEL" && c.destination === "BLR",
      )
      expect(delBlr?.value).toBe(2)
    })
  })

  describe("getSlaBreachDistribution", () => {
    it("derives ontime/late/breached buckets with breached = 20% of late", async () => {
      // Stub the underlying analytics.getShipmentTrend by intercepting db.
      // The analytics service queries the shipments table; we feed a series
      // that yields a known split.
      vi.mocked(db.from).mockReturnValue(
        chainOf({
          data: [
            // Day 1: 100 created (10 delivered → 90 late, 18 breached)
            ...Array.from({ length: 90 }, () => ({
              created_at: "2026-04-01T10:00:00Z",
              status: "IN_TRANSIT",
            })),
            ...Array.from({ length: 10 }, () => ({
              created_at: "2026-04-01T10:00:00Z",
              status: "DELIVERED",
            })),
            // Day 2: 50 created (50 delivered → 0 late, 0 breached)
            ...Array.from({ length: 50 }, () => ({
              created_at: "2026-04-02T10:00:00Z",
              status: "DELIVERED",
            })),
          ],
          error: null,
        }) as unknown as ReturnType<SupabaseClient["from"]>,
      )

      const buckets = await createOrbitalService(db).getSlaBreachDistribution({
        days: 30,
      })

      const day1 = buckets.find((b) => b.date === "2026-04-01")
      const day2 = buckets.find((b) => b.date === "2026-04-02")

      // 90 late, 18 breached, 72 plain late
      expect(day1).toEqual({
        date: "2026-04-01",
        ontime: 10,
        late: 72,
        breached: 18,
      })
      // All delivered → no breaches
      expect(day2).toEqual({
        date: "2026-04-02",
        ontime: 50,
        late: 0,
        breached: 0,
      })
    })
  })

  describe("getSuccessRate", () => {
    it("returns rate=0 + correct shape when no shipments exist", async () => {
      // Default mock returns empty data + count: 0 for every chain.
      const rate = await createOrbitalService(db).getSuccessRate()
      expect(rate).toEqual({
        value: 0,
        max: 100,
        target: 90,
        label: "Delivered on commit",
      })
    })
  })
})
