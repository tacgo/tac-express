# Vercel Deploy Rollback Runbook

> Use this when a freshly-shipped deploy on `apps/web` or `apps/dashboard`
> is causing a customer-visible regression and the fastest path to recovery
> is reverting to the previous deployment. For DB-state corruption, see
> `DATABASE-RESTORE.md` instead.

## Decision: rollback vs forward-fix

Rollback when:
- The regression is in code that shipped in the last deploy (commit
  fingerprint visible in Sentry stack frames).
- The regression has no DB-state side effect (no new tables touched, no
  destructive writes, no irreversible migrations applied since).
- You can verify the previous deploy is healthy (Sentry shows zero of the
  new error class against the previous build sha).

Forward-fix when:
- The regression depends on a migration that's already been applied —
  rolling back code without rolling back the migration creates a worse
  inconsistency.
- An external integration changed (WPBox template approval, Sentry alert
  rule, Vercel env var) — rollback won't undo that.

## Steps (Vercel UI)

1. **Identify the bad deploy.**
   Vercel dashboard → the affected project → Deployments tab. The current
   Production deploy is at the top.
2. **Identify the last-known-good deploy.**
   Scroll back to the most recent Production deploy that doesn't show the
   regression in Sentry (filter Sentry by `release` if release tagging is
   on, otherwise correlate by deploy timestamp).
3. **Promote.**
   On the known-good row → `...` menu → "Promote to Production". Vercel
   atomically switches the production alias to that deploy in ~30 seconds.
   No CDN purge needed — Vercel handles it.
4. **Verify.**
   - Hit the customer surface that was failing.
   - Watch the Sentry rate of the regression class — should drop to zero
     within 60 seconds.
   - Check `/api/health` on dashboard.
5. **Comms.**
   If customers were affected, send a one-line update: "<feature> was
   degraded between HH:MM and HH:MM IST. Resolved. Postmortem to follow."

## Steps (Vercel CLI fallback)

If the UI is unavailable:

```
vercel ls <project>            # list recent deploys
vercel promote <deploy-url>    # promote a specific deploy to production
```

Requires `vercel login` and project access.

## Post-rollback

- Open a postmortem (`docs/incidents/_template.md`). Use the rollback
  timestamp as the resolution time.
- Do **NOT** redeploy the bad commit without a fix. The Vercel UI will
  happily redeploy if main is repushed; pin the fix on a feature branch
  and only land it after green Preview verification.
- If the deploy that was rolled back included migrations: confirm via
  `supabase db diff` that the live schema still matches the now-active
  code. If not, this is a forward-fix situation — escalate to
  `DATABASE-RESTORE.md` Scenario 1.

## What rollback does NOT undo

- Migrations already applied (`supabase db push` is forward-only).
- Env-var changes on Vercel — those are separate from deploys.
- Sentry alert rule changes — see Sentry UI history.
- WhatsApp template changes — Meta-side, not ours.
- Customer messages already sent.

## PITR-as-recovery (when rollback isn't enough)

A bad migration that corrupts data needs **point-in-time recovery**, not a
Vercel rollback. The canonical procedure lives in
[`DATABASE-RESTORE.md` § 5.A — Scenario 1](DATABASE-RESTORE.md). Summary:

1. Identify the timestamp **just before** the bad migration ran.
2. Supabase dashboard → Database → Point-in-time recovery → restore to that
   timestamp.
3. Once restored, replay any good migrations that came after.
4. Then rollback the Vercel deploy of the bad code per this runbook.

PITR is owner-only and requires the Supabase Pro plan with PITR enabled
(prerequisite P2 in `DATABASE-RESTORE.md`).

## What we do NOT have

- **No `down.sql` files.** The migration model is forward-only. PITR is
  the only recovery path for a bad migration.
- **No blue/green deployment.** A bad code deploy means real users see the
  bad code until rollback completes (~30s typical).
- **No automated rollback on Sentry error spike.** Detection → human →
  promote-to-prod is the loop. Future work: auto-rollback rule.
