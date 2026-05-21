# PHASE-0 — Database restore (PITR) playbook (SB-3 / D1)

**Date:** 2026-05-17
**Closes:** [SB-3 in DoD](../launch/definition-of-done.md#sb-3--database-restore-pitr-playbook-backlog-d1) / backlog [D1](../backlog/production-readiness.md#d1--pitr--database-restore-playbook).
**Predecessor:** Existing stub at [`docs/runbooks/PITR-PLAYBOOK.md`](../runbooks/PITR-PLAYBOOK.md) — filed 2026-05-16 as deliberate WONTFIX-UNLESS-TRIGGERED. **The launch IS the trigger** (DoD re-frame in PR #155 promoted D1 from WONTFIX to SHIP-BLOCKER). The stub's "When triggered — what to write here" outline becomes the structural skeleton of the new runbook.

---

## A. Restore scenarios — in scope

The runbook covers three distinct failure modes, each with its own decision branch:

| # | Scenario | Recovery mechanism | Operator-visible signal |
|---|---|---|---|
| 1 | **Bad migration applied to production** | PITR to just-before the migration timestamp (or `supabase db reset` if migration was applied in error to staging) | Sentry rule 4 (Supabase RPC failures) saturates; CI's `Migrations apply on fresh DB` gate would have caught it pre-merge if the migration was logically broken — production-time triggers are runtime semantics (e.g., a CHECK constraint added on data that violates it). |
| 2 | **Accidental data deletion / corruption** (wrong DELETE/UPDATE on production) | PITR to just-before the destructive query | Operator notices missing records (e.g., invoice list shorter than expected); `audit_logs` rows for destructive ops give the timestamp. |
| 3 | **Full database loss** (project unreachable, accidental project deletion, region outage) | Restore from latest backup OR PITR-to-now into a new project + DNS/env cutover | Project status non-`ACTIVE_HEALTHY` in Supabase dashboard; all dashboard endpoints return 500/503. |

**Explicitly OUT of scope** (POST-LAUNCH if needed):
- Automated regression-detection / continuous restore drills.
- Cross-region failover (single-region project today; `ap-northeast-1` Tokyo).
- Restore of `auth.users` (Supabase Auth) separately — covered transitively by PITR but the `auth` schema is managed by Supabase, not migrated by this repo.
- A standalone backup/snapshot tool — Supabase PITR + their daily logical backup is the primary mechanism; rolling our own is POST-LAUNCH.

---

## B. Mechanism ground truth (verified via Supabase MCP)

**Project (verified `mcp__supabase__get_project` on 2026-05-17):**
- Ref: `<YOUR_PROJECT_REF>`
- Name: `tac-express`
- Region: `ap-northeast-1` (Tokyo)
- Status: `ACTIVE_HEALTHY`
- Database: Postgres `17.6.1.104` (engine 17, release channel `ga`)
- Host: `db.<YOUR_PROJECT_REF>.supabase.co`
- Created: 2026-04-07 (~6 weeks old)

**Tables (verified `mcp__supabase__list_tables` on 2026-05-17):** 13 public tables, all RLS-enabled. Production row counts at verification time:

| Table | Rows | Money-flow relevant? |
|---|---|---|
| `invoices` | 23 | ✅ load-bearing |
| `invoice_payments` | 6 | ✅ load-bearing (mutated only via `record_invoice_payment` RPC) |
| `audit_logs` | 0 | ✅ destructive-op trail |
| `shipments` | 16 | operational |
| `manifests` | 9 | operational |
| `manifest_shipments` | 7 | operational |
| `tracking_events` | 20 | operational |
| `rate_cards` | 28 | operational (financial reference) |
| `customers` | 4 | operational |
| `hubs` | 8 | static |
| `profiles` | 1 | static |
| `exceptions` | 0 | operational |
| `notes` | 0 | operational |

**`whatsapp_sends`** (migration `20260517000001`) does NOT appear in the production list at verification time — either the migration has not been applied to production yet, or the table exists with 0 rows and the list call truncated. **OWNER-CONFIRMED PREREQUISITE:** confirm whether `whatsapp_sends` is present on production; the runbook's verification section assumes it MAY be present.

**OWNER-CONFIRMED PREREQUISITES (mechanism availability the agent cannot verify):**

The Supabase MCP read does NOT expose plan tier, PITR availability, retention window, or backup configuration. The owner must confirm — BEFORE relying on this runbook — the following four facts via the Supabase dashboard:

| # | Prerequisite | Where to verify |
|---|---|---|
| P1 | The project is on **Pro plan or above** (Free tier does not have PITR) | `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/settings/general` → Plan |
| P2 | **PITR is enabled** AND the retention window is recorded (default 7 days on Pro; up to 28 days on Team) | `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/database/backups/pitr` |
| P3 | **Daily logical backups** exist (and the daily backup count is at expected cadence) | `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/database/backups/scheduled` |
| P4 | At least one organization-level member has the **Owner** role on the Supabase org (PITR restore requires Owner or Project Admin) | `https://supabase.com/dashboard/org/<YOUR_ORG_REF>/team` |

If P1 or P2 is unverified or absent, the runbook's "PITR-to-timestamp" branches do NOT apply — the runbook then degrades to scenario 3 only (restore from logical backup), AND this is a material launch finding (see bailout § below).

**Bailout check:** does the project's actual restore capability support the in-scope scenarios?

- If P1+P2 confirm (PITR available) → **bailout does NOT fire.** All three scenarios are documented with executable steps.
- If P1+P2 unconfirmed at PR merge time → the runbook ships with the prerequisite section flagged + a SHIP-BLOCKER-candidate finding surfaced for owner attention. The runbook does NOT pretend PITR is available when it might not be.

The PR proceeds assuming P1+P2 hold (Supabase Pro is the standard tier for revenue-bearing projects and is the documented assumption in the existing stub at `PITR-PLAYBOOK.md § Why this is a stub today`). The runbook explicitly calls out the prerequisite check as Step 0.

---

## C. Decision points (the judgment calls — runbook as decision tree, not prose)

A restoring operator under pressure faces FOUR named judgment calls. The runbook gives a concrete tree, not advice.

### D1 — Restore in place, or spin up a parallel project?

| Choice | When | Cost | Risk |
|---|---|---|---|
| **In-place PITR** (same project ref; same DNS; same env vars) | Scenario 1 (bad migration); scenario 2 (small, identifiable data loss) | Fast (RTO ≤ 4h); zero DNS/env changes | Destroys all writes AFTER the restore timestamp |
| **Parallel project + cutover** | Scenario 3 (project lost); any scenario where forensics on post-incident state matters | Slower (RTO ≤ 8h); requires Vercel env-var swap + new project ref | Preserves post-incident writes for forensic review |

### D2 — What's the restore target timestamp?

| Source | Use for |
|---|---|
| `audit_logs.created_at` for the destructive op | Scenario 2 — restore to "just before this row" |
| The PR merge commit + Vercel deploy timestamp | Scenario 1 — restore to "just before deploy" |
| Sentry first event of the incident | Scenarios 2, 3 — anchor on first-known-bad |
| Last green CI run on main + manual reasoning | Scenario 3 — coarse fallback |

### D3 — Single-table restore vs full project?

Supabase PITR is project-level. For **single-table** restores the operator follows the parallel-project path (D1 second row): restore PITR into a new project, then `pg_dump`/`COPY` the target table back to the live project. Adding to the live project is itself a write — see D4.

### D4 — Restore-into-live now, or stage-and-review first?

| Choice | When |
|---|---|
| **Stage first** (restore to parallel project; review; then targeted DML against live) | Scenario 2 (single-table) — always |
| **Restore live now** | Scenario 3 (production down) — speed wins; the alternative is extended outage |
| **Restore live now after dry-walk** | Scenario 1 (bad migration on staging clone first) — recommended for any non-emergency |

---

## D. Verification — how the operator confirms the restore actually worked

A restore with no verification step is incomplete. The runbook's verification section asserts FOUR invariants in order; if any fails, the operator stops and escalates rather than continuing.

### V1 — Schema integrity

```bash
supabase db push --linked --dry-run
# Same shape as the `Migrations apply on fresh DB` CI gate (which runs
# `supabase db reset --debug` against an ephemeral Postgres). The
# `--linked --dry-run` flag pair surfaces unapplied migrations without
# writing — safe to run against a restored production-shaped DB.
```

Pass: 0 errors, all 7 active migrations apply.
Fail: schema drift between restore and repo migrations. Stop. Do NOT write to the restored DB.

### V2 — Money-flow row counts within expected bounds

Capture these BEFORE the restore (Step 0 / safety) and AFTER:

```sql
-- whatsapp_sends line is conditional — see § B above (the table may not
-- be present on production yet). Verify via information_schema first;
-- comment out the line if absent. Same caveat in the runbook § 6 V2.
SELECT 'invoices' AS table, COUNT(*) AS n FROM invoices
UNION ALL SELECT 'invoice_payments', COUNT(*) FROM invoice_payments
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'whatsapp_sends', COUNT(*) FROM whatsapp_sends   -- comment out if absent
UNION ALL SELECT 'shipments', COUNT(*) FROM shipments
UNION ALL SELECT 'manifests', COUNT(*) FROM manifests;
```

The post-restore counts MUST be ≥ counts captured at the restore timestamp on the SOURCE (e.g., if restoring to 14:00 UTC, the source's 14:00 counts are the floor) and ≤ current-live counts.

### V3 — Referential integrity on money-flow joins

The two non-negotiable financial joins:

```sql
-- Every payment links to an invoice that still exists.
SELECT COUNT(*) FROM invoice_payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
WHERE i.id IS NULL;
-- Expected: 0

-- Every audit_logs row for a destructive op references a real entity.
SELECT actor_user_id, op, count(*) FROM audit_logs
WHERE op IN ('payment_delete', 'invoice_cancel', 'manifest_shipment_remove')
GROUP BY 1, 2;
-- Manual review: any unexpected entry (esp. one with NULL actor) → escalate.
```

### V4 — Application smoke test against the restored DB

The operator hits these canonical paths in a deploy preview pointed at the restored DB (NOT production, until V1+V2+V3 all pass):

| Path | Assert |
|---|---|
| GET `/api/health` | 200 OK |
| Sign in as a known MANAGER account | Session established |
| Visit `/ops-console/finance` → click any invoice | Detail page renders; payment ledger shows expected rows |
| Visit `/ops-console/whatsapp/failed-sends` | Page renders (empty list is fine; 500 is not) |

A restored DB that passes V1+V2+V3+V4 is considered restored. Any failure stops the cutover.

---

## E. Blast-radius / safety guards

Restoring a production database is itself a destructive, high-stakes operation. The runbook builds in FIVE safety guards.

### S1 — Authorization

Only the **Supabase organization Owner** (or the Project Admin with explicit owner sign-off in writing) may run the restore. Operators / engineers / agents MUST NOT initiate a PITR restore. The runbook names this explicitly at the top.

### S2 — Pre-restore capture-of-current-state

BEFORE any restore action, the owner captures a snapshot of the current state (so a wrong-restore can be reverted):

```bash
# Trigger an immediate logical backup via Supabase CLI:
supabase db dump --project-id <YOUR_PROJECT_REF> \
  --file ./pre-restore-snapshot-$(date +%Y%m%d-%H%M%S).sql

# Or via the dashboard: Database → Backups → Manual backup
```

If the project is unreachable (scenario 3), this step is skipped and the runbook proceeds to the parallel-project path (D1 second row) — the post-incident state can't be captured if the DB is gone.

### S3 — Announce step

The owner announces (in whatever channel is canonical — owner's email to themselves at minimum, or a Slack/PagerDuty if configured per SB-2) BEFORE starting the restore:
```
Restoring database <YOUR_PROJECT_REF> — target timestamp <X> — expected RTO <Y>m.
Writes to production will be lost if restoring in-place. Acknowledge.
```

This serves two purposes: an audit trail of who decided what, and (when multi-operator) a halt-point if anyone objects.

### S4 — Abort path

At every step in the runbook, an explicit abort instruction: stop the restore action via the Supabase CLI / dashboard, document where it was stopped, escalate. The runbook never says "now you must finish."

### S5 — Application-write blocker during restore

If the application is still serving traffic during the restore (rare — usually the DB is the bottleneck), set `WHATSAPP_ENABLED=false` AND deploy a maintenance flag via Vercel env var to block all write paths. The runbook lists every write path that must be blocked.

---

## Decision verdict

Ship the runbook now per Option A. The DoD re-frame promoted D1 from WONTFIX to SHIP-BLOCKER for the exact reason the original stub's rationale undervalued: pre-launch, deferral was correct; at-launch, "decisions are situational" loses to "a money-flow project with no documented restore path cannot launch."

The original stub's structural outline (assessment → decision tree → mechanical steps → verification → postmortem) becomes the runbook's section structure. Credit retained.

**File output:**
- NEW: `docs/runbooks/DATABASE-RESTORE.md` — the substantive runbook
- REPLACED: `docs/runbooks/PITR-PLAYBOOK.md` — short pointer to DATABASE-RESTORE.md (preserves grep handle + history; eliminates duplication)
