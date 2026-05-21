# Runbook — PI-1 migration-history repair (owner-runnable)

> **Status:** PI-1 is **BLOCKED** on this repair. The migration-deploy pipeline
> (`migration-deploy.yml`) runs correctly but `supabase db push` aborts before
> applying anything, because the production migration-history table records
> versions that do not exist as local migration filenames.
>
> **This runbook is owner-runnable only.** Every command here writes to the
> production migration-history table or pushes migrations. The agent does not
> run them (durable production-write boundary). The agent produced this plan
> read-only.
>
> **Author:** Claude Code (Opus 4.7), DevOps + PM lens — 2026-05-20 PI-1
> history diagnostic session.

---

## 0. TL;DR

`supabase db push` fails with *"Remote migration versions not found in local
migrations directory"* and lists 20 versions to repair. Root cause: the
`baseline_from_production` squash (PR series #78/#79) renumbered the local
migration files, but the production `supabase_migrations.schema_migrations`
table still carries the original 20 pre-squash versions. This is pre-existing
drift, not caused by the PI-1 deploy attempts.

**Recommended fix (Strategy B):** two `supabase migration repair` commands
reconcile the bookkeeping (no schema re-execution), after which `db push`
applies only the 4 genuinely-new PI-1 migrations. Verified safe by a read-only
diff: the 3 post-baseline migrations are byte-for-byte identical local-vs-remote
and idempotent; the baseline is idempotent and stays "applied" (never re-runs).

**Take a PITR checkpoint / snapshot before running** (see § 6).

---

## 1. The drift — full read-only inventory

Production project `<YOUR_PROJECT_REF>` · `supabase_migrations.schema_migrations`
has **21** recorded versions. Local `supabase/migrations/` has **8** `.sql`
files. They diverge as follows.

| Remote version | Name | Local file | Class |
|---|---|---|---|
| `20260421181758` | create_sequences_and_awb_function | — | PRE-BASELINE-SQUASHED |
| `20260421182034` | create_profiles_and_customers | — | PRE-BASELINE-SQUASHED |
| `20260421182043` | create_manifests | — | PRE-BASELINE-SQUASHED |
| `20260421182056` | create_shipments | — | PRE-BASELINE-SQUASHED |
| `20260421182108` | create_tracking_events_and_manifest_shipments | — | PRE-BASELINE-SQUASHED |
| `20260421182127` | create_invoices_exceptions_audit_logs | — | PRE-BASELINE-SQUASHED |
| `20260421182136` | create_triggers_and_profile_creation | — | PRE-BASELINE-SQUASHED |
| `20260421182156` | create_rpc_functions | — | PRE-BASELINE-SQUASHED |
| `20260421182213` | enable_rls_policies | — | PRE-BASELINE-SQUASHED |
| `20260421182219` | enable_realtime_and_storage | — | PRE-BASELINE-SQUASHED |
| `20260421185148` | create_invoice_and_exception_rpc_functions | — | PRE-BASELINE-SQUASHED |
| `20260422145228` | fix_manifest_rpc_optional_staff_id | — | PRE-BASELINE-SQUASHED |
| `20260422155001` | create_rate_cards | — | PRE-BASELINE-SQUASHED |
| `20260511195047` | add_hubs_table | — | PRE-BASELINE-SQUASHED |
| `20260511195111` | add_invoice_payments_and_rpc | — | PRE-BASELINE-SQUASHED |
| `20260511195129` | add_notes_table | — | PRE-BASELINE-SQUASHED |
| `20260512164008` | shipment_created_event_trigger | — | PRE-BASELINE-SQUASHED |
| `20260514235527` | fix_invoice_payments_operator_role | `20260515000002_…` | POST-BASELINE-MISMATCHED |
| `20260515000001` | baseline_from_production | `20260515000001_…` | BASELINE-COLLAPSED (match) |
| `20260515001229` | advisor_search_path_and_revokes | `20260515000003_…` | POST-BASELINE-MISMATCHED |
| `20260515002445` | revoke_public_grant_authenticated | `20260515000004_…` | POST-BASELINE-MISMATCHED |
| — | — | `20260516000001_audit_logs_destructive_op_hardening` | **NEW-PENDING** |
| — | — | `20260516000002_audit_logs_check_manifest_shipment_remove` | **NEW-PENDING** |
| — | — | `20260517000001_whatsapp_sends_table` | **NEW-PENDING** |
| — | — | `20260518000001_contact_leads` | **NEW-PENDING** |

**Classification summary:**
- **17 PRE-BASELINE-SQUASHED** — granular migrations that genuinely built the
  schema on production, then were collapsed into the local `baseline_from_production`
  file. Remote-only.
- **1 BASELINE-COLLAPSED** — `20260515000001` exists both places and matches.
  On remote it is a **marker row with `stmt_count = 0`** (adopted via
  `repair --status applied`; it ran nothing — the granular migrations above did
  the real work).
- **3 POST-BASELINE-MISMATCHED** — same migration, recorded on remote under its
  pre-squash timestamp, present locally under a `…00000N` timestamp. Remote-only
  *versions*; the *content* is already applied (see § 3).
- **4 NEW-PENDING** — the actual PI-1 payload. Never deployed.

The 20 remote-only versions (17 squashed + 3 mismatched) are exactly the list
`supabase db push` told us to repair.

---

## 2. Why `db push` fails

`supabase db push` compares local files against the remote history table. When
the remote has **applied versions with no matching local file**, the CLI treats
it as an inconsistent history and aborts *before applying anything* (fails in
`migration/apply.go` during the pre-apply reconciliation). It will not deploy
the 4 new migrations until the 20 orphaned versions are reconciled.

Two PI-1 pipeline runs confirm the behavior:
- Run **26174554451** — "success" but skipped all deploy steps (the
  `MIGRATION_DEPLOY_ENABLED` flag was miscreated as a *secret* not a *variable*;
  fixed by the owner).
- Run **26175215585** — gate passed, deploy steps ran, `supabase db push`
  **failed** on the history mismatch. Nothing applied. Production unchanged.

---

## 3. Post-baseline content diff (read-only verification)

The 3 POST-BASELINE-MISMATCHED migrations were diffed: the local file body vs
the remote `schema_migrations.statements` array.

| Migration | Local file | Remote version | Content | Idempotent? |
|---|---|---|---|---|
| fix_invoice_payments_operator_role | `20260515000002` | `20260514235527` | **identical** (modulo comment header) | ✅ `drop policy if exists` + `create policy` + `create or replace function` |
| advisor_search_path_and_revokes | `20260515000003` | `20260515001229` | **identical** | ✅ `alter function … set` + `revoke` (re-runnable) |
| revoke_public_grant_authenticated | `20260515000004` | `20260515002445` | **identical** | ✅ `revoke … from public` + `grant … to authenticated` (re-runnable) |

**No content divergence** → this is not a "which side is authoritative" problem
(Strategy C is ruled out). The schema effect of these 3 is already live on
production; the only discrepancy is the version label.

**Baseline idempotency (`20260515000001`, 979 lines):** idempotent. 34
`if not exists`, 20 `create or replace`, 8 `drop … if exists`. The 8 `insert into`
statements are all **inside `create or replace function` bodies** (e.g.
`handle_new_user`, `generate_invoice`) — function logic, **not data seeds** — so
re-execution would not duplicate rows. No unguarded `create table`. (Note: in
both strategies the baseline stays "applied" and never re-runs; this audit is a
reset safety-net.)

---

## 4. Repair strategies

### ✅ Strategy B — RECOMMENDED (reconcile bookkeeping, re-execute nothing)

Mark the 20 orphaned versions reverted, and mark the 3 local post-baseline
versions applied (their content is already live). `db push` then applies only
the 4 new migrations.

```bash
# From the repo root, with the Supabase CLI authenticated to the prod project.
cd /c/tac/tac-express
supabase login                                  # if not already
supabase link --project-ref <YOUR_PROJECT_REF>

# Step 1 — revert the 20 orphaned remote-only versions (17 squashed + 3 mismatched):
supabase migration repair --status reverted \
  20260421181758 20260421182034 20260421182043 20260421182056 20260421182108 \
  20260421182127 20260421182136 20260421182156 20260421182213 20260421182219 \
  20260421185148 20260422145228 20260422155001 20260511195047 20260511195111 \
  20260511195129 20260512164008 20260514235527 20260515001229 20260515002445

# Step 2 — mark the 3 post-baseline local versions applied (content already live,
#           so they must NOT be re-run):
supabase migration repair --status applied \
  20260515000002 20260515000003 20260515000004

# Step 3 — confirm ONLY the 4 new migrations are pending:
supabase migration list --linked
#   Expect pending (local, not remote): 20260516000001, 20260516000002,
#   20260517000001, 20260518000001 — and nothing else.
```

After Step 3 shows exactly the 4 new as pending, the history is clean. Re-run
the deploy via the pipeline (§ 7) — do **not** `db push` by hand; let the
designed pipeline do it for the audit trail.

**Why B:** it never re-executes a migration against production. It records the
truth (those 3 are applied) and leaves `db push` to apply only the genuinely-new
4. Cleanest long-term history.

### Strategy A — acceptable simpler alternative (re-runs the 3 idempotent ones)

```bash
supabase migration repair --status reverted \
  20260421181758 … 20260515002445     # the same 20 versions as B Step 1
supabase migration list --linked         # expect pending: 000002,000003,000004 + the 4 new
```

Then the pipeline's `db push` re-applies `20260515000002/3/4` **and** the 4 new
(7 total). Safe **because § 3 confirmed all three are idempotent and content-
identical** — re-running them is a no-op against the live schema. One fewer
command than B, at the cost of re-executing 3 already-applied migrations. Use B
unless you specifically prefer the single-command form.

### Strategy C — NOT APPLICABLE

Strategy C would apply only if the post-baseline content diverged remote-vs-local
(owner must pick the authoritative side). § 3 proved the content is identical, so
C is ruled out. No action.

---

## 5. What this repair does NOT fix

- **The 17 squashed granular files are not restored locally** — by design. They
  remain collapsed in `baseline_from_production`. After the revert, they are gone
  from remote history too; the local and remote lineages converge on
  `baseline → 000002/3/4 → (4 new)`. This is the intended end state, not a gap.
- **It does not change any schema.** `migration repair` only edits the
  `supabase_migrations.schema_migrations` bookkeeping table. Tables, functions,
  policies, grants are untouched.
- **It does not address the `auth_leaked_password_protection` advisor** (a
  dashboard setting, tracked separately — see `20260515000003` header). Out of
  scope for PI-1.
- **It does not deploy the 4 new migrations** — that is the pipeline re-run in
  § 7, after this repair lands.

---

## 6. Risks & rollback

| Risk | Likelihood | Mitigation |
|---|---|---|
| `migration repair` corrupts the history table | Low | It writes only `schema_migrations` rows. **Take a PITR checkpoint / snapshot first** — see [`PITR-PLAYBOOK.md`](PITR-PLAYBOOK.md) and [`DATABASE-RESTORE.md`](DATABASE-RESTORE.md). |
| `db push` re-runs a non-idempotent migration (Strategy A) | Very low | § 3 confirmed all 3 are idempotent + content-identical. Strategy B avoids re-execution entirely. |
| A 4th new migration fails mid-`db push` | Low | All 4 were verified idempotent/additive/self-verifying in the prior PI-1 analysis session and pass the CI fresh-apply gate. `db push` is forward-only; a partial failure leaves earlier-applied migrations in place — re-run after fixing. |
| Wrong project linked | Low | `supabase link --project-ref <YOUR_PROJECT_REF>` is explicit; confirm with `supabase projects list`. |

**Before running:** confirm PITR is enabled (or take a manual snapshot) on
`<YOUR_PROJECT_REF>` (or whatever the active project ref is), so the production DB can be restored if the repair goes
wrong. The repair touches only bookkeeping, but a checkpoint is cheap insurance
on a production write.

**Rollback of the repair itself:** if `migration list` looks wrong after the
repair, the bookkeeping can be corrected with further `migration repair`
invocations (set versions back to `applied`/`reverted` as needed). No schema is
at risk from the repair step.

---

## 7. Re-trigger PI-1 after the repair

Once `supabase migration list --linked` shows **only** the 4 new migrations
pending:

1. Owner tells the agent the repair is done (or runs the deploy directly).
2. Agent (with explicit owner authorization) re-runs the pipeline:
   `gh workflow run migration-deploy.yml`
3. Agent watches the run, confirms the **opt-in gate passed AND deploy steps
   executed** (not skipped — the run-26174554451 failure mode), and that
   `supabase db push` succeeds this time.
4. Agent verifies read-only via Supabase MCP: `contact_leads` + `whatsapp_sends`
   present, `audit_logs.before_state` + the destructive-action CHECK present, all
   4 versions recorded, `get_advisors` clean on the two PII tables.
5. Agent stamps PI-1 EVIDENCED DONE and closes issue #174.

PI-1 is **not done** until step 5 completes.
