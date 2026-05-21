-- Migration: auto-create CREATED tracking event on shipment insert + backfill
--
-- Per ADR-004: shipment.status is event-derived from public.tracking_events.
-- Every shipment must carry at least one row in tracking_events so the
-- detail-page Tracking tab + public /track render a timeline. Today
-- createShipment() only inserts the shipment row — leaving zero events.
-- That breaks TC007 (TestSprite: "NO EVENTS · No tracking events yet")
-- and silently violates the ADR invariant for every existing shipment.
--
-- This migration:
--   1. Installs an AFTER INSERT trigger on public.shipments that emits a
--      canonical CREATED event into public.tracking_events.
--   2. Backfills CREATED events for every existing shipment that doesn't
--      already have one (idempotent — WHERE NOT EXISTS guard).
--
-- ADDITIVE: existing tracking_events are not touched. The trigger fires
-- only on future inserts.

create or replace function public.shipment_emit_created_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Defensive: only emit if the row doesn't already have a CREATED event
  -- (e.g. bulk-import paths that insert their own canonical event).
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
$$;

comment on function public.shipment_emit_created_event is
  'ADR-004 invariant: every shipment row emits a canonical CREATED tracking event.';

drop trigger if exists trg_shipment_created_event on public.shipments;
create trigger trg_shipment_created_event
  after insert on public.shipments
  for each row
  execute function public.shipment_emit_created_event();

-- Backfill removed 2026-05-15. The original INSERT referenced columns
-- (location, source, staff_id) that don't exist on the repo's
-- tracking_events schema (per 20260430000002_core_schema.sql, which
-- declares: shipment_id, awb_number, event_type, status, hub_code,
-- description, occurred_at, scanned_by, metadata, created_at).
--
-- PostgreSQL validates an INSERT's column list at parse time even when
-- the SELECT returns zero rows. So on a fresh `supabase db reset` this
-- INSERT aborts the entire migration — blocking 20260514000001 (#73,
-- the corrective trigger fix), 20260514000002 (#76, role gates),
-- 20260514000003 (#79 partial), and every subsequent migration from
-- running.
--
-- The trigger function defined above has the SAME column bug, but is
-- lazily validated — only fails when actually called. On a fresh DB
-- no shipments exist to trigger it. Migration 20260514000001 (#73)
-- immediately follows this one and REPLACES the function body with
-- the correct columns via CREATE OR REPLACE.
--
-- Net effect of this fix: 20260512000004 applies cleanly on a fresh
-- stack, then 20260514000001 swaps the broken function body for the
-- correct one. The conceptual backfill (every shipment gets a CREATED
-- tracking_event) is now performed by 20260514000001's backfill query,
-- which uses the correct repo schema.
--
-- Production is unaffected by this edit: production's migration history
-- ends at 20260512164008 (a DIFFERENT filename for the same intent —
-- see supabase/snapshots/REPO-VS-PRODUCTION-DIVERGENCE-2026-05-14.md).
-- Production never had this filename's content applied; editing it
-- changes nothing in production's recorded state.
-- ----------------------------------------------------------------------
-- (original backfill INSERT removed — see 20260514000001 for the
--  correctly-columned replacement)
