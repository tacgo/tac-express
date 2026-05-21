# Sentry Alert Rules & Saved Queries — Runbook

> **Status:** ACTIVE — manual UI provisioning path.
> **Date:** 2026-05-21
> **Authority:** PM decision · `docs/PLUGIN-POLICY.md` (Sentry ADOPTED 2026-05-21) · Sentry SDK wired in PR #7.
> **Scope:** dashboard only (`apps/dashboard`). `apps/web` ships no Sentry.

This runbook lists **what to monitor** for TAC Express and gives **ready-to-paste alert + saved-query definitions** you create by hand in the Sentry UI. There are intentionally **no executable provisioning scripts** here — creating alert rules requires a `project:write` token, which is an owner-only action; this doc is the click-to-create path.

> The earlier SB-2 approach used `scripts/sentry/*` (canonical-rules / create-alert-rules / lint). Those files did not survive the repo re-foundation. If you later want script-based provisioning instead of the UI, that's tracked as a separate backlog item (see § 6).

---

## 0. Prerequisites

- Sentry project **`javascript-nextjs`** on `de.sentry.io` (org `tac-an`).
- Dashboard deployed with `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` set in the host env.
- A notification channel configured in Sentry (email / Slack integration). Each alert below names a **severity** — route P1 to the channel that actually pages someone.
- All alerts should be filtered to **`environment:production`** unless noted — dev/preview traffic (and Turbopack cold-compile spans) are noise.

---

## 1. Tag & surface conventions (what the code emits)

These are the deterministic, PII-free tags the app attaches (see `packages/auth/src/rbac-instrumentation.ts` and `apps/dashboard/app/api/diagnostics/sentry/route.ts`). Build alert filters on these:

| Tag | Values | Emitted by |
|---|---|---|
| `rbac.denial` | `true` | `captureRbacDenial()` on every role-gate refusal |
| `rbac.required_role` | role name | same |
| `rbac.actual_role` | role name | same |
| `rbac.surface` | route/surface string | same |
| `diagnostic` | `sentry-wiring` | `POST /api/diagnostics/sentry` synthetic event |
| `surface` | `/api/diagnostics/sentry` | same |

Money-flow code paths to watch (no custom tag — filter by transaction / stack module): `payment.service.ts`, `invoice.service.ts`, `einvoice.service.ts`, `invoice-draft.service.ts`.

---

## 2. Canonical alerts

Create each via **Alerts → Create Alert** in Sentry. Severity drives which notification channel to attach.

| # | Alert | Type | Trigger | Filter | Severity |
|---|---|---|---|---|---|
| 1 | **Money-flow error** | Issue | A new issue, or an issue seen ≥ 1× in 1m | `event.type:error` AND stack module/transaction matches payment/invoice (see § 3.1) | **P1** |
| 2 | **RBAC denial spike** | Metric (count) | `rbac.denial` events > **10 in 1h** | `rbac.denial:true` | **P2** |
| 3 | **API 5xx** | Issue | New unhandled error on an API route | `event.type:error` AND `transaction:"*/api/*"` AND `unhandled:true` | **P1** |
| 4 | **Frontend crash (global-error)** | Issue | New unhandled client error | `event.type:error` AND `mechanism:"generic"` AND `handled:false` | **P2** |
| 5 | **Slow ops-console pageloads** | Metric (p95) | p95 transaction duration > **3000ms over 10m** | `event.type:transaction` AND `transaction:"GET /ops-console*"` AND `environment:production` | **P3** |
| 6 | **Diagnostic heartbeat** | Issue | Synthetic verification event fires | `diagnostic:sentry-wiring` | **info** (mute after verifying) |

> Thresholds (10 denials/hr, p95 3s) are starting points — tune them once you have a week of real traffic. Don't keep a P1 that cries wolf.

---

## 3. Per-alert detail

### 3.1 Money-flow error (P1)
Errors thrown while recording payments or invoices are the highest-stakes failures — a silent one means money is mis-recorded and nobody learns until a customer complains.

- **Type:** Issues alert
- **When:** "A new issue is created" **OR** "An issue changes state from resolved to unresolved"
- **If (filters):** `event.type:error` AND ( `stack.module:*payment.service*` OR `stack.module:*invoice.service*` OR `stack.module:*einvoice.service*` OR `transaction:"*invoice*"` OR `transaction:"*payment*"` )
- **Then:** notify the P1 channel immediately.
- *Note:* Sentry's stack-module field names vary by SDK; if `stack.module` doesn't match, use the issue's **culprit** contains `payment.service` / `invoice.service` instead.

### 3.2 RBAC denial spike (P2)
A few denials are normal (users hitting pages above their role). A *spike* means either a broken role gate or someone probing.

- **Type:** Metric alert → "Number of errors"
- **Filter:** `rbac.denial:true environment:production`
- **Threshold:** count > **10** in **1 hour** → warning; > **50** → critical.
- **Group by (in the saved query, § 4):** `rbac.surface`, `rbac.actual_role` to see *what* is being probed.

### 3.3 API 5xx (P1)
- **Type:** Issues alert
- **Filter:** `event.type:error transaction:"*/api/*" unhandled:true environment:production`
- **Then:** P1 channel. These are caught by `onRequestError` in `instrumentation.ts`.

### 3.4 Frontend crash via global-error (P2)
Render-phase crashes that hit `apps/dashboard/app/global-error.tsx` (which now calls `Sentry.captureException`).

- **Filter:** `event.type:error handled:false environment:production`
- **Then:** P2 channel.

### 3.5 Slow ops-console pageloads (P3)
- **Type:** Metric alert → transaction duration, **p95**
- **Filter:** `transaction:"GET /ops-console*" environment:production`
- **Threshold:** p95 > **3000ms** over **10 min**.
- *Note:* exclude dev — Turbopack first-compile spans hit 19s+ and are not real (see the verification trace analysis).

### 3.6 Diagnostic heartbeat (info)
Verifies the **whole alert pipeline** end-to-end, not just ingestion.

- **Filter:** `diagnostic:sentry-wiring`
- **When:** any matching event → notify a test channel.
- Fire it on demand: as a MANAGER, `POST /api/diagnostics/sentry` → returns `{ ok: true, eventId }`. The tagged synthetic event should trip this alert within ~30s. Once verified, **mute** this alert.

---

## 4. Saved queries (Discover / Traces)

Paste these into **Explore → Traces** (or Discover) and save them for one-click triage:

| Saved query | Search string | Useful columns / group-by |
|---|---|---|
| **Money-flow errors** | `event.type:error (transaction:"*invoice*" OR transaction:"*payment*")` | transaction, culprit, count, last seen |
| **RBAC denials** | `rbac.denial:true` | group by `rbac.surface`, `rbac.actual_role`; count |
| **API 5xx** | `event.type:error transaction:"*/api/*" unhandled:true` | transaction, error.type, count |
| **Slow ops-console** | `event.type:transaction transaction:"GET /ops-console*"` | sort by p95(span.duration) desc |
| **Diagnostic events** | `diagnostic:sentry-wiring` | timestamp, eventId — confirms wiring |

---

## 5. Verification (after creating the alerts)

1. Deploy the dashboard with the env vars set.
2. As a MANAGER, `POST /api/diagnostics/sentry` → `{ ok: true, eventId }`.
3. Confirm the **Diagnostic heartbeat** alert (§ 3.6) fires to your test channel within ~30s.
4. Mute the heartbeat alert. The pipeline is now proven end-to-end.

---

## 6. If you later want script-based provisioning

The UI path above is the source of truth today. If alert config grows enough to want version-controlled provisioning (`scripts/sentry/create-alert-rules.mjs` + a lint), open a backlog item — it requires a `project:write` token at run time and is owner-run. Keep this runbook as the spec the script would encode.

**Last reviewed: 2026-05-21.**
