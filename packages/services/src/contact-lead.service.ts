/**
 * createContactLeadService — public-form lead capture (PL-2b).
 *
 * Issue tracker: PL-2b (docs/launch/product-launch-readiness.md § C.1).
 * Migration: supabase/migrations/20260518000001_contact_leads.sql.
 * Decision doc: docs/decisions/2026-05-18-contact-leads-pl-2b.md.
 *
 * Why a service (and not the route handler doing it inline)
 * ---------------------------------------------------------
 * The architecture rule (LAW 6/7/8 — `.claude/skills/conventions/`
 * architecture-flow.md) is: route handlers stay thin, services own the
 * business logic + DB access. This service owns the lead-capture contract:
 *
 *   1. INSERT a `new` row into contact_leads with notification_status=
 *      'pending'. If this fails, return `{ ok: false, … }` — the route
 *      surfaces a 500. The lead is NOT captured, so reporting success
 *      would be deceptive UX.
 *   2. THEN attempt the WhatsApp notification via the tracked WhatsApp
 *      service. The lead row already exists, so a send failure does NOT
 *      lose the lead. We catch every exception, update notification_status
 *      to 'sent' or 'failed', and return `{ ok: true, … }` either way —
 *      the lead's durable record is the load-bearing signal of success,
 *      not the notification.
 *
 * This mirrors the tracker-FIRST inversion documented at the top of
 * whatsapp-tracked.service.ts: an observability failure (the notification)
 * must not collapse the customer-facing outcome (the lead being captured).
 *
 * Notification channel
 * --------------------
 * OD-P8 = WhatsApp. The service sends a TEMPLATE message via the tracked
 * WhatsApp service to a configured recipient phone
 * (`WPBOX_LEAD_NOTIFICATION_PHONE`) using a WhatsApp Business template
 * (`WPBOX_LEAD_TEMPLATE_NAME`, default `lead_notification`,
 * `WPBOX_LEAD_TEMPLATE_LANGUAGE`, default `en`).
 *
 * The template needs Meta-side approval before live notifications fire;
 * until then `sendTemplate` will return `{ ok: false, error: … }` and the
 * lead row transitions to notification_status='failed'. The lead is still
 * captured — manual follow-up is unaffected.
 *
 * The template's expected body parameters (positional):
 *   {{1}} reason       — e.g. "Sales"
 *   {{2}} name         — e.g. "Aman Sharma"
 *   {{3}} email        — e.g. "aman@example.com"
 *   {{4}} excerpt      — first 200 chars of the message body
 *
 * No PII / Sentry posture
 * -----------------------
 * The captured email + message ARE PII. They live in contact_leads behind
 * the MANAGER+ SELECT policy. The WhatsApp template carries the same PII
 * to the operator's notification phone — that's the load-bearing payload.
 * NO PII is emitted to Sentry from this service.
 */

import type { SupabaseClient } from "@workspace/database/supabase.types"
import type {
  ContactLeadFilters,
  ContactLeadFormInput,
  ContactLeadNotificationStatus,
  ContactLeadRow,
  ContactLeadStatus,
  ContactLeadSubmissionResult,
} from "@workspace/types"

import type { TrackedWhatsAppService } from "./whatsapp-tracked.service"

/** Maximum chars from the lead's message body included in the WhatsApp
 *  template's {{4}} placeholder. WhatsApp template body parameters cap at
 *  ~1024 chars per Meta's docs; 200 keeps the notification scannable. */
const MESSAGE_EXCERPT_CHARS = 200

/** Reason-label lookup. The form posts the enum key; the notification
 *  shows a human label. Mirrors REASONS in contact-form.tsx. */
const REASON_LABELS: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  partner: "Partner",
  press: "Press / Media",
  other: "Other",
}

/** Request-scoped metadata the route handler captures from headers. */
export interface ContactLeadRequestMeta {
  ipAddress: string | null
  userAgent: string | null
}

/** Service config — env-var-derived values the service needs to call the
 *  WhatsApp template send. */
export interface ContactLeadServiceConfig {
  /** WhatsApp recipient phone (E.164 digits — the team's notification
   *  inbox). Sourced from `WPBOX_LEAD_NOTIFICATION_PHONE`. */
  notificationPhone: string | null
  /** WhatsApp template name. Default `lead_notification`. */
  templateName: string
  /** WhatsApp template language. Default `en`. */
  templateLanguage: string
}

/** Returned by the service factory. */
export interface ContactLeadService {
  submitContactLead(
    input: ContactLeadFormInput,
    meta: ContactLeadRequestMeta,
  ): Promise<ContactLeadSubmissionResult>
}

export function createContactLeadService(
  db: SupabaseClient,
  whatsapp: TrackedWhatsAppService,
  config: ContactLeadServiceConfig,
): ContactLeadService {
  return {
    async submitContactLead(input, meta) {
      // ── Step 1: INSERT the lead row (durable system of record) ────────────
      // Normalize company at the service boundary — accept "" / "   " /
      // undefined from any caller (the route trims to undefined, but
      // direct callers may not) and store a single canonical NULL when
      // empty. Avoids mixed "" / NULL representations in the table.
      const company = input.company?.trim()
      const insert = await db
        .from("contact_leads")
        .insert({
          name: input.name,
          email: input.email,
          company: company && company.length > 0 ? company : null,
          reason: input.reason,
          message: input.message,
          status: "new",
          notification_status: "pending",
          ip_address: meta.ipAddress,
          user_agent: meta.userAgent,
        })
        .select("id")
        .single()

      if (insert.error || !insert.data) {
        // Insert failure = lead not captured. Surface as a server error
        // so the form shows a real error to the visitor (no fake success).
        const message =
          insert.error?.message ??
          "Failed to capture lead — database insert returned no row"
        return { ok: false, error: message }
      }

      const leadId = insert.data.id
      let notificationStatus: ContactLeadNotificationStatus = "pending"

      // ── Step 2: WhatsApp notification (best-effort, never throws) ─────────
      try {
        if (!config.notificationPhone) {
          // No recipient configured — notification path is intentionally
          // disabled (e.g. local dev without a phone configured). Mark
          // failed with a clear error so the operator can spot the
          // misconfiguration in the leads list.
          notificationStatus = "failed"
          await markNotificationFailed(
            db,
            leadId,
            "WPBOX_LEAD_NOTIFICATION_PHONE not configured",
          )
        } else {
          const excerpt =
            input.message.length > MESSAGE_EXCERPT_CHARS
              ? input.message.slice(0, MESSAGE_EXCERPT_CHARS) + "…"
              : input.message

          const result = await whatsapp.sendTemplate({
            phone: config.notificationPhone,
            templateName: config.templateName,
            templateLanguage: config.templateLanguage,
            components: [
              {
                type: "BODY",
                parameters: [
                  { type: "text", text: REASON_LABELS[input.reason] ?? input.reason },
                  { type: "text", text: input.name },
                  { type: "text", text: input.email },
                  { type: "text", text: excerpt },
                ],
              },
            ],
          })

          if (result.ok) {
            notificationStatus = "sent"
            await markNotificationSent(db, leadId)
          } else {
            notificationStatus = "failed"
            await markNotificationFailed(
              db,
              leadId,
              extractErrorMessage(result),
            )
          }
        }
      } catch (err) {
        // Any unexpected throw — log path-tagged + mark the row failed.
        // The LEAD IS ALREADY CAPTURED. We never return ok:false here.
        notificationStatus = "failed"
        const message = err instanceof Error ? err.message : String(err)
        await markNotificationFailed(db, leadId, `unexpected: ${message}`)
      }

      return { ok: true, id: leadId, notificationStatus }
    },
  }
}

/** Update notification_status='sent' + notification_sent_at=now(). Best-
 *  effort: NEVER throws. A failure here can only manifest as a stuck
 *  'pending' row in the table — observable to operators querying the
 *  leads list. Surface that failure to the server log so a misbehaving
 *  Supabase write doesn't fail silently. */
async function markNotificationSent(
  db: SupabaseClient,
  leadId: string,
): Promise<void> {
  try {
    const { error } = await db
      .from("contact_leads")
      .update({
        notification_status: "sent",
        notification_sent_at: new Date().toISOString(),
      })
      .eq("id", leadId)
    if (error) {
      console.error(
        `[contact-lead] markNotificationSent UPDATE failed for lead=${leadId}: ${error.message}`,
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[contact-lead] markNotificationSent threw for lead=${leadId}: ${message}`,
    )
  }
}

/** Update notification_status='failed' (the row stays queryable for manual
 *  follow-up). Reason text is NOT stored on the row to keep PII surface
 *  identical to the rest of the schema — only the status enum lands. The
 *  reason is logged to console for forensic review during incidents.
 *
 *  NEVER throws — a failure here would otherwise propagate out of the
 *  service's outer catch block and turn into a 500, defeating the whole
 *  "lead is captured regardless of notification outcome" contract. We
 *  swallow + log instead. The row stays in 'pending' or its prior state
 *  if the UPDATE fails; that's observable in the leads list. */
async function markNotificationFailed(
  db: SupabaseClient,
  leadId: string,
  reason: string,
): Promise<void> {
  // Server-side log — no PII in this string (lead body is not here; only
  // the underlying error message + the lead id). Consistent with
  // whatsapp-tracked's tracker-failure logging posture.
  console.error(
    `[contact-lead] notification failed for lead=${leadId}: ${reason}`,
  )
  try {
    const { error } = await db
      .from("contact_leads")
      .update({ notification_status: "failed" })
      .eq("id", leadId)
    if (error) {
      console.error(
        `[contact-lead] markNotificationFailed UPDATE returned error for lead=${leadId}: ${error.message}`,
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[contact-lead] markNotificationFailed threw for lead=${leadId}: ${message}`,
    )
  }
}

/** Pull a human-readable error out of a WhatsAppResult. */
function extractErrorMessage(result: {
  ok: false
  error?: string
  status?: number
}): string {
  if (result.error) return result.error
  if (result.status) return `WhatsApp send failed (HTTP ${result.status})`
  return "WhatsApp send failed (no error message)"
}

// ── WS-4B: operator-side inbox read + triage ────────────────────────────────
// A SEPARATE, db-only factory from createContactLeadService (the public-write
// path, which needs the WhatsApp service + config). The dashboard support
// inbox only reads and transitions CRM status, so it takes just the client.
// Access is gated by the contact_leads RLS policies (MANAGER+ select/update);
// a lower-role caller's authenticated client simply returns zero rows.

/** contact_leads columns are already snake_case + match ContactLeadRow 1:1,
 *  so the map is a typed projection (no camelCase conversion). Centralized so
 *  a future column add has a single edit point. */
const CONTACT_LEAD_COLUMNS =
  "id, name, email, company, reason, message, status, notification_status, notification_sent_at, whatsapp_send_id, ip_address, user_agent, created_at"

function mapContactLeadRow(row: Record<string, unknown>): ContactLeadRow {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    company: (row.company as string | null) ?? null,
    reason: row.reason as ContactLeadRow["reason"],
    message: row.message as string,
    status: row.status as ContactLeadStatus,
    notification_status:
      row.notification_status as ContactLeadRow["notification_status"],
    notification_sent_at: (row.notification_sent_at as string | null) ?? null,
    whatsapp_send_id: (row.whatsapp_send_id as string | null) ?? null,
    ip_address: (row.ip_address as string | null) ?? null,
    user_agent: (row.user_agent as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

/** Returned by the inbox service factory. */
export interface ContactLeadInboxService {
  getContactLeads(filters?: ContactLeadFilters): Promise<ContactLeadRow[]>
  getContactLeadById(id: string): Promise<ContactLeadRow | null>
  updateContactLeadStatus(
    id: string,
    status: ContactLeadStatus,
  ): Promise<ContactLeadRow>
}

export function createContactLeadInboxService(
  db: SupabaseClient,
): ContactLeadInboxService {
  return {
    async getContactLeads(filters = {}) {
      const { status, reason, search, page = 1, pageSize = 50 } = filters
      let query = db
        .from("contact_leads")
        .select(CONTACT_LEAD_COLUMNS)
        .order("created_at", { ascending: false })
      if (status) query = query.eq("status", status)
      if (reason) query = query.eq("reason", reason)
      if (search) {
        // PostgREST .or() parses commas/parens/quotes as filter grammar, so a
        // search like "Acme, Inc." would corrupt the filter. Escape backslashes
        // + quotes and wrap the WHOLE ilike pattern (incl. the % wildcards) in
        // PostgREST double-quotes so reserved chars are treated as the value.
        const escaped = search.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
        query = query.or(
          `name.ilike."%${escaped}%",email.ilike."%${escaped}%",company.ilike."%${escaped}%"`,
        )
      }
      const from = (page - 1) * pageSize
      query = query.range(from, from + pageSize - 1)
      const { data, error } = await query
      if (error) throw error
      return (data ?? []).map((r) => mapContactLeadRow(r as Record<string, unknown>))
    },

    async getContactLeadById(id) {
      const { data, error } = await db
        .from("contact_leads")
        .select(CONTACT_LEAD_COLUMNS)
        .eq("id", id)
        // maybeSingle (not single): single() raises PGRST116 on zero rows,
        // which would throw before the `| null` return contract can apply.
        .maybeSingle()
      if (error) throw error
      return data ? mapContactLeadRow(data as Record<string, unknown>) : null
    },

    async updateContactLeadStatus(id, status) {
      // Only the CRM `status` column is writable from the operator path —
      // notification_status is owned by the public-write service. A
      // non-destructive transition (new → contacted → closed), so no
      // withAudit wrapping (consistent with customer edits).
      const { data, error } = await db
        .from("contact_leads")
        .update({ status })
        .eq("id", id)
        .select(CONTACT_LEAD_COLUMNS)
        .single()
      if (error) throw error
      if (!data) throw new Error(`contact_leads row ${id} not found after update`)
      return mapContactLeadRow(data as Record<string, unknown>)
    },
  }
}
