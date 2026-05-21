-- Migration: REVOKE EXECUTE FROM PUBLIC + selective GRANT TO authenticated
--
-- Issue tracker: #79
-- Predecessor: 20260515000003_advisor_search_path_and_revokes.sql (same PR series)
--
-- The previous migration used `REVOKE EXECUTE … FROM anon`, which was a
-- no-op: PostgreSQL grants EXECUTE on functions to PUBLIC by default,
-- and `anon` inherits from PUBLIC. So `REVOKE FROM anon` removes a
-- direct grant that was never made; the inherited PUBLIC grant remains.
--
-- Verified post-deploy with:
--   select proacl, has_function_privilege('anon', oid, 'EXECUTE')
--   from pg_proc … → proacl shows `=X/postgres` (PUBLIC has EXECUTE)
--   and anon_can_execute is still true.
--
-- The correct fix (this migration):
--   1. REVOKE EXECUTE … FROM PUBLIC on all 15 SECURITY DEFINER functions
--   2. GRANT EXECUTE … TO authenticated on the 12 intentional RPCs
--   3. Do NOT grant to anon — these functions require auth.uid()
--   4. Do NOT grant to authenticated for the 3 trigger functions
--      (handle_new_user, rls_auto_enable, shipment_emit_created_event)
--      — they fire from triggers, never via REST
--
-- Net effect:
--   - 15 anon_security_definer warnings → 0 (PUBLIC no longer has EXECUTE)
--   - 15 authenticated_security_definer warnings → 12 (the 3 trigger
--     functions are no longer reachable; the 12 intentional RPCs still
--     warn because the linter can't know intent — internal RLS enforces
--     actual authorization)
--
-- This migration is idempotent: REVOKE removes existing grant or no-ops;
-- GRANT adds it or no-ops.

-- ============================================================================
-- STEP 1 — REVOKE EXECUTE FROM PUBLIC on all 15 SECURITY DEFINER functions
-- ============================================================================
-- This removes the inherited grant that anon and authenticated were getting
-- via PUBLIC.

revoke execute on function public.add_shipment_to_manifest(uuid, text, uuid)            from public;
revoke execute on function public.arrive_manifest(uuid, uuid)                           from public;
revoke execute on function public.close_manifest_atomic(uuid, uuid)                     from public;
revoke execute on function public.count_shipments_by_status()                           from public;
revoke execute on function public.depart_manifest(uuid, uuid)                           from public;
revoke execute on function public.generate_invoice(uuid, uuid, numeric)                 from public;
revoke execute on function public.get_finance_summary()                                 from public;
revoke execute on function public.get_rate_card(text, text, text, numeric)              from public;
revoke execute on function public.get_user_role()                                       from public;
revoke execute on function public.handle_new_user()                                     from public;
revoke execute on function public.record_invoice_payment(uuid, numeric, text, text, text, timestamptz, text) from public;
revoke execute on function public.resolve_exception(uuid, uuid, text)                   from public;
revoke execute on function public.rls_auto_enable()                                     from public;
revoke execute on function public.shipment_emit_created_event()                         from public;
revoke execute on function public.update_shipment_status(uuid, text, uuid, text)        from public;

-- ============================================================================
-- STEP 2 — GRANT EXECUTE TO authenticated on the 12 legitimate RPCs
-- ============================================================================
-- These 12 functions are called by the dashboard app on behalf of signed-in
-- users. Their internal logic checks `auth.uid()` and/or RLS policies for
-- authorization. They MUST be reachable by the authenticated role for the
-- product to work.

grant execute on function public.add_shipment_to_manifest(uuid, text, uuid)            to authenticated;
grant execute on function public.arrive_manifest(uuid, uuid)                           to authenticated;
grant execute on function public.close_manifest_atomic(uuid, uuid)                     to authenticated;
grant execute on function public.count_shipments_by_status()                           to authenticated;
grant execute on function public.depart_manifest(uuid, uuid)                           to authenticated;
grant execute on function public.generate_invoice(uuid, uuid, numeric)                 to authenticated;
grant execute on function public.get_finance_summary()                                 to authenticated;
grant execute on function public.get_rate_card(text, text, text, numeric)              to authenticated;
grant execute on function public.get_user_role()                                       to authenticated;
grant execute on function public.record_invoice_payment(uuid, numeric, text, text, text, timestamptz, text) to authenticated;
grant execute on function public.resolve_exception(uuid, uuid, text)                   to authenticated;
grant execute on function public.update_shipment_status(uuid, text, uuid, text)        to authenticated;

-- ============================================================================
-- STEP 3 — Trigger-only functions stay un-granted to authenticated
-- ============================================================================
-- handle_new_user           — fires on auth.users INSERT (Supabase Auth flow)
-- rls_auto_enable           — DDL event trigger, fires on CREATE TABLE
-- shipment_emit_created_event — row trigger on public.shipments INSERT
--
-- These never need to be REST-callable. After the REVOKE FROM PUBLIC above,
-- they're already inaccessible to anon and authenticated. service_role and
-- the function owner (postgres) retain access for trigger execution.
