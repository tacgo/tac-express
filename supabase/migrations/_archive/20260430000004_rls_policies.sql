-- ============================================================================
-- TAC Express — Row Level Security policies
-- Migration: 20260430000004
-- Pattern: enable RLS on every table, then declare role-based access.
-- ============================================================================

-- Enable RLS everywhere
alter table public.profiles            enable row level security;
alter table public.hubs                 enable row level security;
alter table public.customers            enable row level security;
alter table public.rate_cards           enable row level security;
alter table public.shipments            enable row level security;
alter table public.manifests            enable row level security;
alter table public.manifest_shipments   enable row level security;
alter table public.tracking_events      enable row level security;
alter table public.scans                enable row level security;
alter table public.exceptions           enable row level security;
alter table public.invoices             enable row level security;
alter table public.attachments          enable row level security;
alter table public.audit_logs           enable row level security;
alter table public.events               enable row level security;
alter table public.notifications        enable row level security;
alter table public.webhooks             enable row level security;
alter table public.webhook_deliveries   enable row level security;
alter table public.api_keys             enable row level security;
alter table public.saved_views          enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists "profiles read self or staff" on public.profiles;
create policy "profiles read self or staff" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_manager_or_above());

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles admin write" on public.profiles
  for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ----------------------------------------------------------------------------
-- hubs  (read: everyone authenticated, write: admin)
-- ----------------------------------------------------------------------------
drop policy if exists "hubs read" on public.hubs;
create policy "hubs read" on public.hubs
  for select to authenticated using (true);

drop policy if exists "hubs admin write" on public.hubs;
create policy "hubs admin write" on public.hubs
  for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ----------------------------------------------------------------------------
-- customers
-- ----------------------------------------------------------------------------
drop policy if exists "customers read staff" on public.customers;
create policy "customers read staff" on public.customers
  for select to authenticated
  using (public.is_operations_or_above() or public.is_finance_or_above() or public.is_warehouse_role());

drop policy if exists "customers manager write" on public.customers;
create policy "customers manager write" on public.customers
  for all to authenticated
  using (public.is_manager_or_above())
  with check (public.is_manager_or_above());

-- ----------------------------------------------------------------------------
-- rate_cards  (finance + admin)
-- ----------------------------------------------------------------------------
drop policy if exists "rate_cards read finance" on public.rate_cards;
create policy "rate_cards read finance" on public.rate_cards
  for select to authenticated
  using (public.is_finance_or_above() or public.is_operations_or_above());

drop policy if exists "rate_cards finance write" on public.rate_cards;
create policy "rate_cards finance write" on public.rate_cards
  for all to authenticated
  using (public.is_finance_or_above())
  with check (public.is_finance_or_above());

-- ----------------------------------------------------------------------------
-- shipments
-- ----------------------------------------------------------------------------
drop policy if exists "shipments read staff" on public.shipments;
create policy "shipments read staff" on public.shipments
  for select to authenticated
  using (
    public.is_operations_or_above()
    or public.is_finance_or_above()
    or (public.is_warehouse_role() and (origin_hub = public.current_user_hub() or dest_hub = public.current_user_hub()))
  );

drop policy if exists "shipments operations write" on public.shipments;
create policy "shipments operations write" on public.shipments
  for all to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- manifests
-- ----------------------------------------------------------------------------
drop policy if exists "manifests read staff" on public.manifests;
create policy "manifests read staff" on public.manifests
  for select to authenticated
  using (
    public.is_operations_or_above()
    or (public.is_warehouse_role() and (origin_hub = public.current_user_hub() or dest_hub = public.current_user_hub()))
  );

drop policy if exists "manifests operations write" on public.manifests;
create policy "manifests operations write" on public.manifests
  for all to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- manifest_shipments
-- ----------------------------------------------------------------------------
drop policy if exists "manifest_shipments read staff" on public.manifest_shipments;
create policy "manifest_shipments read staff" on public.manifest_shipments
  for select to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role());

drop policy if exists "manifest_shipments operations write" on public.manifest_shipments;
create policy "manifest_shipments operations write" on public.manifest_shipments
  for all to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- tracking_events  (read: staff + public via service role; write: staff)
-- ----------------------------------------------------------------------------
drop policy if exists "tracking_events read staff" on public.tracking_events;
create policy "tracking_events read staff" on public.tracking_events
  for select to authenticated using (true);

drop policy if exists "tracking_events operations write" on public.tracking_events;
create policy "tracking_events operations write" on public.tracking_events
  for all to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- scans  (warehouse + ops, read+write)
-- ----------------------------------------------------------------------------
drop policy if exists "scans read staff" on public.scans;
create policy "scans read staff" on public.scans
  for select to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role());

drop policy if exists "scans staff write" on public.scans;
create policy "scans staff write" on public.scans
  for all to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- exceptions
-- ----------------------------------------------------------------------------
drop policy if exists "exceptions read staff" on public.exceptions;
create policy "exceptions read staff" on public.exceptions
  for select to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role());

drop policy if exists "exceptions ops write" on public.exceptions;
create policy "exceptions ops write" on public.exceptions
  for all to authenticated
  using (public.is_operations_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- invoices
-- ----------------------------------------------------------------------------
drop policy if exists "invoices read finance" on public.invoices;
create policy "invoices read finance" on public.invoices
  for select to authenticated
  using (public.is_finance_or_above() or public.is_operations_or_above());

drop policy if exists "invoices finance write" on public.invoices;
create policy "invoices finance write" on public.invoices
  for all to authenticated
  using (public.is_finance_or_above())
  with check (public.is_finance_or_above());

-- ----------------------------------------------------------------------------
-- attachments
-- ----------------------------------------------------------------------------
drop policy if exists "attachments read staff" on public.attachments;
create policy "attachments read staff" on public.attachments
  for select to authenticated
  using (public.is_operations_or_above() or public.is_finance_or_above() or public.is_warehouse_role());

drop policy if exists "attachments staff write" on public.attachments;
create policy "attachments staff write" on public.attachments
  for all to authenticated
  using (public.is_operations_or_above() or public.is_finance_or_above() or public.is_warehouse_role())
  with check (public.is_operations_or_above() or public.is_finance_or_above() or public.is_warehouse_role());

-- ----------------------------------------------------------------------------
-- audit_logs (write disallowed at row level — only via SECURITY DEFINER trigger)
-- ----------------------------------------------------------------------------
drop policy if exists "audit_logs read managers" on public.audit_logs;
create policy "audit_logs read managers" on public.audit_logs
  for select to authenticated using (public.is_manager_or_above());

-- intentionally no INSERT/UPDATE/DELETE policy → no client writes possible

-- ----------------------------------------------------------------------------
-- events
-- ----------------------------------------------------------------------------
drop policy if exists "events read managers" on public.events;
create policy "events read managers" on public.events
  for select to authenticated using (public.is_manager_or_above());

-- ----------------------------------------------------------------------------
-- notifications  (per-user)
-- ----------------------------------------------------------------------------
drop policy if exists "notifications read self" on public.notifications;
create policy "notifications read self" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications update self" on public.notifications;
create policy "notifications update self" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications admin write" on public.notifications;
create policy "notifications admin write" on public.notifications
  for insert to authenticated
  with check (public.is_admin_or_above() or user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- webhooks
-- ----------------------------------------------------------------------------
drop policy if exists "webhooks read admin" on public.webhooks;
create policy "webhooks read admin" on public.webhooks
  for select to authenticated using (public.is_admin_or_above());

drop policy if exists "webhooks admin write" on public.webhooks;
create policy "webhooks admin write" on public.webhooks
  for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

drop policy if exists "webhook_deliveries read admin" on public.webhook_deliveries;
create policy "webhook_deliveries read admin" on public.webhook_deliveries
  for select to authenticated using (public.is_admin_or_above());

-- ----------------------------------------------------------------------------
-- api_keys
-- ----------------------------------------------------------------------------
drop policy if exists "api_keys read admin" on public.api_keys;
create policy "api_keys read admin" on public.api_keys
  for select to authenticated using (public.is_admin_or_above());

drop policy if exists "api_keys admin write" on public.api_keys;
create policy "api_keys admin write" on public.api_keys
  for all to authenticated
  using (public.is_admin_or_above())
  with check (public.is_admin_or_above());

-- ----------------------------------------------------------------------------
-- saved_views (per user)
-- ----------------------------------------------------------------------------
drop policy if exists "saved_views read self or shared" on public.saved_views;
create policy "saved_views read self or shared" on public.saved_views
  for select to authenticated
  using (user_id = auth.uid() or is_shared = true);

drop policy if exists "saved_views write self" on public.saved_views;
create policy "saved_views write self" on public.saved_views
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
