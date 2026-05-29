import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock rate-limit — always allow unless overridden
vi.mock("@/lib/rate-limit", () => ({
  checkContactForm: vi.fn().mockResolvedValue({ success: true }),
}))

// Mock the service layer
const mockSubmitContactLead = vi.fn().mockResolvedValue({ ok: true, id: "lead-123", notificationStatus: "sent" })
vi.mock("@workspace/services/server", () => ({
  createContactLeadServerService: vi.fn(() => ({ submitContactLead: mockSubmitContactLead })),
}))

// Lazy import AFTER mocks
let POST: typeof import("../../app/api/contact/route").POST

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import("../../app/api/contact/route")
  POST = mod.POST
})

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  })
}

const validBody = {
  name: "Rahul Singh",
  email: "rahul@example.com",
  company: "ACME Logistics",
  reason: "sales",
  message: "We need a rate card for Delhi-Imphal corridor.",
}

describe("POST /api/contact", () => {
  it("returns 200 on valid submission", async () => {
    const res = await POST(makeRequest(validBody))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
  })

  it("returns 400 when body is not JSON", async () => {
    const req = new NextRequest("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ name: "Rahul" }))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.ok).toBe(false)
  })

  it("returns 200 silently on honeypot hit (bot suppression)", async () => {
    const res = await POST(makeRequest({ ...validBody, website: "http://spam.com" }))
    expect(res.status).toBe(200)
    expect(mockSubmitContactLead).not.toHaveBeenCalled()
  })

  it("returns 429 when rate limit is exceeded", async () => {
    const { checkContactForm } = await import("@/lib/rate-limit")
    vi.mocked(checkContactForm).mockResolvedValueOnce({ success: false } as never)

    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(429)
  })

  it("returns 400 for invalid reason enum", async () => {
    const res = await POST(makeRequest({ ...validBody, reason: "PRICING" }))
    expect(res.status).toBe(400)
  })
})
