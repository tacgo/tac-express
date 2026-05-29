# Incident Postmortem Template

> Copy this file to `docs/incidents/YYYY-MM-DD-short-slug.md` after every
> customer-impacting or security-impacting incident. Fill it within 72 hours
> of resolution. Postmortems are blameless and assume good faith from everyone
> involved.

## Incident summary

- **Incident ID:** INC-YYYY-MM-DD-NN
- **Severity:** SEV-1 / SEV-2 / SEV-3 (see severity definitions below)
- **Status:** Resolved / Monitoring / Investigating
- **Date opened:** YYYY-MM-DD HH:MM IST
- **Date resolved:** YYYY-MM-DD HH:MM IST
- **Duration:** Hh:MMm
- **Customer impact:** <one-sentence summary visible to the customer>
- **Owner:** <name>
- **Reporters:** <name(s)>

## Severity definitions

- **SEV-1** — Production down, money flow blocked, or PII exposed.
  Mobilise immediately, page on-call, customer comms within 1 hour.
- **SEV-2** — Material degradation (a key feature broken, an integration
  failing). Customer-visible but workarounds exist. Resolve within one
  business day.
- **SEV-3** — Internal-only, no customer impact. Resolve in the next sprint.

## Timeline

All times in IST. Source: Sentry events, Vercel deployments, git log, Slack.

| Time | Event |
|---|---|
| YYYY-MM-DD HH:MM | First customer report / first Sentry alert |
| HH:MM | On-call paged / owner acknowledged |
| HH:MM | Triage decision — kill switch flipped / rollback initiated |
| HH:MM | Mitigation deployed |
| HH:MM | Verified resolved |
| HH:MM | All-clear comms sent |

## What happened

<2-4 paragraphs. The user-visible behavior, what the system was doing,
what we believed was true vs. what was actually true. Resist the urge to
go straight to root cause — describe the surface first.>

## Root cause

<The earliest change or condition that, if reversed, would have prevented
the incident. Not the proximate cause — the *root* cause. Often it's a
gap in a guard, an unverified assumption, or a missing pre-flight check.>

## Detection

- How did we find out? (Customer report, Sentry alert, manual smoke check,
  scheduled monitor.)
- Time to detect (TTD): minutes from first impact to first signal.
- Was the detection mechanism correct? (Right alert, right threshold,
  right routing.)

## Response

- Time to acknowledge (TTA): minutes from signal to human response.
- Time to mitigate (TTM): minutes from acknowledgement to impact stopped.
- Time to resolve (TTR): minutes from acknowledgement to full resolution.
- What slowed us down? What helped?

## Customer impact

- Number of affected customers (estimate fine — explain how you counted).
- Surfaces affected (landing tracking, contact form, dashboard, invoice
  PDF, WhatsApp send, etc.).
- Data loss / financial impact (if any).
- Communications sent (who, what, when, where — link the messages).

## Action items

| # | Action | Owner | Due | Type | Status |
|---|---|---|---|---|---|
| 1 | <action> | <name> | YYYY-MM-DD | Prevent / Detect / Mitigate | open |

Categories:
- **Prevent** — make the same root cause impossible (or unlikely).
- **Detect** — surface the same class of failure faster next time.
- **Mitigate** — reduce blast radius when the failure does recur.

Every SEV-1 must produce at least one Prevent action.

## What went well

<Bullet list. Specific. Did the kill switch work? Did the runbook get us
to mitigation in under 30 min? Did the Sentry alert route correctly?>

## What went poorly

<Bullet list. Honest but blameless. What slowed us down, what was
confusing, what was missing.>

## Lessons learned

<2-3 bullets. The durable knowledge — not the action items, the
understanding behind them.>

## Appendix

- Sentry issue links
- Git commits (mitigation + future Prevent action PRs)
- Customer comms drafts
- Screenshots if relevant
