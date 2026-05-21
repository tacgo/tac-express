/**
 * Contact-lead types (PL-2b).
 *
 * The /contact form on apps/web posts to /api/contact, which captures the
 * lead in the contact_leads table and notifies the team via the tracked
 * WhatsApp service. These types mirror the table columns + the route's
 * request/response shapes.
 *
 * Schema source of truth: supabase/migrations/20260518000001_contact_leads.sql.
 */

/** Reason categories the contact form offers. Mirrors the form's REASONS
 *  constant + the CHECK constraint on contact_leads.reason. */
export const CONTACT_LEAD_REASONS = [
  "sales",
  "support",
  "partner",
  "press",
  "other",
] as const

export type ContactLeadReason = (typeof CONTACT_LEAD_REASONS)[number]

/** CRM stage of the lead. */
export const CONTACT_LEAD_STATUSES = ["new", "contacted", "closed"] as const
export type ContactLeadStatus = (typeof CONTACT_LEAD_STATUSES)[number]

/** WhatsApp notification delivery state for the lead. */
export const CONTACT_LEAD_NOTIFICATION_STATUSES = [
  "pending",
  "sent",
  "failed",
] as const
export type ContactLeadNotificationStatus =
  (typeof CONTACT_LEAD_NOTIFICATION_STATUSES)[number]

/** Public form input (the visitor-side payload, post-route-validation).
 *  The honeypot field is intentionally NOT in this type — the route layer
 *  inspects the honeypot before any service call, so by the time input
 *  reaches the service it is guaranteed-not-a-bot. */
export interface ContactLeadFormInput {
  name: string
  email: string
  /** Optional. Empty / whitespace-only is normalized to NULL in the
   *  service layer; the column stays canonical (no mixed "" / NULL). */
  company?: string
  reason: ContactLeadReason
  message: string
}

/** A row as stored. Returned to operator-side reads (NOT to the public form). */
export interface ContactLeadRow {
  id: string
  name: string
  email: string
  company: string | null
  reason: ContactLeadReason
  message: string
  status: ContactLeadStatus
  notification_status: ContactLeadNotificationStatus
  notification_sent_at: string | null
  whatsapp_send_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

/** Outcome returned by the service-layer `submitContactLead`. */
export type ContactLeadSubmissionResult =
  | { ok: true; id: string; notificationStatus: ContactLeadNotificationStatus }
  | { ok: false; error: string }

/** Filters for the operator-side inbox read (WS-4B dashboard support inbox).
 *  All optional; omitted fields are not constrained. `search` matches the
 *  name / email / company columns (ilike). Pagination is 1-indexed. */
export interface ContactLeadFilters {
  status?: ContactLeadStatus
  reason?: ContactLeadReason
  search?: string
  page?: number
  pageSize?: number
}
