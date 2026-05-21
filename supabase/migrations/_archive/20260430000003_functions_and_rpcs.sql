-- ============================================================================
-- TAC Express — Functions, RPCs, sequence-backed numbering
-- Migration: 20260430000003
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Sequences for human-readable identifiers
-- ----------------------------------------------------------------------------
create sequence if not exists public.awb_seq        start 100000;
create sequence if not exists public.manifest_seq   start 1000;
create sequence if not exists public.invoice_seq    start 10000;
create sequence if not exists public.customer_seq   start 1000;

-- ----------------------------------------------------------------------------
-- AWB / Manifest / Invoice number generators (idempotent on shipment_id)
-- ----------------------------------------------------------------------------

create or replace function public.generate_awb_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yymm text := to_char(now(), 'YYMM');
  seq  bigint := nextval('public.awb_seq');
begin
  return 'TAC' || yymm || lpad(seq::text, 7, '0');
end;
$$;

create or replace function public.generate_manifest_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yymm text := to_char(now(), 'YYMM');
  seq  bigint := nextval('public.manifest_seq');
begin
  return 'MFT' || yymm || lpad(seq::text, 5, '0');
end;
$$;

create or replace function public.generate_invoice_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yymm text := to_char(now(), 'YYMM');
  seq  bigint := nextval('public.invoice_seq');
begin
  return 'INV' || yymm || lpad(seq::text, 6, '0');
end;
$$;

create or replace function public.generate_customer_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  seq bigint := nextval('public.customer_seq');
begin
  return 'CUS' || lpad(seq::text, 6, '0');
end;
$$;

-- ----------------------------------------------------------------------------
-- Defaults driven by the generators
-- ----------------------------------------------------------------------------
alter table public.shipments alter column awb_number set default public.generate_awb_number();
alter table public.manifests alter column manifest_number set default public.generate_manifest_number();
alter table public.invoices  alter column invoice_number set default public.generate_invoice_number();

-- ----------------------------------------------------------------------------
-- get_user_role  (kept for parity with generated database.types.ts)
-- ----------------------------------------------------------------------------
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(role::text, 'customer')
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

-- ----------------------------------------------------------------------------
-- count_shipments_by_status
-- ----------------------------------------------------------------------------
create or replace function public.count_shipments_by_status()
returns table (status text, count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select status::text, count(*)::bigint
  from public.shipments
  group by status;
$$;

-- ----------------------------------------------------------------------------
-- add_shipment_to_manifest  (idempotent)
-- ----------------------------------------------------------------------------
-- p_staff_id is informational; the function still uses auth.uid() for the
-- audit columns. The named param exists so PostgREST can match the call from
-- packages/database/src/repositories/manifest.repo.ts and matches what
-- database.types.ts asserts (3-arg). Aligns repo signature with production's
-- 20260422145228_fix_manifest_rpc_optional_staff_id migration.
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
-- close_manifest_atomic
-- ----------------------------------------------------------------------------
-- p_staff_id is informational; the function still uses auth.uid() for the
-- audit columns. Aligned with the 3-arg variant production has.
create or replace function public.close_manifest_atomic(
  p_manifest_id uuid,
  p_staff_id    uuid default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if not public.is_operations_or_above() and not public.is_warehouse_role() then
    raise exception 'Insufficient privileges' using errcode = '42501';
  end if;

  select count(*) into v_count from public.manifest_shipments where manifest_id = p_manifest_id;
  if v_count = 0 then
    raise exception 'Cannot close empty manifest' using errcode = 'P0001';
  end if;

  update public.manifests
     set status = 'closed',
         closed_at = now(),
         closed_by = auth.uid(),
         updated_at = now()
   where id = p_manifest_id and status = 'open';

  if not found then
    raise exception 'Manifest % is not open or does not exist', p_manifest_id using errcode = 'P0001';
  end if;

  insert into public.events(event_type, entity_type, entity_id, payload, emitted_by)
  values ('manifest.closed', 'manifest', p_manifest_id,
          json_build_object('manifest_id', p_manifest_id, 'shipment_count', v_count),
          auth.uid());

  return json_build_object('manifest_id', p_manifest_id, 'shipment_count', v_count, 'success', true);
end;
$$;

-- ----------------------------------------------------------------------------
-- depart_manifest
-- ----------------------------------------------------------------------------
-- p_staff_id is informational; body uses auth.uid().
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
-- p_staff_id is informational; body uses auth.uid().
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
-- reconcile_manifest  (mark all shipments as delivered/exception per provided list)
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
-- update_shipment_status  (writes status + appends tracking event)
-- ----------------------------------------------------------------------------
-- Signature aligned to what packages/database/src/repositories/shipment.repo.ts
-- calls and what database.types.ts:660 declares: (p_new_status text, p_notes?,
-- p_shipment_id uuid, p_staff_id uuid). p_new_status arrives as text and is
-- cast to shipment_status internally. p_staff_id is informational; the body
-- uses auth.uid() for the audit column. hub_code is no longer a parameter
-- (production's types don't expose it).
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
-- p_staff_id is informational; the body uses auth.uid() for resolved_by.
-- Signature matches packages/database/src/repositories/exception.repo.ts
-- which calls with { p_exception_id, p_staff_id, p_resolution }.
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

-- ----------------------------------------------------------------------------
-- lookup_rate  (resolve rate for a route + service level for a customer)
-- ----------------------------------------------------------------------------
create or replace function public.lookup_rate(
  p_customer_id     uuid,
  p_origin_hub      text,
  p_dest_hub        text,
  p_service_level   service_level default 'standard',
  p_chargeable_kg   numeric default 1
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_card public.rate_cards%rowtype;
  v_total numeric(14,2);
begin
  select * into v_card
    from public.rate_cards
   where (customer_id = p_customer_id or customer_id is null)
     and (origin_hub = p_origin_hub or origin_hub is null)
     and (dest_hub = p_dest_hub or dest_hub is null)
     and service_level = p_service_level
     and is_active = true
     and (effective_to is null or effective_to >= current_date)
   order by
     (customer_id = p_customer_id) desc nulls last,
     (origin_hub = p_origin_hub) desc nulls last,
     (dest_hub = p_dest_hub) desc nulls last,
     effective_from desc
   limit 1;

  if v_card.id is null then
    return json_build_object('found', false);
  end if;

  v_total := greatest(v_card.min_charge, v_card.base_rate + (v_card.rate_per_kg * p_chargeable_kg));
  v_total := v_total + (v_total * v_card.fuel_surcharge_pct / 100);
  v_total := v_total + v_card.handling_fee + v_card.docket_charge + v_card.packing_charge;

  return json_build_object(
    'found', true,
    'rate_card_id', v_card.id,
    'name', v_card.name,
    'base_rate', v_card.base_rate,
    'rate_per_kg', v_card.rate_per_kg,
    'fuel_surcharge_pct', v_card.fuel_surcharge_pct,
    'handling_fee', v_card.handling_fee,
    'docket_charge', v_card.docket_charge,
    'packing_charge', v_card.packing_charge,
    'min_charge', v_card.min_charge,
    'chargeable_kg', p_chargeable_kg,
    'total', round(v_total, 2)
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- dashboard_kpis  (single round-trip dashboard query)
-- ----------------------------------------------------------------------------
create or replace function public.dashboard_kpis(p_window_days integer default 30)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(days => p_window_days);
  v_total bigint;
  v_in_transit bigint;
  v_delivered bigint;
  v_exceptions bigint;
  v_revenue numeric(14,2);
  v_overdue bigint;
  v_open_manifests bigint;
begin
  select count(*) into v_total from public.shipments where created_at >= v_since;
  select count(*) into v_in_transit from public.shipments where status in ('in_transit','out_for_delivery','arrived');
  select count(*) into v_delivered from public.shipments where status = 'delivered' and delivered_at >= v_since;
  select count(*) into v_exceptions from public.exceptions where status = 'open';
  select coalesce(sum(total_amount), 0) into v_revenue from public.invoices where issued_at >= v_since and status in ('issued','partial','paid');
  select count(*) into v_overdue from public.invoices where status = 'overdue';
  select count(*) into v_open_manifests from public.manifests where status in ('open','closed','in_transit');

  return json_build_object(
    'window_days', p_window_days,
    'total_shipments', v_total,
    'in_transit', v_in_transit,
    'delivered_in_window', v_delivered,
    'open_exceptions', v_exceptions,
    'revenue_in_window', v_revenue,
    'overdue_invoices', v_overdue,
    'open_manifests', v_open_manifests
  );
end;
$$;

-- ----------------------------------------------------------------------------
-- detect_sla_breaches  (returns shipments past promised delivery)
-- ----------------------------------------------------------------------------
create or replace function public.detect_sla_breaches(p_lookahead_hours integer default 0)
returns table (
  id uuid,
  awb_number text,
  status shipment_status,
  customer_id uuid,
  promised_delivery_at timestamptz,
  hours_overdue numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    id, awb_number, status, customer_id, promised_delivery_at,
    extract(epoch from (now() - promised_delivery_at)) / 3600 as hours_overdue
  from public.shipments
  where status not in ('delivered','cancelled','returned')
    and promised_delivery_at is not null
    and promised_delivery_at < now() + make_interval(hours => p_lookahead_hours)
  order by promised_delivery_at asc;
$$;

-- ----------------------------------------------------------------------------
-- emit_event  (helper for application code; logs to events + audit)
-- ----------------------------------------------------------------------------
create or replace function public.emit_event(
  p_event_type   webhook_event,
  p_entity_type  text,
  p_entity_id    uuid,
  p_payload      jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.events (event_type, entity_type, entity_id, payload, emitted_by)
  values (p_event_type, p_entity_type, p_entity_id, p_payload, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- audit trigger generator (one trigger per important table)
-- ----------------------------------------------------------------------------
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    user_id, action, entity_type, entity_id, description,
    old_values, new_values
  )
  values (
    auth.uid(),
    case tg_op when 'INSERT' then 'create' when 'UPDATE' then 'update' when 'DELETE' then 'delete' end,
    tg_table_name,
    case when tg_op = 'DELETE' then (old.id::uuid) else (new.id::uuid) end,
    tg_table_name || ' ' || tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array['shipments','manifests','invoices','exceptions','customers','rate_cards','hubs','webhooks','api_keys'])
  loop
    execute format('drop trigger if exists trg_audit_%I on public.%I', t, t);
    execute format(
      'create trigger trg_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      t, t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Profile auto-provisioning trigger on auth.users insert
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, is_active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
