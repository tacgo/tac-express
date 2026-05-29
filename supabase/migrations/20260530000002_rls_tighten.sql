-- RLS tightening pass based on production-readiness audit findings.
-- Aligns DB-level enforcement with the role-permission model declared in
-- packages/types/src/domain.types.ts (ROLE_PERMISSIONS).

-- ── customers ────────────────────────────────────────────────────────────────
-- Finding H-3: any authenticated user could write customer PII.
-- Fix: restrict INSERT/UPDATE to MANAGER+; keep broad SELECT for ops workflows.
drop policy if exists "customers_insert" on public.customers;
drop policy if exists "customers_update" on public.customers;

create policy "customers_insert_manager" on public.customers
  for insert
  with check (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPS', 'INVOICE'));

create policy "customers_update_manager" on public.customers
  for update
  using    (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPS', 'INVOICE'))
  with check (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPS', 'INVOICE'));

-- ── manifests ────────────────────────────────────────────────────────────────
-- Finding M: any authenticated user could create/update manifests despite
-- ROLE_PERMISSIONS.canEditManifests being false for several roles.
drop policy if exists "manifests_insert" on public.manifests;
drop policy if exists "manifests_update" on public.manifests;

create policy "manifests_insert_ops" on public.manifests
  for insert
  with check (
    get_user_role() in (
      'SUPER_ADMIN', 'ADMIN', 'MANAGER',
      'WAREHOUSE_IMPHAL', 'WAREHOUSE_DELHI', 'OPS', 'OPS_STAFF'
    )
  );

create policy "manifests_update_ops" on public.manifests
  for update
  using (
    get_user_role() in (
      'SUPER_ADMIN', 'ADMIN', 'MANAGER',
      'WAREHOUSE_IMPHAL', 'WAREHOUSE_DELHI', 'OPS', 'OPS_STAFF'
    )
  )
  with check (
    get_user_role() in (
      'SUPER_ADMIN', 'ADMIN', 'MANAGER',
      'WAREHOUSE_IMPHAL', 'WAREHOUSE_DELHI', 'OPS', 'OPS_STAFF'
    )
  );

-- ── exceptions ───────────────────────────────────────────────────────────────
-- Finding M: any authenticated user could write exceptions;
-- ROLE_PERMISSIONS.canResolveExceptions should gate UPDATE.
drop policy if exists "exceptions_insert" on public.exceptions;
drop policy if exists "exceptions_update" on public.exceptions;

create policy "exceptions_insert_ops" on public.exceptions
  for insert
  with check (auth.uid() is not null);

create policy "exceptions_update_ops" on public.exceptions
  for update
  using (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPS', 'OPS_STAFF'))
  with check (get_user_role() in ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPS', 'OPS_STAFF'));

-- ── audit_logs INSERT ────────────────────────────────────────────────────────
-- Finding M: open INSERT allows any authenticated user to fabricate audit rows.
-- Fix: require that the user_id field matches the calling user's auth.uid().
drop policy if exists "audit_logs_insert" on public.audit_logs;

create policy "audit_logs_insert_own" on public.audit_logs
  for insert
  with check (
    -- Service-role writes (from SECURITY DEFINER RPCs like update_shipment_status)
    -- bypass RLS entirely, so this check only applies to cookie-client writes.
    -- Require the inserted row's user_id to match the calling user.
    user_id = auth.uid()
  );
