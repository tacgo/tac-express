import type { NextRequest } from "next/server"

/**
 * Public-origin resolution helpers for routes that mint URLs WhatsApp's
 * media fetcher (or any other off-network client) has to reach.
 *
 * Two consumers today:
 *   1. `apps/dashboard/app/api/whatsapp/send-invoice/route.ts` — calls
 *      `resolvePublicOrigin()` to build a signed PDF URL when no manual
 *      `templateMediaUrl` was supplied.
 *   2. `apps/dashboard/app/api/whatsapp/test/route.ts` — calls
 *      `isPdfAutoGenAvailable()` to drive the dialog's "hide manual URL
 *      field" toggle. Both use the same predicate so the dialog never
 *      hides the URL field for a request the send route can't fulfil.
 *
 * The third party (zod schema in send-invoice) reuses
 * `isPubliclyReachableHttpUrl` directly to reject operator-pasted URLs
 * that would fail at delivery time.
 */

/**
 * Returns true when `url` is a syntactically-valid http(s) URL pointing
 * at a publicly-routable host. Rejects:
 *   - non-http(s) schemes (file:, data:, javascript:, etc.)
 *   - localhost, 127.0.0.0/8, ::1
 *   - RFC 1918 private ranges (10/8, 172.16/12, 192.168/16)
 *   - link-local 169.254.0.0/16
 *   - IPv6 unique-local fc00::/7
 *   - IPv6 unspecified ::, IPv4 0.0.0.0
 *   - IPv4-mapped IPv6 (`::ffff:a.b.c.d` / `::ffff:WXYZ:WXYZ`) — these
 *     embed an IPv4 address inside an IPv6 representation and would
 *     otherwise bypass the dotted-quad checks. WHATWG URL serializes
 *     `::ffff:127.0.0.1` as `::ffff:7f00:1` so neither the dotted-quad
 *     regex nor the fc/fd ULA pattern catches it. We extract the
 *     embedded IPv4 (whether dotted or hex-encoded) and run the same
 *     private-range checks; if the embedded address is private, reject.
 *     Without this, an attacker who can control `templateMediaUrl` or
 *     `NEXT_PUBLIC_DASHBOARD_URL` could SSRF the dashboard into
 *     fetching from internal services.
 */
export function isPubliclyReachableHttpUrl(value: string): boolean {
  let u: URL
  try {
    u = new URL(value)
  } catch {
    return false
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false

  // WHATWG URL preserves the brackets around IPv6 hostnames
  // (`hostname` of `http://[::1]/` is `"[::1]"`, not `"::1"`). Strip
  // them once so all the host-classification logic below operates on
  // the bare textual form.
  const raw = u.hostname.toLowerCase()
  const host = raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw

  // Loopback / unspecified literals
  if (host === "localhost" || host === "::1" || host === "::") return false

  // IPv4 dotted-quad
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    if (!isPublicIPv4(Number(v4[1]), Number(v4[2]))) return false
  }

  // IPv6 unique-local fc00::/7 — match leading fc/fd nybble
  if (/^(fc|fd)[0-9a-f]{2}:/i.test(host)) return false

  // IPv4-mapped IPv6 (the SSRF bypass). WHATWG URL normalizes
  // `[::ffff:127.0.0.1]` to `[::ffff:7f00:1]` (hex form) so we have
  // to handle both representations. Decode the embedded IPv4 and run
  // the same private-range checks as the dotted-quad path.
  const v4MappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
  if (v4MappedHex) {
    const high = parseInt(v4MappedHex[1] ?? "0", 16)
    const o1 = (high >> 8) & 0xff
    const o2 = high & 0xff
    if (!isPublicIPv4(o1, o2)) return false
  }
  const v4MappedDotted = host.match(
    /^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/i
  )
  if (v4MappedDotted) {
    if (!isPublicIPv4(Number(v4MappedDotted[1]), Number(v4MappedDotted[2]))) {
      return false
    }
  }

  return true
}

/**
 * Apply RFC 1918 / loopback / link-local / unspecified checks against a
 * pair of IPv4 octets. Returns true if the address is publicly routable
 * (i.e. NOT in any of the rejected ranges). Shared between the plain
 * dotted-quad path and the IPv4-mapped IPv6 path.
 */
function isPublicIPv4(o1: number, o2: number): boolean {
  if (o1 === 0) return false // 0.0.0.0/8 unspecified
  if (o1 === 10) return false // 10/8
  if (o1 === 127) return false // loopback
  if (o1 === 169 && o2 === 254) return false // link-local
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return false // 172.16/12
  if (o1 === 192 && o2 === 168) return false // 192.168/16
  return true
}

/**
 * Resolve the public origin WhatsApp will use to fetch our PDF.
 *
 * Order of preference:
 *   1. `NEXT_PUBLIC_DASHBOARD_URL` — explicit env override (production).
 *   2. The request's `Host` header — works for any deployed host.
 *
 * Returns `null` when the resolved origin fails the
 * `isPubliclyReachableHttpUrl` predicate, so the dialog/send routes
 * fall back to manual URL entry instead of producing a
 * guaranteed-to-fail signed URL.
 */
export function resolvePublicOrigin(req: NextRequest): string | null {
  const explicit = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim()
  if (explicit) {
    const candidate = explicit.replace(/\/+$/, "")
    if (!isPubliclyReachableHttpUrl(candidate)) return null
    return candidate
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (host) {
    // `x-forwarded-proto` may carry a comma-separated list when multiple
    // proxies have prepended their own value (e.g. "https, http"). Take
    // the first entry — it's the one closest to the original client.
    const protoHeader = req.headers.get("x-forwarded-proto")
    const proto =
      protoHeader?.split(",")[0]?.trim() ||
      (host.includes(".") ? "https" : "http")
    const candidate = `${proto}://${host}`
    if (!isPubliclyReachableHttpUrl(candidate)) return null
    return candidate
  }

  return null
}

/**
 * Returns true when the dashboard can mint a signed PDF URL that
 * WhatsApp can reach — both the signing secret is set AND the
 * resolved origin passes the public-host predicate.
 *
 * Mirrors EXACTLY the conditions checked in the send route's
 * auto-generation block, so the dialog's "hide manual URL field"
 * toggle never hides for a request the send route can't fulfil.
 */
export function isPdfAutoGenAvailable(req: NextRequest): boolean {
  if (!process.env.INVOICE_PDF_SIGNING_SECRET) return false
  return resolvePublicOrigin(req) !== null
}
