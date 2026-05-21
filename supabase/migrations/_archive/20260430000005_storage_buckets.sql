-- ============================================================================
-- TAC Express — Storage buckets and policies
-- Migration: 20260430000005
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('invoices',           'invoices',           false),
  ('manifests',          'manifests',          false),
  ('proof-of-delivery',  'proof-of-delivery',  false),
  ('exception-photos',   'exception-photos',   false),
  ('shipping-labels',    'shipping-labels',    false),
  ('avatars',            'avatars',            true)
on conflict (id) do nothing;

-- ---- read policies (all authenticated staff) ----
drop policy if exists "storage read invoices" on storage.objects;
create policy "storage read invoices" on storage.objects
  for select to authenticated
  using (bucket_id = 'invoices' and (public.is_finance_or_above() or public.is_operations_or_above()));

drop policy if exists "storage read manifests" on storage.objects;
create policy "storage read manifests" on storage.objects
  for select to authenticated
  using (bucket_id = 'manifests' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage read pod" on storage.objects;
create policy "storage read pod" on storage.objects
  for select to authenticated
  using (bucket_id = 'proof-of-delivery' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage read exception_photos" on storage.objects;
create policy "storage read exception_photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'exception-photos' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage read shipping_labels" on storage.objects;
create policy "storage read shipping_labels" on storage.objects
  for select to authenticated
  using (bucket_id = 'shipping-labels' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage read avatars" on storage.objects;
create policy "storage read avatars" on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- ---- write policies ----
drop policy if exists "storage write invoices" on storage.objects;
create policy "storage write invoices" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'invoices' and public.is_finance_or_above());

drop policy if exists "storage write manifests" on storage.objects;
create policy "storage write manifests" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'manifests' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage write pod" on storage.objects;
create policy "storage write pod" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'proof-of-delivery' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage write exception_photos" on storage.objects;
create policy "storage write exception_photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exception-photos' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage write shipping_labels" on storage.objects;
create policy "storage write shipping_labels" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shipping-labels' and (public.is_operations_or_above() or public.is_warehouse_role()));

drop policy if exists "storage write avatars self" on storage.objects;
create policy "storage write avatars self" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
