-- ============================================================================
-- TAC Express — Bind handle_new_user() to auth.users
-- Migration: 20260522000001
-- ============================================================================
--
-- WHAT: Creates the on_auth_user_created trigger so a public.profiles row is
-- created automatically whenever a new auth.users row is inserted (sign-up).
--
-- WHY: The production-as-baseline (20260515000001) defines the
-- public.handle_new_user() function but NOT the trigger that fires it — the
-- baseline was generated from public-schema introspection, which does not
-- capture triggers living on the auth schema. Without this binding, sign-up
-- creates an auth.users row but no profiles row, so public.get_user_role()
-- returns NULL, the user has no role, and every RBAC gate denies them. The
-- app's signUp() does NOT insert the profile in code (auth.service.ts), so
-- the trigger is the only path. This restores the standard Supabase pattern
-- (and production parity).
--
-- IDEMPOTENT: handle_new_user() already does `on conflict (id) do nothing`,
-- so this is safe even if a profile is ever also created another way.
-- ============================================================================

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reverse: drop trigger if exists on_auth_user_created on auth.users;
