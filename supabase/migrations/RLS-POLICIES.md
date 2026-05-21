# RLS Policies — TAC Express

Single source of truth for the Row Level Security model in this codebase.
Filed against issue #15 to capture the actual security posture rather than
the hypothesised one.

> **TL;DR**: TAC Express is **single-tenant** (one company, one staff base).
> RLS is **role-based**, NOT tenant-based. There is no `tenant_id` column,
> no `auth.uid() = customer_owner_id` chain. Cross-tenant data leak is not
> a vector because there are no other tenants.

## Roles

| Role               | Helper function (in `public` schema) | Granted to                          |
| ------------------ | ------------------------------------ | ----------------------------------- |
| `ADMIN`            | `is_admin()`                         | Operations director, owner          |
| `MANAGER`          | `is_manager_or_above()`              | Ops manager, finance manager        |
| `FINANCE`          | `is_finance_or_above()`              | Finance staff                       |
| `OPERATIONS`       | `is_operations_or_above()`           | Hub ops, dispatch coordinators      |
| `WAREHOUSE`        | `is_warehouse_role()`                | Warehouse floor staff (hub-scoped)  |
| `CUSTOMER_PORTAL`  | _(no helper — explicit in policy)_   | Future: external customer self-svc  |

The role lives on `public.profiles.role` mirrored against each authenticated
user. The helper functions read from that table — single source of truth.

Roles are hierarchical:

```
ADMIN > MANAGER > FINANCE = OPERATIONS > WAREHOUSE > CUSTOMER_PORTAL
```

`is_X_or_above()` helpers encode the hierarchy. Code should always prefer
the helpers over checking `role = 'X'` directly.

## Hub scoping (warehouse role only)

`WAREHOUSE` role users see only rows whose `origin_hub` or `dest_hub`
matches `current_user_hub()` (also a `public` schema helper). This isn't
tenant isolation — it's operational scope: the warehouse staff at IMPHAL
shouldn't see DELHI manifests, even though both are TAC Express ops.

All other roles see all rows for their permitted tables.

## Per-table SELECT policies (the orbital read paths)

`packages/services/src/orbital.service.ts` reads from three tables for
chart aggregation. Each table's SELECT policy and the resulting orbital
visibility:

### `shipments`

```sql
create policy "shipments read staff" on public.shipments
  for select to authenticated
  using (
    public.is_operations_or_above()
    or public.is_finance_or_above()
    or (public.is_warehouse_role()
        and (origin_hub = public.current_user_hub()
             or dest_hub = public.current_user_hub()))
  );
```

- ✅ Operations / Finance / Manager / Admin — full visibility
- ✅ Warehouse — hub-scoped (own hub origin OR destination only)
- ❌ Customer portal / unauthenticated — blocked
- Used by: `getServiceMix`, `getStatusDistribution`, `getShipmentTrend`,
  `getLaneHeatmap`

### `manifests`

```sql
create policy "manifests read staff" on public.manifests
  for select to authenticated
  using (
    public.is_operations_or_above()
    or (public.is_warehouse_role()
        and (origin_hub = public.current_user_hub()
             or dest_hub = public.current_user_hub()))
  );
```

- ✅ Operations / Manager / Admin — full visibility
- ✅ Warehouse — hub-scoped (same as shipments)
- ❌ Finance — blocked from manifest data (intentional separation of
  duties: finance doesn't need to know operational manifests)
- Used by: `getUpcomingOperations`

### `invoices`

```sql
create policy "invoices read finance" on public.invoices
  for select to authenticated
  using (public.is_finance_or_above() or public.is_operations_or_above());
```

- ✅ Finance / Operations / Manager / Admin — full visibility
- ❌ Warehouse — blocked from invoice data (no warehouse-floor pricing)
- Used by: `getRevenueTrend`, `getTopCustomers`

## What's NOT here (and why)

### No `tenant_id` filter

Single-tenant SaaS. The original PR #8 review asked "show me the policies
that filter by tenant" — the answer is "none, because there are no
tenants." This is documented here to prevent future contributors from
adding speculative tenant-scoping that has no upstream constraint to
satisfy.

If TAC Express ever pivots to multi-tenant (e.g., licensing the platform
to other 3PLs), every policy in this file becomes inadequate and needs a
schema migration to add `tenant_id` + an `(auth.uid()
JOIN public.profiles ON profile_id) → tenant_id` chain. **Do not add
tenant scoping piecemeal.**

### No customer-portal SELECT yet

The `CUSTOMER_PORTAL` role is reserved in the enum but no policy currently
grants it SELECT on `shipments` / `invoices`. The intended future shape is
a `customer_id = (select customer_id from public.profiles where id =
auth.uid())` filter that scopes a portal user to their own customer
record's data. Until the portal ships, customer-portal users see zero
rows — which is the safe default.

### No row-count cap in policy

The orbital service used to truncate at 2000 rows in JS (#11). After
2026-05-08 the cap is 50000 with a `console.error` when hit. The cap is
a CLIENT-SIDE concern (avoid pulling tens of MB into the dashboard tab),
not a security concern. RLS policies have no row limits.

## Verification path

The original #15 acceptance criteria ask for Playwright cross-tenant tests.
**Those don't apply** in single-tenant mode — there's no second tenant to
leak to. The equivalent role-isolation tests would be:

- Log in as a `WAREHOUSE` user assigned to hub `IMPHAL` → request
  `/api/orbital/lane-heatmap` → assert response contains only cells whose
  `origin_hub` or `dest_hub === "IMPHAL"`.
- Log in as a `CUSTOMER_PORTAL` user → request the same endpoint → assert
  empty cells (zero rows visible).
- Log in as a `WAREHOUSE` user → request `/api/orbital/revenue-trend`
  (invoices) → assert 401/403 OR empty data.

These are more useful than tenant tests for this codebase. **Tracked as
follow-up scope** under #15 — not landed in this PR because they require
scaffolding test users at four different roles, which is its own piece of
infrastructure work.

## Refs

- Issue #15 (security RLS audit)
- Issue #11 (orbital truncation — paired in this PR)
- File: `packages/services/src/orbital.service.ts`
- Migration: `supabase/migrations/20260430000004_rls_policies.sql`
- Role helpers: `supabase/migrations/20260430000003_functions_and_rpcs.sql`
