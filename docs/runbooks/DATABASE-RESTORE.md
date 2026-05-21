# Runbook — Database Restore (Supabase PITR)

> **Audience:** the Supabase organization Owner. Operators / engineers / agents MUST NOT initiate a restore — see § 1 Authorization.
>
> **Read this BEFORE you need it.** If you are reading this during an incident, jump to § 3 "First 15 minutes" and skim § 0 prerequisites only.
>
> **Project coordinates:** project ref `<YOUR_PROJECT_REF>` (`tac-express`), region `ap-northeast-1` (Tokyo), Postgres 17.
>
> **Decision doc:** [`docs/decisions/2026-05-17-database-restore-playbook.md`](../decisions/2026-05-17-database-restore-playbook.md).
> **Supabase official docs (read once before relying on this runbook):**
> - PITR: <https://supabase.com/docs/guides/platform/backups#point-in-time-recovery>
> - Daily backups: <https://supabase.com/docs/guides/platform/backups>
> - Restore process: <https://supabase.com/docs/guides/platform/migrating-and-upgrading-projects>

---

## 0. TL;DR

```text
1. Confirm prerequisites P1–P4 in § 2 (one-time; verify before launch).
2. On incident: § 3 "First 15 minutes" → identify scenario (1, 2, or 3).
3. Run § 4 SAFETY guards (capture pre-restore snapshot, announce, authorize).
4. Follow § 5 decision tree for your scenario.
5. Verify with § 6 V1–V4 invariants in order. STOP on any failure.
6. Cutover (§ 7), or hand back to staging review.
7. Postmortem (§ 8) and update THIS file with anything learned.
```

**RTO target:** PITR restore ≤ 4 hours from incident detection for scenarios 1 and 2; ≤ 8 hours for scenario 3 (full project loss → parallel project + cutover).

---

## 1. Authorization

| Property | Value |
|---|---|
| Who may run a restore | Supabase **organization Owner** of `<YOUR_ORG_REF>`, OR a Project Admin with documented owner sign-off in writing for THIS incident |
| Who may NOT run a restore | Operators, engineers without admin role, any agent session, any CI workflow |
| Required Supabase permission | Owner (or Project Admin) — PITR restore action is gated server-side at the Supabase platform |
| Where authorization is verified | `https://supabase.com/dashboard/org/<YOUR_ORG_REF>/team` — owner role must be present on the member initiating the restore |

If the only Owner is unreachable AND data loss is ongoing, the escalation path is: contact Supabase support (`https://supabase.com/dashboard/support`) — they can perform restores against a project on the customer's behalf with org-level proof of ownership.

The Supabase audit log captures the actor + action for every restore — this is the canonical "who did what" trail. The owner does NOT need to log it separately.

---

## 2. Prerequisites (OWNER-CONFIRMED — verify before launch)

The agent cannot verify these via the MCP read. The owner confirms once + records confirmation. Recommended cadence to re-verify: quarterly, OR on any plan change.

| # | Prerequisite | How to verify | Confirmed |
|---|---|---|---|
| **P1** | Project is on **Pro plan or above** (Free tier has no PITR) | `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/settings/general` → Plan section | □ |
| **P2** | **PITR is enabled** AND retention window is recorded (default 7d Pro; up to 28d Team) | `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/database/backups/pitr` | □ retention = __ days |
| **P3** | **Daily logical backups** present at expected cadence | `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/database/backups/scheduled` | □ |
| **P4** | At least one org-level **Owner** present (Owner ≠ the project Admin role) | `https://supabase.com/dashboard/org/<YOUR_ORG_REF>/team` | □ Owner = __ |

**If P1 OR P2 is unconfirmed/absent:** the PITR-based scenarios (§ 5 branches A and B) do NOT apply. Restore is limited to scenario 3 from the most recent daily logical backup — which has higher RPO (up to 24h of writes lost). **This is a SHIP-BLOCKER-candidate finding** — escalate to the owner before relying on this runbook.

**If P3 is absent:** even scenario 3 is at risk (no backup to restore from). This is a hard ship-blocker — DO NOT launch with revenue-bearing workloads until daily backups are confirmed.

**Recorded prerequisite confirmation (owner fills in once after verifying):**

```
Date confirmed: ________________________
By: ____________________________________
P1 plan tier:   ________________________
P2 PITR window: ___ days
P3 last daily backup: ________________________
P4 Owner(s):    ________________________
Next re-check:  ________________________
```

---

## 3. First 15 minutes — assessment

When an incident fires, the first 15 minutes are spent identifying the SCENARIO. Resist the urge to act — a wrong restore is worse than 15 minutes of triage.

### 3.1 Is the project actually down?

```bash
# Project ping:
curl -I https://db.<YOUR_PROJECT_REF>.supabase.co
# Expected if healthy: 400 / 401 (DB rejects HTTP); if 5xx/timeout, project is down.

# Application ping:
curl -I https://<dashboard-host>/api/health
# Expected: 200 OK if both app + DB are healthy.

# Supabase status page:
# https://status.supabase.com — if a regional incident is acknowledged, WAIT;
# do not restore during a platform outage (your action may compound the issue).
```

### 3.2 What's the last-known-good state?

- **Sentry breadcrumbs:** `https://<YOUR_SENTRY_ORG>.sentry.io/issues/?project=<YOUR_SENTRY_PROJECT>` — first event of the incident anchors the restore target.
- **Last successful PR merge:** `gh pr list --state merged --limit 5` — gives a candidate "deploy-before" target for scenario 1.
- **Last green CI run:** `https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/actions` — confirms when main was last known-good.
- **Vercel deploys:** the deploy timeline shows when the most recent production deploy went out.

### 3.3 Is data loss suspected, or pure availability?

| Symptom | Scenario | Branch |
|---|---|---|
| Some endpoints 500 after a recent deploy; data appears intact | 1 — bad migration | § 5.A |
| Specific records missing OR `audit_logs` shows an unintended destructive op | 2 — data deletion | § 5.B |
| Project unreachable for >15 min OR Supabase status acknowledges DB loss | 3 — full loss | § 5.C |

If unclear after 15 minutes — escalate to Supabase support before acting.

---

## 4. Safety guards — RUN BEFORE ANY RESTORE ACTION

### S1 — Authorize (§ 1)

Confirm the person running this is the Org Owner OR has documented owner sign-off for this incident. If not, stop.

### S2 — Capture pre-restore snapshot

```bash
# Trigger a logical backup of CURRENT state (the restore will overwrite it).
# Requires: Supabase CLI installed, project linked, owner credentials.
supabase db dump --project-ref <YOUR_PROJECT_REF> \
  --file ./pre-restore-snapshot-$(date -u +%Y%m%d-%H%M%SZ).sql

# Confirm the file exists and is non-empty before continuing:
ls -lh ./pre-restore-snapshot-*.sql
```

If the project is unreachable (scenario 3), this step is skipped — the post-incident state cannot be captured if the DB is gone. Document the skip in the postmortem.

### S3 — Capture current row-count baseline (for V2)

Run via the Supabase SQL Editor (`https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/sql/new`):

```sql
-- The whatsapp_sends line is conditional — see prerequisite check § 2
-- (the table may not be present on production until migration
-- 20260517000001 lands). Check existence first; comment the line out if
-- the table is absent:
--   SELECT EXISTS (SELECT 1 FROM information_schema.tables
--                  WHERE table_schema='public' AND table_name='whatsapp_sends');
SELECT 'invoices' AS table, COUNT(*) AS n FROM invoices
UNION ALL SELECT 'invoice_payments', COUNT(*) FROM invoice_payments
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'whatsapp_sends', COUNT(*) FROM whatsapp_sends   -- comment out if absent
UNION ALL SELECT 'shipments', COUNT(*) FROM shipments
UNION ALL SELECT 'manifests', COUNT(*) FROM manifests
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'rate_cards', COUNT(*) FROM rate_cards;
```

Copy the result into the incident log. These are the floor for V2 verification.

### S4 — Announce

Send to whatever channel is canonical (owner's email at minimum; Slack/PagerDuty if SB-2 is provisioned):

```
INCIDENT — restoring database <YOUR_PROJECT_REF>
Scenario: <1/2/3>
Target timestamp: <ISO 8601>
Mode: <in-place PITR / parallel project + cutover>
Expected RTO: <minutes>
Writes after target timestamp WILL BE LOST if in-place mode.
Acknowledge or object within 5 minutes.
```

The 5-minute window gives a halt-point if anyone has additional context.

### S5 — Block application writes (in-place restore only)

For an in-place PITR (§ 5.A or § 5.B), block all writes to production during the restore window:

```bash
# Set WhatsApp kill switch — the canonical money-flow write surface.
# Vercel env var → Settings → Environment Variables → WHATSAPP_ENABLED → false
# Redeploy production (Vercel UI → Deployments → Promote Preview, or push a no-op commit).
```

Other write paths (invoice/payment forms) cannot be cleanly blocked without a maintenance-mode flag — accept the loss-of-post-incident-writes; document in postmortem. POST-LAUNCH: a maintenance flag would reduce this risk.

**Abort:** at any point through § 5, the owner can stop. Document the abort point, do NOT continue partially. The pre-restore snapshot from S2 can be re-imported if any partial restore was applied.

---

## 5. Decision tree per scenario

### § 5.A — Scenario 1: bad migration applied to production

```
Symptoms: deploy-related; Sentry rule 4 (Supabase RPC failures) spikes
          OR specific endpoints 500 right after a deploy
          AND data appears intact at the row level
```

**Decision:** in-place PITR to just-before the deploy timestamp.

**Steps:**

1. Identify the target timestamp:
   - Vercel deploy timestamp of the offending release (UTC)
   - Subtract 2 minutes for safety margin
2. Block writes (S5 if not done)
3. Run PITR via dashboard:
   - Go to `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/database/backups/pitr`
   - Click **Restore database** → enter the target timestamp
   - Confirm the source/target branches (should be the same: production)
   - Wait for the restore (typical: 5–30 minutes for projects this size; you will receive an email from Supabase when complete)
4. Re-apply the GOOD migrations that ran BEFORE the bad one (if any in the same window):
   - Compare `gh pr list --state merged --base main --limit 10` to the post-restore state
   - For each merged-PR migration that is NOT in the restored DB, run `supabase db push --linked` against the restored project (or `supabase db reset --linked` if you need a full fresh-apply — that's the same command the `Migrations apply on fresh DB` CI gate runs)
   - The bad migration MUST NOT be re-applied — fix it on a branch first
5. Verify per § 6
6. Unblock writes (revert `WHATSAPP_ENABLED` to `true` + redeploy)

**If the dashboard is unreachable:** the Supabase CLI's PITR surface has changed across versions and the exact subcommand depends on the installed CLI version (`branches restore` exists on recent versions for branch-based PITR; project-direct PITR is dashboard-only on some plan tiers). **Do NOT guess at a CLI invocation under incident pressure.** Instead:

1. Open a Supabase support ticket immediately: `https://supabase.com/dashboard/support` (or email `support@supabase.com` if the dashboard itself is unreachable from your network).
2. Quote the project ref `<YOUR_PROJECT_REF>` + target timestamp + "PITR restore requested; dashboard unreachable."
3. Supabase support can perform the PITR restore against the project on the customer's behalf with org-level proof of ownership.

Owner-validated alternative — when the dry-run walkthrough (§ 9) is performed, the owner records the exact CLI command for the project's then-current Supabase CLI version below:

```
# Recorded by owner during the § 9 dry-run walkthrough:
# CLI version:     ________________________
# PITR command:    ________________________
# Confirmed:       ________________________
```

### § 5.B — Scenario 2: accidental data deletion / corruption

```
Symptoms: operator reports missing records (e.g., invoice gone from list)
          OR audit_logs shows an unintended destructive op
          OR a manual SQL query produced an unexpected DELETE/UPDATE result
```

**Decision:** dual path depending on scope:

| Scope | Path | Why |
|---|---|---|
| **Few rows in ONE table** lost | Parallel-project + targeted DML back to live | Preserves post-incident writes in other tables |
| **Whole table truncated** OR many tables touched | In-place PITR to just-before the destructive op | Targeted DML at this scope is risk-multiplied |

**Steps — parallel-project path (single-table restore):**

1. Identify the target timestamp from `audit_logs.created_at` of the offending op (or operator's reported timestamp). Subtract 1 minute.
2. Capture the live state of the affected table (S2 produces a full dump; for one table also run):
   ```sql
   COPY (SELECT * FROM <table>) TO STDOUT;
   -- Save to ./live-<table>-pre-restore.csv
   ```
3. In the Supabase dashboard, create a **branch** (or a parallel project — branches preferred where available):
   - `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/branches`
   - PITR-restore the branch to the target timestamp (the branch UI exposes PITR identically)
4. Connect to the branch DB and `COPY (SELECT * FROM <table> WHERE ...) TO STDOUT` to extract the desired rows
5. Review the extracted rows against the live state — confirm the merge plan
6. Re-insert into live via `INSERT ... ON CONFLICT DO NOTHING` (or targeted `UPDATE` per row)
7. Drop the branch
8. Verify per § 6
9. **Audit-log the operator action** — even though `audit_logs` is wrapped only on application-layer destructive ops, manually insert a row recording the restoration:
   ```sql
   -- NOTE: `auth.uid()` returns NULL in the SQL Editor (no JWT/PostgREST
   -- session context). Manually substitute the operator's profile UUID —
   -- look it up via `SELECT id FROM profiles WHERE email = '<operator>';`
   -- first. Without this, the FK to profiles fails OR the audit row
   -- silently records NULL actor, defeating the audit trail.
   INSERT INTO audit_logs (actor_user_id, op, target_id, payload) VALUES
     ('<operator-profile-uuid>', 'restore_table_<table>', '<some-target-id>',
      jsonb_build_object('runbook_section', '5.B', 'target_timestamp', '<ISO>',
                         'rows_restored', <N>));
   ```

**Steps — in-place PITR path (wide-scope corruption):**

Identical to § 5.A steps 2-6 with the target timestamp pulled from `audit_logs` rather than the deploy timeline.

### § 5.C — Scenario 3: full database loss

```
Symptoms: project status non-ACTIVE_HEALTHY in Supabase dashboard
          OR all dashboard endpoints return 5xx for >15 min
          OR Supabase support confirms a region/project loss
```

**Decision:** restore from latest backup (or PITR-to-now) into a NEW project, then cut over.

**Steps:**

1. Open a Supabase support ticket if not already open: `https://supabase.com/dashboard/support` → describe the project as lost; request restore advice for project ref `<YOUR_PROJECT_REF>`
2. Create a new Supabase project in the same region (`ap-northeast-1`) on the same plan tier:
   - Note the new project ref (16-character lowercase alphanumeric)
   - Note the new connection string + service-role + anon keys
3. Restore the most recent daily backup (or PITR-to-now) INTO the new project:
   - Dashboard path: new project → Database → Backups → "Restore from another project"
   - Provide the lost project's ref + the target timestamp (latest backup OR latest PITR snapshot)
4. Verify per § 6 against the new project
5. Cutover (§ 7) — Vercel env-var update + DNS NOT changed (the host is `db.<ref>.supabase.co` not a custom domain; the app's `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are what update)
6. Update `supabase/config.toml` `project_id` if it references the old ref (it does — see `config.toml`)
7. Update Sentry release tag for the recovery deploy
8. Update this file + `docs/PRODUCTION-RUNBOOK.md` with the new project ref
9. Initiate a postmortem (§ 8)

**RPO note for scenario 3:** if PITR is available (P2 confirmed), RPO is seconds-to-minutes (PITR can restore to "now-minus-WAL-lag"). If only daily backups are available (P2 not confirmed), RPO is up to 24 hours of writes — material; document explicitly.

---

## 6. Verification — confirm the restore worked

Run these IN ORDER. STOP on any failure; do NOT cut over.

### V1 — Schema integrity

Run against the restored DB:

```bash
# Two equivalent ways to verify the restored DB matches the repo migrations:
#
# (a) Use the Supabase CLI directly (same shape the CI gate uses):
SUPABASE_DB_URL='postgresql://...restored connection...' \
  supabase db push --linked --dry-run
#
# (b) Or run `supabase db reset --debug` against the restored project
#     (DESTRUCTIVE — wipes + re-applies migrations; only run if it's safe
#     to discard the restored data and re-bootstrap from migrations alone,
#     e.g. on a Supabase branch).
```

**Pass:** 0 errors; `--dry-run` reports "no changes" (all active migrations from `supabase/migrations/` are present in the restored DB).

**Fail:** schema drift between restored DB and repo `supabase/migrations/`. **STOP.** Do NOT write to the restored DB. Re-check the restore target timestamp — most schema-drift cases are "restored too far back" or "missed a forward migration after the restore."

### V2 — Money-flow row counts within expected bounds

Re-run the S3 row-count SQL against the restored DB. For each table:

```
restored_count ≥ count_at_target_timestamp
restored_count ≤ current_live_count (only meaningful for parallel-project path)
```

If `restored_count < count_at_target_timestamp` for ANY table — **STOP.** The restore didn't complete fully OR the timestamp was wrong.

If the `invoices` or `invoice_payments` count is below the live count by an unexplained amount → escalate immediately, do not cut over.

### V3 — Referential integrity on money-flow joins

These two queries are non-negotiable. Both MUST return 0 / acceptable-only.

```sql
-- Every invoice_payments row links to an invoice that still exists.
SELECT COUNT(*) AS orphaned_payments
FROM invoice_payments p
LEFT JOIN invoices i ON p.invoice_id = i.id
WHERE i.id IS NULL;
-- Expected: 0. Any non-zero → escalate.

-- Every audit_logs row for a destructive op references a real entity.
SELECT op, COUNT(*) FROM audit_logs
WHERE op IN ('payment_delete', 'invoice_cancel', 'manifest_shipment_remove')
GROUP BY op;
-- Manual review: counts must match expected from the incident timeline.
-- Any unfamiliar `op` value → drift; investigate before cutover.

-- whatsapp_sends FK to invoices (when invoice_id is non-null):
-- ONLY RUN if whatsapp_sends exists (see § 6 V2 conditional check).
SELECT COUNT(*) AS orphaned_sends
FROM whatsapp_sends w
WHERE w.invoice_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM invoices WHERE id = w.invoice_id);
-- Expected: 0.
```

### V4 — Application smoke test (deploy preview against restored DB)

1. Deploy a Vercel preview with env vars pointed at the restored connection
2. Walk these paths (manually):

   | Path | Pass criterion |
   |---|---|
   | `GET /api/health` | 200 OK; response body includes `{ ok: true }` |
   | Sign in as a known MANAGER account | Session established; redirect to `/ops-console/...` |
   | `/ops-console/finance` (invoice list) | Loads; row count matches V2 |
   | Click any invoice → detail page | Renders; payment ledger shows the right rows |
   | `/ops-console/whatsapp/failed-sends` | Page renders (empty list is fine; 500 is not) |
   | `/ops-console/scanning` | Loads (smoke) |

3. Do NOT issue a write — V4 is read-only verification. The first write happens at cutover (§ 7) on the live cutover path.

A restored DB that passes V1+V2+V3+V4 is restored. Anything less, do NOT cut over.

---

## 7. Cutover

### Cutover from in-place PITR (§ 5.A / § 5.B in-place)

No cutover needed — the project ref is unchanged, the env vars are unchanged. Re-enable writes (unset `WHATSAPP_ENABLED`-equivalent flags, redeploy) and monitor § 8.

### Cutover from parallel-project (§ 5.C, or § 5.B parallel-path)

1. In Vercel project settings → Environment Variables → Production:
   - Update `NEXT_PUBLIC_SUPABASE_URL` to the new project's URL
   - Update `SUPABASE_SERVICE_ROLE_KEY` to the new project's service-role key
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the new project's anon key
2. Trigger a production deploy (Vercel UI → Deployments → "Redeploy")
3. Within 60s of the deploy, verify:
   - `curl https://<dashboard-host>/api/health` → 200 OK
   - Sentry receives no spike of NEW errors
4. Update `supabase/config.toml`'s `project_id` to the new ref + open a PR (this is config-only; the production cutover already happened via env vars)
5. Update this runbook's § 2 prerequisite table with the new ref

---

## 8. Postmortem

After cutover, write a postmortem at `docs/incidents/<YYYY-MM-DD>-<short-name>.md`:

```markdown
# Incident — <short name> — <YYYY-MM-DD>

## Timeline (all UTC)
- HH:MM — first signal (Sentry / operator report)
- HH:MM — incident commander declared
- HH:MM — scenario identified (1 / 2 / 3)
- HH:MM — restore started
- HH:MM — verification complete
- HH:MM — cutover complete

## Trigger
What caused the incident?

## Scenario + decision
Which § 5 branch was taken and why.

## Restore target timestamp
ISO 8601 UTC.

## Verification outcome
- V1: pass/fail
- V2: pass/fail (note any close-to-floor counts)
- V3: pass/fail
- V4: pass/fail

## RTO actual / RPO actual
- RTO: <minutes> (target ≤ 4h for scenarios 1+2, ≤ 8h for scenario 3)
- RPO: <seconds-to-minutes>

## What worked
What in this runbook was useful?

## What didn't / improvements
What's missing or wrong in this runbook? Update IT in the same PR as the postmortem so the next responder benefits.

## Action items
- [ ] Runbook updated
- [ ] Sentry rule added/adjusted if relevant
- [ ] Root cause fixed
```

---

## 9. Dry-run walkthrough (validate the runbook itself)

This runbook has been WALKED THROUGH against the Supabase dashboard documentation + the project's current MCP-introspected state on **2026-05-17**. It has NOT been EXECUTED against a real restore (executing a PITR against production is itself destructive; executing against a staging clone requires owner credentials the agent does not have).

**Recommended owner-side validation** (do this BEFORE relying on this runbook):

1. Once Pro-plan is confirmed (P1, P2), create a Supabase **branch** off production (zero risk; branches are isolated):
   - `https://supabase.com/dashboard/project/<YOUR_PROJECT_REF>/branches`
2. Run § 5.A steps 1-3 against the branch (PITR-restore the branch to 1 hour ago)
3. Run § 6 V1-V4 against the branch DB
4. Drop the branch
5. Record the dry-run completion in the prerequisite block at § 2

The walkthrough takes ~30 minutes once P1+P2 are confirmed. Until this dry-run is completed, the runbook's executable claims are based on Supabase official documentation; some details (exact UI labels, error messages) may differ from the live experience.

---

## 10. Linked items

- DoD SB-3: [`docs/launch/definition-of-done.md#sb-3`](../launch/definition-of-done.md#sb-3--database-restore-pitr-playbook-backlog-d1)
- Backlog D1: [`docs/backlog/production-readiness.md#d1--pitr--database-restore-playbook`](../backlog/production-readiness.md#d1--pitr--database-restore-playbook)
- PHASE-0 decision: [`docs/decisions/2026-05-17-database-restore-playbook.md`](../decisions/2026-05-17-database-restore-playbook.md)
- Predecessor stub: [`docs/runbooks/PITR-PLAYBOOK.md`](./PITR-PLAYBOOK.md) — now a short pointer to this file
- Architectural Decision 8 (production-as-baseline): `docs/ARCHITECTURAL-DECISIONS.md`
- Migration baseline: `supabase/migrations/20260515000001_baseline_from_production.sql`
- Supabase PITR docs: <https://supabase.com/docs/guides/platform/backups#point-in-time-recovery>
- Supabase support: <https://supabase.com/dashboard/support>
