-- Migration: rename destructive-action CHECK enum value from
--            'manifest_revert' -> 'manifest_shipment_remove'
--
-- Issue tracker: #134 (audit_logs PR 2 adoption)
-- Decision doc: docs/decisions/2026-05-16-audit-logs-mechanism.md
-- Predecessor: 20260516000001_audit_logs_destructive_op_hardening.sql
--
-- Background
-- ----------
-- PR #133 (#102 risk-rank #1 infrastructure) shipped a CHECK constraint
-- enumerating three destructive-action literals:
--   payment_delete, invoice_cancel, manifest_revert
--
-- The first two map cleanly to existing service methods (deletePayment,
-- cancelInvoice). The third (manifest_revert) was a placeholder for a
-- method that DOES NOT EXIST in the codebase: no revertManifest()
-- in manifest.service.ts, no revert_manifest RPC. PR #133's decision
-- doc § 5.1 named this gap and deferred resolution to PR 2 (this PR).
--
-- PR 2's PHASE-0 reconciliation (in the PR body) made the call: do NOT
-- build a revertManifest method just to give the audit system a hook.
-- Instead, wire audit to the manifest destructive op that ACTUALLY
-- exists — removeShipmentFromManifest, which hard-deletes a row from
-- the manifest_shipments join table.
--
-- This migration realigns the CHECK constraint enum with reality:
--   - DROP the constraint that allows 'manifest_revert'
--   - ADD an equivalent constraint that allows 'manifest_shipment_remove'
--   - The other two enum values (payment_delete, invoice_cancel)
--     are unchanged.
--
-- Why a rename, not an additive extension
-- ---------------------------------------
-- We deliberately drop 'manifest_revert' rather than keep it as a
-- legacy-tolerable value, because:
--   (a) no row with action='manifest_revert' exists in the audit_logs
--       table — the value has never been written (it only existed in
--       the constraint definition, the AuditAction type, and the
--       registry).
--   (b) keeping a CHECK-allowed value with no producer is an integrity
--       smell — future contributors would have to guess whether the
--       gap means "feature planned" or "feature renamed". Renaming
--       leaves no ambiguity.
--   (c) the audit-write surface is the load-bearing tamper-evidence
--       layer; the CHECK constraint's enum is part of its contract.
--       Drift between the constraint and the code that calls it is a
--       latent integrity hole.
--
-- Pre-flight assertion
-- --------------------
-- The do$$ block below confirms zero existing rows reference the value
-- we are dropping. If any production deploy somehow has a row with
-- action='manifest_revert', this migration fails loud and the deploy
-- aborts BEFORE the constraint is replaced — protecting the row.
--
-- Idempotency
-- -----------
-- Both the DROP and ADD are conditional (existence-checked via
-- pg_constraint). Safe to re-apply.

-- ============================================================================
-- STEP 0 — Verify no row uses the value we're about to drop
-- ============================================================================
do $$
declare
  v_legacy_row_count integer;
begin
  select count(*) into v_legacy_row_count
  from public.audit_logs
  where action = 'manifest_revert';

  if v_legacy_row_count > 0 then
    raise exception
      'Cannot drop manifest_revert from audit_logs CHECK constraint: '
      '% existing row(s) reference this action. Backfill or rename '
      'those rows in a data migration BEFORE running this constraint '
      'rename.', v_legacy_row_count;
  end if;
end
$$;

-- ============================================================================
-- STEP 1 — Drop the old constraint (if present)
-- ============================================================================
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'audit_logs_destructive_action_check'
      and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      drop constraint audit_logs_destructive_action_check;
  end if;
end
$$;

-- ============================================================================
-- STEP 2 — Re-add the constraint with the corrected enum
-- ============================================================================
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
        action not in ('payment_delete', 'invoice_cancel', 'manifest_shipment_remove')
        or (entity_id is not null and before_state is not null)
      );
  end if;
end
$$;

comment on constraint audit_logs_destructive_action_check on public.audit_logs is
  'Destructive-op rows (action IN payment_delete, invoice_cancel, '
  'manifest_shipment_remove) MUST carry both entity_id and before_state. '
  'Non-destructive actions are unconstrained (historical compatibility). '
  'Adding a new destructive action requires (a) extending this CHECK '
  'and (b) adding an entry to packages/services/src/shared/'
  'destructive-op-registry.ts so the sentinel test enforces wrapper '
  'adoption.';

-- ============================================================================
-- STEP 3 — Post-flight verification (idempotent self-check)
-- ============================================================================
do $$
declare
  v_constraint_def text;
begin
  select pg_get_constraintdef(con.oid) into v_constraint_def
  from pg_constraint con
  join pg_class c on con.conrelid = c.oid
  where con.conname = 'audit_logs_destructive_action_check'
    and c.relname = 'audit_logs';

  if v_constraint_def is null then
    raise exception
      'audit_logs_destructive_action_check constraint not found after '
      'rename migration';
  end if;

  if v_constraint_def not ilike '%manifest_shipment_remove%' then
    raise exception
      'audit_logs_destructive_action_check does not contain the '
      'expected manifest_shipment_remove value. Got: %', v_constraint_def;
  end if;

  if v_constraint_def ilike '%manifest_revert%' then
    raise exception
      'audit_logs_destructive_action_check still contains the legacy '
      'manifest_revert value. Got: %', v_constraint_def;
  end if;

  raise notice
    'audit_logs CHECK reconciliation verified: manifest_revert dropped, '
    'manifest_shipment_remove present';
end
$$;
