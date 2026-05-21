# Migration drift catalog — 2026-05-15

> **Companion to:** `production-schema-2026-05-15.md`
> **Issue:** [#78 — P0 reconcile repo migrations with production schema](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/78)
> **Goal:** Catalog every divergence between the production schema (frozen
> in this directory) and the repo's expected fresh-DB state, then ground
> the strategy decision in evidence rather than vibes.

This catalog **does not change anything**. It is read-only research.

---

## Executive summary — strategy pivot recommended

The 2026-05-14 audit framed the divergence as ~5 axes (function signatures,
filenames, etc.). After this snapshot, **the divergence is structurally
deeper than that** — the two schemas are functionally similar but encode
state in incompatible ways:

| Concern | Repo | Production |
|---|---|---|
| Enumerated columns | `CREATE TYPE … AS ENUM` (Postgres enum types) | `text` columns + `CHECK` constraints |
| Enum value casing | lowercase (`super_admin`, `pending`, `booked`) | UPPERCASE (`SUPER_ADMIN`, `CREATED`, `BOOKED`) |
| Lifecycle states (shipments) | 10 values (`pending`, `booked`, `manifested`, `in_transit`, `arrived`, …) | 11 values (`CREATED`, `PICKUP_SCHEDULED`, `PICKED_UP`, `RECEIVED_AT_ORIGIN`, …) — **different states, not just casing** |
| Role helper function | `current_user_role() returns user_role` (enum) | `get_user_role() returns text` |
| Helper functions for role gates | `is_admin_or_above`, `is_manager_or_above`, `is_finance_or_above`, `is_operations_or_above`, `is_warehouse_role` (5 helpers) | None — policies inline `get_user_role() = ANY(ARRAY[...])` |
| Updated-at trigger function | `set_updated_at` only | `set_updated_at` AND `update_updated_at` (two equivalent) |
| Extensions installed | 5 declared (`pgcrypto`, `uuid-ossp`, `pg_trgm`, `btree_gin`, `citext`) | 2 actually installed (`pgcrypto`, `uuid-ossp`) |
| Migration filenames overlap | 0 with production | — |

The original Path C plan ("edit repo migrations to match production") is
still feasible but would require rewriting **every** repo migration that
defines an enum, a column with an enum type, or a helper function.
That is structurally a Path A ("regenerate repo from production") with
extra steps and audit-trail damage.

**Recommendation: pivot to Path A.** Rationale in §6.

---

## 1. Schema-model divergence (high impact)

### 1.1 Enum types vs CHECK constraints

Repo migration `20260430000001_extensions_and_enums.sql` defines 13 enum
types: `user_role`, `shipment_status`, `manifest_status`, `transport_mode`,
`service_level`, `payment_mode`, `invoice_status`, `exception_severity`,
`exception_status`, `tracking_event_type`, `notification_channel`,
`webhook_event`, `api_key_scope`.

Production has **zero enum types in the public schema**. Equivalent columns
are `text` with a CHECK constraint listing the allowed values.

**Why it matters:** Every column declared `<type>_status` in the repo must
become `text` with a CHECK to match production. Function signatures that
take `shipment_status` must become `text`. RLS policies that compare to
enum values must compare to text. This is not a one-line fix — it cascades.

### 1.2 Lifecycle states differ

```
                Repo (enum)          Production (CHECK)
                -----------          ------------------
shipments:      pending              CREATED
                booked               PICKUP_SCHEDULED
                manifested           PICKED_UP
                in_transit           RECEIVED_AT_ORIGIN
                arrived              IN_TRANSIT
                out_for_delivery     RECEIVED_AT_DEST
                delivered            OUT_FOR_DELIVERY
                returned             DELIVERED
                cancelled            CANCELLED
                exception            RTO
                                     EXCEPTION

manifests:      open                 DRAFT
                closed               BUILDING
                in_transit           OPEN
                arrived              CLOSED
                reconciled           DEPARTED
                cancelled            ARRIVED
                                     RECONCILED
```

These are not casing variants — they're **different state machines**.
Production has finer-grained shipment states (separating origin/dest hub
arrival from departure) and finer-grained manifest states (DRAFT vs
BUILDING vs OPEN). Any code that compares status to a literal must be
updated, and the higher-level domain code in `packages/services` likely
depends on production's state names.

### 1.3 Role names differ

Repo enum `user_role` has 11 lowercase values:
`super_admin, admin, manager, finance, operations, support,
warehouse_imphal, warehouse_delhi, warehouse_staff, driver, customer`.

Production `profiles.role` CHECK has 11 UPPERCASE values:
`SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE_IMPHAL, WAREHOUSE_DELHI,
OPS, INVOICE, SUPPORT, WAREHOUSE_STAFF, OPS_STAFF, FINANCE_STAFF`.

Overlap in concept but the names differ:
- repo `finance` ≈ prod `INVOICE` and/or `FINANCE_STAFF`
- repo `operations` ≈ prod `OPS` and/or `OPS_STAFF`
- repo `driver`, `customer` — **not in production**

## 2. Function-name divergence (medium impact)

| Repo declares | Production has | Impact |
|---|---|---|
| `current_user_role()` returns user_role | `get_user_role()` returns text | Repo helpers (`is_admin_or_above`, etc.) call non-existent function in prod |
| `is_admin_or_above()`, `is_manager_or_above()`, `is_finance_or_above()`, `is_operations_or_above()`, `is_warehouse_role()` | None | Repo RLS policies use these; production policies inline `get_user_role() = ANY(ARRAY[...])` |

**Why it matters:** `CREATE OR REPLACE FUNCTION current_user_role()` does
NOT redefine production's `get_user_role()` — they have different names.
Any repo migration that defines a new helper is dead code in production.

## 3. Function-signature divergence (medium impact, partly known)

Already documented in #78 issue body. Re-confirmed:

| Function | Production signature | Repo files (#76 / #82 / #89) |
|---|---|---|
| `add_shipment_to_manifest` | `(uuid, text, uuid)` | `(uuid, text)` (#76, before #85) |
| `update_shipment_status` | `(uuid, text, uuid, text)` (status as text) | `(uuid, shipment_status, text, text)` (status as enum) |
| `arrive_manifest` / `depart_manifest` / `close_manifest_atomic` | `(uuid, uuid)` (with `p_staff_id`) | `(uuid)` (#76, before #85) |
| `resolve_exception` | `(uuid, uuid, text)` | `(uuid, text)` |

Note: PR #89 already addressed `resolve_exception` via IF/ELSIF positional
detection. PR #85 (commit `8ed8866`?) updated the others to 3-arg signatures
matching production. The remaining gap is that repo functions still take
enum-typed `p_new_status` parameters where production takes text.

## 4. Latent production bug (high impact, P0)

### 4.1 `invoice_payments_insert` policy references nonexistent role

```sql
-- Production policy (live):
create policy invoice_payments_insert on public.invoice_payments
  for insert
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = ANY(ARRAY['SUPER_ADMIN'::text, 'OPERATOR'::text])
    )
  );

-- But profiles.role CHECK list does NOT include 'OPERATOR':
-- SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE_IMPHAL, WAREHOUSE_DELHI,
-- OPS, INVOICE, SUPPORT, WAREHOUSE_STAFF, OPS_STAFF, FINANCE_STAFF
```

**Effect:** Only users with `role = 'SUPER_ADMIN'` can insert into
`invoice_payments`. Every OPS / FINANCE_STAFF / INVOICE / etc. user is
silently rejected. The `record_invoice_payment` RPC will fail for everyone
except the org owner.

**Triage:** This is independent of the migration drift work — it should be
fixed in production directly with a small RLS migration that replaces
`'OPERATOR'` with the actual role names that should have payment-write
access (likely `SUPER_ADMIN`, `MANAGER`, `INVOICE`, `FINANCE_STAFF`).

**This is a strong argument that production-as-truth still needs corrections.**
Path A doesn't mean "production is perfect" — it means "production is the
starting baseline; we add corrective migrations on top."

## 5. Cosmetic / low-impact divergence

- Two `*updated_at()` trigger functions exist (`set_updated_at` and
  `update_updated_at`) — production uses both inconsistently. Pick one
  going forward; leave both if Path A.
- `tracking_events.status` is plain `text` in production (no CHECK). Repo
  expects `tracking_event_type` enum. Production drift introduced because
  triggers/INSERTs sometimes use canonical names like `'CREATED'` and
  sometimes use scan-event names. Tightening this is post-Path-A work.

## 6. Strategy pivot — Path C → Path A (recommended)

### Why the original Path C plan no longer fits

The original framing assumed divergences were small enough that we could
edit repo migrations to "match" production. After this snapshot:

- 13 enum types must be deleted from migration 1 of 11
- ~30 column declarations must change from `<enum>` to `text + CHECK`
- 5 helper functions must be deleted; ~14 RLS policies must be rewritten
  to inline `get_user_role()` checks
- ~7 function signatures must be rewritten
- 3 extensions in repo aren't installed in production — either install
  them (write change) or remove from migration 1

That's not "edit a few migrations" — that's rewriting the entire 11-file
migration set. At that point, the audit trail of how the repo got here is
worse, not better, because individual migrations no longer reflect what
they did at commit time. They become fictional.

### Path A — what it actually means now

1. **Snapshot lock:** Treat `production-schema-2026-05-15.md` (this dir)
   as the canonical baseline.
2. **One consolidated baseline migration:** Generate a single migration
   `20260515000001_baseline_from_production.sql` that, when run on a
   fresh DB, reproduces production's schema exactly (using `text + CHECK`
   for enums, UPPERCASE values, `get_user_role()` helper, etc.). This is
   produced with `pg_dump --schema-only --no-owner --no-privileges` against
   production and lightly post-processed.
3. **Archive the divergent migrations:** Move `20260430000001` through
   `20260514000002` to `supabase/migrations/_archive/` with a README
   pointing here. They are kept for git-blame value, removed from the
   replay path.
4. **Bookkeeping fix:** Insert production's 17 historical filenames into
   `supabase_migrations.schema_migrations` so `supabase db push` knows
   they're already applied. (Done as a one-time SQL run, not a migration.)
5. **Forward migrations only from here:** Future PRs add new dated
   migrations on top of the baseline. No more "fix" migrations against
   the diverged history.
6. **Fix the `invoice_payments_insert` 'OPERATOR' bug** in the first
   forward migration after baseline.

### Why this is the right call

| Criterion | Path C (continue) | Path A (pivot, recommended) |
|---|---|---|
| Effort | Weeks of cross-migration editing | One generation + one archive move + one bookkeeping insert |
| Risk to production | Low (we're not touching it) | Low (we're not touching it) |
| Audit-trail integrity | **Damaged** — migrations become fiction | **Preserved** — archive keeps original intent visible |
| Future PR ergonomics | Confusing — which version of the function are you editing? | Clean — one baseline, forward migrations on top |
| Time to unblock #79 (advisor warnings) | Weeks | Days |
| CI gate (`migrations-fresh-apply`) load-bearing | After 5+ PRs of fixes | After this single Path A PR + bookkeeping |

### What still needs the user's decision

- **Confirm the pivot to Path A.** This catalog is the evidence; the
  decision is the user's as project owner.
- **Confirm acceptance of the archive approach** (vs. deletion) for the
  11 divergent repo migrations.
- **Confirm whether the bookkeeping insert** to `supabase_migrations.schema_migrations`
  goes via `mcp__supabase__execute_sql` (one-time, with a recorded SQL
  trail) or via a manually-applied script in `supabase/scripts/`.

## 7. Acceptance criteria for #78 under Path A

- [ ] `production-schema-2026-05-15.md` + this catalog committed (Phase 1, this PR)
- [ ] `docs/ARCHITECTURAL-DECISIONS.md` updated with the Path A decision and rationale
- [ ] Baseline migration generated, reviewed, replayed on fresh local DB → matches snapshot
- [ ] Archive directory created with README
- [ ] Bookkeeping SQL written, reviewed, applied (one-time) — insertions verified via `list_migrations`
- [ ] CI gate `migrations-fresh-apply` passes against the new baseline
- [ ] `continue-on-error` removed from that gate (load-bearing)
- [ ] First forward migration: fix `invoice_payments_insert` 'OPERATOR' role bug
- [ ] Issue #78 closed; issues #79 and #54 unblocked
