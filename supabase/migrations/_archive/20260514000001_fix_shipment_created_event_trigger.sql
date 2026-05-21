-- Migration: corrective fix for shipment_emit_created_event trigger
--
-- Background: 20260512000004 introduced a CREATED-event trigger that does
-- NOT match the public.tracking_events schema declared in 20260430000002.
-- Specifically, the broken insert referenced columns that do not exist on
-- the table (location, source, staff_id), omitted required NOT NULL columns
-- (shipment_id, event_type), and used a non-existent enum literal
-- ('CREATED' is not a valid shipment_status — the canonical value is
-- 'pending'; the canonical tracking_event_type for this transition is
-- 'created').
--
-- Net effect of the broken migration: every shipment INSERT either fails
-- the trigger outright (NOT NULL violation on shipment_id / event_type) or
-- the migration itself fails to apply at the backfill step
-- (status = 'CREATED' is invalid for shipment_status).
--
-- This corrective migration:
--   1. Drops the broken trigger and function (defensive — IF EXISTS).
--   2. Recreates the function using the exact column list and enum
--      casts already used 6 times in 20260430000003_functions_and_rpcs.sql
--      (the canonical pattern).
--   3. Re-runs the backfill against the corrected schema. Idempotent:
--      uses (shipment_id, event_type='created') as the dedupe key — the
--      same key the broken migration intended via (awb_number, status).
--
-- ADDITIVE: pre-existing tracking_events rows are not touched. If the
-- broken backfill happened to insert any rows (it would not have, per
-- above) they would not have a 'created' event_type so this backfill
-- would re-create the canonical row. Acceptable.

drop trigger if exists trg_shipment_created_event on public.shipments;
drop function if exists public.shipment_emit_created_event();

create or replace function public.shipment_emit_created_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Defensive dedupe: skip if a 'created' event already exists for this
  -- shipment (e.g. bulk-import paths that emit their own canonical event).
  if not exists (
    select 1 from public.tracking_events
    where shipment_id = new.id and event_type = 'created'
  ) then
    insert into public.tracking_events (
      shipment_id,
      awb_number,
      event_type,
      status,
      hub_code,
      description,
      scanned_by,
      occurred_at
    ) values (
      new.id,
      new.awb_number,
      'created'::tracking_event_type,
      new.status,                      -- mirror the shipment's initial status
      nullif(new.origin_hub, ''),      -- '' is the column default; null is more honest
      'Shipment created',
      new.created_by,
      coalesce(new.created_at, now())
    );
  end if;
  return new;
end;
$$;

comment on function public.shipment_emit_created_event is
  'ADR-004 invariant: every shipment row emits a canonical CREATED tracking event. Fixed in 20260514000001 to match tracking_events schema.';

create trigger trg_shipment_created_event
  after insert on public.shipments
  for each row
  execute function public.shipment_emit_created_event();

-- Backfill: every existing shipment without a 'created' event gets one,
-- timestamped to its created_at so the timeline reads correctly. Idempotent.
insert into public.tracking_events (
  shipment_id,
  awb_number,
  event_type,
  status,
  hub_code,
  description,
  scanned_by,
  occurred_at
)
select
  s.id,
  s.awb_number,
  'created'::tracking_event_type,
  s.status,
  nullif(s.origin_hub, ''),
  'Shipment created',
  s.created_by,
  s.created_at
from public.shipments s
where not exists (
  select 1 from public.tracking_events te
  where te.shipment_id = s.id and te.event_type = 'created'
);
