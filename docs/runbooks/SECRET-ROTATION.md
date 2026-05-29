# Secret Rotation Runbook

> Rotation cadence + step-by-step procedure for every long-lived secret in
> TAC Express. Rotate scheduled secrets quarterly; rotate **immediately**
> on confirmed leak (commit history scrape, contractor offboarding, vendor
> security incident).

## Rotation cadence

| Secret | Cadence | Risk if leaked | Rotation owner |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | quarterly + on contractor offboarding | full DB read/write, RLS bypass | owner |
| `SUPABASE_DB_PASSWORD` | quarterly | direct Postgres access | owner |
| `INVOICE_PDF_SIGNING_SECRET` | yearly (rotation invalidates active WhatsApp invoice links) | forged PDF URLs reach customers | owner |
| `WPBOX_API_TOKEN` | quarterly | impersonate ops, spend WhatsApp credit | owner |
| `WPBOX_USER_ID` | rarely (vendor-managed) | identifier-only, low risk | owner |
| `SENTRY_AUTH_TOKEN` | quarterly | upload bad source maps, mint releases | owner |
| `UPSTASH_REDIS_REST_TOKEN` | quarterly | poison rate-limit counters | owner |
| `RESEND_API_KEY` (Supabase secret) | quarterly + on suspicious sends | send mail as our verified domain | owner |
| `TWILIO_AUTH_TOKEN` (Supabase secret) | quarterly | send SMS, incur charges | owner |
| `FCM_SERVER_KEY` (Supabase secret) | n/a — push deleted in H-5 | — | — |
| GitHub Actions `SUPABASE_ACCESS_TOKEN` | yearly | run migrations from CI | owner |

## Procedure — Supabase service-role key

1. **Mint new key.** Supabase dashboard → Project Settings → API → "Generate
   new" alongside the existing `service_role` key. **Do NOT revoke yet.**
2. **Stage on Vercel.** Set `SUPABASE_SERVICE_ROLE_KEY` to the new value on
   both `apps/web` and `apps/dashboard` Vercel projects (Production env).
3. **Stage in Supabase Edge Functions.** `supabase secrets set
   SUPABASE_SERVICE_ROLE_KEY=<new>` (Edge fns also auto-inject, but explicit
   setting prevents the "auto-injected vs configured" race).
4. **Trigger redeploys** on both Vercel projects. Wait for "Ready" on both.
5. **Verify.** Hit `/api/contact` once with a test payload; hit
   `/api/diagnostics/sentry` (manager-gated) once. Both should succeed.
6. **Revoke the old key.** Supabase dashboard → revoke the previous
   `service_role` key. Watch Sentry for 5 minutes — any 5xx with PostgREST
   401/403 means a caller wasn't updated; roll back step 6 and find it.

## Procedure — `INVOICE_PDF_SIGNING_SECRET`

**Side effect:** every previously-sent WhatsApp invoice link breaks.

1. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Set on `apps/dashboard` Vercel Production env.
3. Trigger redeploy of dashboard.
4. The first new WhatsApp invoice send after redeploy mints a fresh signed URL
   with the new secret. Active inbound clicks on the old URLs return 401.
5. No revoke step — there's only one secret in use.

## Procedure — WPBox token

1. Lemin AI dashboard → API tokens → generate new.
2. Set `WPBOX_API_TOKEN` on `apps/dashboard` and `apps/web` Vercel projects.
3. Trigger redeploys.
4. Smoke-test: send one template message via `/api/whatsapp/test` (manager
   gated). If 200 with WAMID, mark old token revoked in Lemin AI.

## Procedure — Sentry auth token

1. Sentry → Settings → Auth Tokens → generate new with `project:write` +
   `org:read` scopes only.
2. Set `SENTRY_AUTH_TOKEN` on the Vercel `apps/dashboard` build env
   (build-only, not runtime).
3. Set in GitHub Actions secrets if used there.
4. Trigger one redeploy and confirm source maps upload to the right release.
5. Revoke the old token in Sentry.

## Procedure — Upstash Redis token

1. Upstash dashboard → REST API → regenerate token (this **does** invalidate
   the prior token immediately, so do this in a maintenance window or
   accept ~30s of rate-limit-off behavior).
2. Set `UPSTASH_REDIS_REST_TOKEN` on both Vercel projects.
3. Trigger redeploys.
4. Watch rate-limit headers on `/api/contact` for a minute — `X-RateLimit-*`
   headers should appear; if missing for 2 min, env wasn't picked up.

## Procedure — Resend / Twilio

These live as Supabase Edge Function secrets (`supabase secrets set <KEY>=...`).
Edge functions cold-start fast, so:

1. Rotate the credential at the vendor.
2. `supabase secrets set RESEND_API_KEY=<new>` (or `TWILIO_AUTH_TOKEN=...`).
3. Invoke the function once with a non-blocking payload to verify.
4. Revoke the old credential at the vendor.

## On a confirmed leak

If a secret is exposed (commit history scrape, contractor offboarding, vendor
incident notice), skip the staged rotation — revoke first, then mint, then
restore service. Customers experiencing failures for the rotation window is
better than an attacker holding live credentials.

Open a postmortem (`docs/incidents/_template.md`) for any non-routine rotation.

## What we do NOT rotate

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public by design. Rotated only on
  Supabase project recreation.
- `NEXT_PUBLIC_SENTRY_DSN` — public by design. Rotation is a Sentry-project
  re-create.
- Pre-shared HMAC secrets in `webhooks.secret` — owned per-subscriber row;
  rotation is a partner-coordinated step, not a global procedure.
