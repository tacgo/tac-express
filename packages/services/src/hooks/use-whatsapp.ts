"use client"

import { useMutation, useQuery } from "@tanstack/react-query"

/**
 * Client-side hooks for the dashboard's WhatsApp surface.
 *
 * - `useSendInvoiceWhatsapp()` — POSTs the actual send through to the
 *   route handler (which masks the WPBox token server-side).
 * - `useWhatsappTest()` — calls a config/connectivity check; the dialog
 *   uses this to show a pre-flight status pill so the user knows whether
 *   their WPBox config is valid BEFORE clicking Send.
 */

/**
 * Delivery mode for the invoice.
 *
 * - `"direct"` — free-form `sendmessage` API. **Only delivers if the
 *   recipient has messaged the WhatsApp Business number in the last 24
 *   hours**, per WhatsApp Business Platform policy. Best for replies /
 *   active conversations.
 * - `"template"` — uses the `sendtemplatemessage` API with a
 *   pre-approved template. Delivers anytime, no 24h restriction. The
 *   template must be approved by Meta before it can be used.
 */
export type WhatsappDeliveryMode = "direct" | "template"

export interface WhatsappTemplateParam {
  text: string
}

export interface SendInvoiceWhatsappInput {
  invoiceId: string
  /** Optional phone override (e.g. "+91 98765 43210" or "9876543210"). */
  phone?: string
  /** Defaults to `"direct"`. Set to `"template"` for guaranteed delivery. */
  mode?: WhatsappDeliveryMode
  /** Required when `mode === "template"`. Name of the approved template. */
  templateName?: string
  /** Required when `mode === "template"`. e.g. "en", "en_US", "hi". */
  templateLanguage?: string
  /** Body parameters for the template. Order matches `{{1}}`, `{{2}}`, … */
  templateParams?: WhatsappTemplateParam[]
  /**
   * Public URL of the document/image/video that fills the template's
   * HEADER component. Required for templates whose HEADER format is
   * DOCUMENT, IMAGE, or VIDEO. WhatsApp fetches this URL server-side,
   * so it MUST be publicly resolvable (no auth, no localhost).
   */
  templateMediaUrl?: string
  /** Display filename when the HEADER format is DOCUMENT. */
  templateMediaFilename?: string
  /** Defaults to `"document"` when `templateMediaUrl` is set. */
  templateMediaKind?: "document" | "image" | "video"
}

export interface SendInvoiceWhatsappResult {
  ok: boolean
  /** The normalized phone (digits + country code) the message was sent to. */
  phone?: string
  invoiceNumber?: string
  /** Mode that was actually used to send. */
  mode?: WhatsappDeliveryMode
  /** WPBox / WhatsApp message ID — proof the message reached the API. */
  wamid?: string
}

export interface SendInvoiceWhatsappError extends Error {
  /** Raw body returned by WPBox — surfaced so the dialog can show details. */
  rawResponse?: string
  status?: number
}

export function useSendInvoiceWhatsapp() {
  return useMutation<SendInvoiceWhatsappResult, SendInvoiceWhatsappError, SendInvoiceWhatsappInput>(
    {
      mutationFn: async (input) => {
        const res = await fetch("/api/whatsapp/send-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean
          phone?: string
          invoiceNumber?: string
          mode?: WhatsappDeliveryMode
          wamid?: string
          error?: string
          rawResponse?: string
          status?: number
        } | null

        if (!res.ok) {
          const err = new Error(
            data?.error ?? `Send failed (HTTP ${res.status})`
          ) as SendInvoiceWhatsappError
          err.rawResponse = data?.rawResponse
          err.status = data?.status ?? res.status
          throw err
        }
        return {
          ok: Boolean(data?.ok),
          phone: data?.phone,
          invoiceNumber: data?.invoiceNumber,
          mode: data?.mode,
          wamid: data?.wamid,
        }
      },
    }
  )
}

/* ════════════════════════════════════════════════════════════════════════ */
/*  Pre-flight config / connectivity check                                   */
/* ════════════════════════════════════════════════════════════════════════ */

export interface WhatsappTemplateSummary {
  name: string
  language: string
  status?: string
  body?: string
  /**
   * `"DOCUMENT" | "IMAGE" | "VIDEO" | "TEXT"` (or undefined for templates
   * without a HEADER). When DOCUMENT/IMAGE/VIDEO, the caller MUST supply
   * `templateMediaUrl` — otherwise WhatsApp silently rejects the send
   * (returns null WAMID).
   */
  headerFormat?: string
}

export interface WhatsappTestResult {
  ok: boolean
  configured: boolean
  connected: boolean
  /**
   * True when the server can mint signed `/api/public/invoice-pdf` URLs
   * that WhatsApp can fetch (signing secret is set + dashboard origin
   * is publicly reachable, not localhost). When true, the dialog hides
   * the manual "Document URL" field — the server fills it in.
   */
  pdfAutoGenAvailable?: boolean
  error?: string
  rawResponse?: string
  /** Approved template catalog for this WPBox account. */
  templates?: WhatsappTemplateSummary[]
}

/**
 * Fires GET `/api/whatsapp/test` once when the SendWhatsAppDialog opens.
 * Doesn't retry — a config check that fails is unlikely to succeed on
 * retry, and we don't want to spam the upstream API. The `enabled` arg
 * lets the dialog gate the request to only when it's actually open.
 */
export function useWhatsappTest(enabled: boolean) {
  return useQuery<WhatsappTestResult>({
    queryKey: ["whatsapp", "test"],
    queryFn: async () => {
      const res = await fetch("/api/whatsapp/test")
      const data = (await res.json().catch(() => null)) as WhatsappTestResult | null
      if (!data) {
        return {
          ok: false,
          configured: false,
          connected: false,
          error: `Unexpected response (HTTP ${res.status})`,
        }
      }
      return data
    },
    enabled,
    retry: false,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}
