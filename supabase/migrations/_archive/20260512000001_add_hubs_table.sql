-- Migration: add hubs master table (TestSprite TC011 unblock + manifest creation)
--
-- Context: existing shipments store `origin_hub` / `dest_hub` as plain text
-- ("IMPHAL", "NEW_DELHI", etc.). The manifest builder wizard depends on a
-- `useHubs()` query that selects from `public.hubs` — which never landed in
-- the deployed schema (despite being declared in 20260430000002_core_schema.sql).
-- Without this table:
--   * Manifest "+ New" wizard hub picker shows "No results"
--   * /management page can't enumerate or create hubs
--   * Fresh operators are blocked from building manifests
--
-- This migration is ADDITIVE — no existing data is touched. Seeded codes
-- match the strings the existing shipments + manifests already use, so
-- routing continues to work without backfill.

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

create index if not exists idx_hubs_active on public.hubs(is_active) where is_active = true;
create index if not exists idx_hubs_city   on public.hubs(city);

comment on table public.hubs is 'Origin/destination hub master data referenced by manifests + shipments.';

-- RLS: authenticated read; SUPER_ADMIN write.
alter table public.hubs enable row level security;

drop policy if exists hubs_select_authenticated on public.hubs;
create policy hubs_select_authenticated on public.hubs
  for select using (auth.role() = 'authenticated');

drop policy if exists hubs_modify_super_admin on public.hubs;
create policy hubs_modify_super_admin on public.hubs
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'super_admin'
    )
  );

-- Seed hubs matching existing shipment/manifest codes.
-- pincode + address are NOT NULL on the hubs table (per 20260430000002),
-- so the seed must include both. Production hubs already have authoritative
-- values; these placeholder seeds only fire on a fresh local DB.
insert into public.hubs (code, name, city, state, pincode, address) values
  ('IMPHAL',    'Imphal Hub',     'Imphal',    'Manipur',     '795001', 'Imphal Hub Office'),
  ('NEW_DELHI', 'New Delhi Hub',  'New Delhi', 'Delhi',       '110001', 'New Delhi Hub Office'),
  ('BOM',       'Mumbai Hub',     'Mumbai',    'Maharashtra', '400001', 'Mumbai Hub Office'),
  ('MAA',       'Chennai Hub',    'Chennai',   'Tamil Nadu',  '600001', 'Chennai Hub Office'),
  ('BLR',       'Bangalore Hub',  'Bangalore', 'Karnataka',   '560001', 'Bangalore Hub Office'),
  ('CCU',       'Kolkata Hub',    'Kolkata',   'West Bengal', '700001', 'Kolkata Hub Office'),
  ('HYD',       'Hyderabad Hub',  'Hyderabad', 'Telangana',   '500001', 'Hyderabad Hub Office'),
  ('PNQ',       'Pune Hub',       'Pune',      'Maharashtra', '411001', 'Pune Hub Office')
on conflict (code) do nothing;
