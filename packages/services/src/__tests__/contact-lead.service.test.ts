/**
 * Unit tests for createContactLeadService (PL-2b).
 *
 * The service contract:
 *  - Insert lead row FIRST. If the insert fails, return { ok: false } —
 *    no notification attempt is made.
 *  - Call WhatsApp send AFTER the row exists. A failed send does NOT
 *    revert the row; status updates to 'failed' and the call returns
 *    { ok: true } so the visitor isn't told the lead was lost.
 *  - When the recipient phone is not configured, skip the send entirely
 *    and mark the row 'failed' with a clear marker.
 */

import { describe, expect, it, vi } from "vitest"
import type { SupabaseClient } from "@workspace/database/supabase.types"

import { createContactLeadService } from "../contact-lead.service"
import type { TrackedWhatsAppService } from "../whatsapp-tracked.service"

const SAMPLE_INPUT = {
  name: "Aman Sharma",
  email: "aman@example.com",
  company: "Tea Cooperative",
  reason: "sales" as const,
  message: "Looking for a quote to Imphal.",
}

const SAMPLE_META = {
  ipAddress: "203.0.113.5",
  userAgent: "Mozilla/5.0",
}

const CONFIG_PHONE = "918765432100"
const CONFIG = {
  notificationPhone: CONFIG_PHONE,
  templateName: "lead_notification",
  templateLanguage: "en",
}

function makeDbWithInsert(result: { data: { id: string } | null; error: { message: string } | null }) {
  const updateCalls: Array<{ table: string; values: unknown }> = []
  const insertCalls: Array<{ table: string; values: unknown }> = []

  const from = vi.fn((table: string) => {
    const builder: Record<string, unknown> = {}
    builder.insert = vi.fn((values: unknown) => {
      insertCalls.push({ table, values })
      const next: Record<string, unknown> = {}
      next.select = vi.fn(() => next)
      next.single = vi.fn(() => Promise.resolve(result))
      return next
    })
    builder.update = vi.fn((values: unknown) => {
      updateCalls.push({ table, values })
      const next: Record<string, unknown> = {}
      next.eq = vi.fn(() => Promise.resolve({ data: null, error: null }))
      return next
    })
    return builder
  })

  return {
    db: { from } as unknown as SupabaseClient,
    insertCalls,
    updateCalls,
  }
}

function makeWhatsapp(sendResult: {
  ok: boolean
  error?: string
  data?: unknown
}): TrackedWhatsAppService {
  return {
    sendTemplate: vi.fn(() => Promise.resolve(sendResult)),
    // The rest are unused by submitContactLead — narrow stubs are fine.
    sendMessage: vi.fn(),
    makeContact: vi.fn(),
    getContact: vi.fn(),
    getTemplates: vi.fn(),
    retryWhatsappSend: vi.fn(),
    getWhatsappSendById: vi.fn(),
    listFailedWhatsappSends: vi.fn(),
  } as unknown as TrackedWhatsAppService
}

describe("createContactLeadService.submitContactLead", () => {
  it("returns { ok: true, notificationStatus: 'sent' } on the happy path", async () => {
    const { db, insertCalls, updateCalls } = makeDbWithInsert({
      data: { id: "lead-1" },
      error: null,
    })
    const whatsapp = makeWhatsapp({ ok: true, data: { message_wamid: "wamid.xyz" } })
    const service = createContactLeadService(db, whatsapp, CONFIG)

    const result = await service.submitContactLead(SAMPLE_INPUT, SAMPLE_META)

    expect(result).toEqual({ ok: true, id: "lead-1", notificationStatus: "sent" })
    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0]?.table).toBe("contact_leads")
    expect(whatsapp.sendTemplate).toHaveBeenCalledOnce()
    expect(whatsapp.sendTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: CONFIG_PHONE,
        templateName: "lead_notification",
        templateLanguage: "en",
      }),
    )
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]?.table).toBe("contact_leads")
    expect(updateCalls[0]?.values).toMatchObject({ notification_status: "sent" })
  })

  it("returns { ok: false } and does NOT call WhatsApp if the lead insert fails", async () => {
    const { db, updateCalls } = makeDbWithInsert({
      data: null,
      error: { message: "boom" },
    })
    const whatsapp = makeWhatsapp({ ok: true })
    const service = createContactLeadService(db, whatsapp, CONFIG)

    const result = await service.submitContactLead(SAMPLE_INPUT, SAMPLE_META)

    expect(result.ok).toBe(false)
    expect(whatsapp.sendTemplate).not.toHaveBeenCalled()
    // No row exists so we never update.
    expect(updateCalls).toHaveLength(0)
  })

  it("returns { ok: true, notificationStatus: 'failed' } when WhatsApp send fails (lead still captured)", async () => {
    const { db, insertCalls, updateCalls } = makeDbWithInsert({
      data: { id: "lead-2" },
      error: null,
    })
    const whatsapp = makeWhatsapp({ ok: false, error: "template not approved" })
    const service = createContactLeadService(db, whatsapp, CONFIG)

    const result = await service.submitContactLead(SAMPLE_INPUT, SAMPLE_META)

    expect(result).toEqual({ ok: true, id: "lead-2", notificationStatus: "failed" })
    expect(insertCalls).toHaveLength(1)
    expect(whatsapp.sendTemplate).toHaveBeenCalledOnce()
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]?.values).toMatchObject({ notification_status: "failed" })
  })

  it("returns { ok: true, notificationStatus: 'failed' } when WhatsApp send throws (lead still captured)", async () => {
    const { db, updateCalls } = makeDbWithInsert({
      data: { id: "lead-3" },
      error: null,
    })
    const whatsapp: TrackedWhatsAppService = {
      sendTemplate: vi.fn(() => {
        throw new Error("network down")
      }),
      sendMessage: vi.fn(),
      makeContact: vi.fn(),
      getContact: vi.fn(),
      getTemplates: vi.fn(),
      retryWhatsappSend: vi.fn(),
      getWhatsappSendById: vi.fn(),
      listFailedWhatsappSends: vi.fn(),
    } as unknown as TrackedWhatsAppService
    const service = createContactLeadService(db, whatsapp, CONFIG)

    // Suppress the expected console.error so it doesn't pollute the test output.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    try {
      const result = await service.submitContactLead(SAMPLE_INPUT, SAMPLE_META)
      expect(result).toEqual({ ok: true, id: "lead-3", notificationStatus: "failed" })
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0]?.values).toMatchObject({ notification_status: "failed" })
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it("skips the WhatsApp send when notificationPhone is null and marks the row failed", async () => {
    const { db, updateCalls } = makeDbWithInsert({
      data: { id: "lead-4" },
      error: null,
    })
    const whatsapp = makeWhatsapp({ ok: true })
    const service = createContactLeadService(db, whatsapp, {
      ...CONFIG,
      notificationPhone: null,
    })

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    try {
      const result = await service.submitContactLead(SAMPLE_INPUT, SAMPLE_META)
      expect(result).toEqual({ ok: true, id: "lead-4", notificationStatus: "failed" })
      expect(whatsapp.sendTemplate).not.toHaveBeenCalled()
      expect(updateCalls).toHaveLength(1)
      expect(updateCalls[0]?.values).toMatchObject({ notification_status: "failed" })
    } finally {
      consoleSpy.mockRestore()
    }
  })

  it("truncates long messages to 200 chars + ellipsis in the template body parameter", async () => {
    const { db } = makeDbWithInsert({ data: { id: "lead-5" }, error: null })
    const whatsapp = makeWhatsapp({ ok: true })
    const service = createContactLeadService(db, whatsapp, CONFIG)
    const longMessage = "x".repeat(500)

    await service.submitContactLead(
      { ...SAMPLE_INPUT, message: longMessage },
      SAMPLE_META,
    )

    const call = (whatsapp.sendTemplate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    const bodyParams = call?.components?.[0]?.parameters as Array<{ text: string }>
    expect(bodyParams).toBeDefined()
    expect(bodyParams[3]?.text).toBe("x".repeat(200) + "…")
  })

  it("passes the reason label (not the enum key) to the template", async () => {
    const { db } = makeDbWithInsert({ data: { id: "lead-6" }, error: null })
    const whatsapp = makeWhatsapp({ ok: true })
    const service = createContactLeadService(db, whatsapp, CONFIG)

    await service.submitContactLead(
      { ...SAMPLE_INPUT, reason: "partner" },
      SAMPLE_META,
    )

    const call = (whatsapp.sendTemplate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    const bodyParams = call?.components?.[0]?.parameters as Array<{ text: string }>
    expect(bodyParams[0]?.text).toBe("Partner")
  })
})
