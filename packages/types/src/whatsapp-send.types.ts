// WhatsApp delivery-tracker types.
//
// Backing table: public.whatsapp_sends (migration 20260517000001).
// Wrapper:       packages/services/src/whatsapp-tracked.service.ts.
// Decision doc:  docs/decisions/2026-05-17-whatsapp-sends-mechanism.md.
//
// Both unions below are mirrored at the DB layer via CHECK constraints on
// public.whatsapp_sends; the SAME literal sets MUST appear in both places.
// The exhaustiveness sentinels at the bottom of this file (and in the
// wrapper's test file) fail at COMPILE time if a literal is added to one
// union without being added to the matching ALL_* constant — preventing
// the "added a status to the type but forgot to update the matrix" bug
// shape that an Object.values() check would silently pass on a wrong-but-
// non-empty matrix.
//
// Catalog reference: docs/patterns/coderabbit-catalog.md entry #8 (enum
// exhaustiveness via `satisfies` + `Exclude<>`). The pattern is identical
// to PaymentMethod's sentinel from PR #118.

import type { UUID } from "./domain.types"

/** ISO-8601 timestamp string (Postgres timestamptz round-trip shape). */
type ISOTimestamp = string

/**
 * WhatsAppSendStatus — within-attempt lifecycle.
 *
 *   queued — row INSERTed before the API call; await result
 *   sent   — API returned ok with a non-null WAMID
 *   failed — API returned !ok, fetch threw, or WAMID-null silent rejection
 *
 * The DB CHECK constraint on whatsapp_sends.status enforces the same set.
 * A retry is modeled as a NEW row (attempt_no=prev+1, original_send_id=prev.id),
 * NOT as a status mutation — there is no `retried` value.
 *
 * Webhook-driven `delivered` / `read` statuses are intentionally OUT OF
 * SCOPE for V1; if added later they become a separate row written by the
 * webhook handler and linked via `wamid`. See decision doc § A.
 */
export type WhatsAppSendStatus = "queued" | "sent" | "failed"

export const ALL_WHATSAPP_SEND_STATUSES = [
  "queued",
  "sent",
  "failed",
] as const satisfies readonly WhatsAppSendStatus[]

// Compile-time exhaustiveness check — if a new status literal is added to
// the WhatsAppSendStatus union without adding it to ALL_WHATSAPP_SEND_STATUSES,
// the `Exclude` resolves to a non-`never` type and the assignment fails.
// Per catalog entry #8 — do NOT use Object.values for this check.
type _WhatsAppSendStatusMissing = Exclude<
  WhatsAppSendStatus,
  (typeof ALL_WHATSAPP_SEND_STATUSES)[number]
>
const _allWhatsAppSendStatusesCovered: _WhatsAppSendStatusMissing extends never
  ? true
  : never = true
// Reference to silence no-unused-vars; the type-check IS the assertion.
void _allWhatsAppSendStatusesCovered

/**
 * WhatsAppSendEndpoint — which WPBox endpoint produced a row. Maps 1:1 to
 * the two send methods on the underlying whatsapp.service WhatsAppService
 * interface (sendMessage and sendTemplate). makeContact / getContact /
 * getTemplates are NOT tracked (not sends).
 */
export type WhatsAppSendEndpoint = "sendmessage" | "sendtemplatemessage"

export const ALL_WHATSAPP_SEND_ENDPOINTS = [
  "sendmessage",
  "sendtemplatemessage",
] as const satisfies readonly WhatsAppSendEndpoint[]

type _WhatsAppSendEndpointMissing = Exclude<
  WhatsAppSendEndpoint,
  (typeof ALL_WHATSAPP_SEND_ENDPOINTS)[number]
>
const _allWhatsAppSendEndpointsCovered: _WhatsAppSendEndpointMissing extends never
  ? true
  : never = true
void _allWhatsAppSendEndpointsCovered

/**
 * Row shape for public.whatsapp_sends. Mirrors the migration columns.
 *
 * NOT exported from the database generated-types file because the table is
 * new in this PR and the regen-types CI job will pick it up on the next
 * regen. This hand-typed interface is the load-bearing source for the
 * wrapper's typed write payloads until then; both can coexist (the
 * generated types are structurally compatible because every column here
 * matches the migration's CREATE TABLE).
 */
export interface WhatsAppSendRow {
  id: UUID
  invoice_id: UUID | null
  original_send_id: UUID | null
  attempt_no: number
  phone: string
  endpoint: WhatsAppSendEndpoint
  template_name: string | null
  wamid: string | null
  status: WhatsAppSendStatus
  raw_response: unknown // jsonb — see WhatsAppSendRawResponseShape below
  error_message: string | null
  user_id: UUID | null
  queued_at: ISOTimestamp
  completed_at: ISOTimestamp | null
}

/**
 * The two shapes the wrapper stores in `raw_response`. Documented so a
 * future consumer (operator UI, support tooling) knows what to expect
 * without having to read the wrapper source.
 *
 *   { parsed: <object> }    when the WPBox body parsed as JSON and the
 *                            serialized form is ≤ 2 KB.
 *   { truncated: true,      when the body did not parse OR exceeded 2 KB
 *     head: <string> }       serialized — `head` holds the first 1900
 *                            chars of the text body.
 *
 * Either shape is a valid JSONB object; SELECTs that need to display the
 * body can branch on `.truncated`.
 */
export type WhatsAppSendRawResponseShape =
  | { parsed: Record<string, unknown> }
  | { truncated: true; head: string }

/**
 * Subset of WhatsAppSendRow surfaced to the failed-sends operator view
 * (backlog item W2 — issue #142). Narrower than the full row to avoid
 * leaking the unused `raw_response` PII shape into the UI props surface.
 * `raw_response` (jsonb) is omitted here — it's verbose and PII-dense; a
 * future per-row detail view can reach for the full row via a separate
 * service method.
 *
 * Used by `listFailedWhatsappSends` in `whatsapp-tracked.service.ts` +
 * by `FailedSendsTable` / `OpsWhatsAppFailedSendsView` in `packages/ui`.
 */
export interface FailedWhatsappSendRow {
  id: UUID
  invoice_id: UUID | null
  original_send_id: UUID | null
  attempt_no: number
  phone: string
  endpoint: WhatsAppSendEndpoint
  template_name: string | null
  status: WhatsAppSendStatus // always "failed" for this view, but typed as union for honesty
  error_message: string | null
  queued_at: ISOTimestamp
  completed_at: ISOTimestamp | null
}

/**
 * Sentry-tag contract emitted by the wrapper on tracker-write failure.
 * Mirrors the AUDIT_WRITE_TAG_KEYS pattern from with-audit.ts so a future
 * cross-package sentinel can assert any Sentry alert rule keyed off these
 * tags references only keys actually emitted.
 *
 * NO PII goes through Sentry. `phone`, `raw_response`, `wamid`, and
 * `error_message` are deterministically NOT tagged.
 */
export const WHATSAPP_SEND_TAG_KEYS = {
  trackingFailed: "whatsapp_send.tracking_failed",
  phase: "whatsapp_send.phase",
  endpoint: "whatsapp_send.endpoint",
  hasInvoiceId: "whatsapp_send.has_invoice_id",
} as const

export type WhatsAppSendTrackingPhase = "queued_insert" | "result_update"
