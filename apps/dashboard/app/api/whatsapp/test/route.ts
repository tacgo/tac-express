import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { getServerAuth } from "@workspace/auth/server"
import { captureRbacDenial } from "@workspace/auth"
import { isManagerOrAbove } from "@workspace/auth/rbac"
import { UserRole } from "@workspace/types"
import { createAdminServerService } from "@workspace/services/server"
import { createWhatsAppServiceFromEnv } from "@workspace/services/whatsapp.service"
import { checkWhatsApp } from "@/lib/rate-limit"
import { isPdfAutoGenAvailable } from "@/lib/public-origin"

/**
 * GET /api/whatsapp/test
 *
 * Diagnostics endpoint — verifies the WPBox configuration AND fetches
 * the list of approved templates the dialog uses to pick a delivery
 * mode. Returns each template's `name`, `language`, `status`, `body`,
 * and — critically — `headerFormat` (DOCUMENT / IMAGE / VIDEO /
 * undefined). The dialog uses `headerFormat` to decide whether to
 * require a media URL field.
 *
 * Authentication & rate-limiting:
 *   - Requires an authenticated MANAGER+ user. The endpoint exposes
 *     internal config state and template metadata — not for anon
 *     callers — and a getTemplates() call hits WPBox upstream, so
 *     unauthenticated access would let any internet caller burn our
 *     WPBox quota.
 *   - Per-user rate-limited by the same bucket as the send endpoint.
 *     Diagnostics calls are typically once per dialog open, so the
 *     budget is plenty.
 */
export const dynamic = "force-dynamic"

interface TemplateSummary {
  name: string
  language: string
  status?: string
  body?: string
  /** "DOCUMENT" | "IMAGE" | "VIDEO" | "TEXT" | undefined */
  headerFormat?: string
}

export async function GET(req: NextRequest) {
  /* ── 0a. Authn + Authz — MANAGER+ same as the send route ── */
  const cookieStore = await cookies()
  const auth = getServerAuth(cookieStore)
  const user = await auth.getUser().catch(() => null)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const adminService = createAdminServerService(cookieStore)
  const profile = await adminService.getProfileById(user.id).catch(() => null)
  const role = profile?.role as UserRole | undefined
  if (!role || !isManagerOrAbove(role)) {
    // BLOCK adoption per audit doc § 2.1.
    captureRbacDenial({
      requiredRole: UserRole.MANAGER,
      actualRole: role ?? UserRole.OPS_STAFF,
      surface: "/api/whatsapp/test",
    })
    return NextResponse.json(
      {
        error:
          "Insufficient permissions. WhatsApp diagnostics require MANAGER or above.",
      },
      { status: 403 }
    )
  }

  /* ── 0b. Per-user rate limit — same bucket as the send route. ── */
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
      }
    )
  }

  /* ── 1. PDF auto-gen availability ──
   *
   * The dialog uses this flag to hide the manual "Document URL" field
   * when the server can produce signed `/api/public/invoice-pdf` URLs
   * itself. Two preconditions:
   *   - `INVOICE_PDF_SIGNING_SECRET` is set (server can HMAC-sign).
   *   - The dashboard origin is publicly reachable (WhatsApp can fetch it).
   *
   * `localhost` / `127.0.0.1` resolve to "no" because Meta's servers
   * can't reach the dev machine. Tunneling tools (ngrok, Cloudflare
   * Tunnel) flip this to true once `NEXT_PUBLIC_DASHBOARD_URL` is set
   * to the tunneled origin.
   */
  const pdfAutoGenAvailable = isPdfAutoGenAvailable(req)

  /* ── 2. Config check ── */
  let svc
  try {
    svc = createWhatsAppServiceFromEnv()
  } catch (err) {
    return NextResponse.json({
      ok: false,
      configured: false,
      connected: false,
      pdfAutoGenAvailable,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  /* ── 3. Connectivity check + fetch template catalog ── */
  const result = await svc.getTemplates()
  if (!result.ok) {
    return NextResponse.json({
      ok: false,
      configured: true,
      connected: false,
      pdfAutoGenAvailable,
      error: result.error,
      rawResponse: result.rawResponse,
      status: result.status,
    })
  }

  /* ── 4. Extract template list (best-effort across response shapes) ── */
  const rawTemplates = extractTemplatesArray(result.data)
  const templates: TemplateSummary[] = rawTemplates
    .map(normalizeTemplate)
    .filter((t): t is TemplateSummary => t !== null)

  return NextResponse.json({
    ok: true,
    configured: true,
    connected: true,
    pdfAutoGenAvailable,
    templates,
  })
}

/* `isPdfAutoGenAvailable` is imported from `@/lib/public-origin` so the
 * dialog's "URL needed?" gate matches the send route's auto-gen path
 * EXACTLY — both use the same `isPubliclyReachableHttpUrl` predicate
 * (loopback + RFC1918 + link-local + IPv6 ULA all rejected). */

/* ════════════════════════════════════════════════════════════════════════ */
/*  Helpers — defensive parsers, since the WPBox response shape varies      */
/* ════════════════════════════════════════════════════════════════════════ */

function extractTemplatesArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.templates)) return obj.templates
    if (Array.isArray(obj.data)) return obj.data
    if (Array.isArray(obj.results)) return obj.results
  }
  return []
}

interface TemplateComponentLike {
  type?: unknown
  format?: unknown
  text?: unknown
  body?: unknown
  content?: unknown
}

/**
 * Normalize a single template entry to the lean shape the dialog needs.
 *
 * WPBox returns `components` as a JSON STRING (escaped JSON). We unwrap
 * it once before walking, then look for:
 *   - HEADER component → expose its `format` so the dialog can decide
 *     whether to require a media URL
 *   - BODY component → expose its `text` so the dialog can count `{{N}}`
 *     placeholders for parameter prefilling
 */
function normalizeTemplate(t: unknown): TemplateSummary | null {
  if (!t || typeof t !== "object") return null
  const obj = t as Record<string, unknown>

  const name = pickString(obj, ["name", "template_name"])
  if (!name) return null

  const language =
    pickString(obj, ["language", "template_language", "lang", "locale"]) ?? "en"
  const status = pickString(obj, ["status", "template_status"])

  // First: try the flat top-level shapes some APIs use.
  let body = pickString(obj, ["body", "body_text", "text", "content"])
  let headerFormat: string | undefined

  // Then: parse `components`. WPBox returns this as either an array or a
  // JSON-encoded string, so handle both.
  const componentsField = obj.components
  let components: TemplateComponentLike[] = []
  if (Array.isArray(componentsField)) {
    components = componentsField as TemplateComponentLike[]
  } else if (typeof componentsField === "string") {
    try {
      const parsed = JSON.parse(componentsField)
      if (Array.isArray(parsed)) components = parsed as TemplateComponentLike[]
    } catch {
      /* malformed JSON — skip */
    }
  }

  for (const c of components) {
    if (!c || typeof c !== "object") continue
    const cType = String(c.type ?? "").toUpperCase()
    if (cType === "HEADER") {
      const fmt = c.format
      if (typeof fmt === "string" && fmt.length > 0) {
        headerFormat = fmt.toUpperCase()
      }
    }
    if (cType === "BODY" && !body) {
      const componentText = c.text ?? c.body ?? c.content
      if (typeof componentText === "string" && componentText.length > 0) {
        body = componentText
      }
    }
  }

  return { name, language, status, body, headerFormat }
}

function pickString(
  obj: Record<string, unknown>,
  keys: readonly string[]
): string | undefined {
  for (const key of keys) {
    const value = obj[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return undefined
}
