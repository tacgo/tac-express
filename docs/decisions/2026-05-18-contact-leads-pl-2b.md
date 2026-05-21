# Decision — PL-2b contact-form lead capture (2026-05-18)

**Status:** Implemented (autonomous launch-readiness run).
**Issue:** PL-2b ([`product-launch-readiness.md`](../launch/product-launch-readiness.md) § C.1).
**Migration:** `supabase/migrations/20260518000001_contact_leads.sql`.

---

## A. The problem

The `/contact` form was stubbed. `apps/web/app/(public)/contact/contact-form.tsx:31` read:

```tsx
async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  setSubmitted(true)
  // Real implementation would post to /api/contact (TODO).
}
```

`apps/web/app/api/` did not exist. A visitor submitted, saw a success message, and **no lead reached the team**. For OD-P1 = sales-led B2B (the locked customer-journey model), this is the system's customer-journey terminator — shipping it stubbed would be deceptive UX.

## B. The contract

Capture-FIRST, notify-second. Two-phase write:

1. **INSERT** a row in `contact_leads` (initial state: `status='new'`, `notification_status='pending'`). If this fails → the route returns 500. The visitor sees a real error. **No fake success.**
2. **THEN** call the tracked WhatsApp service to send the team a notification. The lead row already exists — a notification-send failure **does NOT lose the lead**. The row's `notification_status` transitions to `'sent'` or `'failed'` and the route returns 200 either way.

This mirrors the **tracker-FIRST inversion** documented in [`whatsapp-tracked.service.ts`](../../packages/services/src/whatsapp-tracked.service.ts) (a delivery outage on the tracker doesn't block the underlying send). Here the inversion is dual-layer: the lead capture is system-of-record, the notification is best-effort observability.

## C. Why two tables (contact_leads vs whatsapp_sends)

`whatsapp_sends` tracks the WhatsApp **delivery attempt** (one row per attempt, retriable, rotates with retention). `contact_leads` tracks the **business relationship record** (one row per submission, CRM-shaped `status`, forever). The two have different lifecycles, retention requirements, and read-access scopes. Merging would force-fit two different concepts.

The link is the `contact_leads.whatsapp_send_id` FK. Today it's left NULL (the tracked-send return value doesn't surface the new row id, and adding that is its own refactor). Operators can correlate manually via phone + timestamp; making the link explicit is a clean follow-up.

## D. Auth / RLS posture

The `/api/contact` route handles **unauthenticated** visitors. RLS policies on both target tables (`contact_leads`, `whatsapp_sends`) require an authenticated session, so the route uses a NEW `createServiceRoleClient()` (added to `packages/database/src/client.ts`) that bypasses RLS on the server side.

`contact_leads` deliberately ships **no INSERT or DELETE policy**:
- No anon-role INSERT policy = no direct PostgREST `POST` bypassing the route's rate limit + zod validation + honeypot.
- No DELETE policy = leads are append-only.
- SELECT/UPDATE policies for MANAGER+ only — same posture as `whatsapp_sends_select_admin`.

## E. Defense in depth (route layer)

In order of execution inside `apps/web/app/api/contact/route.ts`:

1. **Rate limit by IP** — Upstash sliding window, 5 submissions / 10 min / IP. Tighter than the general public-API limit because contact forms are commonly abused.
2. **Honeypot field** — hidden `<input name="website">` outside the viewport, `aria-hidden`, `tabIndex={-1}`. Bots fill it; humans don't see it. On a hit, the server returns 200 silently — the bot believes it succeeded and doesn't probe further; no lead row is written.
3. **Zod validation** — length caps matching the table CHECK constraints, enum reason set, email shape.
4. **Service-layer capture** — `submitContactLead` (above).

These four are independent. Each closes a different attack surface.

## F. Notification channel — WhatsApp (OD-P8)

OD-P8 = WhatsApp via the existing tracked WhatsApp service. The lead service calls `whatsapp.sendTemplate(…)` with:

- **`phone`** — `process.env.WPBOX_LEAD_NOTIFICATION_PHONE` (the team's inbox number, E.164 digits).
- **`templateName`** — `WPBOX_LEAD_TEMPLATE_NAME`, default `"lead_notification"`.
- **`templateLanguage`** — `WPBOX_LEAD_TEMPLATE_LANGUAGE`, default `"en"`.
- **`components`** — one `BODY` component with four positional text parameters: reason label / name / email / message excerpt (truncated to 200 chars).

A template was chosen over a free-form `sendmessage` because free-form is gated by WhatsApp's 24-hour customer-service window — the team's notification phone may not have messaged the business number in 24h, in which case the send silently fails. A template delivers anytime.

**Template approval is owner-side** — Meta gates new templates through the WhatsApp Business Manager. Until approved, every send returns `{ ok: false }` and `notification_status` lands `failed`. **Critical:** the LEAD IS STILL CAPTURED. Manual follow-up via the leads table works immediately.

## G. Why we don't store the WhatsApp send's row id on the lead

The tracked `sendTemplate` returns a `WhatsAppResult`, not the new `whatsapp_sends` row id. Surfacing the id requires extending the tracked-service contract. Today `contact_leads.whatsapp_send_id` is always NULL — operators can correlate via phone + timestamp. Explicit linkage is a clean follow-up; the column is already in place to make that change a single-file edit.

## H. Why `WPBOX_LEAD_NOTIFICATION_PHONE` defaults to "not configured" instead of throwing

If the env var is unset in production, throwing at submit-time would lose the lead. Instead, the service treats "no phone configured" as a **notification-misconfiguration** state: lead captures normally, `notification_status` lands `failed`, the operator sees the row in the leads list with a console.error trail saying why. The lead is preserved.

## I. What this PR does NOT do (filed for later)

- **Operator-side leads UI** — there's no `/ops-console/leads` page yet. Leads land in the table; they're queryable by anyone with the MANAGER+ role + the Supabase SQL console. Building a real triage view is its own session.
- **Lead-status transition API** — `status` defaults to `'new'`; transitions to `'contacted'` / `'closed'` are not exposed via UI or API yet.
- **Linking `whatsapp_send_id`** — see § G.
- **Automatic retry of failed lead notifications** — `whatsapp-tracked.service.ts` has retry capability but the operator-facing trigger for *lead-class* failed sends doesn't exist; same pattern as #143 (background WhatsApp retry job) which is POST-LAUNCH.
- **Email fallback** — OD-P8 locks the channel to WhatsApp only.

## J. Verification

- **Migration:** `pnpm supabase db reset` (locally) or the `Migrations apply on fresh DB` CI gate.
- **Typecheck / lint:** standard quality gates.
- **Manual:** with all WPBox + lead env vars set, submit the form on `/contact`. Expected: success state shown, `contact_leads` row written, WhatsApp notification arrives on the configured number.
- **End-to-end:** the lead capture path works WITHOUT the template (lead row written + `notification_status='failed'`). Test that path by submitting with `WPBOX_LEAD_NOTIFICATION_PHONE=""`.
