# SB-2 — Sentry Alert Rules: Manual UI Setup Guide

> **When to use this file:** When creating or re-creating the six canonical Sentry alert rules for the TAC Express dashboard.
>
> **Why this exists:** The original SB-2 script (`scripts/sentry/create-alert-rules.mjs`) did not survive the repo re-foundation. The runbook at `docs/runbooks/sentry-alert-rules.md` was updated 2026-05-21 to document a manual UI provisioning path. This file persists the click-by-click guide so an owner can execute it directly in their browser — Sentry MCP is read-only and Google OAuth blocks automated browser environments, so no agent path exists.
>
> **Authority:** `docs/runbooks/sentry-alert-rules.md` (spec + tag conventions + saved queries). This file is the click-by-click execution companion.
>
> **Prereqs:** Sentry org `tac-an`, project `javascript-nextjs`, region `https://de.sentry.io`. A notification channel (email or Slack) configured in Sentry. Dashboard deployed with `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` set.

---

## How to reach the alert creation page

Navigate to: `https://tac-an.sentry.io/alerts/rules/`

Click **Create Alert** for each rule below.

---

## Rule 1 — Money-flow error (P1)

| Field | Value |
|---|---|
| **Alert type** | Issues |
| **Name** | `Money-flow error` |
| **Environment** | `production` |
| **When** | A new issue is created **AND** An issue changes state from resolved to unresolved |
| **If — filter 1** | Event Type = `error` |
| **If — filter 2** | Stack module contains `payment.service` |
| **If — filter 3** | Stack module contains `invoice.service` |
| **If — filter 4** | Stack module contains `einvoice.service` |
| **Action** | Notify P1 channel (email / Slack) |

> If `stack.module` filters don't match, fall back to **Culprit** contains `payment.service` / `invoice.service`.

---

## Rule 2 — RBAC denial spike (P2)

| Field | Value |
|---|---|
| **Alert type** | Metric Alert → Number of Errors |
| **Name** | `RBAC denial spike` |
| **Environment** | `production` |
| **Filter** | `rbac.denial:true` |
| **Threshold — warning** | count > `10` in `1 hour` |
| **Threshold — critical** | count > `50` in `1 hour` |
| **Action** | Notify P2 channel |

---

## Rule 3 — API 5xx (P1)

| Field | Value |
|---|---|
| **Alert type** | Issues |
| **Name** | `API 5xx` |
| **Environment** | `production` |
| **When** | A new issue is created |
| **If — filter 1** | Event Type = `error` |
| **If — filter 2** | URL contains `/api/` |
| **If — filter 3** | Error is unhandled = `true` |
| **Action** | Notify P1 channel |

---

## Rule 4 — Frontend crash (P2)

| Field | Value |
|---|---|
| **Alert type** | Issues |
| **Name** | `Frontend crash` |
| **Environment** | `production` |
| **When** | A new issue is created |
| **If — filter 1** | Event Type = `error` |
| **If — filter 2** | Error is handled = `false` |
| **Action** | Notify P2 channel |

---

## Rule 5 — Slow ops-console pageloads (P3)

| Field | Value |
|---|---|
| **Alert type** | Metric Alert → Transaction Duration |
| **Name** | `Slow ops-console pageloads` |
| **Environment** | `production` |
| **Filter** | `transaction:GET /ops-console*` |
| **Metric** | `p95(transaction.duration)` |
| **Threshold — critical** | > `3000` ms over `10 minutes` |
| **Action** | Notify P3 channel |

> Exclude dev — Turbopack first-compile spans routinely exceed 19s and are not real traffic.

---

## Rule 6 — Diagnostic heartbeat (info — mute after verifying)

| Field | Value |
|---|---|
| **Alert type** | Issues |
| **Name** | `Diagnostic heartbeat` |
| **Environment** | *(any — including dev/preview)* |
| **When** | A new issue is created |
| **If** | Tag `diagnostic` = `sentry-wiring` |
| **Action** | Any channel (this alert is muted after the verification step below) |

---

## Verification (run after all 6 rules are saved)

1. Deploy the dashboard with the Sentry env vars set.
2. As a user with the **MANAGER** role, call:
   ```
   POST /api/diagnostics/sentry
   ```
   Expected response: `{ ok: true, eventId: "<uuid>" }`
3. Confirm the **Diagnostic heartbeat** alert fires to your channel within ~30 seconds.
4. **Mute** the Diagnostic heartbeat alert. The full alert pipeline is now verified end-to-end.
5. Update `docs/launch/definition-of-done.md` — mark SB-2 as `DONE`.

---

## After verification

The five production alerts (Rules 1–5) are live. Thresholds (10 denials/hr, p95 3s) are starting points — tune them after a week of real traffic. A P1 that cries wolf is worse than no alert.

Full alert spec, tag conventions, and saved Discover queries: `docs/runbooks/sentry-alert-rules.md`.
