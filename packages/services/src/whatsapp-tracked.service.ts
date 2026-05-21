/**
 * createTrackedWhatsAppService — tracked wrapper around createWhatsAppService.
 *
 * Decision doc: docs/decisions/2026-05-17-whatsapp-sends-mechanism.md
 * Backing table: public.whatsapp_sends (migration 20260517000001).
 * Issue tracker: #102 (Sprint 2 Observability, whatsapp_sends line; risk-rank
 *                       #2 per docs/audits/2026-05-16-102-revalidation.md).
 *
 * Why a wrapper (not a withAudit extension)
 * -----------------------------------------
 * A WhatsApp send is NOT a destructive operation. Force-fitting the
 * destructive-op registry would corrupt that registry's semantic. The
 * tracker has a fundamentally different contract:
 *
 *   withAudit               vs.   tracked-whatsapp
 *   ─────────────────────         ───────────────────────────
 *   audit-FIRST                   tracker-FIRST
 *   THROW on audit failure        PROCEED on tracker failure
 *   no audit = no destruction     no tracker = orphaned observability,
 *                                 but the send still happens
 *
 * The inversion on failure-handling is load-bearing. A delivery outage
 * (sends blocked because the tracker DB is down) is a customer-facing
 * regression; an observability outage (some sends untracked) is an
 * internal forensic regression. The wrapper prefers the second.
 *
 * What this wrapper does
 * ----------------------
 * For sendMessage / sendTemplate:
 *   1. INSERT a `queued` row into whatsapp_sends.
 *   2. If the INSERT fails: tag-and-go (console.error + emitTaggedException
 *      with deterministic non-PII tags). Proceed to step 3 regardless —
 *      the underlying send is NOT blocked.
 *   3. Invoke the underlying service's send method with the original input
 *      (tracking-context fields stripped — the underlying service knows
 *      nothing about whatsapp_sends).
 *   4. If the step-1 INSERT succeeded: UPDATE the row with the result
 *      (status='sent'|'failed', wamid, raw_response, error_message,
 *      completed_at).
 *   5. Return the underlying service's WhatsAppResult to the caller VERBATIM.
 *
 * For makeContact / getContact / getTemplates:
 *   Pass-through, unchanged. These are not sends; no tracking row is written.
 *
 * For retryWhatsappSend(originalSendId, replayPayload):
 *   1. Read the original row.
 *   2. Refuse if missing, or if status !== 'failed'.
 *   3. INSERT a new `queued` row with attempt_no = previous + 1,
 *      original_send_id = originalSendId.
 *   4. Invoke the underlying send (same endpoint as the original) with
 *      the caller-supplied replayPayload.
 *   5. UPDATE the new row with the result. Return the result.
 *
 * raw_response truncation
 * -----------------------
 * The wrapper serializes raw_response to JSON and caps at 2 KB. If the
 * body parses cleanly AND fits, store `{ parsed: <object> }`. Otherwise
 * store `{ truncated: true, head: <first 1900 chars> }`. See
 * WhatsAppSendRawResponseShape in packages/types.
 *
 * PII / Sentry posture
 * --------------------
 * Tracker-write-failure Sentry events emit deterministic tags only
 * (WHATSAPP_SEND_TAG_KEYS). NO PII goes through Sentry — `phone`,
 * `raw_response`, `wamid`, `error_message` are deterministically NOT
 * tagged. Same posture as with-audit.ts's AUDIT_WRITE_TAG_KEYS.
 */

import type { SupabaseClient } from "@workspace/database/supabase.types"
import type {
  FailedWhatsappSendRow,
  WhatsAppSendEndpoint,
  WhatsAppSendRawResponseShape,
  WhatsAppSendRow,
  WhatsAppSendStatus,
  WhatsAppSendTrackingPhase,
} from "@workspace/types"
import { WHATSAPP_SEND_TAG_KEYS } from "@workspace/types"

import { emitTaggedException, type TagMap } from "./shared/sentry-tagger"
import {
  createWhatsAppService,
  getWhatsAppConfig,
  type MakeContactInput,
  type SendMessageInput,
  type SendTemplateInput,
  type WhatsAppConfig,
  type WhatsAppResult,
  type WhatsAppService,
} from "./whatsapp.service"

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Tracking context the caller threads through every send for forensic
 * linkage. Both fields are optional — a non-invoice send (future
 * extension) is still tracked, just with `invoice_id = null`. The
 * `userId` is the operator who initiated the send (read from
 * `auth.uid()`-equivalent in the caller).
 */
export interface SendTrackingContext {
  invoiceId?: string | null
  userId?: string | null
}

export type TrackedSendMessageInput = SendMessageInput & SendTrackingContext
export type TrackedSendTemplateInput = SendTemplateInput & SendTrackingContext

/**
 * Payload required to replay a previously-failed send. The caller (route
 * handler) reconstructs this from the original request — we deliberately
 * do NOT persist the full request payload (message text / template
 * components) to whatsapp_sends because they may contain financial
 * details that broaden the PII surface beyond `phone` + `raw_response`.
 */
export type RetryReplayPayload =
  | { endpoint: "sendmessage"; input: SendMessageInput }
  | { endpoint: "sendtemplatemessage"; input: SendTemplateInput }

/**
 * The tracked service's public surface. Same shape as `WhatsAppService`
 * but with tracking-context fields on the two send methods, plus the
 * retry-path method.
 */
export interface TrackedWhatsAppService {
  sendMessage(input: TrackedSendMessageInput): Promise<WhatsAppResult>
  sendTemplate(input: TrackedSendTemplateInput): Promise<WhatsAppResult>
  makeContact: WhatsAppService["makeContact"]
  getContact: WhatsAppService["getContact"]
  getTemplates: WhatsAppService["getTemplates"]
  /**
   * Retry a previously-failed send. Reads the original row, INSERTs a new
   * row with attempt_no = previous + 1, invokes the underlying send via
   * the caller-supplied replay payload, and UPDATEs the new row with the
   * outcome. The returned `WhatsAppResult` is the outcome of the NEW
   * attempt — not the original. The new attempt's row id is also
   * returned so the caller (UI) can navigate to the new attempt's record.
   *
   * Refusals (returns `{ ok: false, error: <…> }` without performing any
   * side effect):
   *  - original row not found
   *  - original row status is `queued` or `sent` (not retriable)
   *
   * NOT shipped in this PR: an operator-facing UI to trigger this method,
   * and an automated background poller. Both are filed as follow-ups —
   * see decision doc § B.
   */
  retryWhatsappSend(
    originalSendId: string,
    replayPayload: RetryReplayPayload,
  ): Promise<{ result: WhatsAppResult; newSendId: string | null }>
  /**
   * Read a single whatsapp_sends row by id (RLS-checked). Returns null
   * when the row doesn't exist OR isn't readable by the caller's role
   * (same privacy posture as `retryWhatsappSend`'s internal lookup —
   * "not found" and "RLS-hidden" are indistinguishable by design).
   *
   * Used by the retry route (SB-1 / #153) to pre-flight check the retry
   * request — the route needs the row's `endpoint` + `invoice_id` to
   * (a) reject template-endpoint retries (V1 supports `sendmessage` only;
   * see decision § A) and (b) load the linked invoice to rebuild the
   * replay payload. The service-layer guards in `retryWhatsappSend` still
   * fire as defense-in-depth on the actual mutation call.
   *
   * The returned shape is the FULL `WhatsAppSendRow` so the caller can
   * narrow as needed — narrower projections at this layer would force
   * a new method per consumer.
   */
  getWhatsappSendById(id: string): Promise<WhatsAppSendRow | null>

  /**
   * List recent FAILED WhatsApp sends for the operator triage view
   * (backlog item W2 — issue #142). Returns rows narrower than the full
   * `WhatsAppSendRow` (omits `raw_response` + `wamid` + `user_id` — the
   * verbose / PII-heavy fields that the list view doesn't need; a future
   * per-row detail view can fetch the full row via a separate method).
   *
   * RLS: the underlying `whatsapp_sends` SELECT policy restricts reads to
   * `SUPER_ADMIN / ADMIN / MANAGER`. A caller without that role gets an
   * empty array (not an error) — defense-in-depth alongside the page-
   * layer role gate.
   *
   * Filters:
   *  - `status='failed'` (hardcoded — the view is the failed-sends view)
   *  - `completed_at >= now() - sinceDays * 24h` (default 7d; mirrors the
   *    migration header's documented retry-window query)
   *  - Ordered `completed_at DESC` (most-recent failures surface first)
   *  - Limit: 50 (operator-triage view; pagination is a future enhancement)
   *
   * The retry action that operates on a row in this list ships in PR 2
   * (the brief's read/retry split) — this method is the read half.
   */
  listFailedWhatsappSends(filters?: {
    limit?: number
    sinceDays?: number
  }): Promise<FailedWhatsappSendRow[]>
}

// ─── Implementation ──────────────────────────────────────────────────────────

/** Maximum serialized size of raw_response, in bytes (not chars). */
const RAW_RESPONSE_MAX_BYTES = 2 * 1024
/** Head length retained when truncating non-parseable / oversized bodies. */
const RAW_RESPONSE_HEAD_CHARS = 1900

/**
 * Build the JSONB shape stored in whatsapp_sends.raw_response from an
 * arbitrary value. See WhatsAppSendRawResponseShape for the two shapes.
 */
export function truncateRawResponse(
  value: unknown,
): WhatsAppSendRawResponseShape {
  // If `value` is an object and serializes within the cap, store as `parsed`.
  if (value !== null && typeof value === "object") {
    try {
      const serialized = JSON.stringify(value)
      if (serialized && Buffer.byteLength(serialized, "utf8") <= RAW_RESPONSE_MAX_BYTES) {
        return { parsed: value as Record<string, unknown> }
      }
      // Object too large — fall through to truncated branch with the
      // serialized JSON as the head text.
      return {
        truncated: true,
        head: serialized.slice(0, RAW_RESPONSE_HEAD_CHARS),
      }
    } catch {
      // Cyclic or unserializable — fall through to head-only.
      return {
        truncated: true,
        head: safeString(value).slice(0, RAW_RESPONSE_HEAD_CHARS),
      }
    }
  }
  // String / number / null / undefined — wrap in the truncated shape with
  // a stringified head. (`null` value gets a literal "null" head.)
  return {
    truncated: true,
    head: safeString(value).slice(0, RAW_RESPONSE_HEAD_CHARS),
  }
}

function safeString(value: unknown): string {
  if (value === undefined) return "undefined"
  if (value === null) return "null"
  if (typeof value === "string") return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Extract a WAMID from the underlying WhatsAppResult's `data` payload.
 * WPBox returns `message_wamid: "wamid.HBgN..."` on success. The WAMID-null
 * silent-rejection case is already converted to `ok: false` upstream in
 * postSmart, so `data` only reaches here in the success case.
 */
export function extractWamid(data: unknown): string | null {
  if (!data || typeof data !== "object") return null
  const obj = data as Record<string, unknown>
  const wamid = obj.message_wamid ?? obj.wamid
  return typeof wamid === "string" && wamid.length > 0 ? wamid : null
}

/**
 * Internal: build a Sentry TagMap for a tracker-write failure. NO PII —
 * see file-header PII/Sentry posture note.
 */
function buildTrackerFailureTags(input: {
  phase: WhatsAppSendTrackingPhase
  endpoint: WhatsAppSendEndpoint
  hasInvoiceId: boolean
}): TagMap {
  return {
    [WHATSAPP_SEND_TAG_KEYS.trackingFailed]: "true",
    [WHATSAPP_SEND_TAG_KEYS.phase]: input.phase,
    [WHATSAPP_SEND_TAG_KEYS.endpoint]: input.endpoint,
    [WHATSAPP_SEND_TAG_KEYS.hasInvoiceId]: input.hasInvoiceId ? "true" : "false",
  }
}

/**
 * INSERT a queued row. Returns the row id on success, or null on failure
 * (failure also emits Sentry + console.error). Designed to NEVER throw.
 */
async function insertQueuedRow(
  db: SupabaseClient,
  input: {
    invoiceId: string | null
    originalSendId: string | null
    attemptNo: number
    phone: string
    endpoint: WhatsAppSendEndpoint
    templateName: string | null
    userId: string | null
  },
): Promise<string | null> {
  try {
    const { data, error } = await db
      .from("whatsapp_sends")
      .insert({
        invoice_id: input.invoiceId,
        original_send_id: input.originalSendId,
        attempt_no: input.attemptNo,
        phone: input.phone,
        endpoint: input.endpoint,
        template_name: input.templateName,
        status: "queued",
        user_id: input.userId,
      })
      .select("id")
      .single()

    if (error) {
      const tags = buildTrackerFailureTags({
        phase: "queued_insert",
        endpoint: input.endpoint,
        hasInvoiceId: input.invoiceId !== null,
      })
      // The DB error message can echo back the failed payload (column
      // names + sometimes the raw bytes that violated a CHECK); log only
      // a sanitized summary.
      console.error(
        "[whatsapp-tracked] queued-row INSERT failed:",
        sanitizeDbError(error),
      )
      emitTaggedException(
        new Error("whatsapp_sends queued-insert failed"),
        tags,
      )
      return null
    }
    return (data as { id: string } | null)?.id ?? null
  } catch (err) {
    // Network / unexpected throw from the Supabase client itself.
    const tags = buildTrackerFailureTags({
      phase: "queued_insert",
      endpoint: input.endpoint,
      hasInvoiceId: input.invoiceId !== null,
    })
    console.error(
      "[whatsapp-tracked] queued-row INSERT threw:",
      err instanceof Error ? err.message : String(err),
    )
    emitTaggedException(
      err instanceof Error
        ? err
        : new Error("whatsapp_sends queued-insert threw"),
      tags,
    )
    return null
  }
}

/**
 * UPDATE the queued row with the send outcome. Designed to NEVER throw —
 * a failure here leaves the row in `queued`, which IS the observability
 * signal (orphan rows older than N minutes are the alertable shape).
 */
async function completeQueuedRow(
  db: SupabaseClient,
  rowId: string,
  outcome:
    | { ok: true; data: unknown }
    | { ok: false; error: string; rawResponse?: string },
  endpoint: WhatsAppSendEndpoint,
  hasInvoiceId: boolean,
): Promise<void> {
  let status: WhatsAppSendStatus
  let wamid: string | null
  let errorMessage: string | null
  let rawResponse: WhatsAppSendRawResponseShape

  if (outcome.ok) {
    wamid = extractWamid(outcome.data)
    if (wamid === null) {
      // Defensive: extractWamid returned null on what postSmart called a
      // success. This should NOT happen (the WAMID-null guard in postSmart
      // already converts to ok:false). Record as failed to keep the DB
      // invariant ('sent' → wamid IS NOT NULL).
      status = "failed"
      errorMessage = "Internal: success outcome had null WAMID — completion-consistency guard"
      rawResponse = truncateRawResponse(outcome.data)
    } else {
      status = "sent"
      errorMessage = null
      rawResponse = truncateRawResponse(outcome.data)
    }
  } else {
    status = "failed"
    wamid = null
    errorMessage = outcome.error
    rawResponse = truncateRawResponse({
      error: outcome.error,
      rawResponse: outcome.rawResponse,
    })
  }

  try {
    const { error } = await db
      .from("whatsapp_sends")
      .update({
        status,
        wamid,
        raw_response: rawResponse,
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", rowId)

    if (error) {
      const tags = buildTrackerFailureTags({
        phase: "result_update",
        endpoint,
        hasInvoiceId,
      })
      console.error(
        "[whatsapp-tracked] result UPDATE failed for row",
        rowId,
        ":",
        sanitizeDbError(error),
      )
      emitTaggedException(
        new Error("whatsapp_sends result-update failed"),
        tags,
      )
    }
  } catch (err) {
    const tags = buildTrackerFailureTags({
      phase: "result_update",
      endpoint,
      hasInvoiceId,
    })
    console.error(
      "[whatsapp-tracked] result UPDATE threw for row",
      rowId,
      ":",
      err instanceof Error ? err.message : String(err),
    )
    emitTaggedException(
      err instanceof Error ? err : new Error("whatsapp_sends result-update threw"),
      tags,
    )
  }
}

/**
 * Reduce a Supabase error to a non-PII string for console logging. Avoids
 * echoing the raw payload back via the error body (which can include
 * column values that triggered a CHECK).
 */
function sanitizeDbError(error: unknown): string {
  if (!error || typeof error !== "object") return safeString(error)
  const obj = error as Record<string, unknown>
  const code = typeof obj.code === "string" ? obj.code : "(no-code)"
  // `details` and `hint` are normally safe (column-name / FK-name level),
  // but `message` from PostgREST can echo values. Keep code+hint only.
  const hint = typeof obj.hint === "string" ? obj.hint : ""
  return `code=${code}${hint ? ` hint=${hint}` : ""}`
}

/**
 * Build the tracked WhatsApp service.
 *
 * @example
 * const db = await getSupabaseServerClient()
 * const svc = createTrackedWhatsAppService(db, getWhatsAppConfig())
 * const result = await svc.sendMessage({
 *   phone: "919876543210",
 *   message: "...",
 *   invoiceId: invoice.id,
 *   userId: user.id,
 * })
 */
export function createTrackedWhatsAppService(
  db: SupabaseClient,
  config: WhatsAppConfig,
): TrackedWhatsAppService {
  const svc = createWhatsAppService(config)

  async function trackedSend(
    endpoint: WhatsAppSendEndpoint,
    trackingCtx: { invoiceId: string | null; userId: string | null; templateName: string | null; phone: string },
    underlying: () => Promise<WhatsAppResult>,
  ): Promise<WhatsAppResult> {
    const rowId = await insertQueuedRow(db, {
      invoiceId: trackingCtx.invoiceId,
      originalSendId: null,
      attemptNo: 1,
      phone: trackingCtx.phone,
      endpoint,
      templateName: trackingCtx.templateName,
      userId: trackingCtx.userId,
    })

    let result: WhatsAppResult
    try {
      result = await underlying()
    } catch (err) {
      // The underlying service is designed not to throw (it returns
      // ok:false on network errors), but defense-in-depth: capture an
      // unexpected throw as a failed outcome so the tracker row is
      // completed, then re-throw to the caller.
      const errorMessage =
        err instanceof Error
          ? `Unexpected throw: ${err.message}`
          : `Unexpected throw: ${String(err)}`
      if (rowId !== null) {
        await completeQueuedRow(
          db,
          rowId,
          { ok: false, error: errorMessage },
          endpoint,
          trackingCtx.invoiceId !== null,
        )
      }
      throw err
    }

    if (rowId !== null) {
      await completeQueuedRow(
        db,
        rowId,
        result.ok
          ? { ok: true, data: result.data }
          : {
              ok: false,
              error: result.error,
              rawResponse: result.rawResponse,
            },
        endpoint,
        trackingCtx.invoiceId !== null,
      )
    }

    return result
  }

  return {
    async sendMessage(input: TrackedSendMessageInput) {
      const { invoiceId = null, userId = null, ...sendInput } = input
      return trackedSend(
        "sendmessage",
        {
          invoiceId,
          userId,
          templateName: null,
          phone: sendInput.phone,
        },
        () => svc.sendMessage(sendInput as SendMessageInput),
      )
    },

    async sendTemplate(input: TrackedSendTemplateInput) {
      const { invoiceId = null, userId = null, ...sendInput } = input
      return trackedSend(
        "sendtemplatemessage",
        {
          invoiceId,
          userId,
          templateName: sendInput.templateName,
          phone: sendInput.phone,
        },
        () => svc.sendTemplate(sendInput as SendTemplateInput),
      )
    },

    makeContact: (input: MakeContactInput) => svc.makeContact(input),
    getContact: (phone: string) => svc.getContact(phone),
    getTemplates: () => svc.getTemplates(),

    async retryWhatsappSend(
      originalSendId: string,
      replayPayload: RetryReplayPayload,
    ): Promise<{ result: WhatsAppResult; newSendId: string | null }> {
      // Read the original row. RLS scoping means the calling user must
      // have SELECT permission (MANAGER+). If they don't, this returns
      // data: null + error: null (RLS hides the row), which we surface
      // as "not found" — indistinguishable from a real missing row, which
      // is the correct privacy posture for a tighter-than-INSERT SELECT
      // scope.
      const { data: original, error: readError } = await db
        .from("whatsapp_sends")
        .select("id, invoice_id, phone, endpoint, status, user_id, attempt_no")
        .eq("id", originalSendId)
        .single()

      if (readError || !original) {
        return {
          result: {
            ok: false,
            error: `whatsapp_sends row not found or not readable: ${originalSendId}`,
          },
          newSendId: null,
        }
      }

      const origRow = original as Pick<
        WhatsAppSendRow,
        "id" | "invoice_id" | "phone" | "endpoint" | "status" | "user_id" | "attempt_no"
      >

      if (origRow.status !== "failed") {
        return {
          result: {
            ok: false,
            error: `whatsapp_sends row is not retriable (status=${origRow.status}); only failed sends can be retried`,
          },
          newSendId: null,
        }
      }

      if (origRow.endpoint !== replayPayload.endpoint) {
        return {
          result: {
            ok: false,
            error: `Replay endpoint mismatch: original=${origRow.endpoint} replay=${replayPayload.endpoint}`,
          },
          newSendId: null,
        }
      }

      // Pre-INSERT existing-attempt guard (concurrency hardening for the
      // money-flow surface — added in PR #156 after Macroscope HIGH finding).
      //
      // The original row's `status` is APPEND-ONLY and stays `'failed'`
      // forever (per decision § A — retry creates a NEW row, never mutates
      // the original). That means the status guard ABOVE does NOT block
      // concurrent retries: two POSTs in flight against the same original
      // both read `status='failed'`, both pass, both INSERT, both send.
      //
      // This pre-INSERT check narrows that race window: if ANY in-flight
      // (`queued`) OR already-succeeded (`sent`) descendant already exists
      // for this original, the retry is refused. The window between this
      // SELECT and the INSERT below is TOCTOU-narrow (microseconds) — for
      // TRUE cross-process safety a UNIQUE PARTIAL INDEX
      // `(original_send_id) WHERE status IN ('queued','sent')` or a
      // `pg_advisory_xact_lock(hash(original_send_id))` is the right
      // architecture. Filed as a POST-LAUNCH follow-up.
      //
      // Defense layering today: this DB-level check + the per-user Upstash
      // rate-limit on the route + the UI ref-locked in-flight guard. The
      // single remaining surface — two operators clicking the SAME row
      // within microseconds of each other — is the post-launch concern.
      const { data: existingAttempt, error: existingErr } = await db
        .from("whatsapp_sends")
        .select("id, status")
        .eq("original_send_id", origRow.id)
        .in("status", ["queued", "sent"])
        .limit(1)
        .maybeSingle()
      if (existingErr) throw existingErr
      if (existingAttempt) {
        const ex = existingAttempt as { id: string; status: WhatsAppSendStatus }
        return {
          result: {
            ok: false,
            error:
              ex.status === "queued"
                ? "A retry of this send is already in flight — wait for it to complete."
                : "This send has already been retried successfully — refresh the page.",
          },
          newSendId: null,
        }
      }

      const templateName =
        replayPayload.endpoint === "sendtemplatemessage"
          ? replayPayload.input.templateName
          : null

      // INSERT new attempt row.
      const newRowId = await insertQueuedRow(db, {
        invoiceId: origRow.invoice_id,
        originalSendId: origRow.id,
        attemptNo: origRow.attempt_no + 1,
        phone: origRow.phone,
        endpoint: replayPayload.endpoint,
        templateName,
        userId: origRow.user_id,
      })

      let result: WhatsAppResult
      try {
        result =
          replayPayload.endpoint === "sendmessage"
            ? await svc.sendMessage(replayPayload.input)
            : await svc.sendTemplate(replayPayload.input)
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? `Unexpected throw: ${err.message}`
            : `Unexpected throw: ${String(err)}`
        if (newRowId !== null) {
          await completeQueuedRow(
            db,
            newRowId,
            { ok: false, error: errorMessage },
            replayPayload.endpoint,
            origRow.invoice_id !== null,
          )
        }
        throw err
      }

      if (newRowId !== null) {
        await completeQueuedRow(
          db,
          newRowId,
          result.ok
            ? { ok: true, data: result.data }
            : {
                ok: false,
                error: result.error,
                rawResponse: result.rawResponse,
              },
          replayPayload.endpoint,
          origRow.invoice_id !== null,
        )
      }

      return { result, newSendId: newRowId }
    },

    async getWhatsappSendById(id: string): Promise<WhatsAppSendRow | null> {
      const { data, error } = await db
        .from("whatsapp_sends")
        .select(
          "id, invoice_id, original_send_id, attempt_no, phone, endpoint, template_name, wamid, status, raw_response, error_message, user_id, queued_at, completed_at",
        )
        .eq("id", id)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      // Explicit field-by-field projection (no `as unknown as`) per the
      // PR #150 retro's anti-pattern note. Mirrors listFailedWhatsappSends'
      // mapper shape.
      const r = data as Record<string, unknown>
      return {
        id: r.id as WhatsAppSendRow["id"],
        invoice_id: (r.invoice_id as WhatsAppSendRow["invoice_id"]) ?? null,
        original_send_id:
          (r.original_send_id as WhatsAppSendRow["original_send_id"]) ?? null,
        attempt_no: r.attempt_no as number,
        phone: r.phone as string,
        endpoint: r.endpoint as WhatsAppSendRow["endpoint"],
        template_name: (r.template_name as string | null) ?? null,
        wamid: (r.wamid as string | null) ?? null,
        status: r.status as WhatsAppSendRow["status"],
        raw_response: r.raw_response ?? null,
        error_message: (r.error_message as string | null) ?? null,
        user_id: (r.user_id as WhatsAppSendRow["user_id"]) ?? null,
        queued_at: r.queued_at as string,
        completed_at: (r.completed_at as string | null) ?? null,
      }
    },

    async listFailedWhatsappSends(
      filters?: { limit?: number; sinceDays?: number },
    ): Promise<FailedWhatsappSendRow[]> {
      // Defaults match the migration header's documented retry-window
      // query: 7-day window, 50-row cap. Operator triage view sizing.
      const limit = filters?.limit ?? 50
      const sinceDays = filters?.sinceDays ?? 7
      const sinceIso = new Date(
        Date.now() - sinceDays * 24 * 60 * 60 * 1000,
      ).toISOString()

      // Two-query "leaf failed rows only" pattern — see PHASE-0 (B) in
      // docs/decisions/2026-05-17-whatsapp-retry-action.md.
      //
      // The append-only-per-attempt row model (PR #141) means a successful
      // retry creates a NEW `sent` row pointing back at the failed row via
      // `original_send_id`. The original failed row stays `failed` forever.
      // A naive `WHERE status='failed'` would therefore keep showing
      // already-retried rows in the operator triage view — inviting the
      // operator to retry AGAIN, double-sending the customer. That is a
      // money-flow correctness bug surfaced by the SB-1 retry action.
      //
      // The fix: show only LEAF failed rows — a failed row whose `id` does
      // NOT appear as `original_send_id` on any other row. PostgREST has no
      // correlated NOT EXISTS subquery; two bounded queries:
      //   1. Get candidate failed rows in the window (2× the limit to
      //      absorb filtered-out non-leaves).
      //   2. Find which candidate ids are referenced by other rows.
      //   3. Filter candidates whose id is in that set, then cap to `limit`.
      // Both queries return ≤ 2 × limit rows at the configured cap of 50.
      const { data: candidateData, error: candidateError } = await db
        .from("whatsapp_sends")
        .select(
          "id, invoice_id, original_send_id, attempt_no, phone, endpoint, template_name, status, error_message, queued_at, completed_at",
        )
        .eq("status", "failed")
        .gte("completed_at", sinceIso)
        .order("completed_at", { ascending: false })
        .limit(limit * 2)

      if (candidateError) throw candidateError
      const candidates = candidateData ?? []
      if (candidates.length === 0) return []

      const candidateIds = candidates.map(
        (r) => (r as Record<string, unknown>).id as string,
      )

      // Step 2: which of the candidate ids are referenced as
      // `original_send_id` from any row? Those are NON-leaves — drop them.
      const { data: descendantData, error: descendantError } = await db
        .from("whatsapp_sends")
        .select("original_send_id")
        .in("original_send_id", candidateIds)

      if (descendantError) throw descendantError
      const supersededIds = new Set(
        (descendantData ?? [])
          .map((r) => (r as Record<string, unknown>).original_send_id as string | null)
          .filter((id): id is string => id !== null),
      )

      // Explicit field-by-field projection — avoids growing the
      // `as unknown as` cluster PR #150's inventory flagged for #131.
      // Pattern mirrors manifest.service.ts::mapManifestSummary's shape.
      return candidates
        .filter((row) => {
          const id = (row as Record<string, unknown>).id as string
          return !supersededIds.has(id)
        })
        .slice(0, limit)
        .map((row): FailedWhatsappSendRow => {
          const r = row as Record<string, unknown>
          return {
            id: r.id as FailedWhatsappSendRow["id"],
            invoice_id: (r.invoice_id as FailedWhatsappSendRow["invoice_id"]) ?? null,
            original_send_id: (r.original_send_id as FailedWhatsappSendRow["original_send_id"]) ?? null,
            attempt_no: r.attempt_no as number,
            phone: r.phone as string,
            endpoint: r.endpoint as FailedWhatsappSendRow["endpoint"],
            template_name: (r.template_name as string | null) ?? null,
            status: r.status as FailedWhatsappSendRow["status"],
            error_message: (r.error_message as string | null) ?? null,
            queued_at: r.queued_at as string,
            completed_at: (r.completed_at as string | null) ?? null,
          }
        })
    },
  }
}

/**
 * Convenience: build a tracked service from env + the given Supabase client.
 * Mirrors createWhatsAppServiceFromEnv but augmented with the DB dependency.
 */
export function createTrackedWhatsAppServiceFromEnv(
  db: SupabaseClient,
): TrackedWhatsAppService {
  return createTrackedWhatsAppService(db, getWhatsAppConfig())
}
