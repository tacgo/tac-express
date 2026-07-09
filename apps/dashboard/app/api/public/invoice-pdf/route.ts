import path from "node:path"
import { promises as fs } from "node:fs"

import type { NextRequest } from "next/server"

import {
  assertCompanyConfig,
  renderInvoicePdfToBuffer,
} from "@workspace/services/pdf/invoice-pdf"
import { verifyInvoicePdfToken } from "@workspace/services/pdf/invoice-pdf-token"
import { generateQrPng } from "@workspace/services/pdf/qr"
import { logger } from "@/lib/logger"

const log = logger.child({ route: "/api/public/invoice-pdf" })

/**
 * GET /api/public/invoice-pdf?p=<base64>&s=<base64>
 *
 * Public, unauthenticated endpoint that renders an invoice PDF on demand.
 * Authorization is enforced by an HMAC signature on the URL — see
 * `packages/services/src/pdf/invoice-pdf-token.ts` for the wire format.
 *
 * The PDF is generated server-side using `@react-pdf/renderer`, with the
 * dashboard's `public/pdf-header.png` embedded as the page banner.
 *
 * This route is fetched by **WhatsApp's servers** when delivering the
 * `tac_express_corridor_invoice` template — they have no Supabase
 * session, so cookie-bound auth is not an option. The signed-payload
 * approach lets us prove authorization without exposing any DB access.
 *
 * Failure modes:
 *   400 — missing `p` or `s` params
 *   401 — signature mismatch / expired token / signing secret unset
 *   500 — header image missing or PDF render error
 */

// Use the Node runtime — `@react-pdf/renderer` and `node:crypto` aren't
// available in the Edge runtime. `force-dynamic` so the route is never
// cached: each request re-verifies the signature and re-renders.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

let cachedHeaderImage: Buffer | null = null
let cachedHeaderImageError: string | null = null

async function loadHeaderImage(): Promise<Buffer | null> {
  if (cachedHeaderImage) return cachedHeaderImage
  if (cachedHeaderImageError) return null
  try {
    // Next.js sets cwd to the dashboard app root during request handling.
    // The header lives at apps/dashboard/public/pdf-header.png.
    const p = path.join(process.cwd(), "public", "pdf-header.png")
    const buf = await fs.readFile(p)
    cachedHeaderImage = buf
    return buf
  } catch (err) {
    cachedHeaderImageError = err instanceof Error ? err.message : String(err)
    log.warn(
      { err: { message: cachedHeaderImageError } },
      "header image not found — rendering without banner",
    )
    return null
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const p = url.searchParams.get("p")
  const s = url.searchParams.get("s")

  /* ─── 0. Refuse to render with placeholder company/bank config ───
   *
   * The PDF is a legal tax document. If COMPANY_GSTIN, BANK_ACCOUNT,
   * etc. aren't set in the environment, `assertCompanyConfig()` throws
   * — better to return a 500 here than to deliver a customer-facing
   * invoice with `[unset]` GSTIN or "1234..." account numbers. */
  try {
    assertCompanyConfig()
  } catch (err) {
    log.error(
      { err: err instanceof Error ? { message: err.message, name: err.name } : { value: String(err) } },
      "company/bank config invalid",
    )
    return new Response(
      JSON.stringify({
        error: "Invoice PDF cannot render",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }

  /* ─── 1. Verify signature ─── */
  const result = verifyInvoicePdfToken({ p, s })
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: result.error }),
      {
        status: result.error.includes("Missing") ? 400 : 401,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  /* ─── 2. Load the header banner ─── */
  const headerBuffer = await loadHeaderImage()
  // The service `renderInvoicePdfToBuffer` already accepts the binary
  // variant — its `headerImageSrc?` parameter is typed
  // `string | { data: Buffer; format: "png" | "jpg" }`. Backlog item O2
  // pre-#149 the cast at this site was `as unknown as string`, which
  // was hiding nothing — it widened a perfectly-typed object to a
  // string the service didn't need. Removed. The genuine library-side
  // @react-pdf/renderer type-gap (Image src declared as string-only)
  // is handled INSIDE the service's JSX at packages/services/src/pdf/
  // invoice-pdf.tsx, where it belongs — the route just passes the
  // typed union through.
  const headerImageSrc = headerBuffer
    ? { data: headerBuffer, format: "png" as const }
    : undefined

  /* ─── 3. Generate QR (optional — degrades gracefully if it fails) ─── */
  const trackingUrl = result.payload.data.trackingUrl ?? undefined
  const qrPng = trackingUrl
    ? await generateQrPng({ text: trackingUrl })
    : null

  /* ─── 4. Render the PDF ─── */
  let buffer: Buffer
  try {
    buffer = await renderInvoicePdfToBuffer({
      data: result.payload.data,
      headerImageSrc,
      qrPng: qrPng ?? undefined,
      trackingUrl,
    })
  } catch (err) {
    log.error(
      {
        err: err instanceof Error ? { message: err.message, name: err.name } : { value: String(err) },
        invoiceNumber: result.payload.data.invoiceNumber,
      },
      "PDF render failed",
    )
    return new Response(
      JSON.stringify({
        error: "PDF render failed",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }

  /* ─── 4. Return as application/pdf ─── */
  const filename = `TAC-Invoice-${result.payload.data.invoiceNumber}.pdf`
  // Wrap the Buffer in a Blob — universally accepted by the global
  // Response constructor across Next/Edge/Node typings. Buffer alone is
  // sometimes flagged because TS resolves to BodyInit shapes that omit
  // raw Uint8Array.
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" })
  // `Content-Disposition: inline` lets WhatsApp / browsers preview
  // rather than force-download.
  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      // 1-hour edge cache is safe — the URL itself is short-lived,
      // and the payload is signed/immutable.
      "Cache-Control": "public, max-age=3600, immutable",
    },
  })
}
