/**
 * GET /api/track/[awb] — public AWB tracking lookup (WS-3).
 *
 * Plan: docs/launch/CUSTOMER-FACING-PLAN.md § 4 (WS-3 spec) +
 *       docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md § 6 (state choreography).
 *
 * The /track/[awb] PAGE route still exists and is the canonical deep-link
 * + SEO + share surface. This API route is the in-app fast path: the hero
 * <TrackingResultDialog> calls it client-side so the LOCATE action can
 * render results in a dialog without a full route navigation.
 *
 * Defense in depth (in order of execution):
 *   1. Rate limit by IP (30 lookups / minute — apps/web/lib/rate-limit.ts).
 *      More permissive than /api/contact because legitimate visitors may
 *      retry with corrected AWBs a few times.
 *   2. Zod validation of the AWB shape (3-30 chars, alphanumeric + dashes,
 *      uppercased before lookup).
 *   3. Service-layer call via createPublicTrackingService — no business
 *      logic in the route (LAW 6/7); zero auth needed (the service uses
 *      the anon key against RLS-public shipments + tracking_events).
 */

import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { createPublicTrackingService } from "@workspace/services/public-tracking.service"
// Use a relative path (not `@/lib/rate-limit`) so vitest can resolve the
// import — the `@/` TS-path alias is apps/web-scoped and not in the
// workspace vitest config. Functional behaviour identical.
import { checkTrackLookup } from "../../../../lib/rate-limit"

// ── AWB shape ──────────────────────────────────────────────────────────────
// Loose regex (matches what the LOCATE input accepts). The not-found UX
// already exists in <TrackingResultView> for "AWB parses but no record."
// This regex only stops blatantly malformed values from hitting Supabase.
const AwbSchema = z
  .string()
  .trim()
  .min(3, "AWB too short")
  .max(30, "AWB too long")
  .regex(/^[A-Z0-9-]+$/i, "AWB must be alphanumeric (dashes allowed)")
  .transform((v) => v.toUpperCase())

/** Best-effort per-visitor identifier from the request. Mirrors the
 *  pattern in /api/contact's getRateLimitIdentifier — first hop of
 *  x-forwarded-for, then x-real-ip, then constant fallback. */
function getRateLimitIdentifier(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp
  return "anonymous"
}

interface RouteContext {
  params: Promise<{ awb: string }>
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  // ── 1. Rate-limit by IP ──────────────────────────────────────────────────
  const ip = getRateLimitIdentifier(req)
  const rate = await checkTrackLookup(ip)
  if (!rate.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Too many lookups. Please wait a moment and try again.",
      },
      { status: 429 },
    )
  }

  // ── 2. Validate AWB shape ────────────────────────────────────────────────
  // decodeURIComponent throws URIError on malformed percent-encoding
  // (e.g. "%E0%A4%A"). Guard it so bad input becomes 400 not 500.
  const { awb: rawAwb } = await ctx.params
  let decodedAwb: string
  try {
    decodedAwb = decodeURIComponent(rawAwb)
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid AWB." },
      { status: 400 },
    )
  }

  const parsed = AwbSchema.safeParse(decodedAwb)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { ok: false, error: issue?.message ?? "Invalid AWB." },
      { status: 400 },
    )
  }
  const awb = parsed.data

  // ── 3. Service-layer call ────────────────────────────────────────────────
  // The service already handles non-2xx upstream responses by returning
  // null / []. The try/catch is for the pathological cases the service
  // can't swallow: network rejection, DNS failure, malformed JSON.
  // Returning 503 (Service Unavailable) signals "upstream is down, retry
  // later" — the dialog client can show its ERROR state with a retry CTA.
  const tracking = createPublicTrackingService({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  })

  let shipment: Awaited<ReturnType<typeof tracking.getShipmentByAwb>>
  let events: Awaited<ReturnType<typeof tracking.getTrackingEvents>>
  try {
    ;[shipment, events] = await Promise.all([
      tracking.getShipmentByAwb(awb),
      tracking.getTrackingEvents(awb),
    ])
  } catch {
    return NextResponse.json(
      { ok: false, error: "Tracking service unavailable. Please try again." },
      { status: 503 },
    )
  }

  if (!shipment) {
    return NextResponse.json(
      { ok: false, error: `No shipment found for AWB ${awb}.`, awb },
      { status: 404 },
    )
  }

  return NextResponse.json({ ok: true, awb, shipment, events })
}
