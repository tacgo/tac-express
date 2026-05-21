# Production schema snapshot — 2026-05-15

Captured via Supabase MCP (`<YOUR_SUPABASE_PROJECT_ID>`). This is the authoritative
state of production at the time of capture. Source of truth for the migration
reconciliation effort tracked by issue #78.

---

## 1. Migration history (17 applied)

```
20260421181758  create_sequences_and_awb_function
20260421182034  create_profiles_and_customers
20260421182043  create_manifests
20260421182056  create_shipments
20260421182108  create_tracking_events_and_manifest_shipments
20260421182127  create_invoices_exceptions_audit_logs
20260421182136  create_triggers_and_profile_creation
20260421182156  create_rpc_functions
20260421182213  enable_rls_policies
20260421182219  enable_realtime_and_storage
20260421185148  create_invoice_and_exception_rpc_functions
20260422145228  fix_manifest_rpc_optional_staff_id
20260422155001  create_rate_cards
20260511195047  add_hubs_table
20260511195111  add_invoice_payments_and_rpc
20260511195129  add_notes_table
20260512164008  shipment_created_event_trigger
```

None of these filenames exist in the repo. The repo's 11 migrations
(`20260430*`, `20260512000*`, `20260514*`) have **never been applied** to
production — `supabase db push` skips by filename, so they would be net-new
applications, not redefinitions.

## 2. Tables (13 total, all RLS-enabled)

| Table | Rows | Notes |
|---|---|---|
| `profiles` | 1 | role is `text` with CHECK list; UPPERCASE values |
| `customers` | 4 | |
| `hubs` | 8 | added 2026-05-11 |
| `shipments` | 16 | status is `text` with CHECK; 11 lifecycle states (UPPERCASE) |
| `manifests` | 9 | status is `text` with CHECK; 7 lifecycle states (UPPERCASE) |
| `manifest_shipments` | 7 | join table |
| `tracking_events` | 20 | status is plain `text`, no CHECK; source has CHECK list |
| `invoices` | 23 | status is `text` with CHECK; 5 lifecycle states |
| `invoice_payments` | 6 | added 2026-05-11; method has CHECK list |
| `exceptions` | 0 | type/severity/status all CHECK lists |
| `notes` | 0 | added 2026-05-11; entity_type CHECK list |
| `rate_cards` | 28 | service_level CHECK list |
| `audit_logs` | 0 | |

### Key column definitions (production reality)

**`profiles.role`** — TEXT, default `'OPS'`, CHECK on:
```
SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE_IMPHAL, WAREHOUSE_DELHI,
OPS, INVOICE, SUPPORT, WAREHOUSE_STAFF, OPS_STAFF, FINANCE_STAFF
```

**`shipments.status`** — TEXT, default `'CREATED'`, CHECK on:
```
CREATED, PICKUP_SCHEDULED, PICKED_UP, RECEIVED_AT_ORIGIN, IN_TRANSIT,
RECEIVED_AT_DEST, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, RTO, EXCEPTION
```

**`manifests.status`** — TEXT, default `'DRAFT'`, CHECK on:
```
DRAFT, BUILDING, OPEN, CLOSED, DEPARTED, ARRIVED, RECONCILED
```

**`invoices.status`** — TEXT, default `'DRAFT'`, CHECK on:
```
DRAFT, ISSUED, PAID, CANCELLED, OVERDUE
```

**`shipments.transport_mode`** — TEXT, default `'AIR'`, CHECK on:
```
AIR, TRUCK, OCEAN
```

## 3. Public-schema enum types

**Zero.** Production has no `CREATE TYPE ... AS ENUM` types in the public schema.
All enumerated columns are TEXT + CHECK constraint.

## 4. Functions (20 total, all under public schema)

| Function | Args | Returns | Security | Lang |
|---|---|---|---|---|
| `add_shipment_to_manifest` | `(p_manifest_id uuid, p_awb_number text, p_staff_id uuid)` | void | DEFINER | plpgsql |
| `arrive_manifest` | `(p_manifest_id uuid, p_staff_id uuid)` | void | DEFINER | plpgsql |
| `close_manifest_atomic` | `(p_manifest_id uuid, p_staff_id uuid)` | void | DEFINER | plpgsql |
| `count_shipments_by_status` | `()` | json | DEFINER | plpgsql |
| `depart_manifest` | `(p_manifest_id uuid, p_staff_id uuid)` | void | DEFINER | plpgsql |
| `generate_awb_number` | `()` | text | INVOKER | plpgsql |
| `generate_invoice` | `(p_shipment_id uuid, p_staff_id uuid, p_discount numeric)` | uuid | DEFINER | plpgsql |
| `generate_invoice_number` | `()` | text | INVOKER | plpgsql |
| `generate_manifest_number` | `()` | text | INVOKER | plpgsql |
| `get_finance_summary` | `()` | json | DEFINER | plpgsql |
| `get_rate_card` | `(p_origin text, p_dest text, p_service_level text, p_weight numeric)` | TABLE(...) | DEFINER | sql |
| `get_user_role` | `()` | **text** | DEFINER | sql |
| `handle_new_user` | `()` | trigger | DEFINER | plpgsql |
| `record_invoice_payment` | `(p_invoice_id uuid, p_amount numeric, p_method text, p_reference text, p_notes text, p_received_at timestamptz, p_attachment_path text)` | invoice_payments | DEFINER | plpgsql |
| `resolve_exception` | `(p_exception_id uuid, p_staff_id uuid, p_resolution text)` | void | DEFINER | plpgsql |
| `rls_auto_enable` | `()` | event_trigger | DEFINER | plpgsql |
| `set_updated_at` | `()` | trigger | INVOKER | plpgsql |
| `shipment_emit_created_event` | `()` | trigger | DEFINER | plpgsql |
| `update_shipment_status` | `(p_shipment_id uuid, p_new_status text, p_staff_id uuid, p_notes text)` | void | DEFINER | plpgsql |
| `update_updated_at` | `()` | trigger | INVOKER | plpgsql |

Notable: `get_user_role` returns `text`, not the repo's expected
`current_user_role` returning `user_role` enum. The function name is
different too. **Both helper-function name and return type diverge from repo.**

## 5. Triggers (8 total)

| Table | Trigger | Event | Timing | Function |
|---|---|---|---|---|
| `customers` | `update_customers_updated_at` | UPDATE | BEFORE | `update_updated_at()` |
| `exceptions` | `update_exceptions_updated_at` | UPDATE | BEFORE | `update_updated_at()` |
| `invoices` | `update_invoices_updated_at` | UPDATE | BEFORE | `update_updated_at()` |
| `manifests` | `update_manifests_updated_at` | UPDATE | BEFORE | `update_updated_at()` |
| `profiles` | `update_profiles_updated_at` | UPDATE | BEFORE | `update_updated_at()` |
| `rate_cards` | `rate_cards_updated_at` | UPDATE | BEFORE | `set_updated_at()` |
| `shipments` | `trg_shipment_created_event` | INSERT | AFTER | `shipment_emit_created_event()` |
| `shipments` | `update_shipments_updated_at` | UPDATE | BEFORE | `update_updated_at()` |

Note that `rate_cards` uses `set_updated_at()` while every other table uses
`update_updated_at()` — there are TWO functionally-equivalent helpers in
production. Repo only defines `set_updated_at()`.

## 6. RLS policies (34 total, public schema)

All policies use `(public)` role. Patterns observed:

- Most tables: simple `auth.uid() IS NOT NULL` for INSERT/SELECT/UPDATE
- Finance tables (`invoices`): role-gated via `get_user_role() = ANY(...)`
- Admin-only tables (`hubs`, `audit_logs`): role check via subquery on `profiles`
- Public-readable: `shipments_select_all` and `tracking_events_select_all` use `qual = true`
- **`invoice_payments_insert` references role `'OPERATOR'` which does NOT exist
  in the `profiles.role` CHECK list — this policy is effectively SUPER_ADMIN-only.**
  See divergence catalog (`MIGRATION-DRIFT-CATALOG-2026-05-15.md`) for the latent-bug entry.

## 7. Extensions installed

Only 4 user-installed extensions are enabled (others available but not
enabled), plus the built-in `plpgsql`:
- `pgcrypto` (extensions schema, v1.3)
- `uuid-ossp` (extensions schema, v1.1)
- `pg_stat_statements` (extensions schema, v1.11)
- `supabase_vault` (vault schema, v0.3.1)
- `plpgsql` (pg_catalog, v1.0) — built-in, always present

The repo migration `20260430000001` declares `pgcrypto`, `uuid-ossp`,
`pg_trgm`, `btree_gin`, `citext`. Production has only the first two; the
trigram/index/citext extensions were never installed in production.

---

## How this snapshot was captured

```
mcp__supabase__list_migrations
mcp__supabase__list_tables(verbose=true)
mcp__supabase__list_extensions
mcp__supabase__execute_sql(...)  # enums, policies, triggers, functions
```

To re-capture: re-run the same Supabase MCP calls. The format of this doc is
machine-friendly enough to diff (markdown table headers stay stable).
