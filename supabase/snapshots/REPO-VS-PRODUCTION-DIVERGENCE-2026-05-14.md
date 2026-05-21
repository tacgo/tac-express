# Repo vs Production Divergence — 2026-05-14

> **TL;DR:** the repo's `supabase/migrations/*.sql` files do **not** describe what production is. They are aspirational. The repo's `database.types.ts` was regenerated against production and the app calls production's functions — so the app **works** — but the migration files describe a database that does not exist anywhere.
>
> **This invalidates #78's planned resolution sequence.** Step 3 — "rewrite #76's migration to target production's 3-arg signatures" — won't work, because the differences are far wider than just signatures. Production functions return `void`; repo's #85 declares `RETURNS json`. PostgreSQL refuses to change return type via `CREATE OR REPLACE FUNCTION`, so even a perfect signature-aligned migration would fail at deploy.
>
> This is a PM-level strategic decision, not an engineering execution task. Surface and stop.

---

## How this was discovered

Step 2 of #78 (production schema snapshot) was supposed to be a routine `pg_dump`-style reference. While capturing it via `mcp__supabase__execute_sql` + `pg_get_functiondef`, I diffed each function against repo. The first three already showed divergence wider than #78's body described. Continued through all 20 functions + 11 tables to confirm.

Files captured this session:
- [`production-functions-2026-05-14.sql`](./production-functions-2026-05-14.sql) — exec-ready SQL for all 20 functions in production's `public` schema
- This file — the analysis layer

---

## Headline findings (3 unknowns, 1 latent bug)

### Finding 1 — RPC return types differ between production and repo

| Function | Production returns | Repo (#85) returns |
|---|---|---|
| `add_shipment_to_manifest` | `void` | `json` |
| `arrive_manifest` | `void` | `json` |
| `close_manifest_atomic` | `void` | `json` |
| `depart_manifest` | `void` | `json` |
| `resolve_exception` | `void` | `json` |
| `update_shipment_status` | `void` | `json` |

**Why this is fatal for #78's planned approach:** PostgreSQL won't allow `CREATE OR REPLACE FUNCTION` to change return type. The deploy would fail at planning with:

```
ERROR: cannot change return type of existing function
HINT: Use DROP FUNCTION public.add_shipment_to_manifest(uuid,text,uuid) first.
```

`DROP FUNCTION` would break every app call mid-deploy. So #85's migration as-currently-written cannot be deployed to production without:
- Either editing #85's `RETURNS json` → `RETURNS void` (changes app contract — callers expect `{ success: true, ... }` JSON shape)
- Or accepting a brief outage during DROP + CREATE
- Or rewriting the app code to not expect any return value

### Finding 2 — Status columns are TEXT (not enums) and use uppercase

Production:

| Table | Status column | Type | Valid values |
|---|---|---|---|
| `shipments.status` | TEXT + CHECK | `CREATED, PICKUP_SCHEDULED, PICKED_UP, RECEIVED_AT_ORIGIN, IN_TRANSIT, RECEIVED_AT_DEST, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RTO, EXCEPTION` | (11 values) |
| `manifests.status` | TEXT + CHECK | `DRAFT, BUILDING, OPEN, CLOSED, DEPARTED, ARRIVED, RECONCILED` | (7 values) |
| `exceptions.status` | TEXT + CHECK | `OPEN, IN_PROGRESS, RESOLVED, CLOSED` | (4 values) |
| `invoices.status` | TEXT + CHECK | `DRAFT, ISSUED, PAID, CANCELLED, OVERDUE` | (5 values) |

Repo declares these as PostgreSQL **enums** with **lowercase** values:
- `shipment_status`: `pending, booked, manifested, in_transit, arrived, out_for_delivery, delivered, returned, cancelled, exception` (10 values, completely different set)
- `manifest_status`: `open, closed, in_transit, arrived, reconciled, cancelled` (6 values, different set)
- `exception_status`: `open, investigating, resolved, escalated, closed`
- `invoice_status`: `draft, issued, partial, paid, overdue, cancelled, refunded`

**No app code that reads these columns and compares against an enum value will work against production** — string equality against `'delivered'` won't match production's `'DELIVERED'`. The fact that the app works at all means it either uses the values from `database.types.ts` (which mirrors production's TEXT values) OR there's a lowercase-cast somewhere.

### Finding 3 — `tracking_events` is a completely different table

| Column | Production | Repo |
|---|---|---|
| `id` | uuid | uuid |
| `awb_number` | text | text |
| `status` | text (uppercase shipment status) | shipment_status enum (lowercase) |
| `event_type` | **missing** | tracking_event_type enum NOT NULL |
| `shipment_id` | **missing** | uuid NOT NULL |
| `description` | text default `''` | text default `''` |
| `location` | text default `''` | **missing** |
| `hub_code` | text nullable | text nullable |
| `source` | text default `'MANUAL'` (CHECK) | **missing** |
| `staff_id` | uuid nullable | **missing** |
| `staff_name` | text nullable | **missing** |
| `scanned_by` | **missing** | uuid nullable |
| `occurred_at` | **missing** | timestamptz default now() |
| `metadata` | jsonb nullable | jsonb default `'{}'` |
| `created_at` | timestamptz default now() | timestamptz default now() |

These are different tables. A repo migration that inserts `(shipment_id, event_type, occurred_at, scanned_by)` would fail against production. A production-style insert with `(source, staff_id, staff_name)` would fail against the repo's schema.

### Finding 4 (LATENT BUG) — `record_invoice_payment` rejects non-SUPER_ADMIN operational roles

Production's `record_invoice_payment` body has:

```sql
if not exists (
  select 1 from public.profiles p
  where p.id = auth.uid() and p.role in ('SUPER_ADMIN','OPERATOR')
) then
  raise exception 'Unauthorized: only operators or super admins can record payments.'
    using errcode = '42501';
end if;
```

Production's `profiles.role` CHECK constraint allows only:
`SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE_IMPHAL, WAREHOUSE_DELHI, OPS, INVOICE, SUPPORT, WAREHOUSE_STAFF, OPS_STAFF, FINANCE_STAFF`.

Decomposing the `role in (...)` check against that list:

- `SUPER_ADMIN` **is** present — SUPER_ADMIN callers pass the gate.
- `OPERATOR` **is not** present — no row could ever hold that value, so the `OPERATOR` branch never matches anyone. Dead code.

**Net effect:** every **non-SUPER_ADMIN** caller — including the roles operationally responsible for recording payments (`OPS`, `OPS_STAFF`, `INVOICE`, `FINANCE_STAFF`) — receives `42501 Unauthorized`. SUPER_ADMIN callers work fine.

`invoice_payments` has 6 rows in production. Given the role check, those were almost certainly recorded by a SUPER_ADMIN account (or inserted directly, bypassing the RPC). Worth confirming via prod logs once Sentry is wired (see #22) — Rule 2 (`module:finance` alerts) would catch every future rejection in real time.

**Impact:** the role check is technically alive (SUPER_ADMIN works) but **semantically inverted from intent** (the RPC was clearly meant to allow operational roles to record payments while blocking, say, drivers — instead it blocks the very people who should be using it).

### Finding 5 — Roles list itself differs

| Production roles | Repo roles |
|---|---|
| SUPER_ADMIN, ADMIN, MANAGER | super_admin, admin, manager |
| WAREHOUSE_IMPHAL, WAREHOUSE_DELHI, WAREHOUSE_STAFF | warehouse_imphal, warehouse_delhi, warehouse_staff |
| OPS, OPS_STAFF | operations |
| INVOICE, FINANCE_STAFF | finance |
| SUPPORT | support |
| — | driver |
| — | customer |

Even ignoring the case, the role *names* differ: production has `OPS`, repo has `operations`. Production has `INVOICE`/`FINANCE_STAFF`, repo has `finance`. Repo defines `driver` and `customer` which production doesn't.

### Finding 6 — `lookup_rate` vs `get_rate_card` are different functions

Production has `get_rate_card(p_origin text, p_dest text, p_service_level text, p_weight numeric) → TABLE(id, rate_per_kg, docket_charge, fuel_surcharge_pct, handling_fee)`.

Repo's migration defines `lookup_rate(p_origin_hub text, p_dest_hub text, p_service_level text, p_weight_kg numeric) → json` returning a different shape.

App code (per `database.types.ts`) calls `get_rate_card` — matches production. The repo's `lookup_rate` function is never called.

---

## What's the right call

This is no longer "step 3 of #78 = rewrite one migration." This is a **strategic decision**:

> **Which is the canonical source of truth — production or the repo migrations?**

Three options, ranked by feasibility for a logistics company with live ops:

### Option A — Production wins (recommended, ~2-3 sessions)

Accept that production is reality. Rewrite the repo's migrations to *mirror* production exactly. This means:

1. Replace `supabase/migrations/20260430000001_extensions_and_enums.sql` — remove all PG enums, declare TEXT columns with CHECK constraints (matching prod).
2. Replace `supabase/migrations/20260430000002_core_schema.sql` — match production's table columns exactly (rebuild `tracking_events` + others).
3. Replace `20260430000003_functions_and_rpcs.sql` — copy production's function bodies verbatim. `RETURNS void` for the 6 mutating RPCs.
4. Replace `20260430000004_rls_policies.sql` — capture production's actual policies (snapshot still needed).
5. Drop or rewrite `20260514000001` (#73's trigger fix) and `20260514000002` (#76's role gates) — production already has the trigger, and the role gates would now go on `RETURNS void` functions.
6. Bump migration filenames so `supabase db push` sees them as new (filename → timestamp scheme).

Trade-offs:
- ✅ App keeps working
- ✅ Local dev (`supabase db reset`) produces a working environment
- ✅ Future migrations land on a known foundation
- ❌ Loses #76's role-gate intent (still needs to be re-applied, on the `RETURNS void` functions, with production's role names)
- ❌ ~2-3 focused sessions of work

### Option B — Repo wins (high-risk, 1-2 weeks)

Migrate production to match the repo. Rewrite production's tables, columns, statuses, roles to use the enum + lowercase scheme. Requires:
1. Long maintenance window
2. Data migration scripts (`UPDATE shipments SET status = LOWER(status)` etc.)
3. Coordinated app deploy (clients expecting `'DELIVERED'` need to be updated to expect `'delivered'`)
4. RLS policy rewrites
5. Re-verification of every app surface that compares status strings

Trade-offs:
- ✅ Clean repo migration history
- ❌ High risk for live operations
- ❌ App breakage during transition

### Option C — Two-track (~1 week)

Keep production as-is. Branch the repo into a "production-mirror" set of migrations + leave the old "aspirational" ones in `.archive/`. Document the boundary clearly.

Trade-offs:
- ✅ Lower risk than B
- ✅ Faster than A
- ❌ Tech-debt: repo has two histories, contributors get confused
- ❌ Doesn't fix the latent bug in finding 4

---

## What this PR (chore/78-step2-production-schema-snapshot) does

Saves the production snapshot as the frozen reference (this directory). **Does not attempt to fix any divergence** because:

1. The fix decision is PM-level (Options A / B / C above need owner choice)
2. Any code-level fix would be wrong on at least one axis (signatures *or* return types *or* statuses *or* columns)
3. The retro's lesson stands: discovery is research, not work. Surface and stop.

Next sessions can pick Option A (recommended) or another and execute against this snapshot.

---

## Recommendations going forward

1. **STOP** treating `supabase/migrations/*.sql` as the source of truth for what's in production. Treat this snapshot as the source of truth.
2. **PIN** the open issue #78 with this finding so future contributors don't repeat the "rewrite #76's migration" plan.
3. **REOPEN** the strategic decision: which side wins? Document in `docs/ARCHITECTURAL-DECISIONS.md` once chosen.
4. **DEFER** all migration-touching PRs until the decision lands. PR #76's role gates remain inert in production.
5. **INVESTIGATE** finding 4 — does `record_invoice_payment` actually get rejected in production today? Check edge function / app logs.

---

*This snapshot was captured via read-only MCP queries (`pg_proc`, `pg_get_functiondef`, `list_tables`). No writes to production. Full SQL definitions in `production-functions-2026-05-14.sql`.*
