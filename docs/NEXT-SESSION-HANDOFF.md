# Next-Session Handoff — Start Here

> **The launch authority is [`docs/launch/MASTER-LAUNCH-PLAN.md`](launch/MASTER-LAUNCH-PLAN.md) (v1.4).** Customer-facing detail: [`docs/launch/CUSTOMER-FACING-PLAN.md`](launch/CUSTOMER-FACING-PLAN.md). UI/UX standard: [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md).

**Last code commit on main:** `f337540` (PI-1 EVIDENCED DONE docs, #191). This PR is the launch-readiness reconciliation (docs-only).
**This handoff covers:** the reconciliation session (2026-05-21). See [`docs/retros/2026-05-21-launch-readiness-reconciliation.md`](retros/2026-05-21-launch-readiness-reconciliation.md).
**Author:** Claude Code (Opus 4.7), PM lens.

---

## 1. LAUNCH VERDICT

> # **NOT READY** (BOOLEAN) — launch surface now **2 owner actions**, down from 4.

| | |
|---|---|
| ✅ PI-1 | **EVIDENCED DONE** — 4 migrations deployed (run `26180576599`); tables live, RLS correct, security advisors clean |
| ✅ LB-4 | **RESOLVED** — operating on Supabase **Free** for launch (active stance; upgrade-when-warranted; 30-day review [#192](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/192)) |
| 🚀 LB-1 | SB-2 Sentry alert provisioning (~20 min) — independent, runnable now |
| 🚀 LB-2a | Submit the Meta WhatsApp template — **external-clock long-pole** (24–48h approval); run first |
| 🚀 LB-2b | WPBOX env vars + production e2e — gated on LB-2a approval |

---

## 2. What happened this session

Reconciliation only (docs). Recorded PI-1 EVIDENCED DONE in the verdict; codified the **production-deploy policy** (pipeline-only; no MCP/manual prod writes; two-signal verification; `pg_dump` before destructive ops on Free); **resolved LB-4** as a Free-tier stance with documented residual risk, compensations, and 5 upgrade triggers; **split LB-2** into a/b to surface the Meta-template external clock; filed the 30-day LB-4 review issue #192.

---

## 3. Open items

- **Open PRs:** this reconciliation PR. After merge → 0 open PRs.
- **Open issues:** #192 (30-day LB-4 review, intentionally open). #174 closed last session.
- **Deferred, non-blocking:** perf-tuning for the 2 new PII tables (FK indexes + `(select auth.uid())` RLS wrapping) — see the PI-1 retro § 6.

---

## 4. Customer-facing status

WS-1, WS-2 + WS-2B, WS-3, WS-4A all closed (landing at clean PREMIUM ~92). The agent-actionable customer-facing burn-down is complete.

---

## 5. Operating principles for production-affecting work (carry forward)

- **Pipeline-only deploys** — migrations via `migration-deploy.yml` only. No MCP `apply_migration`, no manual prod SQL, no off-pipeline `db push`.
- **Two-signal verification** — pair every action with a state-layer read (it caught all four PI-1 false-success modes).
- **`pg_dump` before any destructive prod op** on the Free tier — the standing backup substitute (no PITR).

---

## 6. Next session's lead task — WS-4B (dashboard support inbox)

The next **agent** session is the WS-4B build. Preconditions, all now met:
- ✅ PI-1 done — `contact_leads` exists in production with RLS (MANAGER+ select, MANAGER+ update; no insert/delete policy — service-role writes only).
- ✅ LB-4 resolved — operating on Free; `pg_dump` discipline established.
- No other agent dependencies.

WS-4B is a NEW `apps/dashboard` surface reading `contact_leads`. It needs its own PHASE-0: confirm/extend the RLS read path for MANAGER+, additive schema columns (e.g., `read_at`/`triaged_by` if the inbox needs triage state — design in the build session, NOT before), service-layer methods, composed UI components, audit-trail wiring. ~half-day PR-scale. Load the UI-UX consistency playbook first (customer-facing-adjacent dashboard surface).

**LB-1 and LB-2 are owner-side and parallelizable with WS-4B** — they do not block the next agent session.

---

## 7. OWNER ACTIONS — before next session

1. ✅ **PI-1 — DONE.** No action.
2. ✅ **LB-4 — RESOLVED** (Free for launch). No action; #192 holds the 30-day review.
3. 🚀 **LB-2a** — submit the Meta WhatsApp template **now** (external-clock long-pole; 24–48h approval). This is the launch-ready critical path.
4. 🚀 **LB-1** — SB-2 Sentry alert provisioning (~20 min). Independent; run anytime.
5. 🚀 **LB-2b** — WPBOX env vars + production e2e, after LB-2a approval lands.

🤖 Handoff written by Claude (Opus 4.7), 2026-05-21, post launch-readiness reconciliation.
