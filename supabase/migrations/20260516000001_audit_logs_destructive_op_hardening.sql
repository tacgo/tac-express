-- Migration: audit_logs hardening for destructive-op capture
--
-- Issue tracker: #102 (audit_logs sub-item, risk-rank #1)
-- Decision doc: docs/decisions/2026-05-16-audit-logs-mechanism.md
-- Predecessor: 20260515000004_revoke_public_grant_authenticated.sql
--
-- Background
-- ----------
-- The audit_logs table was created in the baseline migration
-- (20260515000001) with these columns:
--   id, entity_type, action, description, entity_id, user_id, metadata,
--   created_at
-- and RLS already configured for tamper-evidence (INSERT-by-authenticated,
-- SELECT-by-MANAGER+, NO UPDATE policy, NO DELETE policy).
--
-- This migration HARDENS that table for destructive-op capture (payment
-- deletion, invoice cancellation, manifest revert) by adding two things:
--
--   1. before_state JSONB column — captures the row-snapshot of the
--      destroyed/changed record so the operation is forensically
--      reconstructable.
--
--   2. action_destructive_check CHECK constraint — when action matches
--      one of the destructive-op canonical actions, the row MUST carry
--      a non-null before_state and entity_id. Non-destructive actions
--      (the historical 'STATUS_CHANGE' / 'RESOLVED' inserts from the
--      existing SECURITY DEFINER RPCs) are unaffected — the CHECK only
--      activates for the three new canonical action values.
--
-- What this migration does NOT do
-- -------------------------------
--   - Does NOT add an UPDATE or DELETE policy on audit_logs. The baseline's
--     no-UPDATE / no-DELETE tamper-evidence property is preserved exactly.
--   - Does NOT change the SELECT or INSERT policy.
--   - Does NOT add a generic CHECK on action (existing inserts use free-
--     text values like 'STATUS_CHANGE', 'RESOLVED'; constraining all
--     actions would break those historical paths).
--   - Does NOT touch indexes — the existing
--     (created_at DESC) and (entity_type, entity_id) indexes are
--     adequate. If the table grows large enough to need an action-keyed
--     index, that's a follow-up migration.
--
-- Idempotency
-- -----------
-- Both ALTER statements use IF NOT EXISTS. Safe to re-apply.
--
-- Forward-only rollback
-- ---------------------
-- The before_state column is additive and nullable; removing it would
-- only matter if a downgrade was needed, and any rows containing
-- destructive-op records would lose forensic data. The CHECK constraint
-- can be dropped without data loss. We do NOT ship a reverse migration
-- because:
--   (a) audit_logs is append-only by design (no UPDATE/DELETE policies)
--   (b) before_state is additive — old code paths that don't read it
--       are unaffected
--   (c) the CHECK only activates for the three new destructive actions
--       — historical rows are unaffected
-- If a rollback is genuinely needed, the forward path is a new migration
-- dropping the CHECK and the column (with explicit data backup first).
--
-- Verification
-- ------------
-- This migration is gated by the migrations-fresh-apply CI gate. After
-- apply, get_advisors should report no new advisories on audit_logs.
-- The cross-package sentinel test
-- packages/services/src/__tests__/audit-logs-no-update-delete.test.ts
-- verifies that no code in packages/, apps/, or supabase/functions/
-- attempts an UPDATE or DELETE against audit_logs.

-- ============================================================================
-- STEP 1 — Add before_state column
-- ============================================================================
-- JSONB so that arbitrary row shapes (payments, invoices, manifests) can
-- be captured without forcing a typed columnar shape. nullable so that
-- historical / non-destructive inserts remain valid.

alter table public.audit_logs
  add column if not exists before_state jsonb;

comment on column public.audit_logs.before_state is
  'Row-snapshot of the destroyed or changed entity, captured at the moment '
  'of the destructive op. NULL for non-destructive actions. JSONB so that '
  'heterogeneous record shapes (payments, invoices, manifests) can be '
  'recorded without a typed column-per-entity schema. Forensic-grade: '
  'must contain enough fields to reconstruct the destroyed record.';

-- ============================================================================
-- STEP 2 — Add CHECK constraint scoped to the three destructive actions
-- ============================================================================
-- The constraint fires ONLY when action matches one of the canonical
-- destructive actions. For those actions:
--   - entity_id MUST be present (NULL not allowed — every destruction
--     targets a specific record)
--   - before_state MUST be present (NULL not allowed — the whole point
--     of a destructive-op audit row is reconstructability)
--
-- For all other action values, the constraint is satisfied trivially
-- (the IS NOT NULL check on the action match short-circuits). This
-- preserves backwards compatibility with the existing SECURITY DEFINER
-- RPCs (resolve_exception → 'RESOLVED', update_shipment_status →
-- 'STATUS_CHANGE') that write audit rows today.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'audit_logs_destructive_action_check'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_destructive_action_check
      check (
        action not in ('payment_delete', 'invoice_cancel', 'manifest_revert')
        or (entity_id is not null and before_state is not null)
      );
  end if;
end
$$;

comment on constraint audit_logs_destructive_action_check on public.audit_logs is
  'Destructive-op rows (action IN payment_delete, invoice_cancel, '
  'manifest_revert) MUST carry both entity_id and before_state. '
  'Non-destructive actions are unconstrained (historical compatibility). '
  'Adding a new destructive action requires (a) extending this CHECK '
  'and (b) adding an entry to packages/services/src/shared/'
  'destructive-op-registry.ts so the sentinel test enforces wrapper '
  'adoption.';

-- ============================================================================
-- STEP 3 — Verification block (idempotent assertions)
-- ============================================================================
-- These RAISE NOTICE on success and RAISE EXCEPTION on failure. Running
-- the migration on a fresh DB OR on production yields the same result —
-- the assertions are read-only against pg_catalog.

do $$
declare
  v_has_before_state boolean;
  v_has_check boolean;
  v_has_update_policy boolean;
  v_has_delete_policy boolean;
begin
  -- before_state column exists?
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'audit_logs'
      and column_name = 'before_state'
  ) into v_has_before_state;

  if not v_has_before_state then
    raise exception 'audit_logs.before_state column missing after migration';
  end if;

  -- CHECK constraint exists?
  select exists (
    select 1 from pg_constraint
    where conname = 'audit_logs_destructive_action_check'
      and conrelid = 'public.audit_logs'::regclass
  ) into v_has_check;

  if not v_has_check then
    raise exception 'audit_logs_destructive_action_check constraint missing';
  end if;

  -- Tamper-evidence: NO UPDATE policy on audit_logs.
  select exists (
    select 1 from pg_policy pol
    join pg_class c on pol.polrelid = c.oid
    where c.relname = 'audit_logs'
      and pol.polcmd = 'w'  -- 'w' = UPDATE
  ) into v_has_update_policy;

  if v_has_update_policy then
    raise exception
      'audit_logs has an UPDATE policy — tamper-evidence violated. '
      'The migration that added it must be reverted.';
  end if;

  -- Tamper-evidence: NO DELETE policy on audit_logs.
  select exists (
    select 1 from pg_policy pol
    join pg_class c on pol.polrelid = c.oid
    where c.relname = 'audit_logs'
      and pol.polcmd = 'd'  -- 'd' = DELETE
  ) into v_has_delete_policy;

  if v_has_delete_policy then
    raise exception
      'audit_logs has a DELETE policy — tamper-evidence violated. '
      'The migration that added it must be reverted.';
  end if;

  raise notice
    'audit_logs hardening verified: before_state present, '
    'destructive-action CHECK present, no UPDATE policy, no DELETE policy';
end
$$;
