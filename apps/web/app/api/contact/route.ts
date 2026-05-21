/**
 * POST /api/contact — public contact-form submission (PL-2b).
 *
 * Issue tracker: PL-2b (docs/launch/product-launch-readiness.md § C.1).
 * Decision doc: docs/decisions/2026-05-18-contact-leads-pl-2b.md.
 *
 * Defense in depth (in order of execution):
 *   1. Rate limit by IP (5 submissions / 10 min — apps/web/lib/rate-limit.ts).
 *   2. Honeypot field check — `website` MUST be empty. Bots fill anything
 *      visible-looking; humans never see it (display:none + aria-hidden +
 *      tabIndex=-1 on the input). On honeypot hit, return 200 silently
 *      so the bot can't probe its way around.
 *   3. Zod validation of the JSON body (enum reason, length caps).
 *   4. Service-layer capture via createContactLeadServerService — DB-first,
 *      notify-second; a notification failure DOES NOT lose the lead.
 *
 * No business logic in this route (LAW 6/7): the service does all the work.
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createContactLeadServerService } from "@workspace/services/server"
import { CONTACT_LEAD_REASONS } from "@workspace/types"
import { checkContactForm } from "@/lib/rate-limit"

// ── Request schema ──────────────────────────────────────────────────────────
//
// Conservative caps matching the contact_leads CHECK constraints in the
// migration. Empty `company` is normalized to undefined so the service can
// pass NULL to the column.

const ContactRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  company: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  reason: z.enum(CONTACT_LEAD_REASONS),
  message: z.string().trim().min(1, "Message is required").max(4000),
  // Honeypot. ACCEPT any short string — the silent-reject decision is
  // made by the handler AFTER the schema parses (see § 3 below). If we
  // rejected non-empty honeypots at the schema layer, the response would
  // be a tell-tale 400 instead of the 200-OK that keeps the bot fooled.
  // The 200-char cap is just DoS protection; legitimate visitors send "".
  website: z.string().max(200).optional(),
})

/** Pull a stable per-visitor identifier from the request. Best-effort: most
 *  deploys put the real client IP in x-forwarded-for; fall through to the
 *  request's reported remote address. Falls back to a constant identifier
 *  if neither is available so rate-limiting never throws. */
function getRateLimitIdentifier(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    // x-forwarded-for is comma-separated when chained; first hop is the
    // originating client.
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  return "anonymous"
}

export async function POST(req: NextRequest) {
  // ── 1. Rate-limit by IP ────────────────────────────────────────────────────
  const ip = getRateLimitIdentifier(req)
  const rate = await checkContactForm(ip)
  if (!rate.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many submissions. Please try again in a few minutes.",
      },
      { status: 429 },
    )
  }

  // ── 2. Parse + zod-validate body ───────────────────────────────────────────
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 },
    )
  }

  const parsed = ContactRequestSchema.safeParse(body)
  if (!parsed.success) {
    // Surface the first issue — enough for UX without leaking schema details.
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      {
        ok: false,
        error: issue?.message ?? "Invalid form submission.",
        field: issue?.path?.[0] ?? null,
      },
      { status: 400 },
    )
  }

  // ── 3. Honeypot ────────────────────────────────────────────────────────────
  // If a bot filled `website`, return 200 silently — the bot believes the
  // request succeeded and doesn't probe further; no lead row is written.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true, id: null, notificationStatus: "skipped" })
  }

  // ── 4. Hand off to the service layer ───────────────────────────────────────
  const service = createContactLeadServerService()
  const userAgent = req.headers.get("user-agent")
  const result = await service.submitContactLead(
    {
      name: parsed.data.name,
      email: parsed.data.email,
      company: parsed.data.company,
      reason: parsed.data.reason,
      message: parsed.data.message,
    },
    {
      ipAddress: ip === "anonymous" ? null : ip,
      userAgent: userAgent ?? null,
    },
  )

  if (!result.ok) {
    // The lead was NOT captured — surface as a server error so the form
    // shows a real error to the visitor (no fake success).
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 },
    )
  }

  // Lead captured. notificationStatus is informational — even when it's
  // 'failed', the lead row exists and the team can follow up manually.
  return NextResponse.json({
    ok: true,
    id: result.id,
    notificationStatus: result.notificationStatus,
  })
}
