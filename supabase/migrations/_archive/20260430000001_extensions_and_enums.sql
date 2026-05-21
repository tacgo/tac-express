-- ============================================================================
-- TAC Express — Foundation: extensions, enums, helper schema
-- Migration: 20260430000001
-- ============================================================================

-- Disable function-body validation for the duration of this migration.
--
-- Several helper functions defined below (current_user_role, current_user_hub,
-- the is_*_or_above helpers) are language=sql and reference public.profiles —
-- but profiles is not created until migration 20260430000002_core_schema.sql.
-- With Postgres' default check_function_bodies=on, the SQL parser tries to
-- resolve public.profiles at CREATE FUNCTION time and fails with
-- "relation does not exist". language=plpgsql functions are exempt because
-- they parse lazily.
--
-- Production is unaffected: this migration was applied long before the CI
-- gate existed, supabase_migrations.schema_migrations records that fact,
-- and `supabase db push` skips already-applied migrations by filename. The
-- session GUC only matters for fresh local stacks (CI, new dev environments)
-- replaying every migration via `supabase db reset`.
--
-- The structurally correct fix is to move these helpers into 20260430000002
-- (after profiles exists), but that would require editing two committed
-- migrations and risks divergence with environments that already applied
-- the originals. The GUC is the minimum-risk fix.
set check_function_bodies = off;

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm"  with schema extensions;
create extension if not exists "btree_gin" with schema extensions;
create extension if not exists "citext"   with schema extensions;

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type user_role as enum (
    'super_admin',
    'admin',
    'manager',
    'finance',
    'operations',
    'support',
    'warehouse_imphal',
    'warehouse_delhi',
    'warehouse_staff',
    'driver',
    'customer'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type shipment_status as enum (
    'pending',
    'booked',
    'manifested',
    'in_transit',
    'arrived',
    'out_for_delivery',
    'delivered',
    'returned',
    'cancelled',
    'exception'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type manifest_status as enum (
    'open',
    'closed',
    'in_transit',
    'arrived',
    'reconciled',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type transport_mode as enum ('road', 'air', 'rail', 'ocean', 'multi_modal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_level as enum ('standard', 'express', 'priority', 'same_day', 'next_day');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_mode as enum ('prepaid', 'cod', 'topay', 'credit', 'wallet');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum (
    'draft',
    'issued',
    'partial',
    'paid',
    'overdue',
    'cancelled',
    'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type exception_severity as enum ('low', 'medium', 'high', 'critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type exception_status as enum ('open', 'investigating', 'resolved', 'escalated', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tracking_event_type as enum (
    'created',
    'picked_up',
    'arrived_origin_hub',
    'departed_origin_hub',
    'in_transit',
    'arrived_dest_hub',
    'departed_dest_hub',
    'out_for_delivery',
    'delivery_attempted',
    'delivered',
    'returned',
    'exception_raised',
    'exception_resolved',
    'cancelled',
    'scan'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('in_app', 'email', 'sms', 'push', 'webhook');
exception when duplicate_object then null; end $$;

do $$ begin
  create type webhook_event as enum (
    'shipment.created',
    'shipment.status_changed',
    'shipment.delivered',
    'shipment.cancelled',
    'manifest.created',
    'manifest.closed',
    'manifest.departed',
    'manifest.arrived',
    'invoice.issued',
    'invoice.paid',
    'invoice.overdue',
    'exception.raised',
    'exception.resolved'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type api_key_scope as enum ('read_only', 'read_write', 'admin');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- HELPER FUNCTIONS used by triggers and policies
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role::user_role
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_hub()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select hub_code
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'admin'),
    false
  );
$$;

create or replace function public.is_manager_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'admin', 'manager'),
    false
  );
$$;

create or replace function public.is_finance_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'admin', 'manager', 'finance'),
    false
  );
$$;

create or replace function public.is_operations_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('super_admin', 'admin', 'manager', 'operations'),
    false
  );
$$;

create or replace function public.is_warehouse_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_user_role() in ('warehouse_imphal', 'warehouse_delhi', 'warehouse_staff'),
    false
  );
$$;

comment on function public.current_user_role is 'Resolves the role of the authenticated user from public.profiles. Used by RLS policies.';
comment on function public.current_user_hub is 'Resolves the hub code assigned to the authenticated user. Used to scope warehouse role queries.';
