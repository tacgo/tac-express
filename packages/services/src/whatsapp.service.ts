/**
 * WhatsApp messaging via WPBox (chat.leminai.com).
 *
 * ─── SECURITY ─────────────────────────────────────────────────────────────
 * Server-side only. DO NOT import this module from a client component or
 * any file that ends up in the browser bundle. The API token must never
 * be exposed to the browser.
 *
 * Configuration via environment variables (read by `getWhatsAppConfig`):
 *   WPBOX_API_TOKEN  — required. Your WPBox API token.
 *   WPBOX_USER_ID    — required. Your WPBox user ID (used by the
 *                      `getTemplates` endpoint).
 *   WPBOX_BASE_URL   — optional. Defaults to "https://chat.leminai.com".
 *
 * Set these in `.env.local` (development) and the deployment platform's
 * env vars (production). NEVER prefix with `NEXT_PUBLIC_`.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface WhatsAppButton {
  id: string
  title: string
}

export interface WhatsAppTemplateComponent {
  type: "BODY" | "HEADER" | "FOOTER" | "BUTTON"
  parameters: Array<{ type: "text"; text: string }>
}

export interface SendMessageInput {
  /** Phone number with country code, digits only (e.g. "919876543210"). */
  phone: string
  message: string
  header?: string
  footer?: string
  buttons?: WhatsAppButton[]
}

export interface SendTemplateInput {
  phone: string
  templateName: string
  /** WhatsApp language code, e.g. "en_US", "en", "hi". */
  templateLanguage: string
  components?: WhatsAppTemplateComponent[]
}

/**
 * Header media component used by templates whose HEADER is an image,
 * video, or document. WhatsApp fetches `link` server-side, so it MUST
 * be publicly resolvable (no Bearer/cookie auth on the URL itself).
 */
export type WhatsAppHeaderMedia =
  | { kind: "document"; link: string; filename?: string }
  | { kind: "image"; link: string }
  | { kind: "video"; link: string }

/**
 * Build a HEADER component for `sendtemplatemessage`. Output matches the
 * WPBox docs:
 *
 *   { type: "HEADER", parameters: [{ type: "document", document: { link, filename } }] }
 */
export function buildHeaderMediaComponent(
  media: WhatsAppHeaderMedia
): WhatsAppTemplateComponent {
  if (media.kind === "document") {
    return {
      type: "HEADER",
      // The WPBox JSON shape uses dynamic keys keyed by media kind, so
      // we cast the parameter object once rather than fight the typed
      // shape (which only models the BODY-text variant).
      parameters: [
        {
          type: "document",
          document: { link: media.link, ...(media.filename ? { filename: media.filename } : {}) },
        } as unknown as { type: "text"; text: string },
      ],
    }
  }
  if (media.kind === "image") {
    return {
      type: "HEADER",
      parameters: [
        { type: "image", image: { link: media.link } } as unknown as {
          type: "text"
          text: string
        },
      ],
    }
  }
  return {
    type: "HEADER",
    parameters: [
      { type: "video", video: { link: media.link } } as unknown as {
        type: "text"
        text: string
      },
    ],
  }
}

export interface MakeContactInput {
  phone: string
  name: string
  /** Optional group name to assign on creation. */
  groups?: string
  /** Custom key/value fields stored on the contact (e.g. address, age). */
  custom?: Record<string, string | number>
}

export interface WhatsAppConfig {
  token: string
  userId: string
  baseUrl?: string
}

export type WhatsAppResult<T = unknown> =
  | { ok: true; data: T; format?: "json" | "form" }
  | {
      ok: false
      error: string
      status?: number
      /** Full raw body (string) returned by WPBox — useful for surfacing in UI. */
      rawResponse?: string
      /** Which body format produced this failure. Helps diagnose schema issues. */
      attemptedFormats?: Array<"json" | "form">
      /**
       * SEMANTIC failure marker (#139). When true, the failure is NOT a
       * transport-format mismatch — it is a deliberate rejection by the
       * upstream API (e.g., HTTP 200 + `message_wamid: null` = WhatsApp
       * accepted the request but refused the send). `postSmart` checks
       * this BEFORE computing shouldFallback so the form-encoded retry is
       * skipped — retrying a semantic rejection produces an identical
       * rejection AND an extra outbound API call per send. Currently set
       * only by the WAMID-null guard in `attemptPost`; extend if other
       * semantic-failure shapes emerge.
       */
      semanticFailure?: boolean
    }

export interface WhatsAppService {
  sendMessage(input: SendMessageInput): Promise<WhatsAppResult>
  sendTemplate(input: SendTemplateInput): Promise<WhatsAppResult>
  makeContact(input: MakeContactInput): Promise<WhatsAppResult>
  getContact(phone: string): Promise<WhatsAppResult>
  getTemplates(): Promise<WhatsAppResult>
}

/**
 * Build a WhatsApp service bound to the given credentials. Pure factory —
 * no Supabase, no cookies, no DB. Safe to instantiate per-request from
 * route handlers / server actions.
 */
export function createWhatsAppService(config: WhatsAppConfig): WhatsAppService {
  // #140: `||` not `??` — `??` only coalesces null/undefined, so an empty-
  // string baseUrl (the actual case when WPBOX_BASE_URL="" or unset in
  // production env) passed straight through and `fetch(`${baseUrl}${path}`)`
  // built relative URLs (/api/wpbox/...) that Node's fetch rejects as
  // non-absolute. baseUrl is `string | undefined`; the only falsy strings
  // are "" and undefined (already covered), so `||` is safe — no other
  // falsy value can legitimately be a base URL.
  const baseUrl = (config.baseUrl || "https://chat.leminai.com").replace(/\/+$/, "")

  /**
   * POST a payload to the WPBox API with automatic format fallback.
   *
   * Tries `application/json` first (the docs show nested objects/arrays
   * for `buttons`, `components`, `custom` — natural JSON shapes). If that
   * fails with a 4xx OR an application-level error body, retries the same
   * payload as `application/x-www-form-urlencoded` (with complex values
   * JSON-stringified into the form fields). This handles the case where
   * the upstream PHP backend reads `$_POST` instead of `php://input`.
   *
   * Either way, you get a clear log line in the dev terminal showing
   * which format was tried and the exact response body.
   */
  async function postSmart<T = unknown>(
    path: string,
    payload: Record<string, unknown>
  ): Promise<WhatsAppResult<T>> {
    /* ── First attempt: JSON body ── */
    const jsonResult = await attemptPost<T>(path, payload, "json")
    if (jsonResult.ok) return { ...jsonResult, format: "json" }

    /* ── #139: Bypass the form-encoded fallback when the JSON attempt's
     * failure is a SEMANTIC rejection (e.g., HTTP 200 + message_wamid:
     * null). A semantic rejection is not a transport-format mismatch —
     * the body parsed fine; WhatsApp simply refused the send. Retrying
     * as form-encoded produces an identical rejection AND a redundant
     * outbound API call per send. Network-error (status 0) and 4xx /
     * 200-without-WAMID-null cases below are unaffected.                */
    if (jsonResult.semanticFailure) {
      return { ...jsonResult, attemptedFormats: ["json"] }
    }

    /* ── Determine if a fallback is worth attempting ──
     * Network errors / 5xx don't get a fallback (transport problem).
     * Only retry for 4xx / application-level errors which suggest a
     * server-side body parse mismatch.                                  */
    const status = jsonResult.status ?? 0
    const shouldFallback =
      (status >= 400 && status < 500) ||
      // status undefined → app-level error on 200; PHP backend likely
      // didn't parse JSON at all.
      status === 200 ||
      status === 0

    if (!shouldFallback) {
      return { ...jsonResult, attemptedFormats: ["json"] }
    }

    console.warn(
      `[wpbox] JSON attempt on ${path} returned ${
        status || "app-error"
      } — retrying as form-encoded`
    )

    /* ── Second attempt: form-encoded body ── */
    const formResult = await attemptPost<T>(path, payload, "form")
    if (formResult.ok) return { ...formResult, format: "form" }

    /* ── Both attempts failed — surface the form-encoded error
     * (typically more informative because the PHP backend speaks
     * form natively) and tag both formats as attempted.              */
    return { ...formResult, attemptedFormats: ["json", "form"] }
  }

  /**
   * Single POST attempt against WPBox in either JSON or form-encoded mode.
   * Returns a discriminated result with full raw response for diagnostics.
   */
  async function attemptPost<T>(
    path: string,
    payload: Record<string, unknown>,
    format: "json" | "form"
  ): Promise<WhatsAppResult<T>> {
    let body: string
    let contentType: string

    if (format === "json") {
      body = JSON.stringify({ token: config.token, ...payload })
      contentType = "application/json"
    } else {
      const params = new URLSearchParams()
      params.set("token", config.token)
      for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) continue
        params.set(
          key,
          typeof value === "object" ? JSON.stringify(value) : String(value)
        )
      }
      body = params.toString()
      contentType = "application/x-www-form-urlencoded"
    }

    // Log a redacted version of the body (mask the token).
    console.log(
      `[wpbox] POST ${path} (${format}) →`,
      body.replace(config.token, maskToken(config.token))
    )

    let res: Response
    try {
      res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          Accept: "application/json",
        },
        body,
        signal: AbortSignal.timeout(15_000),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[wpbox] network error on ${path} (${format}):`, msg)
      return { ok: false, error: `Network error: ${msg}` }
    }

    /* ── Read as text first so the raw body is always loggable ── */
    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* non-JSON response — keep raw text */
    }

    console.log(
      `[wpbox] ${path} (${format}) ← ${res.status}:`,
      typeof data === "string" ? data.slice(0, 500) : data
    )

    /* ── Transport-level failure ── */
    if (!res.ok) {
      const detail = readErrorMessage(data) ?? res.statusText
      return {
        ok: false,
        error: `WPBox ${res.status}: ${detail}`,
        status: res.status,
        rawResponse: text.slice(0, 1000),
      }
    }

    /* ── Application-level failure (HTTP 200 + error body) ──
     *
     * Two failure shapes WPBox emits with HTTP 200:
     *
     *  1. `{ status: "error", message: "..." }` — explicit error envelope.
     *  2. `{ status: "success", message_id: N, message_wamid: null }` —
     *     **silent rejection**. WPBox accepted our request but WhatsApp
     *     itself refused to send (template requires HEADER but we sent
     *     BODY only, template not approved, recipient blocked, etc.).
     *     The null WAMID is the actual signal of failure for any send
     *     path (`/sendmessage` or `/sendtemplatemessage`). Treat as
     *     failure on those endpoints.
     */
    const isSendEndpoint = path.includes("sendmessage") || path.includes("sendtemplatemessage")
    if (isSendEndpoint && data && typeof data === "object") {
      const obj = data as Record<string, unknown>
      // null literal — JSON.parse leaves this as JS `null`
      if (Object.prototype.hasOwnProperty.call(obj, "message_wamid") && obj.message_wamid === null) {
        return {
          ok: false,
          error:
            "WhatsApp rejected the message (message_wamid: null). The template likely requires a HEADER component, the recipient isn't reachable, or the template is unapproved.",
          status: res.status,
          rawResponse: text.slice(0, 1000),
          // #139: mark this as a SEMANTIC failure so postSmart skips the
          // form-encoded fallback. The body parsed cleanly and WhatsApp
          // returned an unambiguous null WAMID — retrying as form-encoded
          // would just produce the same rejection and double the outbound
          // API call count per send. See WhatsAppResult.semanticFailure.
          semanticFailure: true,
        }
      }
    }

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>
      const isErrorStatus =
        obj.status === "error" ||
        obj.success === false ||
        (typeof obj.error === "string" && obj.error.length > 0)
      if (isErrorStatus) {
        return {
          ok: false,
          error: readErrorMessage(obj) ?? "WPBox returned an error",
          status: res.status,
          rawResponse: text.slice(0, 1000),
        }
      }
    }

    return { ok: true, data: data as T }
  }

  /**
   * GET a payload from the WPBox API. Used for read-only endpoints
   * (`getContacts`, `getTemplates`, etc.) which take query params.
   */
  async function getJson<T = unknown>(
    path: string,
    params: Record<string, string>
  ): Promise<WhatsAppResult<T>> {
    const url = new URL(`${baseUrl}${path}`)
    url.searchParams.set("token", config.token)
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
    let res: Response
    try {
      res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[wpbox] network error on GET ${path}:`, msg)
      return { ok: false, error: `Network error: ${msg}` }
    }

    const text = await res.text()
    let data: unknown = text
    try {
      data = JSON.parse(text)
    } catch {
      /* non-JSON */
    }

    if (!res.ok) {
      console.error(
        `[wpbox] ${res.status} on GET ${path}:`,
        typeof data === "string" ? data.slice(0, 500) : data
      )
      return {
        ok: false,
        error: `WPBox ${res.status}: ${readErrorMessage(data) ?? res.statusText}`,
        status: res.status,
      }
    }
    return { ok: true, data: data as T }
  }

  return {
    sendMessage(input) {
      return postSmart("/api/wpbox/sendmessage", {
        phone: input.phone,
        message: input.message,
        header: input.header,
        footer: input.footer,
        buttons: input.buttons,
      })
    },

    sendTemplate(input) {
      return postSmart("/api/wpbox/sendtemplatemessage", {
        phone: input.phone,
        template_name: input.templateName,
        template_language: input.templateLanguage,
        components: input.components,
      })
    },

    makeContact(input) {
      return postSmart("/api/wpbox/makeContact", {
        phone: input.phone,
        name: input.name,
        groups: input.groups,
        custom: input.custom,
      })
    },

    getContact(phone) {
      return getJson("/api/wpbox/getSingleContact", { phone })
    },

    getTemplates() {
      return getJson("/api/wpbox/getTemplates", { user_id: config.userId })
    },
  }
}

/**
 * Redact the API token for safe logging — keeps the first 4 chars and
 * length so the dev can sanity-check it's not a placeholder.
 */
function maskToken(token: string): string {
  if (!token) return "[empty]"
  if (token.length <= 8) return "****"
  return `${token.slice(0, 4)}…${token.slice(-2)} (len ${token.length})`
}

/**
 * Pull a human-readable error string out of a WPBox response body.
 * The API isn't fully consistent across endpoints — try several common
 * shapes before falling back.
 */
function readErrorMessage(data: unknown): string | null {
  if (!data) return null
  if (typeof data === "string") return data.slice(0, 500) || null
  if (typeof data !== "object") return String(data)
  const obj = data as Record<string, unknown>
  // Common shapes: { message: "..." } / { error: "..." } / { errors: [...] }
  // / { msg: "..." } / { reason: "..." }
  const msg =
    obj.message ?? obj.error ?? obj.msg ?? obj.reason ?? obj.detail ?? null
  if (typeof msg === "string" && msg.length > 0) return msg
  if (Array.isArray(obj.errors) && obj.errors.length > 0) {
    return obj.errors
      .map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .join("; ")
  }
  // Fall through — surface the whole object so the dev can debug.
  try {
    return JSON.stringify(obj).slice(0, 500)
  } catch {
    return null
  }
}

/**
 * Read WhatsApp config from `process.env`. Throws a descriptive error if
 * any required var is missing — call from inside route handlers and
 * surface a 503 to the client.
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  const token = process.env.WPBOX_API_TOKEN
  const userId = process.env.WPBOX_USER_ID
  const baseUrl = process.env.WPBOX_BASE_URL

  if (!token) {
    throw new Error(
      "WPBOX_API_TOKEN is not set. Add it to apps/dashboard/.env.local and your deployment env vars."
    )
  }
  if (!userId) {
    throw new Error(
      "WPBOX_USER_ID is not set. Add it to apps/dashboard/.env.local and your deployment env vars."
    )
  }

  return { token, userId, baseUrl }
}

/** Convenience: build a service instance from env in one call. */
export function createWhatsAppServiceFromEnv(): WhatsAppService {
  return createWhatsAppService(getWhatsAppConfig())
}

/**
 * Normalize a free-form phone string to the digits-only format the WPBox
 * API expects (country code + national number, no `+`, no spaces).
 *
 * Canonical Indian form: `91` + 10-digit subscriber number = 12 digits total.
 *
 * Recognised input shapes (assumes default country code "91"):
 * - `9876543210`           → `919876543210`   (bare 10-digit national)
 * - `09876543210`          → `919876543210`   (national with trunk-zero)
 * - `919876543210`         → `919876543210`   (already canonical)
 * - `+91 98765 43210`      → `919876543210`   (after non-digit strip)
 * - `+91 0 9876543210`     → `919876543210`   (operator prefix +0 stripped)
 *
 * Returns `null` if no plausible Indian phone can be derived. Used as the
 * comparison key for the WhatsApp IDOR allow-list — a bug here can either
 * accept illegitimate sends or reject legitimate ones, so the function
 * stays defensive about ambiguous inputs.
 */
export function normalizePhone(
  input: string,
  defaultCountryCode = "91"
): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, "")
  if (!digits) return null

  // Canonical: 12-digit (country code + 10-digit subscriber).
  if (digits.length === 12 && digits.startsWith(defaultCountryCode)) {
    return digits
  }

  // 13-digit form is almost always `91` + spurious trunk-zero + 10-digit
  // subscriber (the user typed `+91 0 …`). Strip the zero rather than
  // returning the malformed value — otherwise this number compares !=
  // the canonical one and breaks the allow-list. Reject anything else.
  if (digits.length === 13 && digits.startsWith(defaultCountryCode)) {
    if (digits[2] === "0") {
      return defaultCountryCode + digits.slice(3)
    }
    return null
  }

  // National number with leading trunk-zero.
  if (digits.length === 11 && digits.startsWith("0")) {
    return defaultCountryCode + digits.slice(1)
  }

  // Bare 10-digit national number — assume default country.
  if (digits.length === 10) {
    return defaultCountryCode + digits
  }

  // Anything else (8-digit landlines, 11-digit no-zero, 14-digit garbage,
  // non-IN country codes) is rejected — the caller MUST surface a clear
  // error rather than guess.
  return null
}
