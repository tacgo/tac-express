-- Migration: whatsapp_sends — WhatsApp delivery audit table + retry chain
--
-- Issue tracker: #102 (Sprint 2 Observability, whatsapp_sends line; risk-rank #2
--                       per docs/audits/2026-05-16-102-revalidation.md § 6 / § 8)
-- Decision doc:  docs/decisions/2026-05-17-whatsapp-sends-mechanism.md
-- Predecessor:   20260516000002_audit_logs_check_manifest_shipment_remove.sql
--
-- Background
-- ----------
-- WhatsApp sends today (apps/dashboard/app/api/whatsapp/send-invoice/route.ts
-- → packages/services/src/whatsapp.service.ts) produce no auditable trail.
-- A delivery failure (network error, 4xx, 5xx, silent rejection via
-- `message_wamid: null`) is silent and unrecoverable — the operator sees an
-- error in the UI, but there is no DB row to query later, no retry
-- target, no forensic record of `raw_response` for the silent-failure case
-- that motivated this table.
--
-- This migration creates `public.whatsapp_sends`, enables RLS with PII-
-- appropriate scoping, and indexes it for the retry-path query
-- (`WHERE status = 'failed' AND completed_at > now() - 7 days`) and the
-- per-invoice history query (`WHERE invoice_id = $1`).
--
-- Row model: append-only-per-attempt
-- ----------------------------------
-- Each call to sendMessage / sendTemplate inserts exactly one row. That row
-- begins as status='queued' and receives ONE UPDATE on completion to land
-- status='sent' or status='failed'. A retry of a failed send inserts a NEW
-- row with attempt_no = previous + 1 and original_send_id = previous.id —
-- prior attempts are never overwritten.
--
-- See the decision doc for the full A-E PHASE-0 reasoning, including why
-- this is NOT modeled as one-row-with-mutating-status (lose attempt
-- history) and why it does NOT use the destructive-op-registry / withAudit
-- machinery (sends are not destructive ops).
--
-- What this migration does NOT do
-- -------------------------------
--   - Does NOT extend `DESTRUCTIVE_OP_REGISTRY` or
--     `audit_logs_destructive_action_check`. A WhatsApp send is not a
--     destructive operation; force-fitting it would corrupt the
--     destructive-op-registry sentinel's meaning. The decision doc
--     § D documents this verdict.
--   - Does NOT add a webhook callback / `delivered` status. The Meta
--     delivery-confirmation surface is a separate future addition.
--   - Does NOT add an `original_send_id` cycle constraint. A self-FK chain
--     is policed at the application layer (attempt_no enforces ordering;
--     the wrapper only sets original_send_id when retrying a failed row).
--   - Does NOT cap raw_response at the column level. The wrapper truncates
--     to 2 KB before INSERT — this is application policy, not schema
--     enforcement, so a future relaxation of the cap doesn't require a
--     migration.
--
-- Idempotency
-- -----------
-- The CREATE TABLE / CREATE INDEX / CREATE POLICY statements all use
-- IF NOT EXISTS. The verification block at the bottom RAISE NOTICE on
-- success and RAISE EXCEPTION on assertion failure. Safe to re-apply.
--
-- Forward-only rollback
-- ---------------------
-- whatsapp_sends is append-mostly (one UPDATE per row, on completion).
-- A backward migration would DROP the table and lose every delivery
-- record. We do NOT ship a reverse migration. If a rollback is genuinely
-- needed:
--   1. Pause the wrapper (revert the route to direct createWhatsAppService).
--   2. Export the table contents.
--   3. Write a new forward migration that drops the table.
-- The cost of the table existing-but-unused is negligible (one extra
-- table); the cost of losing data is real.
--
-- Verification
-- ------------
-- The migrations-fresh-apply CI gate runs this migration against a clean
-- DB. The verification block at the bottom asserts column presence, CHECK
-- constraints, RLS state, and policy presence — all read-only against
-- pg_catalog / information_schema. After apply, get_advisors should
-- report no new advisories on whatsapp_sends (the SELECT/INSERT/UPDATE
-- policies all gate on auth.uid() + get_user_role(); no public exposure).
--
-- A cross-package application-layer sentinel asserting "no INSERT or
-- UPDATE on whatsapp_sends outside packages/services/src/whatsapp-tracked.
-- service.ts" can be added in a follow-up PR if maintenance experience
-- proves it needed. The DB CHECK constraints + the RLS policies provide
-- the load-bearing guarantees this V1.

-- ============================================================================
-- STEP 1 — Create the table
-- ============================================================================
-- Column-by-column rationale lives in the decision doc § A. Highlights:
--   - id: gen_random_uuid() default, primary key
--   - invoice_id: nullable FK to invoices (a non-invoice send is permitted
--     by the model; today's only consumer is invoice-driven, so NULL is
--     the future-extension affordance)
--   - original_send_id: self-FK, nullable; non-null indicates a retry
--   - attempt_no: 1-indexed, CHECK >= 1 (a retry sets attempt_no = prev + 1)
--   - phone: E.164 digits (output of packages/services normalizePhone)
--   - endpoint: CHECK in the two send endpoints; ENUMERATED at the
--     application layer too via WhatsAppSendEndpoint satisfies-Exclude
--     sentinel
--   - template_name: nullable; non-null iff endpoint='sendtemplatemessage'
--     (the CHECK constraint enforces this invariant at write time)
--   - wamid: nullable; populated only on a successful send
--   - status: CHECK in {queued, sent, failed}; ENUMERATED at app layer too
--   - raw_response: jsonb, truncated to 2 KB serialized by the wrapper
--   - error_message: nullable; non-null when status='failed'
--   - user_id: nullable FK to auth.users (operator who initiated; nullable
--     because future-extension paths may include system-initiated sends)
--   - queued_at: insert timestamp
--   - completed_at: set on the UPDATE that lands status in {sent, failed}

create table if not exists public.whatsapp_sends (
  id                uuid primary key default gen_random_uuid(),
  invoice_id        uuid references public.invoices(id) on delete set null,
  original_send_id  uuid references public.whatsapp_sends(id) on delete set null,
  attempt_no        integer not null default 1
                    check (attempt_no >= 1),
  phone             text not null,
  endpoint          text not null
                    check (endpoint = any (array['sendmessage','sendtemplatemessage'])),
  template_name     text,
  wamid             text,
  status            text not null default 'queued'
                    check (status = any (array['queued','sent','failed'])),
  raw_response      jsonb,
  error_message     text,
  user_id           uuid references auth.users(id) on delete set null,
  queued_at         timestamptz not null default now(),
  completed_at      timestamptz,
  -- Cross-column CHECK: a sendtemplatemessage row MUST carry a template_name;
  -- a sendmessage row MUST NOT carry one. Catches mis-wiring at write time.
  constraint whatsapp_sends_template_name_endpoint_check
    check (
      (endpoint = 'sendtemplatemessage' and template_name is not null)
      or
      (endpoint = 'sendmessage' and template_name is null)
    ),
  -- Cross-column CHECK: a 'sent' row MUST have a wamid; 'failed' rows MUST
  -- carry an error_message. 'queued' rows have neither (yet). Catches the
  -- "status=sent but wamid is null" silent-bug shape at write time.
  constraint whatsapp_sends_completion_consistency_check
    check (
      (status = 'queued'  and wamid is null and error_message is null and completed_at is null)
      or
      (status = 'sent'    and wamid is not null and completed_at is not null)
      or
      (status = 'failed'  and error_message is not null and completed_at is not null)
    )
);

comment on table public.whatsapp_sends is
  'Append-only-per-attempt audit of every WhatsApp send (sendmessage and '
  'sendtemplatemessage). One row per attempt; a retry inserts a NEW row '
  'linked via original_send_id. Within an attempt, status moves queued -> '
  'sent|failed via ONE application-level UPDATE. The wrapper at '
  'packages/services/src/whatsapp-tracked.service.ts is the sole writer. '
  'PII surface: phone (E.164) + raw_response (jsonb, truncated to 2 KB by '
  'the wrapper) — see RLS SELECT scope (MANAGER+ only).';

comment on column public.whatsapp_sends.original_send_id is
  'Self-FK to the row this attempt is retrying. NULL for first attempts. '
  'A non-NULL value implies attempt_no >= 2.';

comment on column public.whatsapp_sends.attempt_no is
  '1-indexed; first attempt is 1. A retry sets attempt_no = previous.attempt_no + 1.';

comment on column public.whatsapp_sends.raw_response is
  'Verbatim WPBox response body (JSONB). Truncated to 2 KB serialized by '
  'the wrapper before INSERT. For HTTP failures, contains {error, status, '
  'rawResponse} from WhatsAppResult. Required for debugging silent '
  'rejections (status=200 + message_wamid:null).';

-- ============================================================================
-- STEP 2 — Indexes
-- ============================================================================
-- (status) — the retry-path query: WHERE status = 'failed' ORDER BY queued_at DESC.
-- (invoice_id, queued_at desc) — the per-invoice history query for the UI.
-- (original_send_id) — the attempt-chain query: WHERE original_send_id = $1.

create index if not exists whatsapp_sends_status_idx
  on public.whatsapp_sends (status);

create index if not exists whatsapp_sends_invoice_queued_idx
  on public.whatsapp_sends (invoice_id, queued_at desc)
  where invoice_id is not null;

create index if not exists whatsapp_sends_original_send_id_idx
  on public.whatsapp_sends (original_send_id)
  where original_send_id is not null;

-- ============================================================================
-- STEP 3 — RLS
-- ============================================================================
-- See decision doc § A (RLS implication) and § C (PII handling) for rationale.
--
-- INSERT scope: SUPER_ADMIN / ADMIN / MANAGER / INVOICE / FINANCE_STAFF —
--   mirrors invoices_insert_finance; these are the roles that drive sends.
-- UPDATE scope: SAME — required for the queued -> sent|failed transition
--   the wrapper performs. Per-row immutability of COMPLETED rows is enforced
--   at the application layer by the wrapper never writing to a row whose
--   completed_at IS NOT NULL.
-- SELECT scope: SUPER_ADMIN / ADMIN / MANAGER — tighter; phone +
--   raw_response are PII. Mirrors audit_logs_select_admin exactly.
-- DELETE: NO POLICY. A delivery-tracker row is not deletable.

alter table public.whatsapp_sends enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.whatsapp_sends'::regclass
      and polname = 'whatsapp_sends_insert_finance'
  ) then
    create policy whatsapp_sends_insert_finance on public.whatsapp_sends
      for insert with check (
        auth.uid() is not null
        and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])
      );
  end if;

  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.whatsapp_sends'::regclass
      and polname = 'whatsapp_sends_update_finance'
  ) then
    create policy whatsapp_sends_update_finance on public.whatsapp_sends
      for update using (
        auth.uid() is not null
        and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])
      );
  end if;

  if not exists (
    select 1 from pg_policy
    where polrelid = 'public.whatsapp_sends'::regclass
      and polname = 'whatsapp_sends_select_admin'
  ) then
    create policy whatsapp_sends_select_admin on public.whatsapp_sends
      for select using (
        auth.uid() is not null
        and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER'])
      );
  end if;
end
$$;

comment on policy whatsapp_sends_insert_finance on public.whatsapp_sends is
  'INSERT scoped to the roles that drive WhatsApp sends (mirrors '
  'invoices_insert_finance). The application-layer wrapper at '
  'packages/services/src/whatsapp-tracked.service.ts is the only intended '
  'writer; the role scope is the defense-in-depth backstop.';

comment on policy whatsapp_sends_update_finance on public.whatsapp_sends is
  'UPDATE scoped same as INSERT; required for the queued -> sent|failed '
  'transition. The application layer never UPDATEs a row whose completed_at '
  'IS NOT NULL — that immutability of completed rows is application-policy, '
  'not DB-enforced. A follow-up sentinel can verify this.';

comment on policy whatsapp_sends_select_admin on public.whatsapp_sends is
  'SELECT scoped tighter than INSERT/UPDATE because phone and raw_response '
  'are PII. Mirrors audit_logs_select_admin. A future operator-facing UI '
  'showing an operator their OWN send history should use a SECURITY DEFINER '
  'RPC filtering by user_id = auth.uid(), not a relaxation of this policy.';

-- ============================================================================
-- STEP 4 — Verification (read-only assertions)
-- ============================================================================
-- Idempotent; runs on every apply. Asserts the load-bearing properties:
--   - Table exists with the expected columns
--   - status, endpoint CHECK constraints exist
--   - template_name × endpoint cross-column CHECK exists
--   - completion-consistency CHECK exists
--   - RLS is enabled
--   - 3 policies present (INSERT, UPDATE, SELECT)
--   - NO DELETE policy
--   - Indexes present on status, (invoice_id, queued_at desc), original_send_id

do $$
declare
  v_table_exists boolean;
  v_status_check boolean;
  v_endpoint_check boolean;
  v_template_check boolean;
  v_completion_check boolean;
  v_rls_enabled boolean;
  v_policy_count integer;
  v_has_delete_policy boolean;
  v_status_idx_exists boolean;
  v_invoice_idx_exists boolean;
  v_original_idx_exists boolean;
begin
  -- Table presence
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'whatsapp_sends'
  ) into v_table_exists;
  if not v_table_exists then
    raise exception 'whatsapp_sends table missing after migration';
  end if;

  -- CHECK constraints
  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.whatsapp_sends'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%queued%sent%failed%'
  ) into v_status_check;
  if not v_status_check then
    raise exception 'whatsapp_sends status CHECK constraint missing';
  end if;

  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.whatsapp_sends'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%endpoint%sendmessage%sendtemplatemessage%'
  ) into v_endpoint_check;
  if not v_endpoint_check then
    raise exception 'whatsapp_sends endpoint CHECK constraint missing';
  end if;

  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.whatsapp_sends'::regclass
      and conname = 'whatsapp_sends_template_name_endpoint_check'
  ) into v_template_check;
  if not v_template_check then
    raise exception 'whatsapp_sends_template_name_endpoint_check missing';
  end if;

  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.whatsapp_sends'::regclass
      and conname = 'whatsapp_sends_completion_consistency_check'
  ) into v_completion_check;
  if not v_completion_check then
    raise exception 'whatsapp_sends_completion_consistency_check missing';
  end if;

  -- RLS enabled
  select relrowsecurity from pg_class
    where oid = 'public.whatsapp_sends'::regclass
    into v_rls_enabled;
  if not v_rls_enabled then
    raise exception 'whatsapp_sends RLS not enabled';
  end if;

  -- Policy count = 3 (INSERT + UPDATE + SELECT)
  select count(*)::int from pg_policy
    where polrelid = 'public.whatsapp_sends'::regclass
    into v_policy_count;
  if v_policy_count <> 3 then
    raise exception 'whatsapp_sends expected 3 RLS policies, found %', v_policy_count;
  end if;

  -- NO DELETE policy
  select exists (
    select 1 from pg_policy
    where polrelid = 'public.whatsapp_sends'::regclass
      and polcmd = 'd'  -- 'd' = DELETE
  ) into v_has_delete_policy;
  if v_has_delete_policy then
    raise exception
      'whatsapp_sends has a DELETE policy — delivery audit rows must not be '
      'deletable. The migration that added it must be reverted.';
  end if;

  -- Indexes
  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'whatsapp_sends'
      and indexname = 'whatsapp_sends_status_idx'
  ) into v_status_idx_exists;
  if not v_status_idx_exists then
    raise exception 'whatsapp_sends_status_idx missing';
  end if;

  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'whatsapp_sends'
      and indexname = 'whatsapp_sends_invoice_queued_idx'
  ) into v_invoice_idx_exists;
  if not v_invoice_idx_exists then
    raise exception 'whatsapp_sends_invoice_queued_idx missing';
  end if;

  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'whatsapp_sends'
      and indexname = 'whatsapp_sends_original_send_id_idx'
  ) into v_original_idx_exists;
  if not v_original_idx_exists then
    raise exception 'whatsapp_sends_original_send_id_idx missing';
  end if;

  raise notice
    'whatsapp_sends migration verified: table present, 4 CHECK constraints, '
    'RLS enabled, 3 policies (INSERT/UPDATE/SELECT), NO DELETE policy, '
    '3 indexes (status, invoice_queued, original_send_id)';
end
$$;
