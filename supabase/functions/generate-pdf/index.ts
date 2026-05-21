// Supabase Edge Function: generate-pdf
// Generates a structured PDF for invoices, manifests, or shipping labels.
// Uses pdf-lib (Deno-compatible) to produce real, renderable PDFs.
//
// Body shape: { entity_type: 'invoice'|'manifest'|'shipping_label', entity_id: string }

import { createClient } from "jsr:@supabase/supabase-js@2"
import { PDFDocument, StandardFonts, rgb, PageSizes } from "npm:pdf-lib@1.17.1"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const BUCKET: Record<string, string> = {
  invoice: "invoices",
  manifest: "manifests",
  shipping_label: "shipping-labels",
}

// ── Color palette (TAC Orbital mission-control) ─────────────────────────────
const C = {
  ink: rgb(0.08, 0.09, 0.10),
  surface: rgb(0.96, 0.97, 0.98),
  primary: rgb(0.31, 0.49, 1.0),
  muted: rgb(0.42, 0.47, 0.55),
  border: rgb(0.85, 0.87, 0.90),
  success: rgb(0.11, 0.80, 0.52),
  danger: rgb(0.93, 0.27, 0.27),
  white: rgb(1, 1, 1),
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function drawHLine(
  page: ReturnType<PDFDocument["addPage"]>,
  y: number,
  xStart: number,
  xEnd: number,
) {
  page.drawLine({
    start: { x: xStart, y },
    end: { x: xEnd, y },
    thickness: 0.5,
    color: C.border,
  })
}

function drawRect(
  page: ReturnType<PDFDocument["addPage"]>,
  x: number,
  y: number,
  w: number,
  h: number,
  color: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width: w, height: h, color })
}

// ── Invoice PDF ──────────────────────────────────────────────────────────────

async function buildInvoicePdf(
  invoice: Record<string, unknown>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage(PageSizes.A4)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()
  const margin = 48

  // Header bar
  drawRect(page, 0, height - 80, width, 80, C.ink)
  page.drawText("TAC EXPRESS", {
    x: margin,
    y: height - 48,
    size: 18,
    font: bold,
    color: C.white,
  })
  page.drawText("INVOICE", {
    x: width - margin - 64,
    y: height - 36,
    size: 22,
    font: bold,
    color: C.primary,
  })

  // Invoice meta
  let y = height - 120
  const invNum = (invoice.invoice_number as string) ?? "—"
  const status = ((invoice.status as string) ?? "").toUpperCase()
  const amount = (invoice.total_amount as number) ?? 0

  page.drawText(`Invoice: ${invNum}`, { x: margin, y, size: 11, font: bold, color: C.ink })
  page.drawText(`Status: ${status}`, { x: 300, y, size: 10, font: regular, color: C.muted })
  y -= 22
  page.drawText(
    `Issue date: ${invoice.issued_at ? new Date(invoice.issued_at as string).toLocaleDateString("en-IN") : "—"}`,
    { x: margin, y, size: 10, font: regular, color: C.muted },
  )
  page.drawText(
    `Due: ${invoice.due_date ? new Date(invoice.due_date as string).toLocaleDateString("en-IN") : "—"}`,
    { x: 300, y, size: 10, font: regular, color: C.muted },
  )

  // Divider
  y -= 24
  drawHLine(page, y, margin, width - margin)

  // Totals section
  y -= 28
  page.drawText("Amount Due", { x: margin, y, size: 12, font: bold, color: C.ink })
  page.drawText(`₹ ${amount.toLocaleString("en-IN")}`, {
    x: width - margin - 100,
    y,
    size: 20,
    font: bold,
    color: C.primary,
  })

  y -= 20
  const gst = (invoice.gst_amount as number) ?? 0
  const base = amount - gst
  page.drawText(`Base: ₹${base.toLocaleString("en-IN")}`, {
    x: margin,
    y,
    size: 9,
    font: regular,
    color: C.muted,
  })
  page.drawText(`GST: ₹${gst.toLocaleString("en-IN")}`, {
    x: 160,
    y,
    size: 9,
    font: regular,
    color: C.muted,
  })

  // Footer
  drawHLine(page, 60, margin, width - margin)
  page.drawText("TAC Express Logistics Pvt. Ltd. · Imphal, Manipur, India", {
    x: margin,
    y: 44,
    size: 8,
    font: regular,
    color: C.muted,
  })
  page.drawText("GSTIN: 14AABCT1332L1Z7 · CIN: U63090MN2024PTC012345", {
    x: margin,
    y: 32,
    size: 8,
    font: regular,
    color: C.muted,
  })

  return doc.save()
}

// ── Manifest PDF ──────────────────────────────────────────────────────────────

async function buildManifestPdf(
  manifest: Record<string, unknown>,
  shipments: Record<string, unknown>[],
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage(PageSizes.A4)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const { width, height } = page.getSize()
  const margin = 48

  drawRect(page, 0, height - 80, width, 80, C.ink)
  page.drawText("TAC EXPRESS", { x: margin, y: height - 48, size: 18, font: bold, color: C.white })
  page.drawText("MANIFEST", { x: width - margin - 72, y: height - 36, size: 22, font: bold, color: C.primary })

  let y = height - 120
  page.drawText(`Manifest: ${(manifest.manifest_number as string) ?? "—"}`, {
    x: margin, y, size: 11, font: bold, color: C.ink,
  })
  y -= 20
  page.drawText(
    `${(manifest.origin_hub as string) ?? "—"} → ${(manifest.dest_hub as string) ?? "—"}  ·  ${(manifest.transport_mode as string) ?? ""}  ·  ${(manifest.status as string) ?? ""}`,
    { x: margin, y, size: 10, font: regular, color: C.muted },
  )

  y -= 28
  drawHLine(page, y, margin, width - margin)

  // Column headers
  y -= 20
  const cols = [
    { label: "AWB", x: margin },
    { label: "Pieces", x: 200 },
    { label: "Weight", x: 260 },
    { label: "Origin", x: 330 },
    { label: "Destination", x: 390 },
    { label: "Service", x: 460 },
  ]
  cols.forEach(({ label, x }) => {
    page.drawText(label, { x, y, size: 8, font: bold, color: C.muted })
  })
  y -= 4
  drawHLine(page, y, margin, width - margin)

  shipments.slice(0, 40).forEach((s) => {
    y -= 16
    if (y < 60) return
    page.drawText((s.awb_number as string) ?? "—", { x: margin, y, size: 8, font: regular, color: C.ink })
    page.drawText(String(s.pieces ?? 1), { x: 200, y, size: 8, font: regular, color: C.ink })
    page.drawText(`${s.chargeable_weight ?? 0} kg`, { x: 260, y, size: 8, font: regular, color: C.ink })
    page.drawText((s.origin_hub as string) ?? "—", { x: 330, y, size: 8, font: regular, color: C.ink })
    page.drawText((s.dest_hub as string) ?? "—", { x: 390, y, size: 8, font: regular, color: C.ink })
    page.drawText((s.service_level as string) ?? "—", { x: 460, y, size: 8, font: regular, color: C.ink })
  })

  y -= 24
  drawHLine(page, y, margin, width - margin)
  y -= 16
  page.drawText(`Total shipments: ${shipments.length}`, { x: margin, y, size: 9, font: bold, color: C.ink })

  drawHLine(page, 60, margin, width - margin)
  page.drawText("TAC Express Logistics Pvt. Ltd. · Generated by TAC Operations Platform", {
    x: margin, y: 44, size: 8, font: regular, color: C.muted,
  })

  return doc.save()
}

// ── Shipping label PDF ────────────────────────────────────────────────────────

async function buildShippingLabelPdf(
  shipment: Record<string, unknown>,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  // 4×6 inch label
  const page = doc.addPage([288, 432])
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)

  drawRect(page, 0, 392, 288, 40, C.ink)
  page.drawText("TAC EXPRESS", { x: 12, y: 408, size: 14, font: bold, color: C.white })

  const service = (shipment.service_level as string) ?? "standard"
  page.drawText(service.replace("_", " ").toUpperCase(), {
    x: 200, y: 408, size: 10, font: bold, color: C.primary,
  })

  let y = 378
  page.drawText("FROM:", { x: 12, y, size: 7, font: bold, color: C.muted })
  y -= 14
  page.drawText((shipment.sender_name as string) ?? "—", { x: 12, y, size: 10, font: bold, color: C.ink })
  y -= 12
  page.drawText(`Pin: ${(shipment.sender_pincode as string) ?? "—"}`, { x: 12, y, size: 9, font: regular, color: C.muted })

  y -= 20
  drawHLine(page, y, 12, 276)
  y -= 16
  page.drawText("TO:", { x: 12, y, size: 7, font: bold, color: C.muted })
  y -= 14
  page.drawText((shipment.receiver_name as string) ?? "—", { x: 12, y, size: 10, font: bold, color: C.ink })
  y -= 12
  page.drawText(`Pin: ${(shipment.receiver_pincode as string) ?? "—"}`, { x: 12, y, size: 9, font: regular, color: C.muted })
  y -= 10
  page.drawText((shipment.receiver_phone as string) ?? "", { x: 12, y, size: 9, font: regular, color: C.muted })

  y -= 20
  drawHLine(page, y, 12, 276)
  y -= 16
  page.drawText(`AWB: ${(shipment.awb_number as string) ?? "—"}`, {
    x: 12, y, size: 13, font: bold, color: C.ink,
  })

  y -= 16
  page.drawText(
    `${(shipment.origin_hub as string) ?? "—"} → ${(shipment.dest_hub as string) ?? "—"}  ·  ${(shipment.pieces ?? 1)} pc  ·  ${(shipment.chargeable_weight ?? 0)} kg`,
    { x: 12, y, size: 9, font: regular, color: C.muted },
  )

  drawHLine(page, 20, 12, 276)
  page.drawText("Fragile · Handle with care", {
    x: 12, y: 8, size: 7, font: regular, color: C.muted,
  })

  return doc.save()
}

// ── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  let entity_type: string, entity_id: string
  try {
    const body = await req.json()
    entity_type = body.entity_type
    entity_id = body.entity_id
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 })
  }

  const bucket = BUCKET[entity_type]
  if (!bucket) {
    return new Response(JSON.stringify({ error: "Unknown entity_type" }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  let pdfBytes: Uint8Array

  try {
    if (entity_type === "invoice") {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", entity_id)
        .single()
      if (error) throw error
      pdfBytes = await buildInvoicePdf(data as Record<string, unknown>)
    } else if (entity_type === "manifest") {
      const [manifestRes, shipmentsRes] = await Promise.all([
        supabase.from("manifests").select("*").eq("id", entity_id).single(),
        supabase
          .from("shipments")
          .select("awb_number,pieces,chargeable_weight,origin_hub,dest_hub,service_level")
          .eq("manifest_id", entity_id),
      ])
      if (manifestRes.error) throw manifestRes.error
      pdfBytes = await buildManifestPdf(
        manifestRes.data as Record<string, unknown>,
        (shipmentsRes.data ?? []) as Record<string, unknown>[],
      )
    } else {
      // shipping_label
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .eq("id", entity_id)
        .single()
      if (error) throw error
      pdfBytes = await buildShippingLabelPdf(data as Record<string, unknown>)
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500 })
  }

  const path = `${entity_type}/${entity_id}.pdf`

  const { error: uploadErr } = await supabase.storage
    .from(bucket)
    .upload(path, pdfBytes, { contentType: "application/pdf", upsert: true })
  if (uploadErr) {
    return new Response(JSON.stringify({ error: uploadErr.message }), { status: 500 })
  }

  const category =
    entity_type === "invoice" ? "invoice_pdf" : entity_type === "shipping_label" ? "label" : "document"

  await supabase.from("attachments").upsert(
    {
      bucket,
      storage_path: path,
      entity_type,
      entity_id,
      filename: `${entity_id}.pdf`,
      mime_type: "application/pdf",
      size_bytes: pdfBytes.byteLength,
      category,
    },
    { onConflict: "bucket,storage_path" },
  )

  return new Response(JSON.stringify({ bucket, path, size_bytes: pdfBytes.byteLength }), {
    headers: { "content-type": "application/json" },
  })
})
