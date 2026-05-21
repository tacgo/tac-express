-- Migration: address remaining Supabase advisor warnings
--
-- Issue tracker: #79 (P1 — Supabase advisors)
-- Predecessor (archived): _archive/20260514000003_supabase_advisors_search_path_and_revokes.sql
-- ADR context: docs/ARCHITECTURAL-DECISIONS.md Decision 8 (Path A baseline)
--
-- After the Phase 3 baseline (20260515000001) and OPERATOR fix
-- (20260515000002 / live as 20260514235527 in production), 48 advisor
-- warnings remained:
--
--   17 × function_search_path_mutable          → ALTER FUNCTION SET search_path
--   15 × anon_security_definer_function_executable → REVOKE EXECUTE FROM anon
--   15 × authenticated_security_definer_function_executable → see notes below
--    1 × auth_leaked_password_protection       → dashboard setting (non-SQL, tracked separately)
--
-- Authenticated REVOKE policy:
-- The advisor flags every SECURITY DEFINER function callable by `authenticated`
-- — but most are intentional RPCs (add_shipment_to_manifest, record_invoice_payment,
-- etc.) that the dashboard app calls on behalf of signed-in users. We REVOKE
-- only on the 3 functions that are NEVER meant to be called via PostgREST:
--   - handle_new_user()           — auth trigger fired by Supabase Auth
--   - rls_auto_enable()           — DDL event trigger
--   - shipment_emit_created_event() — row trigger on shipments INSERT
--
-- The remaining 12 authenticated-DEFINER warnings will continue to fire
-- because the linter can't know intent. This is the documented trade-off
-- (RLS policies inside the functions enforce the actual authorization).

set check_function_bodies = off;

-- ============================================================================
-- 1) Set search_path on all 17 functions missing it
-- ============================================================================
-- Using ALTER FUNCTION ... SET, which doesn't require redefining the body.
-- Each function is identified by its full signature (Postgres overload-safe).

alter function public.generate_awb_number()                                  set search_path = public;
alter function public.generate_invoice_number()                              set search_path = public;
alter function public.generate_manifest_number()                             set search_path = public;
alter function public.update_updated_at()                                    set search_path = public;
alter function public.set_updated_at()                                       set search_path = public;
alter function public.handle_new_user()                                      set search_path = public;
alter function public.get_user_role()                                        set search_path = public;
alter function public.count_shipments_by_status()                            set search_path = public;
alter function public.get_finance_summary()                                  set search_path = public;
alter function public.get_rate_card(text, text, text, numeric)               set search_path = public;
alter function public.generate_invoice(uuid, uuid, numeric)                  set search_path = public;
alter function public.update_shipment_status(uuid, text, uuid, text)         set search_path = public;
alter function public.add_shipment_to_manifest(uuid, text, uuid)             set search_path = public;
alter function public.arrive_manifest(uuid, uuid)                            set search_path = public;
alter function public.depart_manifest(uuid, uuid)                            set search_path = public;
alter function public.close_manifest_atomic(uuid, uuid)                      set search_path = public;
alter function public.resolve_exception(uuid, uuid, text)                    set search_path = public;

-- (record_invoice_payment, shipment_emit_created_event, and rls_auto_enable
--  already have search_path set via their CREATE OR REPLACE definitions.)

-- ============================================================================
-- 2) REVOKE EXECUTE on all SECURITY DEFINER functions FROM anon
-- ============================================================================
-- Anon (unauthenticated) callers should NEVER be able to invoke these.
-- The functions either require auth.uid() (which is null for anon) or
-- mutate authoritative data; either way, anon calls would either throw
-- or constitute a privilege escalation surface.

revoke execute on function public.add_shipment_to_manifest(uuid, text, uuid)            from anon;
revoke execute on function public.arrive_manifest(uuid, uuid)                           from anon;
revoke execute on function public.close_manifest_atomic(uuid, uuid)                     from anon;
revoke execute on function public.count_shipments_by_status()                           from anon;
revoke execute on function public.depart_manifest(uuid, uuid)                           from anon;
revoke execute on function public.generate_invoice(uuid, uuid, numeric)                 from anon;
revoke execute on function public.get_finance_summary()                                 from anon;
revoke execute on function public.get_rate_card(text, text, text, numeric)              from anon;
revoke execute on function public.get_user_role()                                       from anon;
revoke execute on function public.handle_new_user()                                     from anon;
revoke execute on function public.record_invoice_payment(uuid, numeric, text, text, text, timestamptz, text) from anon;
revoke execute on function public.resolve_exception(uuid, uuid, text)                   from anon;
revoke execute on function public.rls_auto_enable()                                     from anon;
revoke execute on function public.shipment_emit_created_event()                         from anon;
revoke execute on function public.update_shipment_status(uuid, text, uuid, text)        from anon;

-- ============================================================================
-- 3) REVOKE EXECUTE on trigger-only functions FROM authenticated
-- ============================================================================
-- These three functions are NEVER meant to be called via PostgREST. They
-- are bound to triggers and fire automatically — exposing them as RPCs
-- would let signed-in users invoke them out-of-band.

revoke execute on function public.handle_new_user()                  from authenticated;
revoke execute on function public.rls_auto_enable()                  from authenticated;
revoke execute on function public.shipment_emit_created_event()      from authenticated;

-- ============================================================================
-- Restore default function-body validation
-- ============================================================================
set check_function_bodies = on;
