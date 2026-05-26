# WS-4B: Dashboard Support Inbox — Scope Document

**Date:** 2026-05-26
**Branch:** to be created from `main` after this doc is approved
**Author:** tacgo
**Status:** PENDING OWNER REVIEW — do not execute until approved

---

## Executive Summary

WS-4B is **substantially complete**. The inventory below confirms that the
schema, RLS, full service layer, all hooks, the dashboard inbox UI, the public
contact form, and the API route are all production-deployed and wired end-to-end.
The remaining work is narrow:

1. **One genuine gap:** In-app notification bell entry is not created when a
   new lead is submitted. WhatsApp is the only notify channel today.
2. **One explicit design decision (not a gap):** Status transitions
   (`new → contacted → closed`) are not written to `audit_logs`. This is
   intentional per the service comment and is consistent with customer edits.
   Re-opening this requires a deliberate product call, not just code.
3. **One verification task:** The full path (public form → DB → dashboard inbox
   → triage) has never been exercised against the production environment in a
   structured end-to-end test. That is the highest-value remaining task.

Estimated remaining work: **one focused session** (~3–5 hours).

---

## Phase 0 — Inventory (this document)

### 0.1 Schema

Table `public.contact_leads` is deployed in production (migration
`20260518000001_contact_leads.sql`, confirmed live at run 26180576599).

**Columns confirmed in production:**

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | `gen_random_uuid()` PK |
| `name` | text NOT NULL | |
| `email` | text NOT NULL | |
| `company` | text NULL | |
| `reason` | text NOT NULL | CHECK enum |
| `message` | text NOT NULL | |
| `status` | text NOT NULL | DEFAULT `'new'` |
| `notification_status` | text NOT NULL | DEFAULT `'pending'` |
| `notification_sent_at` | timestamptz NULL | |
| `whatsapp_send_id` | uuid NULL | FK to whatsapp_sends |
| `ip_address` | text NULL | |
| `user_agent` | text NULL | |
| `created_at` | timestamptz NOT NULL | DEFAULT `now()` |

**Indexes confirmed in production:**

| Index | Definition |
|-------|-----------|
| `contact_leads_pkey` | btree(id) UNIQUE |
| `contact_leads_created_at_idx` | btree(created_at DESC) |
| `contact_leads_status_idx` | btree(status) |
| `contact_leads_notification_failed_idx` | PARTIAL btree(created_at DESC) WHERE notification_status = 'failed' |

**RLS confirmed in production:**

| Policy | Command | Condition |
|--------|---------|-----------|
| `contact_leads_select_admin` | SELECT | `auth.uid() IS NOT NULL AND get_user_role() IN ('SUPER_ADMIN','ADMIN','MANAGER')` |
| `contact_leads_update_admin` | UPDATE | same |

RLS is enabled (`relrowsecurity = true`). No `relforcerowsecurity` — service-role
client (used by the `/api/contact` route) bypasses RLS correctly. No INSERT
policy exists; that is intentional: public inserts arrive via the server-side API
route which runs with the service-role key, not an anon browser client.

**Schema verdict: COMPLETE. No migration needed.**

---

### 0.2 Service Layer

**`packages/services/src/contact-lead.service.ts`** — fully built, two factories:

- `createContactLeadService(db, whatsapp, config)` — public-write path.
  Inserts the lead row first, then attempts WhatsApp template notification
  best-effort. A notification failure does NOT lose the lead.
  Exported via `packages/services/src/server.ts` as
  `createContactLeadServerService()` (service-role client, env-var config).

- `createContactLeadInboxService(db)` — operator-read/triage path.
  Provides `getContactLeads(filters)`, `getContactLeadById(id)`,
  `updateContactLeadStatus(id, status)`. No WhatsApp dependency.

**`packages/services/src/hooks/use-contact-leads.ts`** — fully built:
- `useContactLeads(filters)` — list query, staleTime 60s, RLS-gated
- `useContactLead(id)` — single-record query
- `useUpdateContactLeadStatus()` — mutation with query invalidation

**`packages/services/src/__tests__/contact-lead.service.test.ts`** — exists.

**Service layer verdict: COMPLETE.**

---

### 0.3 Dashboard UI

**`apps/dashboard/app/ops-console/support/page.tsx`** — route exists.

**`apps/dashboard/app/ops-console/support/support-inbox-live.tsx`** — fully
wired to real data:
```tsx
const { data = [], isLoading, isError } = useContactLeads({})
const update = useUpdateContactLeadStatus()
// delegates to <V7ContactLeads leads={data} onStatusChange={...} />
```

**`packages/ui/src/components/composed/support/v7-contact-leads.tsx`** —
full-featured Violet Grid v7 component:
- Status tab filtering (all / new / contacted / closed)
- Client-side search by name, email, company
- Expandable row detail with full message body + company
- Inline triage select (`new → contacted → closed`) bound to `onStatusChange`
- Loading skeleton (`SkeletonTable`) and error/empty states
- `updatingId` prop disables the select while mutation is in-flight

**Dashboard UI verdict: COMPLETE.**

---

### 0.4 Public Contact Form (`apps/web`)

**`apps/web/app/(public)/contact/page.tsx`** — rendered at `/contact`. Full
page with hero section, contact sidebar (phone / email / HQ address), and the
`<ContactForm />` component.

**`apps/web/app/(public)/contact/contact-form.tsx`** — client component using
shadcn Input / Textarea / Select primitives. Features:
- Honeypot `website` field (hidden, `tabIndex=-1`, `aria-hidden`)
- Posts to `/api/contact` as JSON
- Shows success state ("message received") on 200
- Shows rate-limit and server-error copy on failure
- Reason select: sales / support / partner / press / other

**`apps/web/app/api/contact/route.ts`** — POST handler:
- Rate limit: 5 submissions / 10 min by IP (`apps/web/lib/rate-limit.ts`)
- Zod validation with length caps matching DB CHECK constraints
- Honeypot check: returns `{ ok: true }` silently on bot hit
- Delegates to `createContactLeadServerService()` (service-role client)

**Public form verdict: COMPLETE.**

---

### 0.5 Notification + Audit Integration

| Integration | Status | Notes |
|-------------|--------|-------|
| WhatsApp template on new lead | **Built** | Via `WPBOX_LEAD_NOTIFICATION_PHONE` env var; marks `notification_status` sent/failed on the row |
| In-app notification bell entry | **MISSING** | No `notifications` table entry is created when a lead is captured. Ops staff have no dashboard signal for a new lead without checking the inbox manually. |
| `audit_logs` entry on status change | **Not built (intentional)** | The service explicitly omits `withAudit` for `new → contacted → closed` transitions, documented as consistent with customer edits. Re-opening is a product decision, not a code gap. |

---

## Phase 0 Gap Summary

| Gap | Severity | Effort |
|-----|----------|--------|
| In-app notification bell on new lead | Medium — ops staff won't know a lead arrived unless they check the support inbox | ~2 hours |
| E2E path never exercised end-to-end in production | High — the integration is built but unverified | ~1 hour |

Everything else is already shipped.

---

## Revised Phase Plan

Because Phases 1–3 and 5 are fully complete, the original phase template
collapses to:

### PHASE 1 — In-App Notification on New Lead Capture

**What:** When `createContactLeadService.submitContactLead` succeeds (the lead
row is durably inserted), create a row in the `notifications` table for any
active MANAGER+ session. This gives ops staff a badge on the notification bell
without requiring them to poll the support inbox.

**Where:** `packages/services/src/contact-lead.service.ts` —
`createContactLeadService`, after `markNotificationSent/Failed`, before the
`return { ok: true }`. Uses the service-role `db` (same client already in
scope). The notification insert is best-effort (wrapped in try/catch, same
posture as WhatsApp).

**Notification payload:**
```ts
{
  type: "info",
  title: "New contact lead",
  message: `${input.name} (${REASON_LABELS[input.reason]}) submitted a contact form.`,
  link: "/ops-console/support",
}
```

**Scope:** 1 file changed (`contact-lead.service.ts`), 1 test updated
(`contact-lead.service.test.ts`). No schema change — `notifications` table
exists and accepts inserts from service role.

**Files:**
- `packages/services/src/contact-lead.service.ts` (~15 lines added)
- `packages/services/src/__tests__/contact-lead.service.test.ts` (~20 lines added)

**Estimated commit count:** 1

---

### PHASE 2 — E2E Verification

**What:** Structured end-to-end exercise of the complete path in production
(or staging if available). Not automated at this stage — a manual run-book
executed by the owner.

**Run-book:**

1. Navigate to `/contact` on `apps/web` (production URL).
2. Submit a lead with reason = "Sales", name = "Test Lead [timestamp]".
3. Verify:
   - HTTP 200 response with `{ ok: true }` in network tab.
   - Row appears in `contact_leads` table with `status = 'new'`.
   - If `WPBOX_LEAD_NOTIFICATION_PHONE` is configured: `notification_status = 'sent'`.
   - If not configured: `notification_status = 'failed'` with console log.
4. Open `/ops-console/support` in the dashboard.
5. Verify the lead appears under the "new" tab.
6. Expand the row — confirm name, email, reason, message, company are correct.
7. Change status to "contacted" via the inline select.
8. Verify the row updates to `contacted` in the DB and the UI.
9. (After Phase 1) Verify the notification bell shows a new-lead notification.

**Acceptance criteria:** All 9 steps pass without errors or console warnings.

---

## Non-Goals

- No Body 3 polish / aesthetic work. The Violet Grid v7 shell is final.
- No changes to the design system.
- No support ticket threading, email integration, reply-from-dashboard, SLA timers, or lead scoring.
- No audit log entry for status transitions — this is a deliberate design decision. Reversing it requires a product call and a separate scope.
- No broader CRM features beyond the three-state triage (new / contacted / closed).

---

## Estimated Scope

| Phase | Files | Lines (net) | Commits | Session |
|-------|-------|-------------|---------|---------|
| Phase 1 — notification bell | 2 | +35 | 1 | 1 |
| Phase 2 — E2E verification | 0 (run-book only) | 0 | 0 | 1 |

WS-4B is a **single session** of focused work, not the 2–3 sessions originally
estimated. The design refresh arc (ops-shell-rebuild) was the heavy lift;
the feature was mostly built in parallel with it.

---

## Open Questions Before Phase 1 Execution

1. **Notification targeting:** The `notifications` table likely has a `user_id`
   FK. Should the new-lead notification be broadcast to all MANAGER+ users, or
   only to a specific on-call staff member? The current notification service
   may only support per-user inserts. Confirm the `notifications` schema before
   implementing.

2. **WhatsApp template approval:** `WPBOX_LEAD_TEMPLATE_NAME` (default
   `lead_notification`) requires Meta approval before live sends succeed. Is
   the template submitted? If not, all leads will have `notification_status =
   'failed'` until approval comes through — the in-app notification bell
   (Phase 1) is the practical fallback that makes the inbox usable right now.

3. **Env var status:** Is `WPBOX_LEAD_NOTIFICATION_PHONE` set in the production
   Vercel environment? This determines whether the E2E run-book in Phase 2 can
   verify the WhatsApp path or only the lead-capture path.
