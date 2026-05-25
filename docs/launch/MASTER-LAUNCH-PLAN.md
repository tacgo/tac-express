# TAC Express — MASTER LAUNCH PLAN

> **Authority:** this file is the single, reconciled launch plan. It supersedes the *scope* of [`docs/launch/definition-of-done.md`](definition-of-done.md) (engineering) and [`docs/launch/product-launch-readiness.md`](product-launch-readiness.md) (product) AND the customer-facing slice of [`docs/launch/CUSTOMER-FACING-PLAN.md`](CUSTOMER-FACING-PLAN.md) as the **unified** burn-down. Those three files remain the per-workstream detail; this file is the rollup + ordering.

**Version:** 1.4 — PI-1 EVIDENCED DONE; LB-4 RESOLVED (Free-tier stance); LB-2 split a/b; launch surface 4→2, 2026-05-21.
**Previous versions:** 1.3 — WS-1 closed; LB-5 + LB-6 marked DONE (2026-05-19). 1.2 — LB-5 + LB-6 added (2026-05-19, PR #180). 1.1 — LB-3 closed (2026-05-19, PR #179). 1.0 — initial master reconciliation (2026-05-18, PR #178).
**Authority chain:** [`AGENTS.md` § 0](../../AGENTS.md) → THIS FILE → `definition-of-done.md` + `product-launch-readiness.md` + `CUSTOMER-FACING-PLAN.md` → [`docs/backlog/production-readiness.md`](../backlog/production-readiness.md).
**Main HEAD at v1.3 reconciliation:** `2b9b42b` (`docs(customer-facing): UI/UX consistency playbook + WS-1..WS-4 plan + MASTER reconciliation (#180)`).

---

## 0. LAUNCH VERDICT (evidenced)

> # **NOT READY** — but the launch surface is now **2 owner actions**, down from 4.

The verdict is BOOLEAN — `engineering_ready AND product_ready AND customer_facing_ready`.

**2026-05-21 reconciliation (v1.4):** the launch surface dropped **4 → 2 actionable items**:
- ✅ **PI-1 EVIDENCED DONE** — 4 migrations deployed to production (run `26180576599`); see § 4.1.
- ✅ **LB-4 RESOLVED** — operating on Supabase **Free** tier for launch (active stance, not a deferred TODO; upgrade-when-warranted with documented triggers); see § 4.5.
- 🚀 **LB-1** (Sentry alert provisioning, ~20 min, independent) — remaining.
- 🚀 **LB-2** (PL-2b live notifications) — remaining; now unblocked by PI-1. Split into **LB-2a** (submit Meta WhatsApp template — external-clock long-pole) + **LB-2b** (WPBOX env + production e2e, gated on Meta approval).

Customer-facing burn-down is **complete** (WS-1 / WS-2 / WS-2B / WS-3 / WS-4A all CLOSED). **WS-4B — the ops-shell-rebuild arc — is STRUCTURALLY COMPLETE** (`feat/ops-shell-rebuild`, Phase 4→10d): the full v6→v7 dashboard migration (Body 1) and the dashboard-wide token fixes (Body 2) are done; every ops-console route renders Violet Grid v7. Body 3 (premium polish) remains as a separate **optional** session. Both remaining launch items (LB-1, LB-2) are owner-side and were always parallelizable with this arc.

> **Production-deploy policy (codified after the PI-1 arc).** Database migrations
> deploy via the `migration-deploy.yml` workflow **only**. Direct production writes —
> Supabase MCP `apply_migration`, manual SQL against the production schema, or a raw
> `supabase db push` from an owner laptop outside the pipeline — are **not** part of
> the supported deploy surface. Every production-affecting action pairs an action-layer
> step with a state-layer read (two-signal verification); a `pg_dump` precedes any
> deploy that could be destructive on the Free tier. This principle survived four
> false-success modes during PI-1 (see [`docs/retros/2026-05-20-pi-1-deploy.md`](../retros/2026-05-20-pi-1-deploy.md)) and is now part of the architecture.

**Evidence trail (re-verified 2026-05-19):**

| Claim | Verified via | Result |
|---|---|---|
| `/api/contact` would 500 in production | Supabase MCP `list_tables` against project `<YOUR_PROJECT_REF>` | ❌ `contact_leads` ABSENT; `whatsapp_sends` ABSENT — unchanged from 2026-05-18 |
| SB-2 has been run end-to-end | Sentry MCP `search_issues` for `api/diagnostics` in `<YOUR_SENTRY_ORG>/<YOUR_SENTRY_PROJECT>` | ❌ Zero `api/diagnostics` issues across project lifetime — unchanged |
| Production has active error signal | Sentry MCP `search_issues is:unresolved lastSeen:-7d` | ✅ No unresolved errors last 7d (separate from SB-2 — the LACK of alert-rule plumbing means a real incident wouldn't notify the owner) |
| **Carve color-contrast (#173 / LB-3)** | `apps/web/e2e/carve.a11y.spec.ts` × 3 viewports × 9 pages = 27 tests against production build, locally on this branch | ✅ **0 serious/critical color-contrast violations.** `AXE_FAIL_ON_VIOLATIONS=1` flipped to gate regressions. |
| WastelandLanding "deprecated" claim from a prior Run | grep + `product-launch-readiness.md § B.1 / § C.2` | ❌ Brief misread. Implementation uses current Violet Grid tokens; rename is cosmetic POST-LAUNCH-POLISH. **Acceptable to ship.** |
| Run-series outputs | gh PR audit of #163–#178 | ✅ Run 4 supersedes #176 with a complete fix; #176 closed as superseded |

---

## 1. Reconciliation — every issue / PR vs current main

Audited via `gh issue/PR view` against main `180b93a`. Three workstreams reconciled into ONE list below.

### 1.1 Open PRs (0)

Run 4's PR (`feat/lb3-contrast-option-b`) supersedes #176 with the owner-chosen Option B (class-redirect, typography preserved) applied across all 4 contrast sites the wider carve scan surfaced. #176 closed as superseded.

### 1.2 Open issues (13)

| # | Title | True state vs main | Bucket |
|---|---|---|---|
| [#174](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/174) | Deploy 4 un-deployed migrations | OPEN; verified 2026-05-19: `contact_leads` + `whatsapp_sends` still absent from remote `<YOUR_PROJECT_REF>`. Migration-deploy pipeline shipped in PR #175 but DORMANT (`vars.MIGRATION_DEPLOY_ENABLED` defaults `false`). | **🚨 PRODUCTION-INCIDENT** |
| [#173](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/173) | Landing color-contrast WCAG AA | **✅ FIXED 2026-05-19** by the Run-4 PR (Option B class-redirect). All 4 surfaced sites (landing-desktop/tablet AWB-emphasis, landing-mobile testimonial, pricing "Most popular" badge, /track/[awb] AWB number + helper text) now AA-pass. CI gated via `AXE_FAIL_ON_VIOLATIONS=1`. Closing on merge. | LAUNCH-BLOCKER — **closing on merge** |
| [#169](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/169) | POST-LAUNCH: LOCATE tracking-[0.3em] → token | OPEN. Pre-existing inconsistency. POST-LAUNCH per its own title. | POST-LAUNCH |
| [#167](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/167) | Autonomous launch-readiness run — 2026-05-18 | OPEN; meta tracking issue for Run 1/2/3. Not launch-gating. Close after launch-ready. | META (not launch-gating) |
| [#158](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/158) | POST-LAUNCH: request-signing sweep | OPEN; security-sensitive. | POST-LAUNCH-SECURITY (Tier 3) |
| [#157](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/157) | POST-LAUNCH: TOCTOU in retryWhatsappSend | OPEN; security-sensitive. | POST-LAUNCH-SECURITY (Tier 3) |
| [#154](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/154) | RBAC auth-error handling sweep | OPEN; lean POST-LAUNCH per OD-1. Security-sensitive. | POST-LAUNCH-SECURITY (Tier 3; promotable if OD-1 = ship-blocker) |
| [#151](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/151) | `as unknown as` cleanup in apps/web/proxy.ts | OPEN; 30-min hygiene. | POST-LAUNCH |
| [#145](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/145) | Immutability sentinel for whatsapp_sends | OPEN; defense-in-depth. | POST-LAUNCH |
| [#144](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/144) | Meta delivery-callback webhook | OPEN; adds `delivered`/`read` status. | POST-LAUNCH |
| [#143](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/143) | Automated WhatsApp retry job | OPEN; operator-triggered retry is the floor. | POST-LAUNCH |
| [#131](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/131) | ServiceLevel branded type | OPEN; structural. | POST-LAUNCH |
| [#130](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/130) | regex-alternation LAW gate | OPEN; tooling. | POST-LAUNCH |

### 1.3 Recently-closed / merged (the Run-series, for context)

All 14 PRs in the #162–#177 range are CLOSED or MERGED, except #176 (deliberately held). Key contributions to launch state:

- **#175** shipped `.github/workflows/migration-deploy.yml` — the **automation that fixes #174 once activated**. Dormant by default; opt-in via `vars.MIGRATION_DEPLOY_ENABLED=true` + two secrets.
- **#177** shipped `.github/workflows/e2e-web.yml` — gates apps/web smoke+a11y on every PR. `AXE_FAIL_ON_VIOLATIONS=0` until #173 lands.
- **#168** merged the `contact_leads` migration file + `/api/contact` route + service — code-complete; **infrastructure-blocked** by #174.
- **#170, #171, #172** completed PL-1/PL-3/PL-4 (rendered + axe-verified).
- **#139, #140, #142** closed as FIXED on tracker.
- **#94** (SB-2's tracker) remains CLOSED but the owner-runnable work still exists as a tracker-less DoD gate.

### 1.4 Workstream reconciliation

Four workstreams now exist (v1.2 added the customer-facing one):

| Workstream | Authority file | Outstanding items |
|---|---|---|
| Engineering DoD | `definition-of-done.md` | SB-2 only; SB-3 P1–P4 prereqs |
| Product-launch readiness | `product-launch-readiness.md` | PL-2b live-activation; visual-snapshot baselines (contrast closed) |
| Run-series (#167–#179) | — (tracked via #167 + retros) | #173, #174 surfaced; #175 + #177 + #179 shipped (#179 closes #173); #176 superseded by #179 |
| **Customer-facing (v1.2)** | [`CUSTOMER-FACING-PLAN.md`](CUSTOMER-FACING-PLAN.md) | **WS-1** (LB-5 + LB-6 — added to § 2.2); WS-2 / WS-3 / WS-4 (POST-LAUNCH; tracked in the customer-facing plan, not duplicated here) |

**The reconciliation:** every Run-series finding maps onto a row in the unified list below. Specifically:
- #174 promotes to **PRODUCTION-INCIDENT** — NOT previously accounted for in either authority file.
- The migration-deploy pipeline (PR #175) is the closeout mechanism for #174 — NOT previously accounted for in DoD.
- #173 escalates to **LAUNCH-BLOCKER** — WCAG AA is a launch-credibility gate for enterprise B2B, not a polish item.

---

## 2. The unified classified list (FINITE)

### 2.1 PRODUCTION-INCIDENT — 1

| ID | Item | Done criterion (testable) | Owner / Agent | Estimate |
|---|---|---|---|---|
| ~~**PI-1**~~ | ~~Activate the migration-deploy pipeline + run the one-time backfill (#174)~~ | ✅ **EVIDENCED DONE 2026-05-20** — both tables present on `<YOUR_SUPABASE_PROJECT_ID>` (run `26180576599`); schema + RLS + security advisors verified via Supabase MCP. See § 4.1. | OWNER (pipeline) | closed |

### 2.2 LAUNCH-BLOCKER — 2 remaining (LB-1 + LB-2; LB-3/5/6 closed earlier; LB-4 resolved-as-stance 2026-05-21)

| ID | Item | Done criterion (testable) | Owner / Agent | Estimate | Depends on |
|---|---|---|---|---|---|
| **LB-1** | **SB-2 — Sentry alert provisioning** | `scripts/sentry/create-alert-rules.mjs` run with `project:write` token; at least one rule fires end-to-end; an `api/diagnostics`-tagged synthetic event visible via Sentry MCP `search_issues` for `<YOUR_SENTRY_ORG>/<YOUR_SENTRY_PROJECT>` | **OWNER** (owner-only credential per handoff do-NOT list #4) | ~20 min |
| **LB-2a** | **PL-2b — submit the Meta WhatsApp template for approval** | Template submitted in the Meta/WPBOX console; approval status pending or approved | **OWNER** | ~10 min to submit (then 24–48h external approval wait) | — (PI-1 done; can submit now) |
| **LB-2b** | **PL-2b — WPBOX env vars + production e2e** | Submit `/contact` on production. `contact_leads` row lands with `notification_status='sent'`; recipient phone receives the WhatsApp template message; the row's `whatsapp_send_id` resolves to a `whatsapp_sends` row with `status='sent'` | **OWNER** (WPBOX env + production submit) | ~30 min | LB-2a (Meta approval); PI-1 ✅ |
| ~~**LB-3**~~ | ~~#173 — design call on contrast approach + apply to remaining sites~~ | ✅ DONE 2026-05-19 — Option B class-redirect applied across 4 sites; `AXE_FAIL_ON_VIOLATIONS=1` flipped; all 9 carve pages × 3 viewports = 0 serious/critical | AGENT (Run 4 → PR #179) | closed | — |
| ~~**LB-4**~~ | ~~SB-3 P1–P4 owner-prerequisites — verify in Supabase dashboard~~ | ✅ **RESOLVED 2026-05-21** — decision: operate on Supabase **Free** tier for launch (P1/P2/P3 are Pro-tier features, intentionally not adopted pre-launch). Active stance with residual-risk acceptance, operational compensations, and upgrade triggers — see § 4.5. NOT a deferred TODO. | OWNER (decision) | closed (30-day review: [#192](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/192)) | — |
| ~~**LB-5**~~ | ~~Customer-facing WS-1.1 — replace hardcoded `localhost:3001` dashboard link in PublicNav with `NEXT_PUBLIC_DASHBOARD_URL`~~ | ✅ DONE 2026-05-19 — `process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001"` matching the existing pattern at `apps/web/app/dashboard/page.tsx`. Owner action: confirm `NEXT_PUBLIC_DASHBOARD_URL` is set on the apps/web Vercel project (see § 4.6) — without it the production deploy uses the localhost fallback. | AGENT (WS-1+WS-2 PR) | closed | — |
| ~~**LB-6**~~ | ~~Customer-facing WS-1.2 — wire 11 dead in-page anchors (`#features` / `#how-it-works` / `#tracking`) to real sections~~ | ✅ DONE 2026-05-19 — `id="tracking"` on hero LOCATE form, `id="how-it-works"` on BusinessUtility, `id="features"` on SystemCompatibility (+ `scroll-mt-20` for fixed-nav offset). Verified in rendered HTML; 15 Playwright smoke tests pass. | AGENT (WS-1+WS-2 PR) | closed | — |

**Total finite launch surface (2026-05-21):** **2 owner actions remaining** — LB-1 (Sentry, independent) + LB-2 (LB-2a Meta template submission → LB-2b env + e2e). PI-1 EVIDENCED DONE; LB-4 RESOLVED (Free-tier stance). Both remaining items are owner-side and parallelizable with the next agent build (WS-4B). The agent-actionable launch-blocker queue remains empty.

### 2.3 POST-LAUNCH — 7

Real work; not launch-gating. Per Convention A, follow-up issues default here; promotion requires explicit owner decision matching the hard test.

| # | Item |
|---|---|
| [#169](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/169) | LOCATE tracking-[0.3em] → token |
| [#151](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/151) | `as unknown as` cleanup in apps/web/proxy.ts |
| [#145](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/145) | App-layer immutability sentinel for whatsapp_sends |
| [#144](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/144) | Meta delivery-callback webhook |
| [#143](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/143) | Automated WhatsApp retry job |
| [#131](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/131) | ServiceLevel branded type at data-layer |
| [#130](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/130) | regex-alternation LAW gate |

Plus the visual-snapshot baselines for apps/web (deferred follow-up to PR #172 + #177).

### 2.4 POST-LAUNCH-SECURITY — 3 (Tier 3, leave OPEN for human review)

Per the autonomous-run policy: security-sensitive sweeps get their own PRs, kept OPEN for human security review, never auto-merged.

| # | Item |
|---|---|
| [#158](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/158) | request-signing sweep across state-changing dashboard API routes |
| [#157](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/157) | TOCTOU race in retryWhatsappSend |
| [#154](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/154) | RBAC auth-error handling sweep (OD-1: promotable to LB if owner reclassifies) |

### 2.5 WONTFIX-WATCH — 2

| ID | Item | Re-evaluate |
|---|---|---|
| X1 | Form variant canonical pick | 2026-08-16 |
| X2 | On-call schedule + escalation policy | 2026-08-16 |

---

## 3. Burn-down sequence (dependency-ordered)

```
PI-1 ✅ DONE ──> LB-2a (submit Meta template — can run now) ──> LB-2b (WPBOX env + prod e2e, after ~24–48h Meta approval)

LB-1 (Sentry — independent; run anytime)

LB-4 ✅ RESOLVED (Free-tier stance; 30-day review issue filed)

WS-4B ✅ STRUCTURALLY COMPLETE (ops-shell-rebuild arc, Phase 4→10d; Body 1 + Body 2 done; Body 3 polish optional, separate session)
```

**Critical path to launch-ready:** LB-2a → (Meta approval, external clock) → LB-2b. Submit LB-2a first; every hour it waits shifts the launch-ready date by an hour. LB-1 runs independently and does not gate LB-2. (WS-4B / ops-shell-rebuild is structurally complete and never gated launch — Body 3 polish is optional and post-launch-safe.)

LB-3 closed 2026-05-19 (PR #179). LB-5 + LB-6 closed 2026-05-19 (the WS-1+WS-2 PR).

**Critical-path estimate:** ~1 hour of owner work + Meta template-approval latency (external, typically 24–48h). The launch verdict flips to READY once all 4 remaining items pass their done-criteria.

---

## 4. OWNER TASK list (consolidated; the only thing the owner needs to act on)

Numbered + copy-pasteable. Most urgent first.

### 4.1 🚨 PI-1 — Activate migration-deploy pipeline + run backfill (production-incident)

> ## ✅ STATUS 2026-05-20: PI-1 EVIDENCED DONE.
>
> Migrations deployed to production `<YOUR_PROJECT_REF>` via the
> `migration-deploy.yml` pipeline, run **`26180576599`** (`supabase db push`
> succeeded — "All migrations applied. Production schema is up to date").
> Verified read-only via Supabase MCP:
>
> | Check | Result |
> |---|---|
> | `public.contact_leads` table | ✅ present |
> | `public.whatsapp_sends` table | ✅ present |
> | `audit_logs.before_state` column | ✅ present |
> | `audit_logs_destructive_action_check` constraint | ✅ present |
> | 4 PI-1 migrations in `schema_migrations` | ✅ recorded |
> | RLS enabled on both PII tables | ✅ true (contact_leads 2 policies, whatsapp_sends 3) |
> | Security advisors on the PII tables | ✅ zero (no `rls_disabled`/`rls_no_policy`) |
>
> **Performance advisors** touch the new tables (`auth_rls_initplan` ×5,
> `unindexed_foreign_keys` ×2, `unused_index` ×6) — owner-reviewed and
> **accepted as non-blocking**: they are performance-only, consistent with the
> rest of the DB (`auth_rls_initplan` fires on all 17+ tables), and `unused_index`
> is a false-positive on seconds-old tables. Optional perf-tuning (FK indexes +
> `(select auth.uid())` RLS wrapping) is a deferred follow-up, not a launch gate.
>
> **The full incident arc** (skipped run `26174554451` → drift failure
> `26175215585` → repair runbook in PR #190 → CLI-not-installed false repair →
> CLI install + history repair → successful deploy `26180576599`) is in
> [`docs/retros/2026-05-20-pi-1-deploy.md`](../retros/2026-05-20-pi-1-deploy.md).
>
> **LB-4 (SB-3 prereqs) is now an open owner decision**, not a blocker to "fix":
> the project is on Supabase **Free**, so P1 (Pro tier) and P2 (PITR) aren't
> satisfiable without a plan upgrade. Decide upgrade-vs-accept-the-limitation in
> the launch-readiness reconciliation session; document the residual risk either
> way. The pg_dump taken before the repair is the current backup substitute.
>
> The runbook below is retained for history; the steps were completed.

```text
# Step 1 — Generate a Supabase personal-access token:
https://supabase.com/dashboard/account/tokens  (scope: project:write)

# Step 2 — Set GitHub Actions secrets + variable:
Repository → Settings → Secrets and variables → Actions

  Secrets (new):
    SUPABASE_ACCESS_TOKEN = <the PAT>
    SUPABASE_DB_PASSWORD  = <production DB password from Supabase Dashboard → Project Settings → Database>

  Variables (new):
    MIGRATION_DEPLOY_ENABLED = true

# Step 3 — Trigger the one-time backfill:
gh workflow run migration-deploy.yml

# Step 4 — Verify in Supabase SQL editor (or Supabase MCP):
SELECT table_name FROM information_schema.tables
WHERE table_schema='public'
AND table_name IN ('contact_leads','whatsapp_sends');
-- BOTH rows must appear.
```

### 4.2 🚀 LB-1 — Run SB-2 Sentry alert provisioning (~20 min)

```text
# Step 1 — Generate a Sentry user-auth token at
https://de.sentry.io/settings/account/api/auth-tokens/
(scope: project:write — a `sntryu_…` token covers this.)

# Step 2 — Run the canonical alert-rule script:
SENTRY_AUTH_TOKEN=sntryu_xxx node scripts/sentry/create-alert-rules.mjs

# Step 3 — Verify one rule fires end-to-end by tripping the synthetic event:
curl -X POST https://<deploy>/api/diagnostics/sentry
# Then check Sentry MCP:
mcp__sentry__search_issues organizationSlug=<YOUR_SENTRY_ORG> projectSlugOrId=<YOUR_SENTRY_PROJECT> query="api/diagnostics"
# A new issue must appear in the result.

# Step 4 — Update docs/runbooks/sentry-alert-rules.md § 5.3 with the
# actual notification channel used (email or Slack).
```

### 4.3 🚀 LB-2 — Activate PL-2b live notifications (after PI-1)

```text
# Step 1 — Set production env vars (Vercel / hosting provider):
SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard>
WPBOX_API_TOKEN=<from WPBox account>
WPBOX_USER_ID=<from WPBox account>
WPBOX_LEAD_NOTIFICATION_PHONE=918765432100   # team WhatsApp inbox, E.164 digits
# Optional overrides:
WPBOX_LEAD_TEMPLATE_NAME=lead_notification
WPBOX_LEAD_TEMPLATE_LANGUAGE=en

# Step 2 — Submit `lead_notification` WhatsApp template for Meta approval
# via WhatsApp Business Manager / WPBox / LeminAi UI. Template body:
#
#   New {{1}} lead — {{2}} ({{3}}).
#
#   Message: {{4}}
#
# Parameter mapping (positional):
#   {{1}} reason label, {{2}} name, {{3}} email, {{4}} first 200 chars of message body.
#
# Meta approval typically 24–48h.

# Step 3 — End-to-end verification (after PI-1 + steps 1–2):
# Submit /contact on production. Confirm:
#   - contact_leads row exists with notification_status='sent'
#   - WhatsApp message arrives on the configured number
#   - whatsapp_send_id resolves to whatsapp_sends row with status='sent'
```

### 4.4 ✅ LB-3 — CLOSED 2026-05-19

Run 4 applied the owner-chosen Option B (class-redirect + typography-preserved) across all 4 sites:
- pricing "Most popular" badge → `tac-mono-label-base` + `text-primary-foreground`
- /track/[awb] AWB number + not-found echo + helper text → `text-foreground` family
- landing-mobile testimonial "TAC Express" → inherit parent `text-foreground`
- footer region chips → `tac-mono-label` (inherits the brighter `--primary-mono-label`)
- wasteland-landing TH avatar + metric-card id badges → typography-only variant

`AXE_FAIL_ON_VIOLATIONS=1` in `.github/workflows/e2e-web.yml` gates regressions. No owner action remaining.

### 4.5 ✅ LB-4 — RESOLVED: operating on Supabase Free tier for launch

> **Status:** ACTIVE STANCE, not a deferred TODO. **Resolved 2026-05-21.**

**Decision:** launch on Supabase **Free** tier. The SB-3 prerequisites P1 (Pro
plan), P2 (PITR + retention), P3 (daily dashboard backups) are **Pro-tier
features**, intentionally **not adopted** pre-launch. P4 (Owner role) is already
held. Upgrade to Pro is **conditional on real product signal** (see triggers
below), not scheduled.

**Rationale:** pre-launch, the product has no customer traffic, no measured SLA
need, and no incident history requiring point-in-time recovery. Pro tier (verify
current pricing at <https://supabase.com/pricing> — do not rely on a hardcoded
figure) buys insurance (PITR, daily backups, dedicated compute, paid SLA) whose
value scales with production load. Pre-launch that load is zero; upgrading now
would pay for risk that does not yet exist.

**Residual risk accepted:**
- **No PITR** — recovery from a catastrophic incident relies on the most recent
  owner-run `pg_dump`; recovery window is hours, not minutes. (The `pg_dump`
  path was exercised during PI-1 repair prep.)
- **No scheduled dashboard backups** — backups are owner-initiated only.
- **Shared compute** — subject to noisy-neighbor latency effects.
- **Community support** — no paid response-time SLA.

**Operational compensations (accepted in lieu of Pro):**
- `pg_dump` before any production-affecting deploy — same discipline as PI-1.
  Capture the command in a runbook for repeat use.
- `migration-deploy.yml` remains the **only** sanctioned deploy path (audit
  trail + rollback discoverability).
- Sentry (LB-1) provides external incident monitoring once provisioned.
- Two-signal verification (action layer + MCP state read) for any
  production-affecting work — the discipline that caught all four PI-1
  false-success modes.

**Upgrade triggers (any one flips the decision to Pro):**
1. First customer-facing incident where PITR would have meaningfully shortened recovery.
2. Sustained traffic where noisy-neighbor effects produce measurable user-facing latency (e.g., p95 API latency > 1s for > 24h).
3. Any customer/contract requirement specifying a paid SLA.
4. `contact_leads` + `whatsapp_sends` volume where losing > 24h of data is commercially material (rough threshold: 100+ entries/day sustained).
5. A revenue level where the Pro fee is operationally trivial (rough threshold: any month with > $500 GMV through the platform).

**Review cadence:** re-evaluate at **30 days post-launch**, then quarterly.
Tracked by [#192](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/192) (filed 2026-05-21).

> Historical: the original P1–P4 verification checklist lived in
> [`DATABASE-RESTORE.md § 2`](../runbooks/DATABASE-RESTORE.md#2-prerequisites-owner-confirmed--verify-before-launch);
> it is superseded for launch by this Free-tier stance and re-applies only if an
> upgrade trigger fires.

### 4.6 🚀 LB-5 — Set `NEXT_PUBLIC_DASHBOARD_URL` on apps/web Vercel project (~2 min)

```text
# This single env-var set is the only owner input needed for LB-5.
# Without it, the agent's WS-1 PR cannot ship — the build-time fallback
# fails the build deliberately to prevent another localhost regression.

Vercel → Project: apps/web → Settings → Environment Variables → Add:

  Key:    NEXT_PUBLIC_DASHBOARD_URL
  Value:  https://dashboard.tacexpress.com         # production
          (or the verified production dashboard hostname)
  Env:    Production + Preview + Development (all 3)

# After setting: trigger a redeploy to pick the value up, OR let the
# next WS-1 PR's CI build verify the env is visible.
```

LB-6 has no owner action — it ships in the same PR as LB-5 and only needs the agent's section-id assignments + Playwright assertions.

### 4.7 📋 Housekeeping (not launch-gating, but tidies the tracker)

```text
# Per prior-session audits + this reconciliation:

# Reopen #94 OR accept as tracker-less DoD item — issue closed prematurely
# 2026-05-15; owner-runnable work still remains (LB-1 above).
gh issue reopen 94
# OR — record in DoD: "SB-2 surfaces as tracker-less DoD item by owner choice."

# Close #167 (autonomous-run tracking issue) once launch-ready.
# (Leave OPEN for now — it's the ledger.)

# OD-1 — Reclassify #154 (RBAC sweep)?  Lean: POST-LAUNCH-SECURITY.
# OD-2 — Reclassify the other 4 E1 flows?  Lean: payment-only sufficient.

# CodeRabbit billing — if relevant; previously flagged in PRs as a
# "payment past 72h" warning. Update payment method.
```

---

## 5. AGENT TASK list (sequenced)

| Order | Item | Pre-requisite | Estimate |
|---|---|---|---|
| 1 | **LB-5 + LB-6 — WS-1 customer-facing launch-blockers (single PR)**: replace `localhost:3001` hardcode with `NEXT_PUBLIC_DASHBOARD_URL` + wire 11 dead in-page anchors | Owner sets `NEXT_PUBLIC_DASHBOARD_URL` on apps/web Vercel project (§ 4.6) — ~2 min owner action | ~45 min agent session |
| 2 | ~~LB-3 follow-through~~ | ✅ DONE 2026-05-19 (PR #179) | — |
| 3 | Visual-snapshot baselines for apps/web (PL-4 follow-up) | Carve is contrast-stable as of 2026-05-19 (PR #179) — snapshots can be captured against current main | ~1 session |
| 4 | POST-LAUNCH burn-down (one PR per item: #130, #131, #143, #144, #145, #151, #169) | Launch DONE | per-item |
| 5 | Customer-facing WS-2 / WS-3 / WS-4 (POST-LAUNCH; see [`CUSTOMER-FACING-PLAN.md`](CUSTOMER-FACING-PLAN.md)) | Per-WS dependencies; mostly launch-DONE | per-WS |
| — | POST-LAUNCH-SECURITY (#154, #157, #158) | Launch DONE; leave OPEN for human review | n/a |

**The agent's launch-blocker queue now has order 1 (WS-1) as an actionable task.** LB-1 / LB-2 / LB-4 / PI-1 remain owner-only credential/permission work. See § 7.

---

## 6. Maintenance contract

This file is the rollup. Per-bar detail stays in `definition-of-done.md` and `product-launch-readiness.md`; they remain authoritative for the SB-N / PL-N / OD-P-N nomenclature and the per-item testable-done criteria.

When the unified picture changes (a launch-blocker promotes/demotes, a new production-incident surfaces, the verdict flips), update **this file's § 0–§ 4** first; the per-bar files cross-reference here.

The CI `Backlog references drift check` gate continues to guard `docs/backlog/production-readiness.md` reference integrity — that file remains the open-item ledger and is unchanged by this reconciliation.

---

## 7. PHASE 2 evaluation (last updated v1.2, 2026-05-19)

Brief: "If the first agent-task is small, self-contained, low-risk, and does NOT touch a money-flow or production-incident surface — execute it as a second PR this session. Otherwise STOP. Default to STOP."

**v1.0 (2026-05-18):** First agent-task was LB-3 follow-through, owner-gated on PR #176 review. PHASE 2 stopped.
**v1.1 (2026-05-19, Run 4 / PR #179):** LB-3 closed; remaining § 5 items were all owner-gated or POST-LAUNCH. PHASE 2 stopped.
**v1.2 (2026-05-19, this session):** Customer-facing reconciliation added LB-5 + LB-6 as agent-actionable. They are small (~45 min combined), self-contained (apps/web only), low-risk (UI fixes; no money-flow, no production-incident surface, no DB writes). **PHASE 2 candidate exists for the next session** — the WS-1 build session. This session (the playbook + plan session) does NOT execute the WS-1 build, because the brief explicitly restricts this session to playbook + plan + scan, no feature code. See [`CUSTOMER-FACING-PLAN.md`](CUSTOMER-FACING-PLAN.md).

**Next session's task:** WS-1 (LB-5 + LB-6 — one PR). [`docs/NEXT-SESSION-HANDOFF.md § 6`](../NEXT-SESSION-HANDOFF.md) names this.
