import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { captureRbacDenial } from "@workspace/auth"
import { getServerAuth } from "@workspace/auth/server"
import { isManagerOrAbove } from "@workspace/auth/rbac"
import { UserRole } from "@workspace/types"
import {
  createAdminServerService,
  createInvoiceServerService,
  createTrackedWhatsAppServerService,
} from "@workspace/services/server"
import {
  buildInvoiceMessage,
  type InvoiceLike,
} from "@workspace/services/whatsapp/invoice-replay-payload"
import { checkWhatsApp } from "@/lib/rate-limit"
import { logger } from "@/lib/logger"

/**
 * POST /api/whatsapp/retry-send
 *
 * Manual operator retry for a failed WhatsApp send (SB-1 / #153 / W2 PR 2).
 * Closes the write half of the W2 read/retry split opened by PR #152.
 *
 * Scope (V1):
 *   - Retries `sendmessage` (direct-mode) failures only. Template
 *     (`sendtemplatemessage`) retries require `templateLanguage` metadata
 *     not stored on `whatsapp_sends`; out of scope for V1 — the UI shows
 *     the retry button disabled with an explanatory tooltip for template
 *     rows. Filed as POST-LAUNCH follow-up.
 *   - Requires the original failed send to be linked to an invoice
 *     (invoice_id IS NOT NULL). All current sends are invoice-linked; this
 *     guard exists for forward-compatibility with future non-invoice sends.
 *
 * Layered safety (see decision § E):
 *   Layer 1 — Service guards (already shipped in PR #141): row exists +
 *     status=='failed' + endpoint matches. Defense-in-depth on every
 *     retryWhatsappSend call.
 *   Layer 2 — Route guards (this file): MANAGER+ role-gate + kill-switch
 *     check + Upstash rate-limit + scope guards (sendmessage-only,
 *     invoice-linked, invoice still readable). All BEFORE the service call.
 *   Layer 3 — UI guards (client wrapper): per-row in-flight lock; double-
 *     click is a no-op at the wrapper.
 *
 * Money-flow contract: a retry produces AT MOST one additional `sendmessage`
 * call to WPBox per click. The service's "status must be failed" guard
 * fires deterministically against the row id passed in, so a duplicate POST
 * (network retry, browser-back, etc.) cannot produce a second send for the
 * same `original_send_id` while the first attempt is in-flight (queued) or
 * has completed. See decision § E.
 */

const RequestBodySchema = z.object({
  originalSendId: z.string().uuid(),
})

const log = logger.child({ route: "/api/whatsapp/retry-send" })

export async function POST(req: NextRequest) {
  // ─── 0. Server-side kill switch (mirrors send-invoice) ──────────────
  if (process.env.WHATSAPP_ENABLED !== "true") {
    return NextResponse.json(
      {
        error:
          "WhatsApp sending is disabled. Set WHATSAPP_ENABLED=true to enable.",
      },
      { status: 503 },
    )
  }

  // ─── 1. Authn + Authz ───────────────────────────────────────────────
  const cookieStore = await cookies()
  const auth = getServerAuth(cookieStore)
  const user = await auth.getUser().catch(() => null)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Same DB-error vs null pattern as the two pre-flight reads below
  // (getWhatsappSendById, getInvoiceById) — route-local consistency.
  // Genuine missing profile → fall through to the role gate (403 RBAC
  // denial); thrown DB error → 500 (no false RBAC-denial telemetry).
  const adminService = createAdminServerService(cookieStore)
  let profile: Awaited<ReturnType<typeof adminService.getProfileById>> | null
  try {
    profile = await adminService.getProfileById(user.id)
  } catch (err) {
    log.error(
      {
        userId: user.id,
        errorMsg: err instanceof Error ? err.message : String(err),
      },
      "getProfileById threw — surfacing as 500",
    )
    return NextResponse.json(
      { error: "Internal error reading operator profile." },
      { status: 500 },
    )
  }
  const role = profile?.role as UserRole | undefined
  if (!role || !isManagerOrAbove(role)) {
    captureRbacDenial({
      requiredRole: UserRole.MANAGER,
      actualRole: role ?? UserRole.OPS_STAFF,
      surface: "/api/whatsapp/retry-send",
    })
    return NextResponse.json(
      {
        error:
          "Insufficient permissions. Retrying a WhatsApp send requires MANAGER or above.",
      },
      { status: 403 },
    )
  }

  // ─── 2. Parse + validate body (BEFORE the per-send rate-limit so we
  // have parsed.originalSendId available for the second guard) ─────────
  let parsed: z.infer<typeof RequestBodySchema>
  try {
    const raw = await req.json()
    parsed = RequestBodySchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", issues: err.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // ─── 3a. Per-user quota (mirrors send-invoice) ──────────────────────
  const rl = await checkWhatsApp(`user:${user.id}`)
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "Too many requests. Try again in a minute.",
        limit: rl.limit,
        remaining: rl.remaining,
        reset: rl.reset,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.reset),
        },
      },
    )
  }

  // ─── 3b. Per-originalSendId in-flight guard (CodeRabbit #156 — cross-
  // operator concurrency defense-in-depth) ──────────────────────────────
  //
  // The per-user quota above prevents bursts from ONE operator. The
  // service-layer pre-INSERT existing-attempt check prevents most
  // cross-operator races but leaves a TOCTOU window. This Upstash-backed
  // per-originalSendId quota narrows that window further: two operators
  // hitting the same originalSendId within the rate-limit window are
  // serialized through Upstash. Same shape as the per-user guard —
  // returns 429 with rate-limit headers.
  const retryRl = await checkWhatsApp(`retry-send:${parsed.originalSendId}`)
  if (!retryRl.success) {
    return NextResponse.json(
      {
        error:
          "A retry for this failed send is already in progress. Try again in a minute.",
        limit: retryRl.limit,
        remaining: retryRl.remaining,
        reset: retryRl.reset,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(retryRl.limit),
          "X-RateLimit-Remaining": String(retryRl.remaining),
          "X-RateLimit-Reset": String(retryRl.reset),
        },
      },
    )
  }

  // ─── 4. Pre-flight check on the failed row ──────────────────────────
  // Distinguish true "not found" (null result) from DB errors (thrown).
  // CodeRabbit #156 — a blanket `.catch(() => null)` would mask a Supabase
  // outage as a 404, misleading incident triage.
  const trackedSvc = createTrackedWhatsAppServerService(cookieStore)
  let failedRow: Awaited<ReturnType<typeof trackedSvc.getWhatsappSendById>>
  try {
    failedRow = await trackedSvc.getWhatsappSendById(parsed.originalSendId)
  } catch (err) {
    log.error(
      {
        originalSendId: parsed.originalSendId,
        errorMsg: err instanceof Error ? err.message : String(err),
      },
      "getWhatsappSendById threw — surfacing as 500",
    )
    return NextResponse.json(
      { error: "Internal error reading failed-send record." },
      { status: 500 },
    )
  }

  if (!failedRow) {
    return NextResponse.json(
      { error: "Failed send not found, or not visible to this user." },
      { status: 404 },
    )
  }

  if (failedRow.status !== "failed") {
    return NextResponse.json(
      {
        error: `This send is no longer in a retryable state (status=${failedRow.status}). Refresh the page.`,
      },
      { status: 409 },
    )
  }

  if (failedRow.endpoint !== "sendmessage") {
    // V1 scope cut — template retries need templateLanguage metadata that
    // isn't stored on whatsapp_sends today. See decision § A.
    return NextResponse.json(
      {
        error:
          "Template-message retries are not supported in this view yet. Re-send from the invoice detail page.",
      },
      { status: 422 },
    )
  }

  if (failedRow.invoice_id === null) {
    return NextResponse.json(
      {
        error:
          "Replay is supported only for invoice-linked sends in V1.",
      },
      { status: 422 },
    )
  }

  // ─── 5. Load the invoice (RLS-checked via cookie-bound Supabase) ────
  // Same pattern as the getWhatsappSendById pre-flight above (CodeRabbit
  // #156): distinguish true-null (cancelled/deleted/RLS-hidden invoice =
  // expected, returns 422) from a DB outage (thrown, returns 500). The
  // blanket `.catch(() => null)` here would mask a Supabase outage as a
  // "no longer readable" 422, misleading incident triage.
  const invoiceService = createInvoiceServerService(cookieStore)
  let invoice: InvoiceLike | null
  try {
    invoice = (await invoiceService.getInvoiceById(
      failedRow.invoice_id,
    )) as InvoiceLike | null
  } catch (err) {
    log.error(
      {
        invoiceId: failedRow.invoice_id,
        errorMsg: err instanceof Error ? err.message : String(err),
      },
      "getInvoiceById threw — surfacing as 500",
    )
    return NextResponse.json(
      { error: "Internal error reading invoice record." },
      { status: 500 },
    )
  }

  if (!invoice) {
    return NextResponse.json(
      {
        error:
          "Invoice no longer readable. It may have been cancelled or deleted since the original send.",
      },
      { status: 422 },
    )
  }

  // ─── 6. Reconstruct the replay payload ──────────────────────────────
  // Direct-mode only (V1). Phone comes from the original row — that is
  // the SAME number the original send used, preserving the IDOR guards
  // the original send-invoice route enforced at the time.
  const message = buildInvoiceMessage(invoice)

  // ─── 7. Call the wrapper (Layer 1 guards fire here too) ─────────────
  log.debug(
    {
      originalSendId: failedRow.id,
      invoiceNumber: invoice.invoiceNumber,
      attemptNo: failedRow.attempt_no,
      userId: user.id,
    },
    "retrying WhatsApp send",
  )

  let outcome: Awaited<ReturnType<typeof trackedSvc.retryWhatsappSend>>
  try {
    outcome = await trackedSvc.retryWhatsappSend(failedRow.id, {
      endpoint: "sendmessage",
      input: {
        phone: failedRow.phone,
        message,
        header: `TAC Express · ${invoice.invoiceNumber}`,
        footer: "Reply to this message for queries.",
      },
    })
  } catch (err) {
    log.error(
      {
        originalSendId: failedRow.id,
        invoiceNumber: invoice.invoiceNumber,
        errorMsg: err instanceof Error ? err.message : String(err),
      },
      "retryWhatsappSend threw",
    )
    return NextResponse.json(
      { error: "Retry threw unexpectedly. See server logs." },
      { status: 502 },
    )
  }

  if (!outcome.result.ok) {
    log.warn(
      {
        originalSendId: failedRow.id,
        invoiceNumber: invoice.invoiceNumber,
        newSendId: outcome.newSendId,
        errorMsg: outcome.result.error,
      },
      "retry attempt failed",
    )
    return NextResponse.json(
      {
        ok: false,
        error: outcome.result.error,
        newSendId: outcome.newSendId,
      },
      { status: 502 },
    )
  }

  log.info(
    {
      originalSendId: failedRow.id,
      invoiceNumber: invoice.invoiceNumber,
      newSendId: outcome.newSendId,
    },
    "retry succeeded",
  )

  return NextResponse.json({
    ok: true,
    newSendId: outcome.newSendId,
  })
}
