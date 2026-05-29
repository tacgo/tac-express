-- H-4: replace anon SELECT on shipments/tracking_events with SECURITY DEFINER RPCs
-- that return a curated column projection.
--
-- Prior posture: `qual=true` SELECT on both tables allowed any anon-key holder
-- to read every column for any AWB they could guess — including
-- receiver_phone, full addresses, financial totals.
--
-- New posture: a narrow RPC returns only the columns the public tracking page
-- needs (no phone, no address, no financials). The RPC is the only public
-- read path; the underlying tables drop their permissive policies.

-- ── get_public_shipment(awb) ─────────────────────────────────────────────────
create or replace function public.get_public_shipment(p_awb text)
returns table (
  id              uuid,
  awb_number      text,
  status          text,
  sender_name     text,
  receiver_name   text,
  origin_hub      text,
  dest_hub        text,
  chargeable_weight numeric,
  pieces          integer,
  manifest_number text,
  service_level   text,
  created_at      timestamptz,
  updated_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    id, awb_number, status, sender_name, receiver_name,
    origin_hub, dest_hub, chargeable_weight, pieces,
    manifest_number, service_level, created_at, updated_at
  from public.shipments
  where awb_number = upper(trim(p_awb))
  limit 1;
$$;

revoke execute on function public.get_public_shipment(text) from public;
grant  execute on function public.get_public_shipment(text) to anon, authenticated;

-- ── get_public_tracking_events(awb) ──────────────────────────────────────────
create or replace function public.get_public_tracking_events(p_awb text)
returns table (
  id          uuid,
  awb_number  text,
  status      text,
  description text,
  location    text,
  hub_code    text,
  source      text,
  created_at  timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    id, awb_number, status, description, location,
    hub_code, source, created_at
  from public.tracking_events
  where awb_number = upper(trim(p_awb))
  order by created_at desc
  limit 100;
$$;

revoke execute on function public.get_public_tracking_events(text) from public;
grant  execute on function public.get_public_tracking_events(text) to anon, authenticated;

-- ── Tighten the underlying tables to authenticated-only SELECT ──────────────
-- The RPCs above bypass RLS (SECURITY DEFINER), so anon callers still get
-- their curated projection via the RPC. Direct table reads now require auth.
drop policy if exists "shipments_select_public" on public.shipments;
drop policy if exists "shipments_select"        on public.shipments;
create policy "shipments_select_authenticated" on public.shipments
  for select using (auth.uid() is not null);

drop policy if exists "tracking_events_select_public" on public.tracking_events;
drop policy if exists "tracking_events_select"        on public.tracking_events;
create policy "tracking_events_select_authenticated" on public.tracking_events
  for select using (auth.uid() is not null);
