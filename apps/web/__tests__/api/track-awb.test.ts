import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock rate-limit — always allow unless overridden
vi.mock("@/lib/rate-limit", () => ({
  checkTrackLookup: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock the tracking service
const mockGetShipmentByAwb = vi.fn()
const mockGetTrackingEvents = vi.fn().mockResolvedValue([])
vi.mock("@workspace/services/public-tracking.service", () => ({
  createPublicTrackingService: vi.fn(() => ({
    getShipmentByAwb: mockGetShipmentByAwb,
    getTrackingEvents: mockGetTrackingEvents,
  })),
}))

let GET: typeof import("../../app/api/track/[awb]/route").GET

beforeEach(async () => {
  vi.clearAllMocks()
  mockGetTrackingEvents.mockResolvedValue([])
  const mod = await import("../../app/api/track/[awb]/route")
  GET = mod.GET
})

function makeRequest(awb: string) {
  return new NextRequest(`http://localhost/api/track/${awb}`)
}

const SAMPLE_SHIPMENT = { id: "ship-1", awb_number: "TAC001", status: "IN_TRANSIT" }

describe("GET /api/track/[awb]", () => {
  it("returns 200 with shipment data for a valid AWB", async () => {
    mockGetShipmentByAwb.mockResolvedValueOnce(SAMPLE_SHIPMENT)

    const res = await GET(makeRequest("TAC001"), { params: Promise.resolve({ awb: "TAC001" }) })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.awb).toBe("TAC001")
  })

  it("returns 404 when AWB is not found", async () => {
    mockGetShipmentByAwb.mockResolvedValueOnce(null)

    const res = await GET(makeRequest("UNKNOWN999"), { params: Promise.resolve({ awb: "UNKNOWN999" }) })
    expect(res.status).toBe(404)
  })

  it("returns 400 for an AWB that is too short", async () => {
    const res = await GET(makeRequest("X"), { params: Promise.resolve({ awb: "X" }) })
    expect(res.status).toBe(400)
  })

  it("returns 400 for an AWB that is too long (>30 chars)", async () => {
    const longAwb = "A".repeat(31)
    const res = await GET(makeRequest(longAwb), { params: Promise.resolve({ awb: longAwb }) })
    expect(res.status).toBe(400)
  })

  it("returns 429 when rate limited", async () => {
    const { checkTrackLookup } = await import("@/lib/rate-limit")
    vi.mocked(checkTrackLookup).mockResolvedValueOnce({ success: false } as never)

    const res = await GET(makeRequest("TAC001"), { params: Promise.resolve({ awb: "TAC001" }) })
    expect(res.status).toBe(429)
  })

  it("uppercases the AWB before lookup", async () => {
    mockGetShipmentByAwb.mockResolvedValueOnce(SAMPLE_SHIPMENT)

    await GET(makeRequest("tac001"), { params: Promise.resolve({ awb: "tac001" }) })
    expect(mockGetShipmentByAwb).toHaveBeenCalledWith("TAC001")
  })

  it("returns 503 when the tracking service throws", async () => {
    mockGetShipmentByAwb.mockRejectedValueOnce(new Error("network error"))

    const res = await GET(makeRequest("TAC001"), { params: Promise.resolve({ awb: "TAC001" }) })
    expect(res.status).toBe(503)
  })
})
