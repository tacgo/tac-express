import {
  createServerClient,
  createServiceRoleClient,
} from "@workspace/database/client"
import { createContactLeadService, type ContactLeadService } from "./contact-lead.service"
import { createDashboardService } from "./dashboard.service"
import { createShipmentService } from "./shipment.service"
import { createManifestService } from "./manifest.service"
import { createInvoiceService } from "./invoice.service"
import { createExceptionService } from "./exception.service"
import { createCustomerService } from "./customer.service"
import { createAnalyticsService } from "./analytics.service"
import { createAdminService } from "./admin.service"
import {
  createTrackedWhatsAppServiceFromEnv,
  type TrackedWhatsAppService,
} from "./whatsapp-tracked.service"

type CookieStore = Parameters<typeof createServerClient>[0]

export function createDashboardServerService(cookieStore: CookieStore) {
  return createDashboardService(createServerClient(cookieStore))
}

export function createShipmentServerService(cookieStore: CookieStore) {
  return createShipmentService(createServerClient(cookieStore))
}

export function createManifestServerService(cookieStore: CookieStore) {
  return createManifestService(createServerClient(cookieStore))
}

export function createInvoiceServerService(cookieStore: CookieStore) {
  return createInvoiceService(createServerClient(cookieStore))
}

export function createExceptionServerService(cookieStore: CookieStore) {
  return createExceptionService(createServerClient(cookieStore))
}

export function createCustomerServerService(cookieStore: CookieStore) {
  return createCustomerService(createServerClient(cookieStore))
}

export function createAnalyticsServerService(cookieStore: CookieStore) {
  return createAnalyticsService(createServerClient(cookieStore))
}

export function createAdminServerService(cookieStore: CookieStore) {
  return createAdminService(createServerClient(cookieStore))
}

/**
 * Tracked WhatsApp service bound to the per-request Supabase client.
 *
 * Wraps createWhatsAppService with whatsapp_sends delivery-tracking writes
 * (see packages/services/src/whatsapp-tracked.service.ts header + the
 * PHASE-0 decision doc at docs/decisions/2026-05-17-whatsapp-sends-mechanism.md
 * for the full contract). The Supabase client honours the caller's RLS —
 * INSERT/UPDATE on whatsapp_sends require role ∈ SUPER_ADMIN / ADMIN /
 * MANAGER / INVOICE / FINANCE_STAFF.
 *
 * The route handler at apps/dashboard/app/api/whatsapp/send-invoice/route.ts
 * is the single consumer today; it passes invoiceId + userId on each send
 * so the resulting whatsapp_sends row is linked back to the invoice and
 * the operator.
 */
export function createTrackedWhatsAppServerService(
  cookieStore: CookieStore,
): TrackedWhatsAppService {
  return createTrackedWhatsAppServiceFromEnv(createServerClient(cookieStore))
}

/**
 * Public-form contact-lead service (PL-2b).
 *
 * Constructed with the SERVICE-ROLE Supabase client because the /api/contact
 * route handles UNAUTHENTICATED visitors — RLS would otherwise block both
 * the `contact_leads` INSERT and the `whatsapp_sends` INSERT that the
 * tracked WhatsApp service performs. The service-role client bypasses RLS
 * for this server-only path; visitor input is validated with zod at the
 * route + a honeypot guard before the service is invoked.
 *
 * Lead-recipient phone / template name + language are env-derived:
 *   WPBOX_LEAD_NOTIFICATION_PHONE   (required for live notifications)
 *   WPBOX_LEAD_TEMPLATE_NAME        (optional; default "lead_notification")
 *   WPBOX_LEAD_TEMPLATE_LANGUAGE    (optional; default "en")
 *
 * If `WPBOX_LEAD_NOTIFICATION_PHONE` is unset, the lead is still captured
 * and the row's notification_status transitions to 'failed' with a clear
 * marker — the system NEVER loses a lead just because the notification
 * channel is misconfigured.
 */
export function createContactLeadServerService(): ContactLeadService {
  const db = createServiceRoleClient()
  const whatsapp = createTrackedWhatsAppServiceFromEnv(db)
  return createContactLeadService(db, whatsapp, {
    notificationPhone: process.env.WPBOX_LEAD_NOTIFICATION_PHONE?.trim() || null,
    templateName:
      process.env.WPBOX_LEAD_TEMPLATE_NAME?.trim() || "lead_notification",
    templateLanguage:
      process.env.WPBOX_LEAD_TEMPLATE_LANGUAGE?.trim() || "en",
  })
}
