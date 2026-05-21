-- ============================================================================
-- TAC Express — Storage buckets and policies
-- Migration: 20260521000001
-- ============================================================================
--
-- WHAT: Creates the six storage buckets the app expects + RLS policies on
-- storage.objects.
--
-- WHY: Bucket creation lived only in the archived (pre-baseline) migration
-- 20260430000005_storage_buckets.sql, which is NOT replayed (it sits under
-- _archive/). The production-as-baseline (20260515000001) covers the public
-- schema but not storage. This forward migration restores buckets under the
-- baseline's role model.
--
-- ADAPTED: The archived version referenced helper functions
-- (is_finance_or_above / is_operations_or_above / is_warehouse_role) from the
-- divergent enum-based schema. Those do NOT exist in the baseline, which uses
-- public.get_user_role() returning TEXT with UPPERCASE role values. Policies
-- below are rewritten to that model (same shape as the baseline's invoices /
-- audit_logs policies).
-- ============================================================================

-- ---- buckets (all private except avatars) ----
insert into storage.buckets (id, name, public)
values
  ('invoices',           'invoices',           false),
  ('manifests',          'manifests',          false),
  ('proof-of-delivery',  'proof-of-delivery',  false),
  ('exception-photos',   'exception-photos',   false),
  ('shipping-labels',    'shipping-labels',    false),
  ('avatars',            'avatars',            true)
on conflict (id) do nothing;

-- Role groups (baseline role model):
--   finance  : SUPER_ADMIN, ADMIN, MANAGER, INVOICE, FINANCE_STAFF
--   ops      : SUPER_ADMIN, ADMIN, MANAGER, OPS, OPS_STAFF
--   warehouse: WAREHOUSE_IMPHAL, WAREHOUSE_DELHI, WAREHOUSE_STAFF
-- ops-or-warehouse = the union of the ops + warehouse arrays.

-- ---- read policies ----
drop policy if exists "storage read invoices" on storage.objects;
create policy "storage read invoices" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF','OPS','OPS_STAFF']));

drop policy if exists "storage read manifests" on storage.objects;
create policy "storage read manifests" on storage.objects
  for select to authenticated
  using (bucket_id = 'manifests'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage read pod" on storage.objects;
create policy "storage read pod" on storage.objects
  for select to authenticated
  using (bucket_id = 'proof-of-delivery'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage read exception_photos" on storage.objects;
create policy "storage read exception_photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'exception-photos'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage read shipping_labels" on storage.objects;
create policy "storage read shipping_labels" on storage.objects
  for select to authenticated
  using (bucket_id = 'shipping-labels'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage read avatars" on storage.objects;
create policy "storage read avatars" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- ---- write policies ----
drop policy if exists "storage write invoices" on storage.objects;
create policy "storage write invoices" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoices'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','INVOICE','FINANCE_STAFF']));

drop policy if exists "storage write manifests" on storage.objects;
create policy "storage write manifests" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'manifests'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage write pod" on storage.objects;
create policy "storage write pod" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proof-of-delivery'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage write exception_photos" on storage.objects;
create policy "storage write exception_photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exception-photos'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage write shipping_labels" on storage.objects;
create policy "storage write shipping_labels" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipping-labels'
    and public.get_user_role() = any (array['SUPER_ADMIN','ADMIN','MANAGER','OPS','OPS_STAFF','WAREHOUSE_IMPHAL','WAREHOUSE_DELHI','WAREHOUSE_STAFF']));

drop policy if exists "storage write avatars self" on storage.objects;
create policy "storage write avatars self" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Reverse:
--   drop policy (each of the above) on storage.objects;
--   delete from storage.buckets where id in
--     ('invoices','manifests','proof-of-delivery','exception-photos','shipping-labels','avatars');
