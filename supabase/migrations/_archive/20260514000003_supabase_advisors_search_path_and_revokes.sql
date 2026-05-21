-- Migration: address Supabase security advisors (#79) — partial fix
--
-- Closes 17 × `function_search_path_mutable` warnings + REVOKEs anon execute
-- on the 8 mutating SECURITY DEFINER RPCs. Read-only aggregate functions
-- that leak organizational state get the same anon REVOKE treatment for
-- defense-in-depth.
--
-- Strategy: each ALTER / REVOKE is wrapped in a DO block that checks the
-- function exists first. This makes the migration safe to apply against
-- both:
--   - production (which has all 17 functions per the 2026-05-14 snapshot)
--   - the repo's local `supabase db reset` env (which has a subset — the
--     production-only ones like generate_invoice, get_rate_card, etc. are
--     simply skipped locally)
--
-- The repo and production diverge on function bodies (return types, status
-- case, table column refs — see #78). This migration only touches the
-- function's search_path GUC, NOT the body — so it's signature-agnostic
-- enough to be safe across both environments.
--
-- WHAT THIS DOES NOT FIX:
--   - The remaining 21 `*_security_definer_function_executable` advisor
--     warnings for authenticated role — those require either REVOKE
--     (changing UX) or per-function role-gate decisions which depend on
--     #78's resolution direction. Tracked separately.
--   - auth_leaked_password_protection — one-click setting in Supabase
--     dashboard, not a migration.
--   - The latent `record_invoice_payment` role bug (Finding 4 of
--     REPO-VS-PRODUCTION-DIVERGENCE-2026-05-14.md) — fix needs Option A
--     of #78 first.
--
-- This migration IS SAFE TO `supabase db push` to production. It does not
-- change function bodies or signatures; only their attached SET clauses
-- and EXECUTE grants. No data is read or written.

-- ============================================================================
-- PART 1 — Set search_path on the 17 mutable-search-path functions
-- ============================================================================
-- search_path = public, pg_catalog
--   - 'public' — every function references public.<table> qualified, plus
--     this is where the function itself lives
--   - 'pg_catalog' — needed so built-in functions / operators / casts
--     (e.g. now(), coalesce, ::int) resolve without unqualified shadowing
--     attacks succeeding

-- 1. generate_awb_number()
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'generate_awb_number'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.generate_awb_number() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 2. generate_invoice_number()
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'generate_invoice_number'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.generate_invoice_number() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 3. generate_manifest_number()
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'generate_manifest_number'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.generate_manifest_number() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 4. update_updated_at() — production trigger fn (repo uses set_updated_at)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'update_updated_at'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 5. set_updated_at() — repo trigger fn (production has both update_updated_at + set_updated_at)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 6. handle_new_user() — auth.users insert trigger
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 7. update_shipment_status — production: (uuid, text, uuid, text); repo #85: (uuid, text, uuid, text)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'update_shipment_status'
               AND pg_get_function_identity_arguments(p.oid) IN ('p_shipment_id uuid, p_new_status text, p_staff_id uuid, p_notes text',
                                                                  'p_shipment_id uuid, p_new_status text, p_staff_id uuid DEFAULT NULL::uuid, p_notes text DEFAULT NULL::text')) THEN
    ALTER FUNCTION public.update_shipment_status(uuid, text, uuid, text)
      SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 8. count_shipments_by_status()
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'count_shipments_by_status'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.count_shipments_by_status() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 9. add_shipment_to_manifest — 3-arg matches both production and repo #85
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'add_shipment_to_manifest'
               AND pg_get_function_identity_arguments(p.oid) IN ('p_manifest_id uuid, p_awb_number text, p_staff_id uuid',
                                                                  'p_manifest_id uuid, p_awb_number text, p_staff_id uuid DEFAULT NULL::uuid')) THEN
    ALTER FUNCTION public.add_shipment_to_manifest(uuid, text, uuid)
      SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 10. arrive_manifest — 2-arg in both production and repo #85
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'arrive_manifest'
               AND pg_get_function_identity_arguments(p.oid) IN ('p_manifest_id uuid, p_staff_id uuid',
                                                                  'p_manifest_id uuid, p_staff_id uuid DEFAULT NULL::uuid')) THEN
    ALTER FUNCTION public.arrive_manifest(uuid, uuid) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 11. depart_manifest
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'depart_manifest'
               AND pg_get_function_identity_arguments(p.oid) IN ('p_manifest_id uuid, p_staff_id uuid',
                                                                  'p_manifest_id uuid, p_staff_id uuid DEFAULT NULL::uuid')) THEN
    ALTER FUNCTION public.depart_manifest(uuid, uuid) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 12. close_manifest_atomic
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'close_manifest_atomic'
               AND pg_get_function_identity_arguments(p.oid) IN ('p_manifest_id uuid, p_staff_id uuid',
                                                                  'p_manifest_id uuid, p_staff_id uuid DEFAULT NULL::uuid')) THEN
    ALTER FUNCTION public.close_manifest_atomic(uuid, uuid) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 13. resolve_exception — DIVERGENT POSITIONAL ORDER between repo and production
--   - production:   (p_exception_id uuid, p_staff_id uuid, p_resolution text)
--   - repo #85:     (p_exception_id uuid, p_resolution text, p_staff_id uuid)
-- PostgreSQL identifies overloads by positional type list, so ALTER FUNCTION
-- must use the matching order for each environment. Branch on which one
-- actually exists. Macroscope caught this on PR #89 (comment_id 3243084057).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'resolve_exception'
               AND pg_get_function_identity_arguments(p.oid) = 'p_exception_id uuid, p_resolution text, p_staff_id uuid DEFAULT NULL::uuid') THEN
    -- repo / #85 order: (uuid, text, uuid)
    ALTER FUNCTION public.resolve_exception(uuid, text, uuid) SET search_path = public, pg_catalog;
  ELSIF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'resolve_exception'
                  AND pg_get_function_identity_arguments(p.oid) = 'p_exception_id uuid, p_staff_id uuid, p_resolution text') THEN
    -- production order: (uuid, uuid, text)
    ALTER FUNCTION public.resolve_exception(uuid, uuid, text) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 14. get_user_role()
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'get_user_role'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.get_user_role() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 15. generate_invoice — production-only function (per #78 snapshot)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'generate_invoice'
               AND pg_get_function_identity_arguments(p.oid) = 'p_shipment_id uuid, p_staff_id uuid, p_discount numeric') THEN
    ALTER FUNCTION public.generate_invoice(uuid, uuid, numeric) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 16. get_finance_summary() — production-only
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'get_finance_summary'
               AND pg_get_function_identity_arguments(p.oid) = '') THEN
    ALTER FUNCTION public.get_finance_summary() SET search_path = public, pg_catalog;
  END IF;
END $$;

-- 17. get_rate_card — production-only (repo has lookup_rate instead)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'get_rate_card'
               AND pg_get_function_identity_arguments(p.oid) = 'p_origin text, p_dest text, p_service_level text, p_weight numeric') THEN
    ALTER FUNCTION public.get_rate_card(text, text, text, numeric) SET search_path = public, pg_catalog;
  END IF;
END $$;

-- ============================================================================
-- PART 2 — REVOKE EXECUTE FROM anon on SECURITY DEFINER functions
-- ============================================================================
-- The anon role is the unsigned-in REST surface. Mutating RPCs must never
-- be callable from there (defense-in-depth — RLS already blocks reads, but
-- SECURITY DEFINER bypasses RLS). Read-only aggregates also REVOKEd to
-- prevent enumeration / cardinality leaks via the public API.
--
-- All REVOKEs are idempotent: re-running this migration has no effect.
-- Authenticated role retains EXECUTE (default grant) on each function;
-- authz on authenticated callers is per-function role gating, which is
-- partially in place (close_manifest_atomic, record_invoice_payment) and
-- partially blocked on #78 step 1.

-- Mutating RPCs (the high-impact set)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'add_shipment_to_manifest') THEN
    REVOKE EXECUTE ON FUNCTION public.add_shipment_to_manifest(uuid, text, uuid) FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'arrive_manifest') THEN
    REVOKE EXECUTE ON FUNCTION public.arrive_manifest(uuid, uuid) FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'close_manifest_atomic') THEN
    REVOKE EXECUTE ON FUNCTION public.close_manifest_atomic(uuid, uuid) FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'depart_manifest') THEN
    REVOKE EXECUTE ON FUNCTION public.depart_manifest(uuid, uuid) FROM anon;
  END IF;
END $$;

-- resolve_exception — same positional-order divergence as the ALTER above.
-- Branch by exact signature so the REVOKE targets the function that exists.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'resolve_exception'
               AND pg_get_function_identity_arguments(p.oid) = 'p_exception_id uuid, p_resolution text, p_staff_id uuid DEFAULT NULL::uuid') THEN
    REVOKE EXECUTE ON FUNCTION public.resolve_exception(uuid, text, uuid) FROM anon;
  ELSIF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                WHERE n.nspname = 'public' AND p.proname = 'resolve_exception'
                  AND pg_get_function_identity_arguments(p.oid) = 'p_exception_id uuid, p_staff_id uuid, p_resolution text') THEN
    REVOKE EXECUTE ON FUNCTION public.resolve_exception(uuid, uuid, text) FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'update_shipment_status') THEN
    REVOKE EXECUTE ON FUNCTION public.update_shipment_status(uuid, text, uuid, text) FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'generate_invoice') THEN
    REVOKE EXECUTE ON FUNCTION public.generate_invoice(uuid, uuid, numeric) FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'record_invoice_payment') THEN
    REVOKE EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, text, text, text, timestamptz, text) FROM anon;
  END IF;
END $$;

-- Read-only aggregates (still organizational state — REVOKE for parity)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'count_shipments_by_status') THEN
    REVOKE EXECUTE ON FUNCTION public.count_shipments_by_status() FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'get_finance_summary') THEN
    REVOKE EXECUTE ON FUNCTION public.get_finance_summary() FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'get_user_role') THEN
    REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'get_rate_card') THEN
    REVOKE EXECUTE ON FUNCTION public.get_rate_card(text, text, text, numeric) FROM anon;
  END IF;
END $$;

-- Trigger / event-trigger functions — not callable via REST in the first
-- place but explicit REVOKE is defensive:
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable') THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'shipment_emit_created_event') THEN
    REVOKE EXECUTE ON FUNCTION public.shipment_emit_created_event() FROM anon;
  END IF;
END $$;
