import { describe, it, expect, vi, beforeEach } from "vitest"
import { createAttachmentService } from "../attachment.service"
import { mockDb } from "./helpers/mock-db"
import type { SupabaseClient } from "@workspace/database/supabase.types"
import type { UUID } from "@workspace/types"

const id = (s: string): UUID => s as unknown as UUID

const SAMPLE_ATTACHMENT_ROW = {
  id: "att-1",
  bucket: "invoices",
  storage_path: "invoice/inv-1.pdf",
  entity_type: "invoice",
  entity_id: "inv-1",
  filename: "inv-1.pdf",
  mime_type: "application/pdf",
  size_bytes: 12345,
  category: "invoice_pdf",
  uploaded_by: "user-1",
  uploaded_at: "2026-01-01T00:00:00Z",
  metadata: {},
}

function makeChain(result: object) {
  const c: Record<string, unknown> = {}
  ;["select", "insert", "delete", "eq", "order", "single"].forEach((m) => {
    c[m] = vi.fn(() => c)
  })
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return c
}

describe("createAttachmentService", () => {
  let db: SupabaseClient

  beforeEach(() => {
    db = mockDb()
  })

  it("listForEntity returns mapped attachments", async () => {
    const chain = makeChain({ data: [SAMPLE_ATTACHMENT_ROW], error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const attachments = await createAttachmentService(db).listForEntity("invoice", "inv-1")

    expect(attachments).toHaveLength(1)
    expect(attachments[0]).toMatchObject({
      id: "att-1",
      filename: "inv-1.pdf",
      sizeBytes: 12345,
      entityType: "invoice",
    })
  })

  it("getSignedUrl returns signedUrl from storage", async () => {
    const url = await createAttachmentService(db).getSignedUrl("invoices", "invoice/inv-1.pdf")
    expect(url).toBe("https://example.com/signed")
  })

  it("uploadFile uploads blob then inserts attachment row", async () => {
    const chain = makeChain({ data: SAMPLE_ATTACHMENT_ROW, error: null })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    const blob = new Blob(["PDF bytes"], { type: "application/pdf" })
    const att = await createAttachmentService(db).uploadFile(
      {
        bucket: "invoices",
        storagePath: "invoice/inv-1.pdf",
        entityType: "invoice",
        entityId: id("inv-1"),
        filename: "inv-1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 9,
      },
      blob,
    )

    expect(att.filename).toBe("inv-1.pdf")
    expect(db.storage.from).toHaveBeenCalledWith("invoices")
  })

  it("listForEntity throws on error", async () => {
    const chain = makeChain({ data: null, error: { message: "Storage error" } })
    vi.mocked(db.from).mockReturnValue(chain as unknown as ReturnType<SupabaseClient["from"]>)

    await expect(
      createAttachmentService(db).listForEntity("invoice", "inv-1"),
    ).rejects.toMatchObject({ message: "Storage error" })
  })
})
