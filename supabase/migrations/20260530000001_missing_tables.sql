-- Migration: missing tables required by services and edge functions.
-- Tables referenced by application code that were not yet in the production
-- schema: notifications, webhooks, webhook_deliveries, attachments, api_keys.
-- Without these tables, every code path that writes to them silently lost data
-- (notifications) or threw 500s (send-notification edge function).

-- ── notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  channel       text not null default 'in_app'
                  check (channel in ('in_app', 'email', 'sms', 'push', 'all')),
  title         text not null,
  body          text not null,
  link          text,
  entity_type   text,
  entity_id     uuid,
  is_read       boolean not null default false,
  read_at       timestamptz,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- RLS: users see their own notifications; managers see all.
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (
    auth.uid() = user_id
    or get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  );

create policy "notifications_insert_service" on public.notifications
  for insert with check (auth.uid() is not null);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

create index if not exists notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc)
  where not is_read;

-- ── webhooks ─────────────────────────────────────────────────────────────────
create table if not exists public.webhooks (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  url             text not null,
  secret          text not null,
  events          text[] not null default '{}',
  is_active       boolean not null default true,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count   integer not null default 0,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.webhooks enable row level security;

-- Only MANAGER+ can manage webhooks.
create policy "webhooks_manager_all" on public.webhooks
  for all using (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
  with check (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

create or replace function public.increment_webhook_failure(p_webhook_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.webhooks
  set failure_count = failure_count + 1
  where id = p_webhook_id;
$$;

revoke execute on function public.increment_webhook_failure(uuid) from public;
grant  execute on function public.increment_webhook_failure(uuid) to authenticated;

-- ── webhook_deliveries ───────────────────────────────────────────────────────
create table if not exists public.webhook_deliveries (
  id              uuid primary key default gen_random_uuid(),
  webhook_id      uuid not null references public.webhooks(id) on delete cascade,
  event_id        text,
  event_type      text not null,
  request_body    jsonb,
  response_status integer,
  response_body   text,
  attempt         integer not null default 1,
  succeeded       boolean not null default false,
  delivered_at    timestamptz not null default now()
);

alter table public.webhook_deliveries enable row level security;

create policy "webhook_deliveries_manager_select" on public.webhook_deliveries
  for select using (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

create policy "webhook_deliveries_service_insert" on public.webhook_deliveries
  for insert with check (auth.uid() is not null);

create index if not exists webhook_deliveries_webhook_idx
  on public.webhook_deliveries (webhook_id, delivered_at desc);

-- ── attachments ──────────────────────────────────────────────────────────────
create table if not exists public.attachments (
  id            uuid primary key default gen_random_uuid(),
  bucket        text not null,
  storage_path  text not null unique,
  entity_type   text not null,
  entity_id     uuid not null,
  filename      text not null,
  mime_type     text not null,
  size_bytes    bigint not null default 0,
  category      text not null default 'document',
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now(),
  metadata      jsonb not null default '{}'
);

alter table public.attachments enable row level security;

create policy "attachments_authenticated_select" on public.attachments
  for select using (auth.uid() is not null);

create policy "attachments_authenticated_insert" on public.attachments
  for insert with check (auth.uid() is not null);

create policy "attachments_manager_delete" on public.attachments
  for delete using (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

create index if not exists attachments_entity_idx
  on public.attachments (entity_type, entity_id, uploaded_at desc);

-- ── api_keys ─────────────────────────────────────────────────────────────────
create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  key_prefix    text not null,
  key_hash      text not null unique,
  scope         text not null default 'read',
  customer_id   uuid references public.customers(id) on delete cascade,
  is_active     boolean not null default true,
  last_used_at  timestamptz,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles(id) on delete set null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "api_keys_manager_all" on public.api_keys
  for all using (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'))
  with check (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER'));

create index if not exists api_keys_customer_idx
  on public.api_keys (customer_id, is_active);
