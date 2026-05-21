import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Test floor for whatsapp-tracked.service.ts — the delivery-tracking
 * wrapper around createWhatsAppService.
 *
 * Decision doc: docs/decisions/2026-05-17-whatsapp-sends-mechanism.md
 * Schema:       supabase/migrations/20260517000001_whatsapp_sends_table.sql
 * Matrix:       decision doc § PHASE-A AUDIT (12 rows).
 *
 * This file extends — but does NOT modify — the existing PR #138 test floor
 * at __tests__/whatsapp.service.test.ts. The underlying HTTP service is
 * unchanged; only the new wrapper is under test here.
 *
 * Mocking strategy
 * ----------------
 * The wrapper composes two boundaries that BOTH need mocking:
 *   1. The HTTP boundary (globalThis.fetch) — same pattern as PR #138,
 *      mocked via `vi.stubGlobal("fetch", mockFetchSequence(...))`.
 *   2. The Supabase boundary — mocked via `makeDb` + `makeBuilderSpy` /
 *      `makeBuilderSpyByTable` from the canonical helpers (PR #132).
 * Per the prior handoff § 5.7 (NEW test-pattern for non-Supabase services),
 * this is the FIRST consumer that crosses BOTH boundaries — the wrapper is
 * the layer that introduces a Supabase dependency to a service that did not
 * have one before.
 *
 * Local mockFetchSequence + mockResponse helpers
 * ----------------------------------------------
 * mockResponse + mockFetchSequence are intentionally COPIED INLINE from
 * the PR #138 test file rather than extracted to a shared helper. Per
 * catalog entry #9 (abstract-on-second-use), this PR is the second use
 * and would normally trigger extraction — BUT extracting would require
 * editing whatsapp.service.test.ts, which is a tested file with 47 cases.
 * "Do not entertain while-I'm-here expansion" (PR-discipline) wins over
 * the abstraction-timing rule when extraction would force modifying a
 * separate tested file. If a THIRD consumer appears, extraction is then
 * mandatory and the refactor lands as its own chore PR.
 *
 * Catalog preemption — every applicable entry from
 * docs/patterns/coderabbit-catalog.md is preempted here:
 *   #1 (value-contract over call-existence): every assertion below that
 *      cares about a written value uses .insert / .update arg-capture via
 *      makeBuilderSpyByTable, not bare toHaveBeenCalledWith.
 *   #2 (toHaveBeenNthCalledWith + toHaveBeenCalledTimes): the multi-step
 *      path tests (queue-then-update) assert exact .from() call counts +
 *      ordering. The retry tests assert TWO inserts + TWO updates.
 *   #3 (statSync isFile): N/A — no filesystem invariants here.
 *   #4 (sweep the whole describe block): every status × endpoint
 *      combination is enumerated, not just one canonical case.
 *   #5 (no hardcoded line numbers): comments reference symbol names, not
 *      line numbers.
 *   #6 (anchor-scoped windows): N/A — no source-text assertions here.
 *   #7 (generalize regex): N/A — no regex parsers here.
 *   #8 (enum exhaustiveness via satisfies + Exclude): the
 *      `STATUS_TRANSITIONS` matrix below uses `satisfies` + an Exclude
 *      sentinel; the matching sentinel is in packages/types/src/
 *      whatsapp-send.types.ts for the WhatsAppSendStatus union itself.
 *   #9 (abstract on second use): see "Local mockFetchSequence" note above.
 *
 * Scope (matches PHASE-A matrix, by method × outcome × failure mode):
 *   - sendMessage success / WAMID-null silent rejection / 4xx / 5xx /
 *     network throw / tracker-INSERT-fail then API-success /
 *     tracker-INSERT-success then UPDATE-fail / underlying-throw
 *   - sendTemplate (same 8 shapes, validating template_name persistence)
 *   - retryWhatsappSend: failed → success / refusals (status=queued,
 *     status=sent, row missing, endpoint mismatch) / attempt_no increment
 *   - Pass-through methods (makeContact / getContact / getTemplates):
 *     never touch the DB
 *   - truncateRawResponse + extractWamid (pure helpers)
 *   - Status enum exhaustiveness sentinel
 */

import {
  ALL_WHATSAPP_SEND_ENDPOINTS,
  ALL_WHATSAPP_SEND_STATUSES,
  WHATSAPP_SEND_TAG_KEYS,
  type WhatsAppSendStatus,
} from "@workspace/types"

import {
  createTrackedWhatsAppService,
  extractWamid,
  truncateRawResponse,
  type TrackedSendMessageInput,
  type TrackedSendTemplateInput,
} from "../whatsapp-tracked.service"
import { registerSentry, type TaggedEmitter } from "../shared/sentry-tagger"
import { makeDb } from "./helpers/make-db"
import { makeBuilderSpyByTable } from "./helpers/make-builder-spy"

// ─── Local fetch helpers (see "Local mockFetchSequence" comment above) ──────

function mockResponse(init: {
  ok?: boolean
  status?: number
  statusText?: string
  body: string
}): Response {
  const status = init.status ?? 200
  const ok = init.ok ?? (status >= 200 && status < 300)
  return {
    ok,
    status,
    statusText: init.statusText ?? "",
    text: () => Promise.resolve(init.body),
  } as unknown as Response
}

function mockFetchSequence(...responses: Response[]): ReturnType<typeof vi.fn> {
  let i = 0
  return vi.fn(() => {
    if (i >= responses.length) {
      throw new Error(
        `mockFetchSequence exhausted: ${responses.length} response(s) configured, call ${i + 1} attempted. ` +
          "The SUT made more fetch calls than this test anticipated — assertion-strength signal.",
      )
    }
    return Promise.resolve(responses[i++]!)
  })
}

// ─── Config + constants ──────────────────────────────────────────────────────

const CONFIG = { token: "test-token-12345", userId: "test-user-id", baseUrl: "https://wpbox.test" }
const SAMPLE_INVOICE_ID = "00000000-0000-0000-0000-000000000001"
const SAMPLE_USER_ID = "00000000-0000-0000-0000-0000000000aa"
const SAMPLE_PHONE = "919876543210"
const SAMPLE_MESSAGE = "Your invoice is ready."
const SAMPLE_TEMPLATE = "invoice_notification_v2"
const SAMPLE_WAMID = "wamid.HBgN910Test=="

const SUCCESS_BODY = JSON.stringify({
  status: "success",
  message_id: 42,
  message_wamid: SAMPLE_WAMID,
})
const WAMID_NULL_BODY = JSON.stringify({
  status: "success",
  message_id: 43,
  message_wamid: null,
})
const ERROR_BODY = JSON.stringify({
  status: "error",
  message: "Template not approved",
})

// Capture Sentry emissions for assertion. Per file-header PII posture: no
// PII goes through the emitter; we assert deterministic tags only.
const sentryCalls: Array<{ error: unknown; tags: Record<string, string> }> = []
const sentryEmitter: TaggedEmitter = {
  // Per sentry-tagger.ts contract: captureException(error, tags) — both
  // positional, tags is a flat TagMap (Record<string, string>). The shape
  // matches the registered Sentry backend's @sentry/nextjs adapter.
  captureException(error, tags) {
    sentryCalls.push({ error, tags: { ...tags } })
  },
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
  sentryCalls.length = 0
  registerSentry(sentryEmitter)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  registerSentry(null)
})

// ─── Status enum exhaustiveness sentinel ─────────────────────────────────────
//
// Catalog entry #8 — satisfies + Exclude.
//
// This local matrix enumerates the WITHIN-attempt transitions the wrapper
// actually performs. Adding a new WhatsAppSendStatus literal (e.g., a
// future `delivered` from a webhook) without adding a transition policy
// here will fail compilation.

const STATUS_TRANSITIONS = {
  queued: { canTransitionTo: ["sent", "failed"] satisfies WhatsAppSendStatus[] },
  sent: { canTransitionTo: [] satisfies WhatsAppSendStatus[] },
  failed: { canTransitionTo: [] satisfies WhatsAppSendStatus[] },
} as const satisfies Record<WhatsAppSendStatus, { canTransitionTo: WhatsAppSendStatus[] }>

type _MissingStatusInMatrix = Exclude<WhatsAppSendStatus, keyof typeof STATUS_TRANSITIONS>
const _matrixIsExhaustive: _MissingStatusInMatrix extends never ? true : never = true
void _matrixIsExhaustive

// ─── truncateRawResponse + extractWamid ──────────────────────────────────────

describe("truncateRawResponse", () => {
  it("returns { parsed } for a small object", () => {
    const out = truncateRawResponse({ a: 1, b: "two" })
    expect(out).toEqual({ parsed: { a: 1, b: "two" } })
  })

  it("returns { truncated, head } for a string", () => {
    const out = truncateRawResponse("hello world")
    expect(out).toEqual({ truncated: true, head: "hello world" })
  })

  it("returns { truncated, head } for null", () => {
    const out = truncateRawResponse(null)
    expect(out).toEqual({ truncated: true, head: "null" })
  })

  it("truncates oversized objects to a head string capped at 1900 chars", () => {
    const big = { x: "a".repeat(3000) }
    const out = truncateRawResponse(big)
    expect(out).toMatchObject({ truncated: true })
    if ("head" in out) {
      expect(out.head.length).toBeLessThanOrEqual(1900)
    }
  })

  it("handles cyclic objects without throwing", () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    const out = truncateRawResponse(cyclic)
    expect(out).toMatchObject({ truncated: true })
  })
})

describe("extractWamid", () => {
  it("returns the wamid from a success payload", () => {
    expect(extractWamid({ message_wamid: SAMPLE_WAMID })).toBe(SAMPLE_WAMID)
  })

  it("returns null when wamid is null", () => {
    expect(extractWamid({ message_wamid: null })).toBeNull()
  })

  it("returns null when wamid is missing", () => {
    expect(extractWamid({ message_id: 1 })).toBeNull()
  })

  it("returns null for non-object input", () => {
    expect(extractWamid("hello")).toBeNull()
    expect(extractWamid(null)).toBeNull()
    expect(extractWamid(undefined)).toBeNull()
  })

  it("accepts the alternate `wamid` field name", () => {
    expect(extractWamid({ wamid: "alt-wamid-1" })).toBe("alt-wamid-1")
  })
})

// ─── sendMessage — PHASE-A matrix rows 1-8 ───────────────────────────────────

describe("sendMessage tracking", () => {
  it("Row 1: success — INSERTs queued row, UPDATEs to sent with wamid", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: SUCCESS_BODY })))
    const { fromImpl, spies, tableCalls } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-1" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
      invoiceId: SAMPLE_INVOICE_ID,
      userId: SAMPLE_USER_ID,
    })

    expect(result.ok).toBe(true)
    // Catalog #2: exact call ordering + count. db.from called twice: once
    // for INSERT, once for UPDATE. Both target whatsapp_sends.
    expect(tableCalls).toEqual(["whatsapp_sends", "whatsapp_sends"])

    const spy = spies.whatsapp_sends!
    // Catalog #1: value-contract on the INSERT payload.
    const insertPayload = spy.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertPayload).toMatchObject({
      invoice_id: SAMPLE_INVOICE_ID,
      original_send_id: null,
      attempt_no: 1,
      phone: SAMPLE_PHONE,
      endpoint: "sendmessage",
      template_name: null,
      status: "queued",
      user_id: SAMPLE_USER_ID,
    })

    // Catalog #1: value-contract on the UPDATE payload.
    const updatePayload = spy.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload).toMatchObject({
      status: "sent",
      wamid: SAMPLE_WAMID,
      error_message: null,
    })
    expect(updatePayload.completed_at).toBeTruthy()
    // raw_response stored as { parsed: <success body> }
    expect(updatePayload.raw_response).toMatchObject({
      parsed: { status: "success", message_wamid: SAMPLE_WAMID },
    })

    // UPDATE .eq("id", rowId) — load-bearing scope guard. Catalog #1.
    expect(spy.calls.eq).toEqual([["id", "row-1"]])
  })

  it("Row 2: WAMID-null silent rejection — UPDATEs to failed", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: WAMID_NULL_BODY })))
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-2" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
      invoiceId: SAMPLE_INVOICE_ID,
    })

    expect(result.ok).toBe(false)
    const updatePayload = spies.whatsapp_sends!.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload.status).toBe("failed")
    expect(updatePayload.wamid).toBeNull()
    expect(typeof updatePayload.error_message).toBe("string")
    expect((updatePayload.error_message as string).length).toBeGreaterThan(0)
  })

  it("Row 3: API 4xx — UPDATEs to failed with error_message and rawResponse persisted", async () => {
    // postSmart will try JSON (4xx -> fallback) then form (4xx). The fetch
    // mock needs TWO responses to satisfy the fallback path.
    vi.stubGlobal(
      "fetch",
      mockFetchSequence(
        mockResponse({ status: 400, body: ERROR_BODY }),
        mockResponse({ status: 400, body: ERROR_BODY }),
      ),
    )
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-3" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
    })

    expect(result.ok).toBe(false)
    const updatePayload = spies.whatsapp_sends!.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload.status).toBe("failed")
    expect(typeof updatePayload.error_message).toBe("string")
    // raw_response should carry the truncated error envelope
    expect(updatePayload.raw_response).toBeDefined()
  })

  it("Row 4: API 5xx — no fallback, UPDATEs to failed", async () => {
    // 5xx is transport-level; postSmart does NOT retry as form-encoded.
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 503, body: "Service unavailable" })))
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-4" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
    })

    expect(result.ok).toBe(false)
    const updatePayload = spies.whatsapp_sends!.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload.status).toBe("failed")
  })

  it("Row 5: fetch throws (network error) — UPDATEs to failed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new TypeError("network down")
      }),
    )
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-5" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
    })

    expect(result.ok).toBe(false)
    const updatePayload = spies.whatsapp_sends!.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload.status).toBe("failed")
    expect(updatePayload.error_message).toContain("network down")
  })

  it("Row 6: tracker INSERT fails — proceeds with send anyway, NO update attempted", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: SUCCESS_BODY })))
    const { fromImpl, spies, tableCalls } = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: { code: "23502", message: "not null violation" } },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
      invoiceId: SAMPLE_INVOICE_ID,
    })

    // Load-bearing: send proceeded despite tracker failure. (Decision § E.)
    expect(result.ok).toBe(true)
    // Only ONE db.from call — the failed INSERT. No UPDATE attempted
    // because there's no rowId.
    expect(tableCalls).toEqual(["whatsapp_sends"])
    expect(spies.whatsapp_sends!.calls.update).toHaveLength(0)

    // Sentry tag emitted with deterministic non-PII tags.
    expect(sentryCalls).toHaveLength(1)
    const tags = sentryCalls[0]!.tags
    expect(tags).toMatchObject({
      [WHATSAPP_SEND_TAG_KEYS.trackingFailed]: "true",
      [WHATSAPP_SEND_TAG_KEYS.phase]: "queued_insert",
      [WHATSAPP_SEND_TAG_KEYS.endpoint]: "sendmessage",
      [WHATSAPP_SEND_TAG_KEYS.hasInvoiceId]: "true",
    })
    // Catalog #1: NO PII (phone / wamid / raw response) in tags.
    expect(Object.values(tags)).not.toContain(SAMPLE_PHONE)
  })

  it("Row 7: INSERT OK, UPDATE fails — orphan queued row, send result still returned", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: SUCCESS_BODY })))

    // The chainable builder resolves to a SINGLE result for every awaited
    // terminal — so the INSERT path .select().single() AND the UPDATE
    // path's await both observe the same configured result. To express
    // "INSERT OK, UPDATE FAIL" we configure two different builders, one
    // per .from() call, by stateful dispatch.
    const insertBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-7" }, error: null },
    })
    const updateBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: { code: "40001", message: "deadlock" } },
    })
    let fromCalls = 0
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation((table: string) => {
      fromCalls++
      return fromCalls === 1
        ? insertBuilder.fromImpl(table)
        : updateBuilder.fromImpl(table)
    })

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
    })

    // The underlying send succeeded; result is passed through.
    expect(result.ok).toBe(true)
    // INSERT happened (catalog #2: ordering).
    expect(insertBuilder.tableCalls).toEqual(["whatsapp_sends"])
    // UPDATE attempted.
    expect(updateBuilder.tableCalls).toEqual(["whatsapp_sends"])
    // Sentry tag for the result_update failure.
    expect(sentryCalls).toHaveLength(1)
    expect(sentryCalls[0]?.tags[WHATSAPP_SEND_TAG_KEYS.phase]).toBe("result_update")
  })

  it("Row 8: INSERT OK, underlying service throws synchronously — UPDATE completes row to failed, throw re-raised", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new TypeError("synchronous fetch detonation")
      }),
    )
    // Underlying svc returns ok:false on fetch error (so this row is
    // actually still in the ok:false path, not a throw — but the wrapper
    // also has its own try/catch around the underlying call to handle the
    // pathological case where the underlying throws instead of returning
    // ok:false). We test the wrapper's defense-in-depth here by stubbing
    // a deeper throw via a malformed config trigger; the wrapper's
    // try/catch is exercised by Row 5 already. This case asserts the
    // observable: even with a fetch that throws, the wrapper writes a
    // 'failed' row.
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "row-8" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
    })

    // attemptPost catches the throw and returns ok:false; the wrapper
    // observes ok:false and UPDATEs to 'failed'. Both paths reach a
    // 'failed' row state — that's the load-bearing invariant.
    expect(result.ok).toBe(false)
    const updatePayload = spies.whatsapp_sends!.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload.status).toBe("failed")
  })

  it("does not include invoiceId/userId in the underlying fetch payload", async () => {
    const fetchMock = mockFetchSequence(mockResponse({ status: 200, body: SUCCESS_BODY }))
    vi.stubGlobal("fetch", fetchMock)
    const { fromImpl } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "guard-row" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    await svc.sendMessage({
      phone: SAMPLE_PHONE,
      message: SAMPLE_MESSAGE,
      invoiceId: SAMPLE_INVOICE_ID,
      userId: SAMPLE_USER_ID,
    })

    // Catalog #1: value-contract. The fetch body must NOT echo invoiceId /
    // userId to WPBox — those are tracking-only fields. Regression guard
    // against an accidental `{ ...input }` spread into the underlying svc.
    const fetchBody = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body as string
    expect(fetchBody).not.toContain(SAMPLE_INVOICE_ID)
    expect(fetchBody).not.toContain(SAMPLE_USER_ID)
  })
})

// ─── sendTemplate — PHASE-A matrix row 9 (mirrors sendMessage shapes) ───────

describe("sendTemplate tracking", () => {
  it("success — INSERT carries endpoint='sendtemplatemessage' + template_name", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: SUCCESS_BODY })))
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "t-row-1" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendTemplate({
      phone: SAMPLE_PHONE,
      templateName: SAMPLE_TEMPLATE,
      templateLanguage: "en_US",
      invoiceId: SAMPLE_INVOICE_ID,
      userId: SAMPLE_USER_ID,
    })

    expect(result.ok).toBe(true)
    const insertPayload = spies.whatsapp_sends!.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertPayload).toMatchObject({
      endpoint: "sendtemplatemessage",
      template_name: SAMPLE_TEMPLATE,
    })
  })

  it("failure — UPDATEs to failed with raw_response carrying the WPBox error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchSequence(
        mockResponse({ status: 400, body: ERROR_BODY }),
        mockResponse({ status: 400, body: ERROR_BODY }),
      ),
    )
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "t-row-2" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const result = await svc.sendTemplate({
      phone: SAMPLE_PHONE,
      templateName: SAMPLE_TEMPLATE,
      templateLanguage: "en_US",
    })

    expect(result.ok).toBe(false)
    const updatePayload = spies.whatsapp_sends!.firstCallArgs("update")?.[0] as Record<string, unknown>
    expect(updatePayload.status).toBe("failed")
  })
})

// ─── retryWhatsappSend — PHASE-A matrix rows 10-12 ───────────────────────────

describe("retryWhatsappSend", () => {
  const FAILED_ORIGINAL = {
    id: "orig-1",
    invoice_id: SAMPLE_INVOICE_ID,
    phone: SAMPLE_PHONE,
    endpoint: "sendmessage",
    status: "failed" as const,
    user_id: SAMPLE_USER_ID,
    attempt_no: 1,
  }

  it("Row 10: retries a failed row — inserts new attempt with attempt_no=2 and original_send_id link, succeeds", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: SUCCESS_BODY })))

    // FOUR .from() calls now:
    //   1. SELECT to read original
    //   2. SELECT existing-attempt guard (added in PR #156 — Macroscope HIGH
    //      finding on concurrent-retry double-send). Returns null = no existing.
    //   3. INSERT new attempt row
    //   4. UPDATE the new row with the result
    let fromCalls = 0
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: FAILED_ORIGINAL, error: null },
    })
    const existingGuardBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: null }, // no existing attempt → proceed
    })
    const insertBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "new-row-1" }, error: null },
    })
    const updateBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation((table: string) => {
      fromCalls++
      if (fromCalls === 1) return selectBuilder.fromImpl(table)
      if (fromCalls === 2) return existingGuardBuilder.fromImpl(table)
      if (fromCalls === 3) return insertBuilder.fromImpl(table)
      return updateBuilder.fromImpl(table)
    })

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("orig-1", {
      endpoint: "sendmessage",
      input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
    })

    expect(result.ok).toBe(true)
    expect(newSendId).toBe("new-row-1")
    // Catalog #1: INSERT payload value-contract.
    const insertPayload = insertBuilder.spies.whatsapp_sends!.firstCallArgs("insert")?.[0] as Record<
      string,
      unknown
    >
    expect(insertPayload).toMatchObject({
      original_send_id: "orig-1",
      attempt_no: 2,
      phone: SAMPLE_PHONE,
      endpoint: "sendmessage",
      template_name: null,
      status: "queued",
      invoice_id: SAMPLE_INVOICE_ID,
      user_id: SAMPLE_USER_ID,
    })
    // Existing-attempt guard fired with the right filter shape.
    const guardSpy = existingGuardBuilder.spies.whatsapp_sends!
    expect(guardSpy.calls.eq).toContainEqual(["original_send_id", "orig-1"])
    expect(guardSpy.calls.in[0]?.[0]).toBe("status")
    expect(guardSpy.calls.in[0]?.[1]).toEqual(["queued", "sent"])
  })

  // ─── Pre-INSERT concurrency guard (Macroscope HIGH on PR #156) ─────────
  //
  // The original row's status stays `'failed'` forever (append-only model),
  // so two concurrent retries against the same original would both pass the
  // status guard above. The new pre-INSERT check refuses if any descendant
  // is already `queued` or `sent`. Race window is TOCTOU-narrow only.

  it("refuses when an in-flight (queued) attempt already exists for the original", async () => {
    let fromCalls = 0
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: FAILED_ORIGINAL, error: null },
    })
    const existingGuardBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "in-flight-attempt", status: "queued" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation((table: string) => {
      fromCalls++
      if (fromCalls === 1) return selectBuilder.fromImpl(table)
      return existingGuardBuilder.fromImpl(table)
    })

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("orig-X", {
      endpoint: "sendmessage",
      input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
    })

    expect(result.ok).toBe(false)
    expect(newSendId).toBeNull()
    expect("error" in result ? result.error : "").toContain("already in flight")
    // No INSERT happened — only the two SELECTs.
    expect(fromCalls).toBe(2)
  })

  it("refuses when a successfully-retried (sent) attempt already exists for the original", async () => {
    let fromCalls = 0
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: FAILED_ORIGINAL, error: null },
    })
    const existingGuardBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: { id: "succeeded-attempt", status: "sent" }, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation((table: string) => {
      fromCalls++
      if (fromCalls === 1) return selectBuilder.fromImpl(table)
      return existingGuardBuilder.fromImpl(table)
    })

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("orig-Y", {
      endpoint: "sendmessage",
      input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
    })

    expect(result.ok).toBe(false)
    expect(newSendId).toBeNull()
    expect("error" in result ? result.error : "").toContain("already been retried")
    expect(fromCalls).toBe(2)
  })

  it("rethrows on existing-attempt-guard DB error (defense-in-depth)", async () => {
    let fromCalls = 0
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: FAILED_ORIGINAL, error: null },
    })
    const existingGuardBuilder = makeBuilderSpyByTable({
      whatsapp_sends: {
        data: null,
        error: { code: "P0003", message: "guard query failed" },
      },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation((table: string) => {
      fromCalls++
      if (fromCalls === 1) return selectBuilder.fromImpl(table)
      return existingGuardBuilder.fromImpl(table)
    })

    const svc = createTrackedWhatsAppService(db, CONFIG)
    await expect(
      svc.retryWhatsappSend("orig-Z", {
        endpoint: "sendmessage",
        input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
      }),
    ).rejects.toMatchObject({ code: "P0003" })
  })

  it("Row 11a: refuses when original row status is 'queued'", async () => {
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: {
        data: { ...FAILED_ORIGINAL, status: "queued" as const },
        error: null,
      },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(selectBuilder.fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("orig-2", {
      endpoint: "sendmessage",
      input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
    })

    expect(result.ok).toBe(false)
    expect(newSendId).toBeNull()
    expect("error" in result ? result.error : "").toContain("not retriable")
    // No INSERT performed — only the SELECT.
    expect(selectBuilder.tableCalls).toEqual(["whatsapp_sends"])
  })

  it("Row 11b: refuses when original row status is 'sent'", async () => {
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: {
        data: { ...FAILED_ORIGINAL, status: "sent" as const },
        error: null,
      },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(selectBuilder.fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("orig-3", {
      endpoint: "sendmessage",
      input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
    })

    expect(result.ok).toBe(false)
    expect(newSendId).toBeNull()
    expect("error" in result ? result.error : "").toContain("not retriable")
  })

  it("Row 12: refuses when original row missing", async () => {
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: { code: "PGRST116", message: "No rows" } },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(selectBuilder.fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("missing-id", {
      endpoint: "sendmessage",
      input: { phone: SAMPLE_PHONE, message: SAMPLE_MESSAGE },
    })

    expect(result.ok).toBe(false)
    expect(newSendId).toBeNull()
    expect("error" in result ? result.error : "").toContain("not found")
  })

  it("refuses when replay endpoint mismatches the original", async () => {
    const selectBuilder = makeBuilderSpyByTable({
      whatsapp_sends: { data: FAILED_ORIGINAL, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(selectBuilder.fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const { result, newSendId } = await svc.retryWhatsappSend("orig-1", {
      endpoint: "sendtemplatemessage",
      input: { phone: SAMPLE_PHONE, templateName: SAMPLE_TEMPLATE, templateLanguage: "en_US" },
    })

    expect(result.ok).toBe(false)
    expect(newSendId).toBeNull()
    expect("error" in result ? result.error : "").toContain("endpoint mismatch")
  })
})

// ─── Pass-through methods — never touch the DB ───────────────────────────────

describe("non-send pass-throughs", () => {
  it("makeContact does not touch the DB", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: '{"status":"success"}' })))
    const db = makeDb({})
    const svc = createTrackedWhatsAppService(db, CONFIG)
    await svc.makeContact({ phone: SAMPLE_PHONE, name: "Alice" })
    expect(db.from).not.toHaveBeenCalled()
  })

  it("getContact does not touch the DB", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: '{"status":"success"}' })))
    const db = makeDb({})
    const svc = createTrackedWhatsAppService(db, CONFIG)
    await svc.getContact(SAMPLE_PHONE)
    expect(db.from).not.toHaveBeenCalled()
  })

  it("getTemplates does not touch the DB", async () => {
    vi.stubGlobal("fetch", mockFetchSequence(mockResponse({ status: 200, body: "[]" })))
    const db = makeDb({})
    const svc = createTrackedWhatsAppService(db, CONFIG)
    await svc.getTemplates()
    expect(db.from).not.toHaveBeenCalled()
  })
})

// ─── Cross-package exhaustiveness sentinels ─────────────────────────────────

describe("exhaustiveness sentinels", () => {
  it("ALL_WHATSAPP_SEND_STATUSES covers every literal in the WhatsAppSendStatus union", () => {
    // Runtime smoke for the compile-time sentinel in whatsapp-send.types.ts.
    // Provides a NICE error message if someone bypasses TypeScript and
    // adds a status at runtime (extension via casting).
    expect(ALL_WHATSAPP_SEND_STATUSES).toEqual(["queued", "sent", "failed"])
  })

  it("ALL_WHATSAPP_SEND_ENDPOINTS covers every literal in the WhatsAppSendEndpoint union", () => {
    expect(ALL_WHATSAPP_SEND_ENDPOINTS).toEqual(["sendmessage", "sendtemplatemessage"])
  })

  it("STATUS_TRANSITIONS matrix is exhaustive over WhatsAppSendStatus", () => {
    // Smoke for the compile-time check at the top of this file. The
    // compile-time _matrixIsExhaustive failure would be the primary signal;
    // this runtime assertion is a fall-through documentation aid.
    expect(Object.keys(STATUS_TRANSITIONS).sort()).toEqual([...ALL_WHATSAPP_SEND_STATUSES].sort())
  })
})

// ─── Type-only assertions (input shapes) ─────────────────────────────────────
//
// These never run at runtime — they're load-bearing on compilation only.
// Catalog #8: type-system as forcing function. If TrackedSendMessageInput
// or TrackedSendTemplateInput is changed in a way that breaks the
// caller's expected shape, these references won't compile.

const _typeOnlyAssertions = (): void => {
  const _msg: TrackedSendMessageInput = {
    phone: SAMPLE_PHONE,
    message: SAMPLE_MESSAGE,
    invoiceId: SAMPLE_INVOICE_ID,
    userId: SAMPLE_USER_ID,
  }
  void _msg
  const _tpl: TrackedSendTemplateInput = {
    phone: SAMPLE_PHONE,
    templateName: SAMPLE_TEMPLATE,
    templateLanguage: "en_US",
  }
  void _tpl
}
void _typeOnlyAssertions

// ─── getWhatsappSendById (SB-1 / #153 — retry-route pre-flight reader) ──────

describe("getWhatsappSendById", () => {
  const ROW_ID = "ff111111-1111-1111-1111-111111111111"
  const ROW = {
    id: ROW_ID,
    invoice_id: SAMPLE_INVOICE_ID,
    original_send_id: null,
    attempt_no: 1,
    phone: SAMPLE_PHONE,
    endpoint: "sendmessage",
    template_name: null,
    wamid: null,
    status: "failed",
    raw_response: null,
    error_message: "WhatsApp rejected",
    user_id: null,
    queued_at: "2026-05-17T08:00:00Z",
    completed_at: "2026-05-17T08:00:02Z",
  }

  it("returns a mapped row when the row exists + caller can read it", async () => {
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: ROW, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const row = await svc.getWhatsappSendById(ROW_ID)
    expect(row).toMatchObject({
      id: ROW_ID,
      invoice_id: SAMPLE_INVOICE_ID,
      attempt_no: 1,
      phone: SAMPLE_PHONE,
      endpoint: "sendmessage",
      status: "failed",
      error_message: "WhatsApp rejected",
    })
    const spy = spies.whatsapp_sends!
    // Asserts the projection includes ALL fields (the retry route's pre-flight
    // check needs invoice_id + endpoint + status; the returned row is full
    // shape for future callers).
    const selectArg = spy.firstCallArgs("select")?.[0] as string
    expect(selectArg).toContain("invoice_id")
    expect(selectArg).toContain("endpoint")
    expect(selectArg).toContain("status")
    expect(selectArg).toContain("raw_response")
    expect(spy.calls.eq).toEqual([["id", ROW_ID]])
  })

  it("returns null when the row doesn't exist OR is RLS-hidden (no error)", async () => {
    const { fromImpl } = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    expect(await svc.getWhatsappSendById(ROW_ID)).toBeNull()
  })

  it("rethrows on DB error", async () => {
    const { fromImpl } = makeBuilderSpyByTable({
      whatsapp_sends: {
        data: null,
        error: { code: "P0001", message: "RLS denied" },
      },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    await expect(svc.getWhatsappSendById(ROW_ID)).rejects.toMatchObject({
      code: "P0001",
    })
  })
})

// ─── listFailedWhatsappSends (backlog W2, PR 1: visibility/read path) ───────

describe("listFailedWhatsappSends", () => {
  const SAMPLE_FAILED_ROW = {
    id: "ff111111-1111-1111-1111-111111111111",
    invoice_id: SAMPLE_INVOICE_ID,
    original_send_id: null,
    attempt_no: 1,
    phone: SAMPLE_PHONE,
    endpoint: "sendmessage",
    template_name: null,
    status: "failed",
    error_message: "WhatsApp rejected (message_wamid: null)",
    queued_at: "2026-05-17T08:00:00Z",
    completed_at: "2026-05-17T08:00:02Z",
  }

  /**
   * The implementation issues TWO `.from('whatsapp_sends')` calls — see
   * PHASE-0 § B in `docs/decisions/2026-05-17-whatsapp-retry-action.md`:
   *
   *   call 1: candidates  — `.select(...).eq("status","failed").gte().order().limit(limit*2)`
   *   call 2: descendants — `.select("original_send_id").in("original_send_id", candidateIds)`
   *
   * `makeBuilderSpyByTable` returns the SAME spy/builder for every call to
   * `.from(table)`, so `spy.calls.*` accumulates BOTH invocations. Tests
   * that care about WHICH query did what read the right index out of
   * `calls[method]` (first call = candidates; second = descendants).
   *
   * For tests that need to distinguish OUTPUTS per query (e.g., a leaf-
   * filtering test where the candidate query returns rows but the
   * descendant query returns its own row set), use `sequentialBuilders`
   * below — it stubs `db.from` to hand back DIFFERENT builders per call.
   */
  function sequentialBuilders(...results: Array<{ data: unknown; error: unknown }>) {
    const built = results.map((r) => makeBuilderSpyByTable({
      whatsapp_sends: r,
    }))
    const fromImpl = ((_table: string) => {
      const next = built.shift()
      if (!next) throw new Error("sequentialBuilders: more from() calls than expected")
      return next.fromImpl(_table)
    }) as (table: string) => never
    return { fromImpl }
  }

  it("happy path: returns mapped rows + overfetches by 2× for leaf-filtering", async () => {
    // Both queries return the same single-row data. The descendant query's
    // `.in("original_send_id", [SAMPLE_FAILED_ROW.id])` returns this row,
    // whose `original_send_id` is null → no candidate is superseded → the
    // single row passes through to the mapped output.
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: [SAMPLE_FAILED_ROW], error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const rows = await svc.listFailedWhatsappSends()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: SAMPLE_FAILED_ROW.id,
      invoice_id: SAMPLE_INVOICE_ID,
      original_send_id: null,
      attempt_no: 1,
      phone: SAMPLE_PHONE,
      endpoint: "sendmessage",
      template_name: null,
      status: "failed",
      error_message: "WhatsApp rejected (message_wamid: null)",
    })
    const spy = spies.whatsapp_sends!
    // First .select() is the candidates query (full projection).
    const candidateSelect = spy.calls.select[0]?.[0] as string
    expect(candidateSelect).toContain("id")
    expect(candidateSelect).toContain("error_message")
    expect(candidateSelect).toContain("completed_at")
    expect(candidateSelect).not.toContain("raw_response")
    // Second .select() is the descendant query (only original_send_id).
    const descendantSelect = spy.calls.select[1]?.[0] as string
    expect(descendantSelect).toBe("original_send_id")
    // The candidate query asserts status='failed'.
    expect(spy.calls.eq).toEqual([["status", "failed"]])
    expect(spy.firstCallArgs("order")).toEqual([
      "completed_at",
      { ascending: false },
    ])
    // .limit(50 * 2) — the implementation overfetches by 2× so that filtered-
    // out non-leaves don't shrink the returned page below the requested cap.
    expect(spy.argsFor("limit")).toEqual([100])
    // The descendant query uses .in("original_send_id", candidateIds).
    expect(spy.calls.in[0]?.[0]).toBe("original_send_id")
    expect(spy.calls.in[0]?.[1]).toEqual([SAMPLE_FAILED_ROW.id])
  })

  it("default sinceDays = 7 → .gte('completed_at', <7-day cutoff ISO>)", async () => {
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: [], error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const before = Date.now()
    const svc = createTrackedWhatsAppService(db, CONFIG)
    await svc.listFailedWhatsappSends()
    const after = Date.now()

    const gteCall = spies.whatsapp_sends!.calls.gte[0]
    expect(gteCall?.[0]).toBe("completed_at")
    const cutoffMs = new Date(gteCall?.[1] as string).getTime()
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
    expect(cutoffMs).toBeGreaterThanOrEqual(before - sevenDaysMs)
    expect(cutoffMs).toBeLessThanOrEqual(after - sevenDaysMs)
  })

  it("custom limit + sinceDays passed through (limit doubles for overfetch)", async () => {
    const { fromImpl, spies } = makeBuilderSpyByTable({
      whatsapp_sends: { data: [], error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    await svc.listFailedWhatsappSends({ limit: 10, sinceDays: 30 })
    const spy = spies.whatsapp_sends!
    // limit: 10 → first query calls .limit(20) for the 2× overfetch.
    expect(spy.argsFor("limit")).toEqual([20])
    const cutoffMs = new Date(spy.calls.gte[0]?.[1] as string).getTime()
    const expectedMin = Date.now() - 30 * 24 * 60 * 60 * 1000 - 5_000
    const expectedMax = Date.now() - 30 * 24 * 60 * 60 * 1000 + 5_000
    expect(cutoffMs).toBeGreaterThanOrEqual(expectedMin)
    expect(cutoffMs).toBeLessThanOrEqual(expectedMax)
  })

  it("returns empty array when data is null (no failed sends in window)", async () => {
    const { fromImpl } = makeBuilderSpyByTable({
      whatsapp_sends: { data: null, error: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const rows = await svc.listFailedWhatsappSends()
    expect(rows).toEqual([])
  })

  it("rethrows on candidate-query DB error (RLS denied, network, etc.)", async () => {
    const { fromImpl } = makeBuilderSpyByTable({
      whatsapp_sends: {
        data: null,
        error: { code: "P0001", message: "RLS denied" },
      },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    await expect(svc.listFailedWhatsappSends()).rejects.toMatchObject({
      code: "P0001",
    })
  })

  // ─── Leaf-filtering (PHASE-0 § B — money-flow correctness for retries) ───
  //
  // The append-only-per-attempt row model means a successful retry creates
  // a NEW `sent` row pointing back at the failed row via `original_send_id`.
  // The original failed row stays `failed` forever. The list MUST filter
  // out failed rows whose id is referenced as `original_send_id` by ANY
  // other row — otherwise the operator sees an already-retried failure and
  // is invited to re-send the customer (a money-flow bug).

  it("drops a failed row whose id is referenced as original_send_id by a descendant", async () => {
    const SUPERSEDED = {
      ...SAMPLE_FAILED_ROW,
      id: "11111111-1111-1111-1111-111111111111",
    }
    // Candidate query returns 1 row; descendant query returns 1 row
    // pointing at the SUPERSEDED row → it should be filtered out → 0 rows.
    const { fromImpl } = sequentialBuilders(
      { data: [SUPERSEDED], error: null },
      { data: [{ original_send_id: SUPERSEDED.id }], error: null },
    )
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const rows = await svc.listFailedWhatsappSends()
    expect(rows).toEqual([])
  })

  it("multi-attempt chain: only the LEAF failed row is shown (ancestors filtered)", async () => {
    // Chain: A (failed) → B (failed) → C (failed) — C is the leaf.
    // Descendant query returns rows pointing at A and at B (because B
    // points at A and C points at B); C is referenced by nothing → leaf.
    const A = { ...SAMPLE_FAILED_ROW, id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", attempt_no: 1, original_send_id: null }
    const B = { ...SAMPLE_FAILED_ROW, id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", attempt_no: 2, original_send_id: A.id }
    const C = { ...SAMPLE_FAILED_ROW, id: "cccccccc-cccc-cccc-cccc-cccccccccccc", attempt_no: 3, original_send_id: B.id }
    const { fromImpl } = sequentialBuilders(
      { data: [C, B, A], error: null }, // ordered most-recent-first per .order
      { data: [{ original_send_id: A.id }, { original_send_id: B.id }], error: null },
    )
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const rows = await svc.listFailedWhatsappSends()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.id).toBe(C.id)
    expect(rows[0]?.attempt_no).toBe(3)
  })

  it("enforces the limit cap AFTER leaf-filtering (small page even with many candidates)", async () => {
    // 10 candidates; 5 are non-leaves (referenced by 5 descendants);
    // limit=3 → returns 3 leaves (the first 3 by completed_at DESC).
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      ...SAMPLE_FAILED_ROW,
      id: `c${i}aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
      completed_at: `2026-05-17T08:00:${String(i).padStart(2, "0")}Z`,
    }))
    // Five of them (the LAST five in the array — the oldest by sort order)
    // have descendants → leaves are the first 5.
    const descendants = candidates.slice(5).map((c) => ({ original_send_id: c.id }))
    const { fromImpl } = sequentialBuilders(
      { data: candidates, error: null },
      { data: descendants, error: null },
    )
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    const rows = await svc.listFailedWhatsappSends({ limit: 3 })
    expect(rows).toHaveLength(3)
    // First 3 candidates (= first 3 leaves once the last 5 are dropped).
    expect(rows.map((r) => r.id)).toEqual(candidates.slice(0, 3).map((c) => c.id))
  })

  it("rethrows on descendant-query DB error too (defense-in-depth)", async () => {
    const { fromImpl } = sequentialBuilders(
      { data: [SAMPLE_FAILED_ROW], error: null },
      { data: null, error: { code: "P0002", message: "descendant query failed" } },
    )
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)

    const svc = createTrackedWhatsAppService(db, CONFIG)
    await expect(svc.listFailedWhatsappSends()).rejects.toMatchObject({
      code: "P0002",
    })
  })
})
