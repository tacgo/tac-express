-- ============================================================================
-- TAC Express — Consolidated baseline migration from production schema
-- Migration: 20260515000001
-- ============================================================================
--
-- WHAT: A single migration that, when replayed on a fresh database, produces
-- the EXACT schema currently live in production (project <YOUR_SUPABASE_PROJECT_ID>).
--
-- WHY: ADR Decision 8 (docs/ARCHITECTURAL-DECISIONS.md, "Migration drift
-- reconciliation: Path A — production-as-baseline"). Production was
-- bootstrapped from a different set of migrations than the repo. After
-- six weeks of independent maintenance, the two diverged structurally
-- (production: TEXT + CHECK with UPPERCASE values; repo: enum types with
-- lowercase values). Editing the 11 divergent repo migrations to match
-- production would damage audit-trail integrity more than archiving them
-- and starting from a single consolidated baseline. See
-- supabase/snapshots/MIGRATION-DRIFT-CATALOG-2026-05-15.md §6 for the
-- full analysis.
--
-- HOW: Generated from production via Supabase MCP introspection on
-- 2026-05-15 (see supabase/snapshots/production-schema-2026-05-15.md for
-- the captured state). Function bodies are taken verbatim from
-- pg_get_functiondef. Constraint and policy definitions are taken
-- verbatim from pg_get_constraintdef and pg_policies.
--
-- DOES NOT TOUCH PRODUCTION: This migration's filename is new. After it
-- lands, the bookkeeping insert (run separately via Supabase MCP) will
-- record this filename plus the 17 historical production filenames as
-- "already applied" so `supabase db push` is a no-op against production.
-- The schema this file produces equals the schema production already has.
--
-- ARCHIVED: The 11 divergent repo migrations are moved to
-- supabase/migrations/_archive/ in the same PR as this baseline, so that
-- on a fresh `supabase db reset` ONLY this baseline runs.
--
-- LATENT BUG NOT FIXED HERE: The invoice_payments_insert RLS policy
-- references role 'OPERATOR' which is not in the profiles.role CHECK
-- list. The fix ships in a separate forward migration immediately
-- following this baseline, so the baseline reproduces production
-- exactly (including its bugs).
-- ============================================================================

-- Function-body validation must be relaxed for this migration: helper
-- functions reference public.profiles before profiles is created (they
-- are forward-declarations from production's original creation order).
-- Production accepted this because its functions were created in a later
-- migration than profiles; we collapse them into one file but preserve
-- the same logical effect.
set check_function_bodies = off;

-- ============================================================================
-- SECTION 1 — EXTENSIONS
-- ============================================================================

create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists "pgcrypto"  with schema extensions;
-- pg_stat_statements and supabase_vault are managed by Supabase platform.
-- They exist in production but are not declared here because Supabase
-- creates them automatically; declaring them in a migration may conflict
-- with the platform's lifecycle.

-- ============================================================================
-- SECTION 2 — SEQUENCES
-- ============================================================================

create sequence if not exists public.awb_seq      start 10001 increment 1;
create sequence if not exists public.invoice_seq  start 1001  increment 1;
create sequence if not exists public.manifest_seq start 1     increment 1;

-- ============================================================================
-- SECTION 3 — TRIGGER HELPER FUNCTIONS
-- ============================================================================
-- Production has TWO functionally-equivalent updated_at helpers
-- (set_updated_at and update_updated_at). Both are reproduced verbatim
-- to match production's trigger bindings exactly.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- ============================================================================
-- SECTION 4 — TABLES (in FK dependency order)
-- ============================================================================

-- 4.1 profiles (depends on auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null default '',
  role        text not null default 'OPS'
              check (role = any (array[
                'SUPER_ADMIN','ADMIN','MANAGER','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI',
                'OPS','INVOICE','SUPPORT','WAREHOUSE_STAFF','OPS_STAFF','FINANCE_STAFF'
              ])),
  hub_code    text,
  is_active   boolean not null default true,
  last_login_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4.2 customers
create table if not exists public.customers (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  phone               text not null,
  email               text,
  gstin               text,
  address_line1       text not null default '',
  address_line2       text,
  city                text not null default '',
  state               text not null default '',
  zip                 text not null default '',
  total_shipments     integer not null default 0,
  total_revenue       numeric not null default 0,
  outstanding_balance numeric not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 4.3 hubs
create table if not exists public.hubs (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  city        text not null,
  state       text not null,
  country     text not null default 'IN',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.hubs is 'Origin/destination hub master data referenced by manifests + shipments.';

-- 4.4 manifests (created before shipments because shipments.manifest_id FK)
create table if not exists public.manifests (
  id              uuid primary key default gen_random_uuid(),
  -- manifest_number default is bound below in section 6, after
  -- generate_manifest_number() is defined. CREATE TABLE cannot reference
  -- a function that doesn't yet exist.
  manifest_number text not null unique,
  status          text not null default 'DRAFT'
                  check (status = any (array['DRAFT','BUILDING','OPEN','CLOSED','DEPARTED','ARRIVED','RECONCILED'])),
  transport_mode  text not null default 'AIR'
                  check (transport_mode = any (array['AIR','TRUCK','OCEAN'])),
  origin_hub      text not null,
  dest_hub        text not null,
  total_shipments integer not null default 0,
  total_pieces    integer not null default 0,
  total_weight    numeric not null default 0,
  departure_date  date,
  arrival_date    date,
  departed_at     timestamptz,
  arrived_at      timestamptz,
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  closed_by       uuid references auth.users(id) on delete set null,
  departed_by     uuid references auth.users(id) on delete set null,
  arrived_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 4.5 shipments (depends on customers, manifests, auth.users)
create table if not exists public.shipments (
  id                uuid primary key default gen_random_uuid(),
  awb_number        text not null unique,  -- default bound after generate_awb_number is created
  status            text not null default 'CREATED'
                    check (status = any (array[
                      'CREATED','PICKUP_SCHEDULED','PICKED_UP','RECEIVED_AT_ORIGIN','IN_TRANSIT',
                      'RECEIVED_AT_DEST','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','RTO','EXCEPTION'
                    ])),
  service_level     text not null default 'STANDARD'
                    check (service_level = any (array['STANDARD','EXPRESS','PRIORITY'])),
  payment_mode      text not null default 'TO_PAY'
                    check (payment_mode = any (array['PAID','TO_PAY','TBB'])),
  transport_mode    text not null default 'AIR'
                    check (transport_mode = any (array['AIR','TRUCK','OCEAN'])),
  origin_hub        text not null default 'IMPHAL',
  dest_hub          text not null default 'NEW_DELHI',
  sender_name       text not null,
  sender_phone      text not null,
  sender_email      text,
  sender_address    text not null default '',
  sender_city       text not null default '',
  sender_state      text not null default '',
  sender_pincode    text not null default '',
  sender_gstin      text,
  receiver_name     text not null,
  receiver_phone    text not null,
  receiver_email    text,
  receiver_address  text not null default '',
  receiver_city     text not null default '',
  receiver_state    text not null default '',
  receiver_pincode  text not null default '',
  receiver_gstin    text,
  dead_weight       numeric not null default 0,
  volumetric_weight numeric not null default 0,
  chargeable_weight numeric not null default 0,
  pieces            integer not null default 1,
  description       text,
  rate_per_kg       numeric not null default 0,
  total_amount      numeric not null default 0,
  financials        jsonb,
  manifest_id       uuid references public.manifests(id) on delete set null,
  manifest_number   text,
  customer_id       uuid references public.customers(id) on delete set null,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  delivered_at      timestamptz,
  cancelled_at      timestamptz
);

-- 4.6 manifest_shipments (join table)
create table if not exists public.manifest_shipments (
  id          uuid primary key default gen_random_uuid(),
  manifest_id uuid not null references public.manifests(id) on delete cascade,
  awb_number  text not null references public.shipments(awb_number) on delete cascade,
  shipment_id uuid references public.shipments(id) on delete cascade,
  added_at    timestamptz not null default now(),
  added_by    uuid references auth.users(id) on delete set null,
  unique (manifest_id, awb_number)
);

-- 4.7 tracking_events (depends on shipments via awb_number)
create table if not exists public.tracking_events (
  id          uuid primary key default gen_random_uuid(),
  awb_number  text not null references public.shipments(awb_number) on delete cascade,
  status      text not null,
  description text not null default '',
  location    text not null default '',
  hub_code    text,
  source      text not null default 'MANUAL'
              check (source = any (array['SCAN','MANUAL','SYSTEM','API'])),
  staff_id    uuid references auth.users(id) on delete set null,
  staff_name  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- 4.8 invoices (depends on shipments, customers)
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  invoice_number  text not null unique,  -- default bound after generate_invoice_number is created
  status          text not null default 'DRAFT'
                  check (status = any (array['DRAFT','ISSUED','PAID','CANCELLED','OVERDUE'])),
  awb_number      text references public.shipments(awb_number) on delete set null,
  shipment_id     uuid references public.shipments(id) on delete set null,
  customer_id     uuid references public.customers(id) on delete set null,
  customer_name   text not null default '',
  customer_gstin  text,
  payment_mode    text not null default 'TO_PAY'
                  check (payment_mode = any (array['PAID','TO_PAY','TBB'])),
  base_freight    numeric not null default 0,
  docket_charge   numeric not null default 0,
  pickup_charge   numeric not null default 0,
  packing_charge  numeric not null default 0,
  fuel_surcharge  numeric not null default 0,
  handling_fee    numeric not null default 0,
  insurance       numeric not null default 0,
  discount        numeric not null default 0,
  tax             jsonb not null default '{"cgst": 0, "igst": 0, "sgst": 0, "total": 0}'::jsonb,
  total_amount    numeric not null default 0,
  advance_paid    numeric not null default 0,
  balance         numeric not null default 0,
  pdf_path        text,
  notes           text,
  due_date        date,
  issued_at       timestamptz,
  paid_at         timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 4.9 invoice_payments (depends on invoices)
create table if not exists public.invoice_payments (
  id              uuid primary key default gen_random_uuid(),
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  amount          numeric not null check (amount > 0),
  method          text not null
                  check (method = any (array['CASH','BANK_TRANSFER','UPI','CHEQUE','CARD','OTHER'])),
  reference       text,
  notes           text,
  received_at     timestamptz not null default now(),
  attachment_path text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null
);
comment on table public.invoice_payments is 'Per-payment ledger linked to invoices. Mutated only via record_invoice_payment RPC.';

-- 4.10 exceptions (depends on shipments)
create table if not exists public.exceptions (
  id          uuid primary key default gen_random_uuid(),
  awb_number  text references public.shipments(awb_number) on delete set null,
  shipment_id uuid references public.shipments(id) on delete cascade,
  type        text not null
              check (type = any (array[
                'DAMAGED','LOST','DELAYED','MISMATCH','PAYMENT_HOLD','MISROUTED',
                'ADDRESS_ISSUE','MISSING_PACKAGE','WRONG_HUB','ROUTE_MISMATCH','INVOICE_DISPUTE'
              ])),
  severity    text not null default 'MEDIUM'
              check (severity = any (array['LOW','MEDIUM','HIGH','CRITICAL'])),
  status      text not null default 'OPEN'
              check (status = any (array['OPEN','IN_PROGRESS','RESOLVED','CLOSED'])),
  description text not null,
  resolution  text,
  metadata    jsonb,
  reported_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4.11 notes (polymorphic — no entity FKs)
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null
              check (entity_type = any (array['CUSTOMER','SHIPMENT','MANIFEST','INVOICE','EXCEPTION'])),
  entity_id   uuid not null,
  body        jsonb not null,
  text_body   text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);
comment on table public.notes is 'Polymorphic notes thread attached to customers, shipments, manifests, invoices, exceptions.';

-- 4.12 rate_cards (depends on profiles)
create table if not exists public.rate_cards (
  id                 uuid primary key default gen_random_uuid(),
  origin_hub         text not null,
  dest_hub           text not null,
  service_level      text not null
                     check (service_level = any (array['STANDARD','PRIORITY','EXPRESS'])),
  weight_slab_min    numeric not null default 0,
  weight_slab_max    numeric not null default 99999,
  rate_per_kg        numeric not null,
  docket_charge      numeric not null default 0,
  fuel_surcharge_pct numeric not null default 0,
  handling_fee       numeric not null default 0,
  is_active          boolean not null default true,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 4.13 audit_logs
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id   uuid,
  action      text not null,
  description text not null default '',
  user_id     uuid references auth.users(id) on delete set null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- SECTION 5 — INDEXES
-- ============================================================================

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx     on public.audit_logs (entity_type, entity_id);

create index if not exists idx_hubs_active           on public.hubs (is_active) where (is_active = true);
create index if not exists idx_hubs_city             on public.hubs (city);

create index if not exists idx_invoice_payments_invoice on public.invoice_payments (invoice_id, received_at desc);
create index if not exists idx_invoice_payments_method  on public.invoice_payments (method);

create index if not exists idx_notes_author on public.notes (created_by);
create index if not exists idx_notes_entity on public.notes (entity_type, entity_id, created_at desc);

create unique index if not exists rate_cards_route_slab_idx
  on public.rate_cards (origin_hub, dest_hub, service_level, weight_slab_min, weight_slab_max)
  where (is_active = true);

create index if not exists shipments_created_at_idx on public.shipments (created_at desc);
create index if not exists shipments_manifest_id_idx on public.shipments (manifest_id);
create index if not exists shipments_status_idx     on public.shipments (status);

create index if not exists tracking_events_awb_idx        on public.tracking_events (awb_number);
create index if not exists tracking_events_created_at_idx on public.tracking_events (created_at desc);

-- ============================================================================
-- SECTION 6 — FUNCTIONS (verbatim from production via pg_get_functiondef)
-- ============================================================================
-- Order matters where function bodies reference other functions, but here
-- all function bodies reference only tables/sequences (already created).

create or replace function public.generate_awb_number()
returns text
language plpgsql
as $function$
begin
  return 'TAC' || to_char(now() at time zone 'UTC', 'YYMMDD') || lpad(nextval('public.awb_seq')::text, 5, '0');
end;
$function$;

create or replace function public.generate_invoice_number()
returns text
language plpgsql
as $function$
begin
  return 'INV-' || to_char(now() at time zone 'UTC', 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 5, '0');
end;
$function$;

create or replace function public.generate_manifest_number()
returns text
language plpgsql
as $function$
begin
  return 'MAN' || to_char(now() at time zone 'UTC', 'YYMMDD') || lpad(nextval('public.manifest_seq')::text, 4, '0');
end;
$function$;

-- Now bind the generated-number defaults (functions exist).
alter table public.shipments alter column awb_number       set default public.generate_awb_number();
alter table public.invoices  alter column invoice_number   set default public.generate_invoice_number();
alter table public.manifests alter column manifest_number  set default public.generate_manifest_number();

create or replace function public.get_user_role()
returns text
language sql
stable
security definer
as $function$
  select role from public.profiles where id = auth.uid()
$function$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $function$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

create or replace function public.count_shipments_by_status()
returns json
language plpgsql
security definer
as $function$
declare
  result json;
begin
  select json_object_agg(status, cnt)
  into result
  from (
    select status, count(*)::int as cnt
    from public.shipments
    group by status
  ) t;
  return coalesce(result, '{}'::json);
end;
$function$;

create or replace function public.get_finance_summary()
returns json
language plpgsql
security definer
as $function$
declare
  v_total_revenue numeric;
  v_outstanding   numeric;
  v_paid_count    int;
begin
  select
    coalesce(sum(case when status = 'PAID' then total_amount else 0 end), 0),
    coalesce(sum(case when status in ('ISSUED', 'OVERDUE') then balance else 0 end), 0),
    count(case when status = 'PAID' then 1 end)::int
  into v_total_revenue, v_outstanding, v_paid_count
  from public.invoices;

  return json_build_object(
    'totalRevenue', v_total_revenue,
    'outstanding',  v_outstanding,
    'paidCount',    v_paid_count
  );
end;
$function$;

create or replace function public.get_rate_card(p_origin text, p_dest text, p_service_level text, p_weight numeric)
returns table(id uuid, rate_per_kg numeric, docket_charge numeric, fuel_surcharge_pct numeric, handling_fee numeric)
language sql
stable
security definer
as $function$
  select
    rc.id,
    rc.rate_per_kg,
    rc.docket_charge,
    rc.fuel_surcharge_pct,
    rc.handling_fee
  from public.rate_cards rc
  where rc.origin_hub = p_origin
    and rc.dest_hub = p_dest
    and rc.service_level = p_service_level
    and rc.weight_slab_min <= p_weight
    and rc.weight_slab_max >= p_weight
    and rc.is_active = true
  order by rc.weight_slab_min desc
  limit 1;
$function$;

create or replace function public.generate_invoice(p_shipment_id uuid, p_staff_id uuid, p_discount numeric default 0)
returns uuid
language plpgsql
security definer
as $function$
declare
  v_shipment     record;
  v_invoice_id   uuid;
  v_base_freight numeric;
  v_total        numeric;
begin
  select * into v_shipment from public.shipments where id = p_shipment_id;
  if v_shipment is null then
    raise exception 'Shipment not found: %', p_shipment_id;
  end if;

  v_base_freight := v_shipment.chargeable_weight * v_shipment.rate_per_kg;
  v_total        := greatest(0, v_base_freight - p_discount);

  insert into public.invoices (
    awb_number, shipment_id, customer_id, customer_name,
    payment_mode, base_freight, discount, total_amount, balance,
    status, created_by
  )
  values (
    v_shipment.awb_number,
    p_shipment_id,
    v_shipment.customer_id,
    coalesce((select name from public.customers where id = v_shipment.customer_id), v_shipment.sender_name),
    v_shipment.payment_mode,
    v_base_freight,
    p_discount,
    v_total,
    v_total,
    'DRAFT',
    p_staff_id
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$function$;

create or replace function public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text default null,
  p_notes text default null,
  p_received_at timestamptz default now(),
  p_attachment_path text default null
)
returns public.invoice_payments
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_invoice     public.invoices%rowtype;
  v_new_balance numeric(12,2);
  v_new_advance numeric(12,2);
  v_payment     public.invoice_payments%rowtype;
begin
  -- Production currently checks for role 'OPERATOR' which is not a valid
  -- role in the profiles.role CHECK list. The 'OPERATOR' check is preserved
  -- here to reproduce production exactly. The fix is in a separate forward
  -- migration (see issue #78 acceptance criteria).
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('SUPER_ADMIN','OPERATOR')) then
    raise exception 'Unauthorized: only operators or super admins can record payments.' using errcode = '42501';
  end if;
  if p_amount <= 0 then
    raise exception 'Payment amount must be positive (got %).', p_amount using errcode = '22023';
  end if;
  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice % not found.', p_invoice_id using errcode = 'P0002';
  end if;
  if v_invoice.status in ('CANCELLED','PAID') then
    raise exception 'Cannot record payment on a % invoice.', v_invoice.status using errcode = '22023';
  end if;
  insert into public.invoice_payments
    (invoice_id, amount, method, reference, notes, received_at, attachment_path, created_by)
  values
    (p_invoice_id, p_amount, p_method, p_reference, p_notes, p_received_at, p_attachment_path, auth.uid())
  returning * into v_payment;
  v_new_advance := coalesce(v_invoice.advance_paid, 0) + p_amount;
  v_new_balance := greatest(0, v_invoice.total_amount - v_new_advance);
  update public.invoices
  set advance_paid = v_new_advance,
      balance      = v_new_balance,
      status       = case when v_new_balance = 0 then 'PAID' else 'ISSUED' end,
      paid_at      = case when v_new_balance = 0 then coalesce(paid_at, now()) else paid_at end,
      updated_at   = now()
  where id = p_invoice_id;
  return v_payment;
end;
$function$;

create or replace function public.resolve_exception(p_exception_id uuid, p_staff_id uuid, p_resolution text)
returns void
language plpgsql
security definer
as $function$
begin
  update public.exceptions
  set
    status      = 'RESOLVED',
    resolved_by = p_staff_id,
    resolution  = p_resolution,
    resolved_at = now(),
    updated_at  = now()
  where id = p_exception_id and status in ('OPEN', 'IN_PROGRESS');

  if not found then
    raise exception 'Exception % not found or already resolved', p_exception_id;
  end if;

  insert into public.audit_logs (entity_type, entity_id, action, description, user_id)
  values ('exception', p_exception_id, 'RESOLVED', 'Exception resolved: ' || p_resolution, p_staff_id);
end;
$function$;

create or replace function public.update_shipment_status(p_shipment_id uuid, p_new_status text, p_staff_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
as $function$
declare
  v_awb        text;
  v_staff_name text;
begin
  select awb_number into v_awb from public.shipments where id = p_shipment_id;
  if v_awb is null then
    raise exception 'Shipment not found: %', p_shipment_id;
  end if;

  select name into v_staff_name from public.profiles where id = p_staff_id;

  update public.shipments
  set
    status       = p_new_status,
    delivered_at = case when p_new_status = 'DELIVERED' then now() else delivered_at end,
    cancelled_at = case when p_new_status = 'CANCELLED' then now() else cancelled_at end,
    updated_at   = now()
  where id = p_shipment_id;

  insert into public.tracking_events (awb_number, status, description, source, staff_id, staff_name)
  values (
    v_awb,
    p_new_status,
    coalesce(p_notes, 'Status updated to ' || p_new_status),
    'MANUAL',
    p_staff_id,
    v_staff_name
  );

  insert into public.audit_logs (entity_type, entity_id, action, description, user_id)
  values ('shipment', p_shipment_id, 'STATUS_CHANGE', 'Status changed to ' || p_new_status, p_staff_id);
end;
$function$;

create or replace function public.add_shipment_to_manifest(p_manifest_id uuid, p_awb_number text, p_staff_id uuid)
returns void
language plpgsql
security definer
as $function$
declare
  v_shipment_id uuid;
  v_pieces      int;
  v_weight      numeric;
begin
  select id, pieces, chargeable_weight
  into v_shipment_id, v_pieces, v_weight
  from public.shipments
  where awb_number = p_awb_number;

  if v_shipment_id is null then
    raise exception 'Shipment not found: %', p_awb_number;
  end if;

  insert into public.manifest_shipments (manifest_id, awb_number, shipment_id, added_by)
  values (p_manifest_id, p_awb_number, v_shipment_id, p_staff_id);

  update public.shipments
  set manifest_id = p_manifest_id,
      manifest_number = (select manifest_number from public.manifests where id = p_manifest_id)
  where id = v_shipment_id;

  update public.manifests
  set
    total_shipments = total_shipments + 1,
    total_pieces    = total_pieces + coalesce(v_pieces, 1),
    total_weight    = total_weight + coalesce(v_weight, 0),
    updated_at      = now()
  where id = p_manifest_id;
end;
$function$;

create or replace function public.arrive_manifest(p_manifest_id uuid, p_staff_id uuid default null::uuid)
returns void
language plpgsql
security definer
as $function$
declare
  v_staff_id uuid := coalesce(p_staff_id, auth.uid());
begin
  update public.manifests
  set
    status      = 'ARRIVED',
    arrived_by  = v_staff_id,
    arrived_at  = now(),
    updated_at  = now()
  where id = p_manifest_id and status = 'DEPARTED';

  if not found then
    raise exception 'Manifest % not found or not in DEPARTED status', p_manifest_id;
  end if;
end;
$function$;

create or replace function public.depart_manifest(p_manifest_id uuid, p_staff_id uuid default null::uuid)
returns void
language plpgsql
security definer
as $function$
declare
  v_staff_id uuid := coalesce(p_staff_id, auth.uid());
begin
  update public.manifests
  set
    status      = 'DEPARTED',
    departed_by = v_staff_id,
    departed_at = now(),
    updated_at  = now()
  where id = p_manifest_id and status = 'CLOSED';

  if not found then
    raise exception 'Manifest % not found or not in CLOSED status', p_manifest_id;
  end if;
end;
$function$;

create or replace function public.close_manifest_atomic(p_manifest_id uuid, p_staff_id uuid default null::uuid)
returns void
language plpgsql
security definer
as $function$
declare
  v_staff_id uuid := coalesce(p_staff_id, auth.uid());
  v_count    integer;
begin
  select count(*) into v_count
  from public.manifest_shipments
  where manifest_id = p_manifest_id;

  update public.manifests
  set
    status     = 'CLOSED',
    closed_by  = v_staff_id,
    updated_at = now()
  where id = p_manifest_id and status in ('DRAFT','BUILDING','OPEN');

  if not found then
    raise exception 'Manifest % not found or cannot be closed from current status', p_manifest_id;
  end if;
end;
$function$;

create or replace function public.shipment_emit_created_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not exists (
    select 1 from public.tracking_events
    where awb_number = new.awb_number and status = 'CREATED'
  ) then
    insert into public.tracking_events
      (awb_number, status, description, location, hub_code, source, staff_id, created_at)
    values (
      new.awb_number,
      'CREATED',
      'Shipment created',
      coalesce(new.origin_hub, 'UNKNOWN'),
      coalesce(new.origin_hub, 'UNKNOWN'),
      'SYSTEM',
      new.created_by,
      coalesce(new.created_at, now())
    );
  end if;
  return new;
end;
$function$;

-- rls_auto_enable is an event trigger function — it fires on CREATE TABLE
-- DDL events. Reproduced verbatim from production.
create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

-- ============================================================================
-- SECTION 7 — TRIGGERS
-- ============================================================================

drop trigger if exists update_customers_updated_at  on public.customers;
create trigger        update_customers_updated_at  before update on public.customers  for each row execute function public.update_updated_at();

drop trigger if exists update_exceptions_updated_at on public.exceptions;
create trigger        update_exceptions_updated_at before update on public.exceptions for each row execute function public.update_updated_at();

drop trigger if exists update_invoices_updated_at   on public.invoices;
create trigger        update_invoices_updated_at   before update on public.invoices   for each row execute function public.update_updated_at();

drop trigger if exists update_manifests_updated_at  on public.manifests;
create trigger        update_manifests_updated_at  before update on public.manifests  for each row execute function public.update_updated_at();

drop trigger if exists update_profiles_updated_at   on public.profiles;
create trigger        update_profiles_updated_at   before update on public.profiles   for each row execute function public.update_updated_at();

drop trigger if exists rate_cards_updated_at        on public.rate_cards;
create trigger        rate_cards_updated_at        before update on public.rate_cards for each row execute function public.set_updated_at();

drop trigger if exists trg_shipment_created_event   on public.shipments;
create trigger        trg_shipment_created_event   after insert on public.shipments   for each row execute function public.shipment_emit_created_event();

drop trigger if exists update_shipments_updated_at  on public.shipments;
create trigger        update_shipments_updated_at  before update on public.shipments  for each row execute function public.update_updated_at();

-- ============================================================================
-- SECTION 8 — ROW LEVEL SECURITY (enable + policies)
-- ============================================================================

alter table public.profiles           enable row level security;
alter table public.customers          enable row level security;
alter table public.hubs               enable row level security;
alter table public.shipments          enable row level security;
alter table public.manifests          enable row level security;
alter table public.manifest_shipments enable row level security;
alter table public.tracking_events    enable row level security;
alter table public.invoices           enable row level security;
alter table public.invoice_payments   enable row level security;
alter table public.exceptions         enable row level security;
alter table public.notes              enable row level security;
alter table public.rate_cards         enable row level security;
alter table public.audit_logs         enable row level security;

-- audit_logs
create policy audit_logs_insert_auth   on public.audit_logs   for insert with check (auth.uid() is not null);
create policy audit_logs_select_admin  on public.audit_logs   for select using ((auth.uid() is not null) and (public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER'])));

-- customers
create policy customers_insert_auth    on public.customers    for insert with check (auth.uid() is not null);
create policy customers_select_auth    on public.customers    for select using (auth.uid() is not null);
create policy customers_update_auth    on public.customers    for update using (auth.uid() is not null);

-- exceptions
create policy exceptions_insert_auth   on public.exceptions   for insert with check (auth.uid() is not null);
create policy exceptions_select_auth   on public.exceptions   for select using (auth.uid() is not null);
create policy exceptions_update_auth   on public.exceptions   for update using (auth.uid() is not null);

-- hubs
create policy hubs_modify_super_admin     on public.hubs for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN'));
create policy hubs_select_authenticated   on public.hubs for select using (auth.role() = 'authenticated');

-- invoice_payments
-- KNOWN BUG (preserved to match production exactly): the with-check predicate
-- gates on role 'OPERATOR' which doesn't exist in profiles.role CHECK. Fixed
-- in a separate forward migration immediately after this baseline.
create policy invoice_payments_insert  on public.invoice_payments for insert with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = any (array['SUPER_ADMIN','OPERATOR'])));
create policy invoice_payments_select  on public.invoice_payments for select using (auth.role() = 'authenticated');

-- invoices
create policy invoices_insert_finance  on public.invoices for insert with check ((auth.uid() is not null) and (public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])));
create policy invoices_select_finance  on public.invoices for select using ((auth.uid() is not null) and (public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])));
create policy invoices_update_finance  on public.invoices for update using ((auth.uid() is not null) and (public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF'])));

-- manifest_shipments
create policy manifest_shipments_delete_auth on public.manifest_shipments for delete using (auth.uid() is not null);
create policy manifest_shipments_insert_auth on public.manifest_shipments for insert with check (auth.uid() is not null);
create policy manifest_shipments_select_auth on public.manifest_shipments for select using (auth.uid() is not null);

-- manifests
create policy manifests_insert_auth   on public.manifests for insert with check (auth.uid() is not null);
create policy manifests_select_auth   on public.manifests for select using (auth.uid() is not null);
create policy manifests_update_auth   on public.manifests for update using (auth.uid() is not null);

-- notes
create policy notes_delete_own_or_admin   on public.notes for delete using ((created_by = auth.uid()) or (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'SUPER_ADMIN')));
create policy notes_insert_authenticated  on public.notes for insert with check ((auth.role() = 'authenticated') and (created_by = auth.uid()));
create policy notes_select_authenticated  on public.notes for select using (auth.role() = 'authenticated');

-- profiles
create policy profiles_insert_on_signup on public.profiles for insert with check (auth.uid() = id);
create policy profiles_select_own       on public.profiles for select using (auth.uid() = id);
create policy profiles_update_own       on public.profiles for update using (auth.uid() = id);

-- rate_cards
create policy rate_cards_read   on public.rate_cards for select using (auth.role() = 'authenticated');
create policy rate_cards_write  on public.rate_cards for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = any (array['SUPER_ADMIN','ADMIN','MANAGER'])));

-- shipments
create policy shipments_delete_admin on public.shipments for delete using ((auth.uid() is not null) and (public.get_user_role() = any (array['SUPER_ADMIN','ADMIN'])));
create policy shipments_insert_auth  on public.shipments for insert with check (auth.uid() is not null);
create policy shipments_select_all   on public.shipments for select using (true);
create policy shipments_update_auth  on public.shipments for update using (auth.uid() is not null);

-- tracking_events
create policy tracking_events_insert_auth on public.tracking_events for insert with check (auth.uid() is not null);
create policy tracking_events_select_all  on public.tracking_events for select using (true);

-- ============================================================================
-- END OF BASELINE
-- ============================================================================

-- Re-enable function-body validation for any subsequent migrations in
-- the same session.
set check_function_bodies = on;
