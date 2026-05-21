/**
 * HMAC-signed invoice PDF tokens.
 *
 * The public `/api/public/invoice-pdf` route is fetched by WhatsApp's
 * servers — they have no Supabase session, so we can't use cookie-bound
 * auth. Instead, the dashboard signs a **self-contained** payload that
 * carries the entire invoice data needed to render the PDF, plus an
 * expiry. The route verifies the HMAC and renders the PDF without
 * touching the database.
 *
 * Why self-contained (vs. ID + service-role lookup):
 *   - No `SUPABASE_SERVICE_ROLE_KEY` exposure surface.
 *   - The signed payload is a snapshot — even if the invoice is later
 *     edited or deleted, the URL still resolves to the version that was
 *     sent (good for audit / customer-side immutability).
 *   - Single env var (`INVOICE_PDF_SIGNING_SECRET`) — no extra DB plumbing.
 *
 * URL shape produced by `buildSignedInvoicePdfUrl`:
 *   https://host/api/public/invoice-pdf?p=<base64url(json)>&s=<base64url(hmac)>
 *
 * Server-only module — DO NOT import from a client component.
 */

import { createHmac, timingSafeEqual } from "node:crypto"

import type { InvoicePdfData } from "./invoice-pdf"

/** Compact, signed payload. Lives entirely inside the URL. */
export interface InvoicePdfPayload {
  data: InvoicePdfData
  /** Unix epoch milliseconds. The route rejects requests past this. */
  exp: number
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days — WhatsApp may
// fetch the URL minutes-to-hours after we send. A long TTL is fine
// because the payload itself is immutable once signed.

/* ─── Encoders ─────────────────────────────────────────────────────────── */

function toBase64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function fromBase64Url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4))
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64")
}

/* ─── Signing ──────────────────────────────────────────────────────────── */

function getSecret(): string {
  const secret = process.env.INVOICE_PDF_SIGNING_SECRET
  // Require ≥ 32 bytes of entropy as 64 hex chars. The recommended
  // generation command emits exactly that. This HMAC is the ONLY auth
  // on the public PDF route, so the threat model demands more than the
  // previous 16-char placeholder.
  //
  // Validation pattern (per audit #101 / tracking #102):
  // length-only check accepted any 64-char string including weak
  // patterns like "aaaaaaaa…" (~26 bits of entropy). Hex-format check
  // ensures the secret was generated from a CSPRNG.
  if (!secret || !/^[0-9a-f]{64}$/i.test(secret)) {
    throw new Error(
      "INVOICE_PDF_SIGNING_SECRET is not set or is not 64 hex chars (32 bytes of entropy). " +
        "Add to apps/dashboard/.env.local — generate with: " +
        "node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    )
  }
  return secret
}

function sign(payloadEncoded: string, secret: string): string {
  return toBase64Url(
    createHmac("sha256", secret).update(payloadEncoded).digest()
  )
}

/**
 * Build a signed URL that the public PDF route can render. The host
 * comes from the caller (we don't read `NEXT_PUBLIC_DASHBOARD_URL`
 * inside this helper, because in production WhatsApp must hit the
 * deployed origin, not localhost).
 */
export function buildSignedInvoicePdfUrl(input: {
  origin: string
  data: InvoicePdfData
  ttlMs?: number
}): string {
  const payload: InvoicePdfPayload = {
    data: input.data,
    exp: Date.now() + (input.ttlMs ?? DEFAULT_TTL_MS),
  }
  const json = JSON.stringify(payload)
  const p = toBase64Url(Buffer.from(json, "utf-8"))
  const s = sign(p, getSecret())
  const origin = input.origin.replace(/\/+$/, "")
  return `${origin}/api/public/invoice-pdf?p=${p}&s=${s}`
}

/* ─── Verifying ────────────────────────────────────────────────────────── */

export type VerifyResult =
  | { ok: true; payload: InvoicePdfPayload }
  | { ok: false; error: string }

/**
 * Verify a signed token from the public PDF route's query params.
 * Returns a discriminated result so the route handler can branch
 * without try/catch.
 */
export function verifyInvoicePdfToken(input: {
  p: string | null
  s: string | null
}): VerifyResult {
  if (!input.p || !input.s) {
    return { ok: false, error: "Missing 'p' or 's' query parameter" }
  }

  let secret: string
  try {
    secret = getSecret()
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  const expected = sign(input.p, secret)
  const expectedBuf = Buffer.from(expected)
  const actualBuf = Buffer.from(input.s)
  if (expectedBuf.length !== actualBuf.length) {
    return { ok: false, error: "Signature mismatch" }
  }
  if (!timingSafeEqual(expectedBuf, actualBuf)) {
    return { ok: false, error: "Signature mismatch" }
  }

  let parsed: InvoicePdfPayload
  try {
    parsed = JSON.parse(fromBase64Url(input.p).toString("utf-8"))
  } catch {
    return { ok: false, error: "Payload is not valid JSON" }
  }

  if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) {
    return { ok: false, error: "Token has expired" }
  }
  if (!parsed.data || typeof parsed.data !== "object") {
    return { ok: false, error: "Payload missing data" }
  }

  return { ok: true, payload: parsed }
}
