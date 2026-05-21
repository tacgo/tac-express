-- Migration: explicit role gates on 6 SECURITY DEFINER mutating RPCs
--
-- Background: 6 functions in 20260430000003_functions_and_rpcs.sql run as
-- SECURITY DEFINER (executor's privileges, not caller's), so RLS does NOT
-- filter what they touch. The only thing standing between an authenticated
-- low-privilege user and a write to manifests/shipments/exceptions is "the
-- UI doesn't expose the button." That's a one-layer authz model.
--
-- close_manifest_atomic and record_invoice_payment already do this check
-- correctly. This migration aligns the remaining 6:
--
--   - add_shipment_to_manifest
--   - depart_manifest
--   - arrive_manifest
--   - reconcile_manifest
--   - update_shipment_status
--   - resolve_exception
--
-- Pattern (matches close_manifest_atomic at line 176-178 of the original):
--   if not public.is_operations_or_above() and not public.is_warehouse_role() then
--     raise exception 'Insufficient privileges' using errcode = '42501';
--   end if;
--
-- Defense-in-depth: even if the UI / route handler / service layer is
-- bypassed, the database refuses the mutation. errcode 42501 maps to
-- PostgreSQL's "insufficient_privilege" SQLSTATE so callers can detect it.
--
-- ADDITIVE: function bodies otherwise unchanged. CREATE OR REPLACE preserves
-- grants and dependencies. No data is read or written by this migration.

-- ----------------------------------------------------------------------------
-- add_shipment_to_manifest
-- ----------------------------------------------------------------------------
-- Signature must match 20260430000003 (3-arg with p_staff_id) — otherwise this
-- migration creates a 2-arg overload alongside the 3-arg function, leaving
-- the app's 3-arg calls ungated. p_staff_id stays informational (body uses
-- auth.uid()).
create or replace function public.add_shipment_to_manifest(
  p_manifest_id uuid,
  p_awb_number  text,
  p_staff_id    uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shipment_id uuid;
  v_manifest_status manifest_status;
begin
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  select status into v_manifest_status from public.manifests where id = p_manifest_id;
  if v_manifest_status is null then
    raise exception 'Manifest % not found', p_manifest_id using errcode = 'P0002';
  end if;
  if v_manifest_status not in ('open') then
    raise exception 'Manifest % is %; cannot add shipments', p_manifest_id, v_manifest_status using errcode = 'P0001';
  end if;

  select id into v_shipment_id from public.shipments where awb_number = p_awb_number;
  if v_shipment_id is null then
    raise exception 'Shipment % not found', p_awb_number using errcode = 'P0002';
  end if;

  insert into public.manifest_shipments (manifest_id, shipment_id, awb_number, added_by)
  values (p_manifest_id, v_shipment_id, p_awb_number, auth.uid())
  on conflict (manifest_id, awb_number) do nothing;

  update public.shipments
     set manifest_id = p_manifest_id,
         manifest_number = (select manifest_number from public.manifests where id = p_manifest_id),
         status = case when status in ('pending','booked') then 'manifested'::shipment_status else status end,
         updated_at = now()
   where id = v_shipment_id;

  -- recompute manifest totals
  update public.manifests m
     set total_shipments = (select count(*) from public.manifest_shipments ms where ms.manifest_id = m.id),
         total_pieces    = coalesce((select sum(s.pieces) from public.manifest_shipments ms join public.shipments s on s.id = ms.shipment_id where ms.manifest_id = m.id), 0),
         total_weight    = coalesce((select sum(s.chargeable_weight) from public.manifest_shipments ms join public.shipments s on s.id = ms.shipment_id where ms.manifest_id = m.id), 0),
         total_value     = coalesce((select sum(s.declared_value) from public.manifest_shipments ms join public.shipments s on s.id = ms.shipment_id where ms.manifest_id = m.id), 0),
         updated_at      = now()
   where m.id = p_manifest_id;

  return json_build_object('manifest_id', p_manifest_id, 'awb_number', p_awb_number, 'success', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- depart_manifest
-- ----------------------------------------------------------------------------
create or replace function public.depart_manifest(
  p_manifest_id uuid,
  p_staff_id    uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  update public.manifests
     set status = 'in_transit',
         departed_at = now(),
         departed_by = auth.uid(),
         departure_date = coalesce(departure_date, current_date),
         updated_at = now()
   where id = p_manifest_id and status = 'closed';

  if not found then
    raise exception 'Manifest % must be closed before departure', p_manifest_id using errcode = 'P0001';
  end if;

  -- propagate to shipments
  update public.shipments s
     set status = 'in_transit',
         updated_at = now()
   where s.manifest_id = p_manifest_id
     and s.status in ('manifested','booked','pending');

  -- log per shipment
  insert into public.tracking_events (shipment_id, awb_number, event_type, status, hub_code, description, scanned_by)
  select s.id, s.awb_number, 'departed_origin_hub', 'in_transit', s.origin_hub, 'Manifest ' || m.manifest_number || ' departed', auth.uid()
  from public.shipments s
  join public.manifests m on m.id = s.manifest_id
  where s.manifest_id = p_manifest_id;

  insert into public.events(event_type, entity_type, entity_id, payload, emitted_by)
  values ('manifest.departed', 'manifest', p_manifest_id, json_build_object('manifest_id', p_manifest_id), auth.uid());

  return json_build_object('manifest_id', p_manifest_id, 'success', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- arrive_manifest
-- ----------------------------------------------------------------------------
create or replace function public.arrive_manifest(
  p_manifest_id uuid,
  p_staff_id    uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  update public.manifests
     set status = 'arrived',
         arrived_at = now(),
         arrived_by = auth.uid(),
         arrival_date = coalesce(arrival_date, current_date),
         updated_at = now()
   where id = p_manifest_id and status = 'in_transit';

  if not found then
    raise exception 'Manifest % must be in_transit before arrival', p_manifest_id using errcode = 'P0001';
  end if;

  update public.shipments s
     set status = 'arrived', updated_at = now()
   where s.manifest_id = p_manifest_id and s.status = 'in_transit';

  insert into public.tracking_events (shipment_id, awb_number, event_type, status, hub_code, description, scanned_by)
  select s.id, s.awb_number, 'arrived_dest_hub', 'arrived', s.dest_hub, 'Manifest arrived at destination hub', auth.uid()
  from public.shipments s where s.manifest_id = p_manifest_id;

  insert into public.events(event_type, entity_type, entity_id, payload, emitted_by)
  values ('manifest.arrived', 'manifest', p_manifest_id, json_build_object('manifest_id', p_manifest_id), auth.uid());

  return json_build_object('manifest_id', p_manifest_id, 'success', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- reconcile_manifest
-- ----------------------------------------------------------------------------
create or replace function public.reconcile_manifest(
  p_manifest_id uuid,
  p_delivered_awbs text[],
  p_exception_awbs text[] default '{}'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  update public.shipments
     set status = 'delivered', delivered_at = now(), updated_at = now()
   where manifest_id = p_manifest_id and awb_number = any (p_delivered_awbs);

  update public.shipments
     set status = 'exception', updated_at = now()
   where manifest_id = p_manifest_id and awb_number = any (p_exception_awbs);

  update public.manifests
     set status = 'reconciled', reconciled_at = now(), reconciled_by = auth.uid(), updated_at = now()
   where id = p_manifest_id;

  return json_build_object(
    'manifest_id', p_manifest_id,
    'delivered_count', coalesce(array_length(p_delivered_awbs, 1), 0),
    'exception_count', coalesce(array_length(p_exception_awbs, 1), 0),
    'success', true
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- update_shipment_status
-- ----------------------------------------------------------------------------
-- Signature aligned with 20260430000003 + database.types.ts:660 + app callers.
-- p_new_status arrives as text and is cast to shipment_status internally.
create or replace function public.update_shipment_status(
  p_shipment_id uuid,
  p_new_status  text,
  p_staff_id    uuid default null,
  p_notes       text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_awb     text;
  v_status  shipment_status;
begin
  -- Role check FIRST so unauthorized callers don't learn about enum values
  -- through 'invalid input value for enum shipment_status' error messages.
  -- The cast must happen inside BEGIN, after the gate, not in DECLARE.
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  v_status := p_new_status::shipment_status;

  select awb_number into v_awb from public.shipments where id = p_shipment_id;
  if v_awb is null then
    raise exception 'Shipment % not found', p_shipment_id using errcode = 'P0002';
  end if;

  update public.shipments
     set status = v_status,
         delivered_at = case when v_status = 'delivered' then now() else delivered_at end,
         cancelled_at = case when v_status = 'cancelled' then now() else cancelled_at end,
         updated_at = now()
   where id = p_shipment_id;

  insert into public.tracking_events (shipment_id, awb_number, event_type, status, hub_code, description, scanned_by)
  values (
    p_shipment_id,
    v_awb,
    case
      when v_status = 'delivered'        then 'delivered'::tracking_event_type
      when v_status = 'cancelled'        then 'cancelled'::tracking_event_type
      when v_status = 'returned'         then 'returned'::tracking_event_type
      when v_status = 'out_for_delivery' then 'out_for_delivery'::tracking_event_type
      when v_status = 'arrived'          then 'arrived_dest_hub'::tracking_event_type
      when v_status = 'in_transit'       then 'in_transit'::tracking_event_type
      else 'scan'::tracking_event_type
    end,
    v_status,
    null,
    coalesce(p_notes, 'Status updated to ' || v_status::text),
    auth.uid()
  );

  return json_build_object('shipment_id', p_shipment_id, 'status', v_status, 'success', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- resolve_exception
-- ----------------------------------------------------------------------------
create or replace function public.resolve_exception(
  p_exception_id uuid,
  p_resolution   text,
  p_staff_id     uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  update public.exceptions
     set status = 'resolved',
         resolution = p_resolution,
         resolved_at = now(),
         resolved_by = auth.uid(),
         updated_at = now()
   where id = p_exception_id and status in ('open', 'investigating');

  if not found then
    raise exception 'Exception % is not resolvable in current state', p_exception_id using errcode = 'P0001';
  end if;

  insert into public.events(event_type, entity_type, entity_id, payload, emitted_by)
  values ('exception.resolved', 'exception', p_exception_id, json_build_object('exception_id', p_exception_id), auth.uid());

  return json_build_object('exception_id', p_exception_id, 'success', true);
end;
$$;

comment on function public.add_shipment_to_manifest is
  'Mutates manifest_shipments + shipments + manifests. Gated to ops/warehouse roles in 20260514000002 (was: no explicit gate, relied on UI).';
comment on function public.depart_manifest is
  'Mutates manifests + shipments + tracking_events + events. Gated to ops/warehouse roles in 20260514000002.';
comment on function public.arrive_manifest is
  'Mutates manifests + shipments + tracking_events + events. Gated to ops/warehouse roles in 20260514000002.';
comment on function public.reconcile_manifest is
  'Mutates shipments + manifests. Gated to ops/warehouse roles in 20260514000002.';
comment on function public.update_shipment_status is
  'Mutates shipments + tracking_events. Gated to ops/warehouse roles in 20260514000002.';
comment on function public.resolve_exception is
  'Mutates exceptions + events. Gated to ops/warehouse roles in 20260514000002.';
