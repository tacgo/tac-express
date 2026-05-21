-- Migration: contact_leads — durable capture of public contact-form submissions
--
-- Issue tracker: PL-2b (docs/launch/product-launch-readiness.md § C.1) — the
--                contact form was stubbed (apps/web/app/(public)/contact/
--                contact-form.tsx:31 had `setSubmitted(true)` + a TODO and no
--                /api/contact route existed). Owner answer OD-P1 = sales-led
--                B2B means the customer journey terminates at this form; it
--                must durably capture leads and notify the team.
-- Decision doc:  docs/decisions/2026-05-18-contact-leads-pl-2b.md
-- Predecessor:   20260517000001_whatsapp_sends_table.sql
--
-- Background
-- ----------
-- The /contact form fields (per packages/ui/src/.../contact-form pattern AND
-- apps/web/app/(public)/contact/contact-form.tsx) are: name (required),
-- email (required), company (optional), reason (5-value enum), message
-- (required). The form is the single load-bearing customer-journey
-- terminator for sales-led B2B (OD-P1) — every submission must reach the
-- team OR be replayable from the system of record if a notification fails.
--
-- Capture-FIRST, notify-second
-- ----------------------------
-- The application-layer contract (packages/services/src/contact-lead.service.
-- ts) is:
--   1. INSERT a `new` row with notification_status='pending'. If this fails,
--      the route returns 500 — the lead is NOT captured, so reporting a
--      success would be deceptive UX.
--   2. THEN call the tracked WhatsApp service. The lead row already exists,
--      so a notification-send failure does NOT lose the lead — the row
--      transitions to notification_status='failed' and stays queryable for
--      the operator to follow up manually. (Same shape as the whatsapp_sends
--      tracker-FIRST contract — see 20260517000001 header.)
--   3. On success: UPDATE notification_status='sent' + notification_sent_at.
--
-- Why a separate table from whatsapp_sends
-- ----------------------------------------
-- whatsapp_sends tracks the WhatsApp DELIVERY ATTEMPT (one row per attempt;
-- retriable). contact_leads tracks the BUSINESS-RELATIONSHIP RECORD (one row
-- per submitted lead; `status` tracks CRM stage: new → contacted → closed).
-- The two have different lifecycles, different retention requirements
-- (whatsapp_sends rotates; leads are forever), and different read-access
-- scopes. Merging them would force-fit two different concepts.
--
-- The link between a lead and the notification it triggered is the
-- whatsapp_send_id column. NULL until the WhatsApp send succeeds far enough
-- to produce a tracker row id; populated thereafter. If the WhatsApp send
-- never produced a tracker row (env misconfiguration / catastrophic
-- failure), whatsapp_send_id stays NULL and notification_status='failed'
-- carries the error.
--
-- RLS posture
-- -----------
-- This is a PUBLIC-FORM-INSERT surface. Three distinct access scopes:
--
--   INSERT — NO POLICY. The /api/contact route uses the service-role
--            Supabase client (createServiceRoleClient — server-only) to
--            insert. No anon-role insert policy exists; that closes the
--            attack surface of direct PostgREST INSERTs that would bypass
--            rate-limit / honeypot / zod validation in the route.
--   SELECT — SUPER_ADMIN / ADMIN / MANAGER. The leads contain PII (name,
--            email, message body) — same posture as whatsapp_sends.raw_
--            response, scoped to the team roles that handle sales follow-up.
--   UPDATE — SUPER_ADMIN / ADMIN / MANAGER, but only for the CRM-status
--            transition (status / notes columns; notification_status is
--            written exclusively by the service layer via service-role).
--            Application-layer enforcement of "which columns" is in
--            packages/services/src/contact-lead.service.ts.
--   DELETE — NO POLICY. A contact lead is never deleted (audit-style).
--
-- Idempotency
-- -----------
-- CREATE TABLE / INDEX / POLICY use IF NOT EXISTS. The verification block
-- asserts column presence, CHECK constraints, RLS state, and policy presence
-- — read-only against pg_catalog. Safe to re-apply.
--
-- Forward-only rollback
-- ---------------------
-- contact_leads is append-mostly. A backward migration would DROP the table
-- and lose every captured lead — the customer relationships themselves.
-- We do NOT ship a reverse migration.

-- ============================================================================
-- STEP 1 — Create the table
-- ============================================================================

create table if not exists public.contact_leads (
  id                       uuid primary key default gen_random_uuid(),
  -- Form fields (from apps/web/app/(public)/contact/contact-form.tsx)
  name                     text not null
                           check (char_length(name) between 1 and 200),
  email                    text not null
                           check (char_length(email) between 3 and 320),
  company                  text
                           check (company is null or char_length(company) <= 200),
  reason                   text not null
                           check (reason = any (array['sales','support','partner','press','other'])),
  message                  text not null
                           check (char_length(message) between 1 and 4000),
  -- CRM stage. Initial state is 'new'; team transitions to 'contacted' once
  -- a follow-up has begun; 'closed' marks the lead resolved (sale won/lost
  -- or non-actionable). Application layer doesn't enforce transitions today.
  status                   text not null default 'new'
                           check (status = any (array['new','contacted','closed'])),
  -- Notification delivery state. 'pending' is the initial state; the service
  -- layer transitions to 'sent' or 'failed' after the WhatsApp call returns.
  -- A failure here does NOT lose the lead — the row exists.
  notification_status      text not null default 'pending'
                           check (notification_status = any (array['pending','sent','failed'])),
  notification_sent_at     timestamptz,
  -- Link to the whatsapp_sends row produced by the lead notification.
  -- NULL when the WhatsApp call never produced a tracker row (catastrophic
  -- failure / env misconfiguration). The retention contract on whatsapp_
  -- sends is not synced — if a whatsapp_sends row is archived/dropped, this
  -- FK goes to NULL via the ON DELETE SET NULL clause.
  whatsapp_send_id         uuid references public.whatsapp_sends(id) on delete set null,
  -- Honeypot + spam-tracing metadata. The route handler reads x-forwarded-
  -- for / user-agent and persists them for forensic review.
  ip_address               text,
  user_agent               text,
  created_at               timestamptz not null default now(),
  -- Cross-column CHECK: notification_status='sent' must carry notification_
  -- sent_at; 'pending' must not. 'failed' may or may not (timing of the
  -- failure varies). Catches the "marked sent but no timestamp" silent bug.
  constraint contact_leads_notification_consistency_check
    check (
      (notification_status = 'pending' and notification_sent_at is null)
      or
      (notification_status = 'sent' and notification_sent_at is not null)
      or
      (notification_status = 'failed')
    )
);

comment on table public.contact_leads is
  'Durable capture of public /contact form submissions (PL-2b). One row per '
  'submission. Service layer (packages/services/src/contact-lead.service.ts) '
  'writes the row FIRST, then attempts the WhatsApp notification — a '
  'notification failure does not lose the lead. PII surface: name + email + '
  'message; SELECT scoped to MANAGER+.';

comment on column public.contact_leads.reason is
  'Form-reason enum mirroring REASONS in apps/web/app/(public)/contact/'
  'contact-form.tsx. Application-layer zod validation also enforces this '
  'set.';

comment on column public.contact_leads.status is
  'CRM stage. new = just-submitted (initial); contacted = team has begun '
  'follow-up; closed = sale won/lost or non-actionable. Application layer '
  'does not enforce transitions today.';

comment on column public.contact_leads.notification_status is
  'WhatsApp notification delivery state. pending = initial; sent = the '
  'tracked WhatsApp send succeeded; failed = the WhatsApp call returned an '
  'error or threw. A failure does not lose the lead — the row persists for '
  'manual follow-up.';

comment on column public.contact_leads.whatsapp_send_id is
  'FK to the whatsapp_sends row produced by the notification. NULL when the '
  'send never produced a tracker row (env misconfiguration / catastrophic '
  'failure).';

-- ============================================================================
-- STEP 2 — Indexes
-- ============================================================================
-- created_at desc — operator-triage view: "most recent leads first".
-- status — CRM-stage filter (e.g., "all leads in 'new' state").
-- notification_status='failed' partial — "leads whose notification failed"
--   (the operator action: send the lead a manual ack so they're not ghosted).

create index if not exists contact_leads_created_at_idx
  on public.contact_leads (created_at desc);

create index if not exists contact_leads_status_idx
  on public.contact_leads (status);

create index if not exists contact_leads_notification_failed_idx
  on public.contact_leads (created_at desc)
  where notification_status = 'failed';

-- ============================================================================
-- STEP 3 — RLS
-- ============================================================================

alter table public.contact_leads enable row level security;

do $$
begin
  -- SELECT: MANAGER+ only (PII: name, email, message body).
  -- Mirrors whatsapp_sends_select_admin.
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.contact_leads'::regclass
      and polname = 'contact_leads_select_admin'
  ) then
    create policy contact_leads_select_admin on public.contact_leads
      for select using (
        auth.uid() is not null
        and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER'])
      );
  end if;

  -- UPDATE: MANAGER+ only. The service layer further constrains which
  -- columns operators can write (status / no notification_* mutation from
  -- the operator path).
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.contact_leads'::regclass
      and polname = 'contact_leads_update_admin'
  ) then
    create policy contact_leads_update_admin on public.contact_leads
      for update using (
        auth.uid() is not null
        and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER'])
      );
  end if;

  -- NO INSERT POLICY by design. The /api/contact route uses the service-role
  -- client; an anon-role insert policy would expose a raw PostgREST INSERT
  -- endpoint bypassing the route's validation / rate-limit / honeypot.
  --
  -- NO DELETE POLICY. Leads are append-only — never deleted.
end
$$;

comment on policy contact_leads_select_admin on public.contact_leads is
  'SELECT scoped to MANAGER+ (mirrors whatsapp_sends_select_admin). The '
  'leads contain PII; only the team roles that handle sales follow-up read.';

comment on policy contact_leads_update_admin on public.contact_leads is
  'UPDATE scoped to MANAGER+ for the CRM-status transition (status column). '
  'Application-layer enforcement limits which columns mutate; the policy '
  'guards the role boundary.';

-- ============================================================================
-- STEP 4 — REVOKE PUBLIC + GRANT authenticated (advisor posture)
-- ============================================================================
-- Mirrors the project-wide pattern from 20260515000004_revoke_public_grant_
-- authenticated.sql — PostgREST shouldn't expose the table to the anon role.
-- The service-role client (server-only) bypasses these GRANTs.

revoke all on public.contact_leads from public;
grant select, update on public.contact_leads to authenticated;

-- ============================================================================
-- STEP 5 — Verification
-- ============================================================================

do $$
declare
  expected_columns text[] := array[
    'id', 'name', 'email', 'company', 'reason', 'message',
    'status', 'notification_status', 'notification_sent_at',
    'whatsapp_send_id', 'ip_address', 'user_agent', 'created_at'
  ];
  expected_policies text[] := array[
    'contact_leads_select_admin', 'contact_leads_update_admin'
  ];
  col text;
  pol text;
  rls_enabled boolean;
begin
  -- Column presence
  foreach col in array expected_columns loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'contact_leads'
        and column_name = col
    ) then
      raise exception 'contact_leads migration: missing column "%"', col;
    end if;
  end loop;

  -- Policy presence
  foreach pol in array expected_policies loop
    if not exists (
      select 1 from pg_policy
      where polrelid = 'public.contact_leads'::regclass
        and polname = pol
    ) then
      raise exception 'contact_leads migration: missing policy "%"', pol;
    end if;
  end loop;

  -- RLS state
  select c.relrowsecurity into rls_enabled
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'contact_leads';

  if not rls_enabled then
    raise exception 'contact_leads migration: RLS is NOT enabled';
  end if;

  raise notice 'contact_leads migration: verified (% columns, % policies, RLS enabled)',
    array_length(expected_columns, 1), array_length(expected_policies, 1);
end
$$;
