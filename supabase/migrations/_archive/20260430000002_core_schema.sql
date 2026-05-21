-- ============================================================================
-- TAC Express — Core schema: tables, indexes, foreign keys
-- Migration: 20260430000002
-- Tables: profiles, hubs, customers, rate_cards, shipments, manifests,
--         manifest_shipments, tracking_events, scans, exceptions, invoices,
--         attachments, audit_logs, events, notifications, webhooks,
--         webhook_deliveries, api_keys, saved_views.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           citext not null unique,
  name            text not null default '',
  role            user_role not null default 'customer',
  hub_code        text,
  phone           text,
  avatar_url      text,
  is_active       boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_hub  on public.profiles(hub_code);
create index if not exists idx_profiles_active on public.profiles(is_active) where is_active = true;

-- ----------------------------------------------------------------------------
-- hubs
-- ----------------------------------------------------------------------------
create table if not exists public.hubs (
  id              uuid primary key default extensions.uuid_generate_v4(),
  code            text not null unique,
  name            text not null,
  city            text not null,
  state           text not null,
  country         text not null default 'IN',
  pincode         text not null,
  address         text not null,
  manager_id      uuid references public.profiles(id) on delete set null,
  is_origin       boolean not null default true,
  is_destination  boolean not null default true,
  is_active       boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_hubs_active on public.hubs(is_active) where is_active = true;
create index if not exists idx_hubs_city on public.hubs(city);

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id                    uuid primary key default extensions.uuid_generate_v4(),
  customer_code         text unique,
  name                  text not null,
  email                 citext,
  phone                 text not null,
  gstin                 text,
  pan                   text,
  address_line1         text not null default '',
  address_line2         text,
  city                  text not null default '',
  state                 text not null default '',
  zip                   text not null default '',
  country               text not null default 'IN',
  credit_limit          numeric(14,2) not null default 0,
  outstanding_balance   numeric(14,2) not null default 0,
  total_revenue         numeric(14,2) not null default 0,
  total_shipments       integer not null default 0,
  classification        text not null default 'standard', -- standard | vip | strategic
  tags                  text[] not null default '{}',
  preferred_payment     payment_mode not null default 'prepaid',
  is_active             boolean not null default true,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_customers_name on public.customers using gin (name gin_trgm_ops);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_active on public.customers(is_active) where is_active = true;
create index if not exists idx_customers_classification on public.customers(classification);

-- ----------------------------------------------------------------------------
-- rate_cards
-- ----------------------------------------------------------------------------
create table if not exists public.rate_cards (
  id                uuid primary key default extensions.uuid_generate_v4(),
  customer_id       uuid references public.customers(id) on delete cascade,
  name              text not null,
  origin_hub        text,
  dest_hub          text,
  service_level     service_level not null default 'standard',
  transport_mode    transport_mode not null default 'road',
  base_rate         numeric(14,2) not null default 0,
  rate_per_kg       numeric(14,2) not null default 0,
  min_charge        numeric(14,2) not null default 0,
  fuel_surcharge_pct numeric(6,3) not null default 0,
  handling_fee     numeric(14,2) not null default 0,
  docket_charge    numeric(14,2) not null default 0,
  packing_charge   numeric(14,2) not null default 0,
  insurance_pct    numeric(6,3) not null default 0,
  volumetric_divisor integer not null default 5000,
  effective_from   date not null default current_date,
  effective_to     date,
  is_active        boolean not null default true,
  version          integer not null default 1,
  metadata         jsonb not null default '{}'::jsonb,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_rate_cards_customer on public.rate_cards(customer_id);
create index if not exists idx_rate_cards_active on public.rate_cards(is_active, effective_from, effective_to);
create index if not exists idx_rate_cards_route on public.rate_cards(origin_hub, dest_hub, service_level);

-- ----------------------------------------------------------------------------
-- shipments
-- ----------------------------------------------------------------------------
create table if not exists public.shipments (
  id                  uuid primary key default extensions.uuid_generate_v4(),
  awb_number          text not null unique,
  customer_id         uuid references public.customers(id) on delete set null,
  status              shipment_status not null default 'pending',
  service_level       service_level not null default 'standard',
  transport_mode      transport_mode not null default 'road',
  payment_mode        payment_mode not null default 'prepaid',

  -- sender
  sender_name         text not null,
  sender_phone        text not null,
  sender_email        citext,
  sender_gstin        text,
  sender_address      text not null default '',
  sender_city         text not null default '',
  sender_state        text not null default '',
  sender_pincode      text not null default '',

  -- receiver
  receiver_name       text not null,
  receiver_phone      text not null,
  receiver_email      citext,
  receiver_gstin      text,
  receiver_address    text not null default '',
  receiver_city       text not null default '',
  receiver_state      text not null default '',
  receiver_pincode    text not null default '',

  -- routing
  origin_hub          text not null default '',
  dest_hub            text not null default '',
  manifest_id         uuid,
  manifest_number     text,

  -- packaging
  pieces              integer not null default 1,
  dead_weight         numeric(10,3) not null default 0,
  volumetric_weight   numeric(10,3) not null default 0,
  chargeable_weight   numeric(10,3) not null default 0,
  rate_per_kg         numeric(10,2) not null default 0,
  declared_value      numeric(14,2) not null default 0,

  -- finance
  total_amount        numeric(14,2) not null default 0,
  financials          jsonb,

  -- meta
  description         text,
  reference_number    text,
  promised_delivery_at timestamptz,
  delivered_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_reason    text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_shipments_status on public.shipments(status);
create index if not exists idx_shipments_customer on public.shipments(customer_id);
create index if not exists idx_shipments_origin_dest on public.shipments(origin_hub, dest_hub);
create index if not exists idx_shipments_manifest on public.shipments(manifest_id);
create index if not exists idx_shipments_created on public.shipments(created_at desc);
create index if not exists idx_shipments_promised on public.shipments(promised_delivery_at) where status not in ('delivered', 'cancelled', 'returned');
create index if not exists idx_shipments_awb_trgm on public.shipments using gin (awb_number gin_trgm_ops);
create index if not exists idx_shipments_receiver_trgm on public.shipments using gin (receiver_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- manifests
-- ----------------------------------------------------------------------------
create table if not exists public.manifests (
  id                uuid primary key default extensions.uuid_generate_v4(),
  manifest_number   text not null unique,
  status            manifest_status not null default 'open',
  origin_hub        text not null,
  dest_hub          text not null,
  transport_mode    transport_mode not null default 'road',
  vehicle_number    text,
  driver_name       text,
  driver_phone      text,
  total_shipments   integer not null default 0,
  total_pieces      integer not null default 0,
  total_weight      numeric(12,3) not null default 0,
  total_value       numeric(14,2) not null default 0,
  notes             text,
  departure_date    date,
  arrival_date      date,
  closed_at         timestamptz,
  closed_by         uuid references public.profiles(id) on delete set null,
  departed_at       timestamptz,
  departed_by       uuid references public.profiles(id) on delete set null,
  arrived_at        timestamptz,
  arrived_by        uuid references public.profiles(id) on delete set null,
  reconciled_at     timestamptz,
  reconciled_by     uuid references public.profiles(id) on delete set null,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_manifests_status on public.manifests(status);
create index if not exists idx_manifests_origin_dest on public.manifests(origin_hub, dest_hub);
create index if not exists idx_manifests_created on public.manifests(created_at desc);

-- shipments → manifest FK (created after both tables exist)
alter table public.shipments
  drop constraint if exists shipments_manifest_id_fkey;
alter table public.shipments
  add constraint shipments_manifest_id_fkey
  foreign key (manifest_id) references public.manifests(id) on delete set null;

-- ----------------------------------------------------------------------------
-- manifest_shipments (junction)
-- ----------------------------------------------------------------------------
create table if not exists public.manifest_shipments (
  id            uuid primary key default extensions.uuid_generate_v4(),
  manifest_id   uuid not null references public.manifests(id) on delete cascade,
  shipment_id   uuid references public.shipments(id) on delete set null,
  awb_number    text not null,
  added_at      timestamptz not null default now(),
  added_by      uuid references public.profiles(id) on delete set null,
  unique (manifest_id, awb_number)
);

create index if not exists idx_manifest_shipments_manifest on public.manifest_shipments(manifest_id);
create index if not exists idx_manifest_shipments_awb on public.manifest_shipments(awb_number);

-- ----------------------------------------------------------------------------
-- tracking_events  (canonical event log per shipment)
-- ----------------------------------------------------------------------------
create table if not exists public.tracking_events (
  id              uuid primary key default extensions.uuid_generate_v4(),
  shipment_id     uuid not null references public.shipments(id) on delete cascade,
  awb_number      text not null,
  event_type      tracking_event_type not null,
  status          shipment_status,
  hub_code        text,
  description     text not null default '',
  occurred_at     timestamptz not null default now(),
  scanned_by      uuid references public.profiles(id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_tracking_shipment on public.tracking_events(shipment_id, occurred_at desc);
create index if not exists idx_tracking_awb on public.tracking_events(awb_number, occurred_at desc);
create index if not exists idx_tracking_type on public.tracking_events(event_type);

-- ----------------------------------------------------------------------------
-- scans (mobile/handheld scan log — separate from tracking_events for dedupe)
-- ----------------------------------------------------------------------------
create table if not exists public.scans (
  id              uuid primary key default extensions.uuid_generate_v4(),
  awb_number      text not null,
  shipment_id     uuid references public.shipments(id) on delete set null,
  manifest_id     uuid references public.manifests(id) on delete set null,
  scan_type       text not null,         -- inbound | outbound | manifest_add | dispatch | delivery
  hub_code        text,
  device_id       text,
  client_event_id text,                   -- idempotency key from offline queue
  scanned_by      uuid references public.profiles(id) on delete set null,
  scanned_at      timestamptz not null default now(),
  is_synced       boolean not null default true,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  unique (client_event_id)
);

create index if not exists idx_scans_awb on public.scans(awb_number, scanned_at desc);
create index if not exists idx_scans_manifest on public.scans(manifest_id);
create index if not exists idx_scans_user on public.scans(scanned_by, scanned_at desc);

-- ----------------------------------------------------------------------------
-- exceptions
-- ----------------------------------------------------------------------------
create table if not exists public.exceptions (
  id              uuid primary key default extensions.uuid_generate_v4(),
  shipment_id     uuid references public.shipments(id) on delete cascade,
  awb_number      text references public.shipments(awb_number) on delete cascade,
  type            text not null,           -- damage | misroute | delay | lost | refused | address_invalid
  severity        exception_severity not null default 'medium',
  status          exception_status not null default 'open',
  description     text not null,
  resolution      text,
  reported_by     uuid references public.profiles(id) on delete set null,
  resolved_by     uuid references public.profiles(id) on delete set null,
  resolved_at     timestamptz,
  escalated_at    timestamptz,
  escalated_to    uuid references public.profiles(id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_exceptions_status on public.exceptions(status);
create index if not exists idx_exceptions_severity on public.exceptions(severity);
create index if not exists idx_exceptions_shipment on public.exceptions(shipment_id);
create index if not exists idx_exceptions_open on public.exceptions(created_at desc) where status = 'open';

-- ----------------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------------
create table if not exists public.invoices (
  id                  uuid primary key default extensions.uuid_generate_v4(),
  invoice_number      text not null unique,
  customer_id         uuid references public.customers(id) on delete set null,
  customer_name       text not null default '',
  customer_gstin      text,
  shipment_id         uuid references public.shipments(id) on delete set null,
  awb_number          text references public.shipments(awb_number) on delete set null,

  base_freight        numeric(14,2) not null default 0,
  fuel_surcharge      numeric(14,2) not null default 0,
  handling_fee        numeric(14,2) not null default 0,
  docket_charge       numeric(14,2) not null default 0,
  packing_charge      numeric(14,2) not null default 0,
  pickup_charge       numeric(14,2) not null default 0,
  insurance           numeric(14,2) not null default 0,
  discount            numeric(14,2) not null default 0,
  tax                 jsonb not null default '{"cgst":0,"sgst":0,"igst":0}'::jsonb,

  total_amount        numeric(14,2) not null default 0,
  advance_paid        numeric(14,2) not null default 0,
  balance             numeric(14,2) not null default 0,

  status              invoice_status not null default 'draft',
  payment_mode        payment_mode not null default 'prepaid',
  due_date            date,
  issued_at           timestamptz,
  paid_at             timestamptz,
  cancelled_at        timestamptz,
  notes               text,
  pdf_path            text,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_customer on public.invoices(customer_id);
create index if not exists idx_invoices_due on public.invoices(due_date) where status in ('issued', 'partial', 'overdue');
create index if not exists idx_invoices_shipment on public.invoices(shipment_id);

-- ----------------------------------------------------------------------------
-- attachments  (POD photos, signatures, exception photos, invoice PDFs)
-- ----------------------------------------------------------------------------
create table if not exists public.attachments (
  id              uuid primary key default extensions.uuid_generate_v4(),
  bucket          text not null,
  storage_path    text not null,
  entity_type     text not null,    -- shipment | invoice | manifest | exception
  entity_id       uuid not null,
  filename        text not null,
  mime_type       text not null,
  size_bytes      bigint not null default 0,
  category        text not null default 'document', -- document | photo | signature | label | invoice_pdf
  uploaded_by     uuid references public.profiles(id) on delete set null,
  uploaded_at     timestamptz not null default now(),
  metadata        jsonb not null default '{}'::jsonb
);

create index if not exists idx_attachments_entity on public.attachments(entity_type, entity_id);
create index if not exists idx_attachments_uploaded on public.attachments(uploaded_at desc);

-- ----------------------------------------------------------------------------
-- audit_logs  (preserves existing shape; extends it)
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id            uuid primary key default extensions.uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete set null,
  action        text not null,        -- create | update | delete | login | logout | role_change | etc
  entity_type   text not null,
  entity_id     uuid,
  description   text not null default '',
  old_values    jsonb,
  new_values    jsonb,
  ip_address    inet,
  user_agent    text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_audit_user on public.audit_logs(user_id, created_at desc);
create index if not exists idx_audit_entity on public.audit_logs(entity_type, entity_id, created_at desc);
create index if not exists idx_audit_action on public.audit_logs(action);

-- ----------------------------------------------------------------------------
-- events  (business event stream — distinct from audit_logs, drives webhooks)
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id            uuid primary key default extensions.uuid_generate_v4(),
  event_type    webhook_event not null,
  entity_type   text not null,
  entity_id     uuid not null,
  payload       jsonb not null,
  emitted_by    uuid references public.profiles(id) on delete set null,
  emitted_at    timestamptz not null default now()
);

create index if not exists idx_events_type on public.events(event_type, emitted_at desc);
create index if not exists idx_events_entity on public.events(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- notifications
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default extensions.uuid_generate_v4(),
  user_id       uuid references public.profiles(id) on delete cascade,
  channel       notification_channel not null default 'in_app',
  title         text not null,
  body          text not null,
  link          text,
  entity_type   text,
  entity_id     uuid,
  is_read       boolean not null default false,
  read_at       timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where is_read = false;

-- ----------------------------------------------------------------------------
-- webhooks
-- ----------------------------------------------------------------------------
create table if not exists public.webhooks (
  id            uuid primary key default extensions.uuid_generate_v4(),
  name          text not null,
  url           text not null,
  secret        text not null,
  events        webhook_event[] not null default '{}',
  is_active     boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_webhooks_active on public.webhooks(is_active) where is_active = true;

-- ----------------------------------------------------------------------------
-- webhook_deliveries (history of dispatched webhooks)
-- ----------------------------------------------------------------------------
create table if not exists public.webhook_deliveries (
  id              uuid primary key default extensions.uuid_generate_v4(),
  webhook_id      uuid not null references public.webhooks(id) on delete cascade,
  event_id        uuid references public.events(id) on delete set null,
  event_type      webhook_event not null,
  request_body    jsonb not null,
  response_status integer,
  response_body   text,
  attempt         integer not null default 1,
  succeeded       boolean not null default false,
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_webhook on public.webhook_deliveries(webhook_id, created_at desc);
create index if not exists idx_webhook_deliveries_event on public.webhook_deliveries(event_id);

-- ----------------------------------------------------------------------------
-- api_keys
-- ----------------------------------------------------------------------------
create table if not exists public.api_keys (
  id            uuid primary key default extensions.uuid_generate_v4(),
  name          text not null,
  key_prefix    text not null,        -- first 8 chars for display
  key_hash      text not null unique, -- sha256 of full key
  scope         api_key_scope not null default 'read_only',
  customer_id   uuid references public.customers(id) on delete cascade,
  is_active     boolean not null default true,
  last_used_at  timestamptz,
  expires_at    timestamptz,
  created_by    uuid references public.profiles(id) on delete set null,
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_api_keys_customer on public.api_keys(customer_id);
create index if not exists idx_api_keys_active on public.api_keys(is_active) where is_active = true;

-- ----------------------------------------------------------------------------
-- saved_views (per-user filter presets)
-- ----------------------------------------------------------------------------
create table if not exists public.saved_views (
  id            uuid primary key default extensions.uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  entity_type   text not null,        -- shipments | manifests | exceptions | invoices | customers
  name          text not null,
  filters       jsonb not null default '{}'::jsonb,
  sort          jsonb not null default '{}'::jsonb,
  is_pinned     boolean not null default false,
  is_shared     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_saved_views_user on public.saved_views(user_id);
create index if not exists idx_saved_views_entity on public.saved_views(entity_type);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
do $$
declare
  t record;
begin
  for t in
    select unnest(array[
      'profiles','hubs','customers','rate_cards','shipments','manifests',
      'exceptions','invoices','webhooks','saved_views'
    ]) as table_name
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t.table_name, t.table_name);
    execute format(
      'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t.table_name, t.table_name
    );
  end loop;
end $$;

-- ============================================================================
-- Comments (documentation lives with the schema)
-- ============================================================================

comment on table public.profiles            is 'Application-level identity. 1:1 with auth.users.';
comment on table public.hubs                is 'Origin/destination hub master data.';
comment on table public.customers           is 'Customers (shippers). Track credit, classification, payment preference.';
comment on table public.rate_cards          is 'Per-customer rate matrix. Versioned by effective_from/effective_to.';
comment on table public.shipments           is 'Single AWB shipment. Status lifecycle is driven by tracking_events.';
comment on table public.manifests           is 'Vehicle manifest grouping multiple shipments for a leg.';
comment on table public.manifest_shipments  is 'Junction: shipments inside a manifest (idempotent on awb_number).';
comment on table public.tracking_events     is 'Canonical timeline of shipment events. Public-tracking reads from here.';
comment on table public.scans               is 'Raw barcode scans, deduped by client_event_id (offline queue safe).';
comment on table public.exceptions          is 'Operational exceptions raised against shipments.';
comment on table public.invoices            is 'Customer billing.';
comment on table public.attachments         is 'File metadata for Supabase Storage objects.';
comment on table public.audit_logs          is 'System audit trail (write-only, never deleted).';
comment on table public.events              is 'Business event stream — drives webhooks and notifications.';
comment on table public.notifications       is 'In-app and external notifications.';
comment on table public.webhooks            is 'Customer/3rd-party webhook subscriptions.';
comment on table public.webhook_deliveries  is 'Delivery history per webhook.';
comment on table public.api_keys            is 'Customer API access tokens (sha256 hashed).';
comment on table public.saved_views         is 'Per-user filter presets.';
