import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Test floor for whatsapp.service.ts — ticks the #102 Sprint 2 sub-item:
 *   - Unit tests for whatsapp.service.ts (18KB, 0 tests today)
 *
 * Risk-correct lead per `docs/audits/2026-05-16-102-revalidation.md § 8`;
 * supersedes the prior handoff's momentum-default of manifest.service.ts.
 * Foundation for the future whatsapp_sends audit-table work (#102 risk-rank
 * #2) — that wiring lands on top of a tested service rather than a blind one.
 *
 * Mirrors PR #118 (payment.service.test.ts) + PR #123 (invoice.service.test.ts)
 * + PR #132 (shipment.service.test.ts) pattern in structure (one describe per
 * public method; value-contract assertions; per-test fresh module via
 * vi.resetModules()), but with ONE deliberate divergence from the canonical
 * Supabase-mocked floors:
 *
 *   whatsapp.service.ts does NOT touch Supabase. There is no SupabaseClient
 *   parameter, no db.from() call anywhere in the source. The service speaks
 *   directly to the WPBox HTTP API via globalThis.fetch (in two private
 *   helpers: postSmart with a JSON->form fallback, and getJson). The
 *   canonical makeDb + makeBuilderSpy helpers are therefore N/A here — there
 *   is nothing for them to mock. This is documented in the PR body's
 *   PHASE-A audit + the EXTERNAL-MOCK RATIONALE section.
 *
 * Mocking strategy (PHASE-A decision):
 *   - The external boundary is `globalThis.fetch`. We mock via
 *     `vi.stubGlobal("fetch", ...)` per test — minimal, single-purpose,
 *     restored in afterEach via `vi.unstubAllGlobals()`. No new
 *     framework; no parallel mock harness; no real network call.
 *   - The local `mockFetchSequence(...responses)` factory below is the
 *     ONLY new helper. It returns a vi.Mock that resolves a sequence of
 *     Response objects in order — useful for the JSON-then-form fallback
 *     path where postSmart calls fetch twice. Inline / single-file by
 *     design (first consumer); extract-on-second-use applies per catalog
 *     entry #9 abstract-on-second-use rule if a future consumer appears.
 *   - The service's own logic — fallback decision tree, error parsing,
 *     status checks, WAMID-null silent-rejection guard, token masking,
 *     query-param shape — all runs as real code, exactly mirroring the
 *     "mock at the boundary; let our own logic run" discipline that
 *     makeDb embodies for Supabase-touching services.
 *
 * Scope (HTTP-side only, no real WPBox):
 *   - postSmart decision tree (exercised via sendMessage / sendTemplate /
 *     makeContact): JSON happy / 4xx-then-form-success / 200-app-error-
 *     then-form-success / network-error / 5xx-no-fallback / both-fail /
 *     status-0-fallback-trigger / form-encoded payload shape (null+
 *     undefined skipped, objects JSON-stringified, token prefixed).
 *   - WAMID-null silent-rejection guard: send endpoint + 200 + null
 *     wamid -> failure; non-send endpoint + 200 + null wamid -> success
 *     (the guard is endpoint-scoped, not global).
 *   - getJson path (exercised via getContact / getTemplates): success /
 *     4xx-with-body / 5xx / network-error / non-JSON body kept as text /
 *     query-param shape (token + caller params).
 *   - Surface dispatch: each of the five WhatsAppService methods hits the
 *     correct path and shapes the payload correctly (sendTemplate's
 *     snake_case template_name / template_language is the easiest place
 *     to regress).
 *   - buildHeaderMediaComponent: document with + without filename, image,
 *     video, exhaustiveness sentinel on WhatsAppHeaderMedia.kind.
 *   - getWhatsAppConfig env reader: token-missing throws, userId-missing
 *     throws, baseUrl defaults to undefined when env is unset, baseUrl
 *     pass-through when set, full happy shape.
 *   - createWhatsAppServiceFromEnv: composition smoke test.
 *   - normalizePhone: every documented input shape + reject paths.
 *
 * NOT IN SCOPE (documented absences):
 *   - Real WPBox API contract verification — that needs a smoke script or
 *     a contract-test against the live API in a sandbox. Out of scope for
 *     a unit-test floor by definition.
 *   - PII-redaction sentinel for `maskToken` — covered indirectly through
 *     the postSmart console.log path; full sentinel can ride on a future
 *     PII-audit session.
 *   - AbortSignal.timeout(15_000) actually firing under real time — vitest
 *     fake timers would change too much else; the timeout is configured in
 *     the source and exercised in production. Asserting timer wiring would
 *     be a snapshot-test that rots without catching real bugs.
 *
 * Sentry registration: whatsapp.service.ts does NOT emit captureException
 *   through the packages/services/src/shared/sentry-tagger contract. Its
 *   diagnostics use console.* (intentionally — WPBox failures surface as
 *   structured WhatsAppResult.error to the caller; Sentry instrumentation
 *   for the WhatsApp surface lives one layer up in the API route, not
 *   here). No registerSentry mock needed.
 */

import {
  buildHeaderMediaComponent,
  createWhatsAppService,
  createWhatsAppServiceFromEnv,
  getWhatsAppConfig,
  normalizePhone,
  type WhatsAppHeaderMedia,
  type WhatsAppService,
} from "../whatsapp.service"

// ─── Local helpers ───────────────────────────────────────────────────────────

/**
 * Build a Response-shaped object suitable for a fetch mock.
 *
 * Vitest + Node 22 / Bun-compat: a minimal object with `.ok`, `.status`,
 * `.statusText`, and `.text()` satisfies the service's read path. We use
 * a plain object rather than a real `new Response(...)` because the
 * service reads via `.text()` and uses `JSON.parse` itself — wrapping in
 * a real Response would add encoding round-trips that don't help the test
 * and that mask the parse path the service actually exercises.
 */
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

/**
 * Build a fetch mock that returns a sequence of responses in order.
 *
 * `kind: "response"` resolves the given Response; `kind: "throw"` rejects
 * with the given Error (simulates `fetch` itself throwing — DNS failure,
 * AbortSignal timeout, network refused). The mock asserts the call count
 * does not exceed the sequence length so an unexpected extra fetch
 * (e.g. an accidental third attempt in postSmart) fails loud.
 */
type FetchStep =
  | { kind: "response"; response: Response }
  | { kind: "throw"; error: Error }

function mockFetchSequence(...steps: FetchStep[]): ReturnType<typeof vi.fn> {
  let idx = 0
  return vi.fn(async () => {
    const step = steps[idx++]
    if (!step) {
      throw new Error(
        `mockFetchSequence exhausted: only ${steps.length} step(s) configured, ` +
          `but a ${idx}-th fetch call was made. Either the service is making ` +
          `an unexpected extra request, or the test needs another step.`,
      )
    }
    if (step.kind === "throw") throw step.error
    return step.response
  })
}

/** Suppress noisy [wpbox] logs during tests so vitest output stays clean. */
let consoleLogSpy: ReturnType<typeof vi.spyOn>
let consoleWarnSpy: ReturnType<typeof vi.spyOn>
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined)
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
})

afterEach(() => {
  consoleLogSpy.mockRestore()
  consoleWarnSpy.mockRestore()
  consoleErrorSpy.mockRestore()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const TEST_CONFIG = {
  token: "test-token-abcdef12345",
  userId: "user-1",
  baseUrl: "https://api.example.test",
}

function freshService(): WhatsAppService {
  return createWhatsAppService(TEST_CONFIG)
}

// ─── postSmart decision tree (via sendMessage) ───────────────────────────────

describe("postSmart decision tree (via sendMessage)", () => {
  it("JSON success: returns { ok: true, format: 'json' } and uses the JSON content-type", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ status: "success", message_wamid: "wamid.123" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.format).toBe("json")
      expect(result.data).toEqual({ status: "success", message_wamid: "wamid.123" })
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // Value-contract (catalog entry #1): assert the URL, method, body, and
    // content-type — bare toHaveBeenCalledTimes would mask a path regression.
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://api.example.test/api/wpbox/sendmessage")
    expect(init.method).toBe("POST")
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    )
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>
    expect(sentBody.token).toBe(TEST_CONFIG.token)
    expect(sentBody.phone).toBe("919876543210")
    expect(sentBody.message).toBe("hi")
  })

  it("JSON 4xx -> form-encoded retry succeeds: returns { ok: true, format: 'form' }", async () => {
    const fetchMock = mockFetchSequence(
      {
        kind: "response",
        response: mockResponse({
          status: 400,
          ok: false,
          body: JSON.stringify({ status: "error", message: "bad json" }),
        }),
      },
      {
        kind: "response",
        response: mockResponse({
          body: JSON.stringify({ status: "success", message_wamid: "wamid.456" }),
        }),
      },
    )
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.format).toBe("form")
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
    // Multi-step ordering (catalog entry #2): JSON first, form second.
    const [, firstInit] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect((firstInit.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    )
    const [, secondInit] = fetchMock.mock.calls[1]! as [string, RequestInit]
    expect((secondInit.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    )
    const formBody = new URLSearchParams(secondInit.body as string)
    expect(formBody.get("token")).toBe(TEST_CONFIG.token)
    expect(formBody.get("phone")).toBe("919876543210")
    expect(formBody.get("message")).toBe("hi")
  })

  it("JSON 200 with app-error envelope triggers form fallback (PHP-backend signal)", async () => {
    // status: "error" inside a 200 body is the load-bearing signal —
    // the PHP backend often returns 200 with an error envelope when it
    // can't parse the JSON body. Falling back to form-encoded recovers
    // that case. Asserting this case pins the load-bearing branch in
    // postSmart's shouldFallback decision.
    const fetchMock = mockFetchSequence(
      {
        kind: "response",
        response: mockResponse({
          body: JSON.stringify({ status: "error", message: "could not parse" }),
        }),
      },
      {
        kind: "response",
        response: mockResponse({
          body: JSON.stringify({ status: "success", message_wamid: "wamid.789" }),
        }),
      },
    )
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.format).toBe("form")
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("JSON 5xx does NOT trigger fallback (transport problem, not body-parse problem)", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        status: 503,
        ok: false,
        body: JSON.stringify({ status: "error", message: "service down" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
      expect(result.attemptedFormats).toEqual(["json"])
      expect(result.error).toContain("503")
      expect(result.error).toContain("service down")
      expect(result.rawResponse).toContain("service down")
    }
    // Critical: no second attempt; the 5xx branch in postSmart's
    // shouldFallback decision is the load-bearing guard against
    // hammering an already-failing backend.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("both attempts fail: surfaces the form error with attemptedFormats: ['json','form']", async () => {
    const fetchMock = mockFetchSequence(
      {
        kind: "response",
        response: mockResponse({
          status: 400,
          ok: false,
          body: JSON.stringify({ message: "json failed" }),
        }),
      },
      {
        kind: "response",
        response: mockResponse({
          status: 422,
          ok: false,
          body: JSON.stringify({ message: "form failed too" }),
        }),
      },
    )
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.attemptedFormats).toEqual(["json", "form"])
      // Surfaced error is the FORM result's error (the second / final
      // attempt) — PHP backends speak form natively so its error is
      // more informative.
      expect(result.error).toContain("form failed too")
      expect(result.status).toBe(422)
    }
  })

  it("network error (status undefined / 0) DOES trigger form fallback per shouldFallback decision tree", async () => {
    // attemptPost's network-error branch returns `{ ok: false, error: ..., status: undefined }`.
    // postSmart's shouldFallback reads `status: jsonResult.status ?? 0`,
    // sees 0, and falls back. If the form attempt ALSO network-errors,
    // both are network errors and the final result is the form attempt's
    // error with attemptedFormats: ["json", "form"]. Pinning this
    // explicitly so a future refactor that "fixes" status: 0 to be its
    // own no-fallback branch is a conscious choice and not a silent
    // regression.
    const fetchMock = mockFetchSequence(
      { kind: "throw", error: new TypeError("fetch failed: ECONNREFUSED") },
      { kind: "throw", error: new Error("second attempt: network still down") },
    )
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // Final error is the FORM attempt's error (the second / final call).
      expect(result.error).toContain("Network error")
      expect(result.error).toContain("second attempt: network still down")
      expect(result.attemptedFormats).toEqual(["json", "form"])
      expect(result.status).toBeUndefined()
    }
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("non-JSON response body (HTML error page) is preserved as raw text in rawResponse", async () => {
    const htmlBody = "<html><body>503 Service Unavailable</body></html>"
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        status: 503,
        ok: false,
        statusText: "Service Unavailable",
        body: htmlBody,
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
      // readErrorMessage falls through to data.slice(0, 500) for a string body.
      expect(result.error).toContain(htmlBody)
      expect(result.rawResponse).toContain("503 Service Unavailable")
    }
  })

  it("app-error envelope with success: false also recognized as failure", async () => {
    const fetchMock = mockFetchSequence(
      {
        kind: "response",
        response: mockResponse({
          body: JSON.stringify({ success: false, error: "explicit failure" }),
        }),
      },
      {
        // Need a form fallback; supply a successful one so we can pin the
        // chain to the second attempt's success rather than the failure path.
        kind: "response",
        response: mockResponse({
          body: JSON.stringify({ status: "success", message_wamid: "wamid.x" }),
        }),
      },
    )
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("form-encoded body skips null/undefined values and JSON-stringifies objects/arrays", async () => {
    // Force the form fallback by erroring the JSON attempt with a 4xx,
    // then assert the form body shape on the second call.
    const fetchMock = mockFetchSequence(
      {
        kind: "response",
        response: mockResponse({
          status: 400,
          ok: false,
          body: JSON.stringify({ message: "form me please" }),
        }),
      },
      {
        kind: "response",
        response: mockResponse({
          body: JSON.stringify({ status: "success", message_wamid: "wamid.f" }),
        }),
      },
    )
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.sendMessage({
      phone: "919876543210",
      message: "hi",
      header: undefined,
      footer: undefined,
      buttons: [{ id: "yes", title: "Yes" }],
    })
    const [, formInit] = fetchMock.mock.calls[1]! as [string, RequestInit]
    expect((formInit.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/x-www-form-urlencoded",
    )
    const params = new URLSearchParams(formInit.body as string)
    expect(params.get("token")).toBe(TEST_CONFIG.token)
    expect(params.get("phone")).toBe("919876543210")
    expect(params.get("message")).toBe("hi")
    // null / undefined values dropped — assertion mirrors the
    // attemptPost form-encoded branch.
    expect(params.has("header")).toBe(false)
    expect(params.has("footer")).toBe(false)
    // Object values JSON-stringified.
    expect(params.get("buttons")).toBe(JSON.stringify([{ id: "yes", title: "Yes" }]))
  })
})

// ─── WAMID-null silent-rejection guard ───────────────────────────────────────

describe("WAMID-null silent-rejection guard", () => {
  it("send endpoint + 200 + message_wamid: null -> failure; NO form-encoded fallback (#139 regression check)", async () => {
    // WPBox returns HTTP 200 with status: "success" but message_wamid: null
    // when WhatsApp accepted the call shape but the actual send was
    // rejected downstream (template requires HEADER, recipient unreachable,
    // template unapproved). Without this guard, the caller would think
    // the message went through. The guard is the difference between
    // "delivery succeeded" and "delivery attempted." Load-bearing.
    //
    // #139 regression: this test was originally written when postSmart's
    // shouldFallback (status === 200) fired on WAMID-null and triggered a
    // redundant form-encoded retry — every silent rejection cost two API
    // calls. The source fix sets `semanticFailure: true` on the WAMID-null
    // branch in attemptPost, and postSmart short-circuits on that flag
    // BEFORE computing shouldFallback. ONE fetch call per send;
    // attemptedFormats: ["json"] only. The mock has ONE response (was 2
    // pre-fix); if a future regression re-introduces the fallback, the
    // sequence-exhaustion assertion in mockFetchSequence fires loudly.
    const wamidNullBody = JSON.stringify({
      status: "success",
      message_id: 99,
      message_wamid: null,
    })
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({ body: wamidNullBody }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("message_wamid: null")
      expect(result.error).toContain("HEADER component")
      expect(result.status).toBe(200)
      expect(result.rawResponse).toContain("message_wamid")
      // ONLY the JSON attempt ran post-#139 fix — no redundant form retry.
      expect(result.attemptedFormats).toEqual(["json"])
      // semanticFailure flag surfaces to the caller so consumers (and the
      // delivery-tracking wrapper) can distinguish semantic rejections
      // from transport-format failures if needed.
      expect(result.semanticFailure).toBe(true)
    }
    // Catalog #1 / #2: pin the EXACT call count. A future regression that
    // re-introduces the redundant fallback (status === 200 path firing on
    // WAMID-null) makes this fail with `expected 2 to equal 1`.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("send endpoint + 200 + message_wamid present -> success", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({
          status: "success",
          message_id: 100,
          message_wamid: "wamid.HBgN...",
        }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(true)
  })

  it("send endpoint via sendTemplate + 200 + message_wamid: null -> failure, single fetch (#139 regression, endpoint-class)", async () => {
    // The WAMID-null guard is scoped to BOTH /sendmessage and
    // /sendtemplatemessage paths. Pinning sendTemplate explicitly
    // guards against a regression that narrows the path check to
    // sendmessage only.
    //
    // Post-#139: ONE fetch call, attemptedFormats: ["json"] only. Same
    // single-response mock as the sendMessage case above.
    const wamidNullBody = JSON.stringify({
      status: "success",
      message_id: 99,
      message_wamid: null,
    })
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({ body: wamidNullBody }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.sendTemplate({
      phone: "919876543210",
      templateName: "shipment_update",
      templateLanguage: "en",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("message_wamid: null")
      expect(result.attemptedFormats).toEqual(["json"])
      expect(result.semanticFailure).toBe(true)
    }
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("non-send endpoint (makeContact) + 200 + message_wamid: null -> SUCCESS (guard is scoped, not global)", async () => {
    // makeContact has nothing to do with sending a message; if WPBox's
    // response happens to contain a null message_wamid (it shouldn't,
    // but the data shape isn't strictly enforced upstream), we MUST NOT
    // reject. Pinning this asserts the guard's path-scope.
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({
          status: "success",
          message_wamid: null,
          contact_id: "c-1",
        }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.makeContact({ phone: "919876543210", name: "Test" })
    expect(result.ok).toBe(true)
  })
})

// ─── getJson path (via getContact / getTemplates) ────────────────────────────

describe("getJson path (via getContact / getTemplates)", () => {
  it("happy path: parses JSON, returns { ok: true, data }", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ status: "success", contact: { id: "c-1" } }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.getContact("919876543210")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toEqual({ status: "success", contact: { id: "c-1" } })
    }
    // Query-string contract: token + phone, both as URL params; HTTP GET.
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(init.method).toBe("GET")
    const parsed = new URL(url)
    expect(parsed.origin + parsed.pathname).toBe(
      "https://api.example.test/api/wpbox/getSingleContact",
    )
    expect(parsed.searchParams.get("token")).toBe(TEST_CONFIG.token)
    expect(parsed.searchParams.get("phone")).toBe("919876543210")
  })

  it("4xx with body: returns { ok: false } with status + parsed error message", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        status: 404,
        ok: false,
        statusText: "Not Found",
        body: JSON.stringify({ message: "contact not found" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.getContact("919876543210")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.error).toContain("404")
      expect(result.error).toContain("contact not found")
    }
  })

  it("5xx without body: falls through to statusText for the error message", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        status: 502,
        ok: false,
        statusText: "Bad Gateway",
        body: "",
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.getContact("919876543210")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
      expect(result.error).toContain("502")
      expect(result.error).toContain("Bad Gateway")
    }
  })

  it("network error: { ok: false } with no status", async () => {
    const fetchMock = mockFetchSequence({
      kind: "throw",
      error: new Error("ENOTFOUND"),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.getContact("919876543210")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("Network error")
      expect(result.error).toContain("ENOTFOUND")
      expect(result.status).toBeUndefined()
    }
  })

  it("non-JSON body kept as raw text in the success data", async () => {
    const rawText = "not-json plaintext"
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({ body: rawText }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    const result = await svc.getContact("919876543210")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe(rawText)
  })

  it("getTemplates appends user_id to query params (pin against snake_case-vs-camelCase regression)", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ templates: [] }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.getTemplates()
    const [url] = fetchMock.mock.calls[0]! as [string, RequestInit]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/api/wpbox/getTemplates")
    expect(parsed.searchParams.get("user_id")).toBe(TEST_CONFIG.userId)
    expect(parsed.searchParams.get("token")).toBe(TEST_CONFIG.token)
  })
})

// ─── Surface dispatch (path + payload shape per method) ──────────────────────

describe("surface dispatch (each WhatsAppService method hits the right path + shapes payload correctly)", () => {
  function happyJsonResponse(body: Record<string, unknown> = { status: "success", message_wamid: "wamid.ok" }): FetchStep {
    return { kind: "response", response: mockResponse({ body: JSON.stringify(body) }) }
  }

  it("sendMessage POSTs /api/wpbox/sendmessage with phone+message+header+footer+buttons", async () => {
    const fetchMock = mockFetchSequence(happyJsonResponse())
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.sendMessage({
      phone: "919876543210",
      message: "Hi",
      header: "Header",
      footer: "Footer",
      buttons: [{ id: "1", title: "OK" }],
    })
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://api.example.test/api/wpbox/sendmessage")
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      token: TEST_CONFIG.token,
      phone: "919876543210",
      message: "Hi",
      header: "Header",
      footer: "Footer",
      buttons: [{ id: "1", title: "OK" }],
    })
  })

  it("sendTemplate uses snake_case template_name and template_language (regression-prone key shape)", async () => {
    // The snake_case is THE place this method is most likely to regress
    // — TS-side camelCase, wire snake_case. The PR #128 cast-cleanup
    // session surfaced a similar key-shape failure mode on track/[awb]
    // (camelCase vs DB snake_case for serviceLevel).
    const fetchMock = mockFetchSequence(happyJsonResponse())
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.sendTemplate({
      phone: "919876543210",
      templateName: "invoice_ready",
      templateLanguage: "en_US",
      components: [
        { type: "BODY", parameters: [{ type: "text", text: "INV-001" }] },
      ],
    })
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://api.example.test/api/wpbox/sendtemplatemessage")
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.template_name).toBe("invoice_ready")
    expect(body.template_language).toBe("en_US")
    expect(body.phone).toBe("919876543210")
    expect(Array.isArray(body.components)).toBe(true)
  })

  it("makeContact POSTs /api/wpbox/makeContact with name + optional groups + custom fields", async () => {
    const fetchMock = mockFetchSequence(happyJsonResponse({ status: "success", contact_id: "c-1" }))
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.makeContact({
      phone: "919876543210",
      name: "Acme Logistics",
      groups: "customers",
      custom: { gstin: "07AABCU9603R1ZM", city: "Imphal" },
    })
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://api.example.test/api/wpbox/makeContact")
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body).toMatchObject({
      phone: "919876543210",
      name: "Acme Logistics",
      groups: "customers",
      custom: { gstin: "07AABCU9603R1ZM", city: "Imphal" },
    })
  })

  it("getContact hits /api/wpbox/getSingleContact with phone in the query string", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({ body: JSON.stringify({ status: "success" }) }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.getContact("919876543210")
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(init.method).toBe("GET")
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/api/wpbox/getSingleContact")
    expect(parsed.searchParams.get("phone")).toBe("919876543210")
  })

  it("getTemplates hits /api/wpbox/getTemplates with user_id in the query string", async () => {
    // Already covered in the getJson describe block; this is the surface-
    // dispatch mirror (per catalog entry #4 — sweep whole describe block;
    // every surface method gets its dispatch pinned for parity).
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({ body: JSON.stringify({ templates: [] }) }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = freshService()
    await svc.getTemplates()
    const [url] = fetchMock.mock.calls[0]! as [string, RequestInit]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe("/api/wpbox/getTemplates")
    expect(parsed.searchParams.get("user_id")).toBe(TEST_CONFIG.userId)
  })

  it("baseUrl trailing-slash is normalized (no double-slash in the constructed URL)", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ status: "success", message_wamid: "w" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = createWhatsAppService({
      token: TEST_CONFIG.token,
      userId: TEST_CONFIG.userId,
      baseUrl: "https://api.example.test/////",
    })
    await svc.sendMessage({ phone: "919876543210", message: "hi" })
    const [url] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://api.example.test/api/wpbox/sendmessage")
  })

  it("default baseUrl is the WPBox production hostname when none provided", async () => {
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ status: "success", message_wamid: "w" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = createWhatsAppService({
      token: TEST_CONFIG.token,
      userId: TEST_CONFIG.userId,
    })
    await svc.sendMessage({ phone: "919876543210", message: "hi" })
    const [url] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://chat.leminai.com/api/wpbox/sendmessage")
  })
})

// ─── buildHeaderMediaComponent (pure helper, all media kinds) ────────────────

describe("buildHeaderMediaComponent", () => {
  it("document with filename produces the typed-document parameter shape", () => {
    const c = buildHeaderMediaComponent({
      kind: "document",
      link: "https://example.com/inv-001.pdf",
      filename: "INV-001.pdf",
    })
    expect(c.type).toBe("HEADER")
    const p = c.parameters[0] as unknown as {
      type: string
      document: { link: string; filename?: string }
    }
    expect(p.type).toBe("document")
    expect(p.document.link).toBe("https://example.com/inv-001.pdf")
    expect(p.document.filename).toBe("INV-001.pdf")
  })

  it("document without filename omits the filename key (not a key with undefined)", () => {
    const c = buildHeaderMediaComponent({
      kind: "document",
      link: "https://example.com/inv.pdf",
    })
    const p = c.parameters[0] as unknown as {
      type: string
      document: { link: string; filename?: string }
    }
    expect(p.document.link).toBe("https://example.com/inv.pdf")
    // Catalog entry #1 (value-contract): explicit absence, not just `undefined`.
    expect("filename" in p.document).toBe(false)
  })

  it("image produces the typed-image parameter shape", () => {
    const c = buildHeaderMediaComponent({
      kind: "image",
      link: "https://example.com/logo.png",
    })
    const p = c.parameters[0] as unknown as {
      type: string
      image: { link: string }
    }
    expect(p.type).toBe("image")
    expect(p.image.link).toBe("https://example.com/logo.png")
  })

  it("video produces the typed-video parameter shape", () => {
    const c = buildHeaderMediaComponent({
      kind: "video",
      link: "https://example.com/promo.mp4",
    })
    const p = c.parameters[0] as unknown as {
      type: string
      video: { link: string }
    }
    expect(p.type).toBe("video")
    expect(p.video.link).toBe("https://example.com/promo.mp4")
  })

  // Catalog entry #8 (enum exhaustiveness via satisfies + Exclude). If a
  // future contributor adds a new WhatsAppHeaderMedia.kind without
  // extending buildHeaderMediaComponent, the missing branch would still
  // compile (the function's return type is the wide union). This
  // type-level check forces the addition to be conscious by failing
  // compilation if the kinds-list below is stale.
  const _ALL_HEADER_KINDS = ["document", "image", "video"] as const satisfies readonly WhatsAppHeaderMedia["kind"][]
  type _MissingHeaderKind = Exclude<WhatsAppHeaderMedia["kind"], (typeof _ALL_HEADER_KINDS)[number]>
  const _allHeaderKindsCovered: _MissingHeaderKind extends never ? true : never = true
  void _allHeaderKindsCovered
})

// ─── getWhatsAppConfig (env reader) ──────────────────────────────────────────

describe("getWhatsAppConfig", () => {
  it("throws a descriptive error when WPBOX_API_TOKEN is missing", () => {
    vi.stubEnv("WPBOX_API_TOKEN", "")
    vi.stubEnv("WPBOX_USER_ID", "u-1")
    expect(() => getWhatsAppConfig()).toThrow(/WPBOX_API_TOKEN is not set/)
    expect(() => getWhatsAppConfig()).toThrow(/\.env\.local/)
  })

  it("throws a descriptive error when WPBOX_USER_ID is missing (and token is set)", () => {
    vi.stubEnv("WPBOX_API_TOKEN", "tok-1")
    vi.stubEnv("WPBOX_USER_ID", "")
    expect(() => getWhatsAppConfig()).toThrow(/WPBOX_USER_ID is not set/)
  })

  it("returns the full config when all vars are set (baseUrl included)", () => {
    vi.stubEnv("WPBOX_API_TOKEN", "tok-1")
    vi.stubEnv("WPBOX_USER_ID", "u-1")
    vi.stubEnv("WPBOX_BASE_URL", "https://custom.example.test")
    const cfg = getWhatsAppConfig()
    expect(cfg).toEqual({
      token: "tok-1",
      userId: "u-1",
      baseUrl: "https://custom.example.test",
    })
  })

  it("returns baseUrl: '' (empty string, NOT undefined) when WPBOX_BASE_URL is stubbed empty — pins actual behavior", () => {
    // CodeRabbit-corrected: prior version of this test asserted
    // `cfg.baseUrl === "" || cfg.baseUrl === undefined`, which was
    // dishonestly permissive and masked a real source-behavior issue.
    //
    // vi.stubEnv("WPBOX_BASE_URL", "") sets process.env.WPBOX_BASE_URL
    // to the empty string. The source `getWhatsAppConfig` reads it
    // verbatim (no `??`, no `||`, no normalization) and returns it.
    // The result is { baseUrl: "" }, NOT { baseUrl: undefined }.
    //
    // This matters because `createWhatsAppService`'s
    // `config.baseUrl ?? "https://chat.leminai.com"` fallback uses the
    // nullish-coalescing operator, which does NOT trigger on empty
    // string. So an empty baseUrl propagates through and produces
    // relative-URL fetch calls. See the next test for the
    // bug-documenting demonstration, and the BASE-URL-EMPTY-FALLBACK
    // follow-up issue for the source fix.
    vi.stubEnv("WPBOX_API_TOKEN", "tok-1")
    vi.stubEnv("WPBOX_USER_ID", "u-1")
    vi.stubEnv("WPBOX_BASE_URL", "")
    const cfg = getWhatsAppConfig()
    expect(cfg.token).toBe("tok-1")
    expect(cfg.userId).toBe("u-1")
    expect(cfg.baseUrl).toBe("")
  })

  it("empty-string baseUrl resolves to the default WPBox base URL (#140 regression check)", async () => {
    // Originally documented as a LATENT BUG by CodeRabbit's review of the
    // PR #138 test floor: the source's pre-fix
    // `(config.baseUrl ?? "https://chat.leminai.com")` used `??`, which
    // only coalesces null/undefined, so baseUrl="" passed straight through
    // and fetch was called with a relative URL (`/api/wpbox/sendmessage`).
    // Node's fetch rejects non-absolute URLs in production.
    //
    // #140 fix: changed `??` to `||` in createWhatsAppService. Since
    // baseUrl is `string | undefined` and the only falsy strings are ""
    // (which we want to coalesce) and undefined (already covered), `||`
    // is the minimal correct change. Fixed at the consumer layer
    // (createWhatsAppService), NOT at getWhatsAppConfig, so the
    // WhatsAppConfig type stays honest about what `baseUrl: ""` means
    // (treated as "use default").
    //
    // This test was previously titled "LATENT BUG: ..." and asserted
    // `expect(url).toBe("/api/wpbox/sendmessage")` (the buggy relative
    // URL). Flipped here to assert the fixed behavior: the URL is the
    // default base + path. A regression that reverts `||` back to `??`
    // makes this assertion fail.
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ status: "success", message_wamid: "w" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = createWhatsAppService({
      token: TEST_CONFIG.token,
      userId: TEST_CONFIG.userId,
      baseUrl: "",
    })
    await svc.sendMessage({ phone: "919876543210", message: "hi" })
    const [url] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://chat.leminai.com/api/wpbox/sendmessage")
  })
})

// ─── createWhatsAppServiceFromEnv (composition smoke test) ───────────────────

describe("createWhatsAppServiceFromEnv", () => {
  it("composes getWhatsAppConfig + createWhatsAppService into a working service", async () => {
    vi.stubEnv("WPBOX_API_TOKEN", "tok-env")
    vi.stubEnv("WPBOX_USER_ID", "u-env")
    vi.stubEnv("WPBOX_BASE_URL", "https://env.example.test")
    const fetchMock = mockFetchSequence({
      kind: "response",
      response: mockResponse({
        body: JSON.stringify({ status: "success", message_wamid: "wamid.env" }),
      }),
    })
    vi.stubGlobal("fetch", fetchMock)
    const svc = createWhatsAppServiceFromEnv()
    const result = await svc.sendMessage({ phone: "919876543210", message: "hi" })
    expect(result.ok).toBe(true)
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit]
    expect(url).toBe("https://env.example.test/api/wpbox/sendmessage")
    const body = JSON.parse(init.body as string) as Record<string, unknown>
    expect(body.token).toBe("tok-env")
  })
})

// ─── normalizePhone (pure helper, every documented input shape) ──────────────

describe("normalizePhone", () => {
  it("empty input returns null", () => {
    expect(normalizePhone("")).toBeNull()
  })

  it("input with no digits returns null", () => {
    expect(normalizePhone("---")).toBeNull()
    expect(normalizePhone("abc")).toBeNull()
    expect(normalizePhone(" + ")).toBeNull()
  })

  it("bare 10-digit number prepends the default country code (91)", () => {
    expect(normalizePhone("9876543210")).toBe("919876543210")
  })

  it("11-digit with leading trunk-zero strips zero and prepends country code", () => {
    expect(normalizePhone("09876543210")).toBe("919876543210")
  })

  it("12-digit canonical form passes through", () => {
    expect(normalizePhone("919876543210")).toBe("919876543210")
  })

  it("13-digit with spurious +91 0 trunk-zero strips the zero", () => {
    expect(normalizePhone("9109876543210")).toBe("919876543210")
  })

  it("13-digit without the trunk-zero second-digit returns null (unrecognized shape)", () => {
    // Not 91 + 0 + 10 — could be a different country or garbage. Reject
    // rather than guess.
    expect(normalizePhone("9119876543210")).toBeNull()
  })

  it("8-digit landline-style returns null", () => {
    expect(normalizePhone("12345678")).toBeNull()
  })

  it("14-digit garbage returns null", () => {
    expect(normalizePhone("12345678901234")).toBeNull()
  })

  it("non-IN country code via defaultCountryCode override", () => {
    // 10-digit + override prepends the override.
    expect(normalizePhone("5551234567", "1")).toBe("15551234567")
    // 11-digit canonical for "1" country code passes through (1 + 10).
    // Source rule: 12-digit must start with default code; 11-digit starts
    // with "0" trunk-zero. So the bare-canonical path for "1" is the
    // 10-digit branch above; an 11-digit input "15551234567" would NOT
    // match the 11-digit-with-leading-zero branch (no leading 0) and
    // would fall through to null. Pin that explicitly.
    expect(normalizePhone("15551234567", "1")).toBeNull()
  })

  it("strips non-digits (spaces, +, dashes, parens) before parsing", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("919876543210")
    expect(normalizePhone("(91) 9876543210")).toBe("919876543210")
    expect(normalizePhone("+91 0 9876543210")).toBe("919876543210")
  })

  it("12-digit with WRONG country prefix returns null (canonical-shape guard)", () => {
    // 12 digits but starting with "92" rather than the default "91" must
    // fall through to null — preserves the function's role as an
    // allow-list filter, not a permissive normalizer.
    expect(normalizePhone("929876543210")).toBeNull()
  })
})
