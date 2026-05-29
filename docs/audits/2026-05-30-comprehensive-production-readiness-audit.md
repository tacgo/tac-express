# TAC Express — Comprehensive Production-Readiness Audit

**Date:** 2026-05-30
**Branch:** `feat/prod-readiness-comprehensive-audit`
**Source HEAD:** `f83552a feat(web): landing page comprehensive overhaul — nav, dark mode, new sections`
**Worktree:** `C:\tac\tw-prodaudit`
**Methodology:** Six parallel read-only investigations covering env config, integrations, security/RLS, observability, testing, and code quality. RLS audited live via Supabase MCP against project `skkappqeaxsdygwrbqni`. All other findings sourced from clean worktree at production HEAD.

**Scope:** Read-only audit. No code changes. The owner reviews this document and decides which findings to action in subsequent sessions.

**Three gaps the owner flagged at audit start (confirmed below):**
1. `NEXT_PUBLIC_DASHBOARD_URL` — ngrok in dashboard `.env.local`; **missing entirely** from web `.env.local` (the larger gap)
2. `WPBOX_API_TOKEN` — set in dashboard; **missing** from web `.env.local` (where `/api/contact` runs)
3. `INVOICE_PDF_SIGNING_SECRET` — set locally with a valid 64-hex value; owner concern is Vercel prod env (unverifiable from repo)

**Severity legend.**
- **CRITICAL** — will fail or expose data when real users hit it
- **HIGH** — degrades trust, observability, or experience meaningfully
- **MEDIUM** — should fix before scale, not before launch
- **LOW** — quality improvement, not blocking
- **NOTE** — observation worth recording, no action required

---

## Section 1 — Environment & Configuration Readiness

### 1.1 Env var inventory

Legend for "Local status":
- `apps/dashboard/.env.local`: D=set, D-empty=empty string, D-ngrok=ngrok placeholder, D-missing=not present
- `apps/web/.env.local`: W=set, W-empty=empty string, W-missing=not present
- `(no local file)`: var lives in root only / both apps consume

Note: `apps/web/.env.local` contains ONLY `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Every other web-app env var is currently missing locally.

| Var | Location(s) | Required (prod) | Client-exposed | Local status | Failure mode if missing in prod | Severity |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `packages/database/src/client.ts:11,62`; `packages/database/src/middleware.ts:7`; `apps/web/app/api/track/[awb]/route.ts:107`; `apps/web/app/(public)/track/[awb]/page.tsx:21`; `apps/dashboard/app/track/[awb]/page.tsx:35` | **YES** (hard throw in `client.ts:14`, `middleware.ts:10`) | YES | D set, W set | Auth/middleware throws on first request → every page 500s | CRITICAL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as above | **YES** (same throws) | YES | D set, W set | Same as above | CRITICAL |
| `SUPABASE_SERVICE_ROLE_KEY` | `packages/database/src/client.ts:63` (service-role client) | **YES** for `/api/contact` lead capture (`packages/services/src/server.ts:95` chain) and any service-role write | NO (server-only) | **D-missing, W-missing** | `createServiceRoleClient()` throws → public `/api/contact` 500s → contact form drops every lead | **CRITICAL** |
| `NEXT_PUBLIC_DASHBOARD_URL` | `apps/web/app/dashboard/page.tsx:4`; `apps/dashboard/lib/public-origin.ts:126`; `packages/ui/src/components/composed/public-nav.tsx:19` | **YES** (web→dashboard redirect, public-nav "Open dashboard" link, WhatsApp PDF origin) | YES (`NEXT_PUBLIC_`) | **D-ngrok** (`https://pupil-rhyme-hence.ngrok-free.dev`), **W-missing** | Web "Open dashboard" + `/dashboard` redirect both fall back to `http://localhost:3001` (visitor loops to local). WhatsApp PDF auto-gen falls back to request host (works behind Vercel) but the marketing nav link will be broken on web. | **CRITICAL** |
| `INVOICE_PDF_SIGNING_SECRET` | `packages/services/src/pdf/invoice-pdf-token.ts:57`; `apps/dashboard/lib/public-origin.ts:161`; `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:416` | **YES** for any WhatsApp PDF send | NO | **D set (64-hex looks valid)**, W-missing (not used on web) | `getSecret()` throws on signed-URL mint → every WhatsApp invoice send 500s; auto-gen URL field gets hidden by `isPdfAutoGenAvailable() === false` | **HIGH** (owner flagged as empty but **the dashboard `.env.local` actually has it set** — verify Vercel env separately) |
| `WPBOX_API_TOKEN` | `packages/services/src/whatsapp.service.ts:489` | **YES** for any WhatsApp send | NO | **D set, W-missing** | `getWhatsAppConfig()` throws (`whatsapp.service.ts:493`) → all WhatsApp invoice sends + lead notifications 503/500 | **CRITICAL** (owner flagged empty — present in dashboard but **MISSING in apps/web/.env.local**, which `/api/contact` consumes via `packages/services/src/server.ts`) |
| `WPBOX_USER_ID` | `packages/services/src/whatsapp.service.ts:490` | **YES** for any WhatsApp send | NO | **D set, W-missing** | Same throw (`whatsapp.service.ts:498`) → all WhatsApp paths 500 | **CRITICAL** for apps/web (lead notification path) |
| `WPBOX_BASE_URL` | `packages/services/src/whatsapp.service.ts:491` | NO — defaults to `https://chat.leminai.com` (`whatsapp.service.ts:162`) | NO | D-missing, W-missing | None (uses default) | LOW |
| `WHATSAPP_ENABLED` | `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:141`; `apps/dashboard/app/api/whatsapp/retry-send/route.ts:63` | YES if WhatsApp expected — strict `=== "true"` check | NO | D set (`"true"`), W-missing | If unset/typo → 503 on every send (intentional kill switch). Production silently disabled is a real risk if Vercel value drifts. | HIGH |
| `WPBOX_LEAD_NOTIFICATION_PHONE` | `packages/services/src/server.ts:98` | NO — lead row still captured, but `notification_status` flips to `failed` for every lead | NO | D-missing, **W-missing** | Every contact-form lead notification fails; manual follow-up required via `contact_leads` table | **HIGH** (silent operational gap — leads land but no one is paged) |
| `WPBOX_LEAD_TEMPLATE_NAME` | `packages/services/src/server.ts:100` | NO (defaults to `"lead_notification"`) | NO | D-missing, W-missing | Uses default; works if WPBox has that exact template approved | MEDIUM (depends on WPBox template provisioning) |
| `WPBOX_LEAD_TEMPLATE_LANGUAGE` | `packages/services/src/server.ts:102` | NO (defaults to `"en"`) | NO | D-missing, W-missing | None | LOW |
| `NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE` | `packages/ui/src/components/composed/finance/send-whatsapp-dialog.tsx:693` | NO — pattern-match `/invoice/i` fallback; UI shows warning copy when ambiguous (line 548) | YES | D-missing, W-missing | None if exactly one `*invoice*` template approved at WPBox; ambiguous warning otherwise | MEDIUM |
| `COMPANY_LEGAL_NAME` | `packages/services/src/pdf/invoice-pdf.tsx:100`; asserted at `invoice-pdf.tsx:131` | **YES** (PDF render throws on missing — `invoice-pdf.tsx:157`) | NO | D-missing | First public invoice-PDF render 500s | **CRITICAL** |
| `COMPANY_ADDRESS` | `invoice-pdf.tsx:101` (pipe-separated lines); asserted at `:154` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `COMPANY_TEL` | `invoice-pdf.tsx:102`; asserted `:135` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `COMPANY_EMAIL` | `invoice-pdf.tsx:103`; asserted `:136` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `COMPANY_WEB` | `invoice-pdf.tsx:104`; asserted `:137` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `COMPANY_GSTIN` | `invoice-pdf.tsx:105`; asserted `:132` | **YES** (statutory) | NO | D-missing | Same — placeholder `[unset]` GSTIN on a legal tax document | **CRITICAL** |
| `COMPANY_PAN` | `invoice-pdf.tsx:106`; asserted `:133` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `COMPANY_CIN` | `invoice-pdf.tsx:107`; asserted `:134` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `BANK_NAME` | `invoice-pdf.tsx:112`; asserted `:138` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `BANK_ACCOUNT` | `invoice-pdf.tsx:113`; asserted `:139` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `BANK_IFSC` | `invoice-pdf.tsx:114`; asserted `:140` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `BANK_SWIFT` | `invoice-pdf.tsx:115`; asserted `:141` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `BANK_UPI` | `invoice-pdf.tsx:116`; asserted `:142` | **YES** | NO | D-missing | Same | **CRITICAL** |
| `UPSTASH_REDIS_REST_URL` | `apps/dashboard/lib/rate-limit.ts:10`; `apps/web/lib/rate-limit.ts:15` | NO (fails-open / no-op when unset; comment in both files confirms) | NO | D-missing, **W-missing** | Rate limits silently disabled. Public `/track/*`, `/sign-in`, `/api/contact`, `/api/whatsapp/*` accept unlimited requests → credential stuffing + WhatsApp billing abuse + contact-form spam | **HIGH** (works, but launch posture is "no abuse protection") |
| `UPSTASH_REDIS_REST_TOKEN` | same | NO (fails-open) | NO | D-missing, W-missing | Same | **HIGH** |
| `NEXT_PUBLIC_SITE_URL` | `apps/web/lib/site-url.ts:22` | NO — falls back to `https://tacexpress.in` (`site-url.ts:20`) and validates with `URL.canParse` | YES | W-missing | None (good fallback) — but if web is deployed under a non-`tacexpress.in` hostname, sitemap/OG metadata points at the wrong origin | MEDIUM |
| `NEXT_PUBLIC_WEB_URL` | **NONE** — declared in `.env.example` (root, web, dashboard) but never read in code | NO | YES | D-missing, W-missing | Dead doc — nothing reads it | NOTE (dead doc) |
| `SENTRY_DSN` | `apps/dashboard/sentry.server.config.ts:26`; `apps/dashboard/sentry.edge.config.ts:16`; `apps/dashboard/app/api/diagnostics/sentry/route.ts:100` | NO (fail-quiet — Sentry init no-ops without DSN) | NO | D set | Server/edge errors not reported to Sentry. Client side still works (different var) | HIGH (no server observability) |
| `NEXT_PUBLIC_SENTRY_DSN` | `apps/dashboard/instrumentation-client.ts:20`; also fallback in server/edge configs | NO (same fail-quiet) | YES | D set | Client errors + Session Replay not reported | HIGH |
| `SENTRY_AUTH_TOKEN` | `apps/dashboard/next.config.mjs:85` (via `withSentryConfig`) | NO (source-map upload no-ops without it) | NO (build-only) | Stored in `.env.sentry-build-plugin` (gitignored, present at root) | No source maps in Sentry → stack traces minified | MEDIUM |
| `SENTRY_ENV` | `apps/dashboard/app/api/diagnostics/sentry/route.ts:122` | NO (falls back to `NODE_ENV`) | NO | D-missing | Diagnostic endpoint reports `environment: "production"` from NODE_ENV | LOW |
| `SENTRY_RELEASE` | `apps/dashboard/app/api/diagnostics/sentry/route.ts:123` | NO | NO | D-missing | Releases not tagged → no regression detection by release | MEDIUM |
| `NEXT_PUBLIC_SENTRY_ENV` | declared in `turbo.json:33`, **NOT read in any .ts file** | NO | YES | D-missing | Dead — only declared for Turbo cache key | NOTE |
| `NEXT_PUBLIC_SENTRY_RELEASE` | declared in `turbo.json:34`, **NOT read in any .ts file** | NO | YES | D-missing | Dead | NOTE |
| `SENTRY_ALERT_NOTIFICATION_ACTION` | declared in `turbo.json:27`, **NOT read in any .ts file** | NO | NO | D-missing | Dead doc / future use | NOTE |
| `LOG_LEVEL` | `apps/dashboard/lib/logger.ts:67` | NO (defaults: `info` in prod, `debug` in dev) | NO | D-missing | None | LOW |
| `NODE_ENV` | many (`payment.service.ts:266`, `einvoice.service.ts:57`, sentry configs, etc.) | Set by runtime — not user-configured | NO | Set by Next.js | N/A | NOTE |
| `NEXT_RUNTIME` | `apps/dashboard/instrumentation.ts:10,14` | Set by Next.js | NO | runtime-injected | N/A | NOTE |
| `ANTHROPIC_API_KEY` | declared in root `.env.example:24`, **NOT read in any production code** | NO | NO | N/A | Dead doc | NOTE |
| `RESEND_API_KEY` | `supabase/functions/send-notification/index.ts:14` (Edge function — Deno) | NO if email notifications not used today (function warns + skips) | NO (Edge function secret) | N/A (Supabase secret, not in `.env.local`) | Email notification path no-ops with `console.warn` | MEDIUM |
| `TWILIO_ACCOUNT_SID` | `supabase/functions/send-notification/index.ts:15` | NO (function warns + skips SMS) | NO | N/A | SMS path no-ops | MEDIUM |
| `TWILIO_AUTH_TOKEN` | same | NO | NO | N/A | Same | MEDIUM |
| `TWILIO_FROM_NUMBER` | same | NO | NO | N/A | Same | LOW |
| `FCM_SERVER_KEY` | `supabase/functions/send-notification/index.ts:18` | NO (function warns + skips push) | NO | N/A | Push notifications skipped | MEDIUM |
| `NOTIFICATION_FROM_EMAIL` | `supabase/functions/send-notification/index.ts:19` | NO (defaults `"no-reply@tac-express.in"`) | NO | N/A | None | LOW |
| `SUPABASE_URL` (Edge) | `supabase/functions/{generate-pdf,scheduled-sla-monitor,send-notification,dispatch-webhook}/index.ts` | YES for Edge fns (non-null asserted `!`) | NO | Auto-injected by Supabase Edge | Edge fn throws on cold start | HIGH if not set — typically auto-provisioned by Supabase, but verify |
| `SUPABASE_SERVICE_ROLE_KEY` (Edge) | same Edge fns | YES (non-null asserted) | NO | Auto-injected by Supabase | Edge fn throws | HIGH (verify Supabase secret) |
| `PLAYWRIGHT_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_INVOICE_ID`, `E2E_AWB`, `E2E_MANIFEST_ID`, `E2E_SEED_DB_OK`, `BOOTSTRAP_BASELINE`, `AXE_FAIL_ON_VIOLATIONS` | E2E only (Playwright + axe; in `turbo.json:44-68`, `apps/dashboard/.env.test.local.example`) | NO in prod (CI-only) | NO | not in `.env.local` | N/A in prod | NOTE |
| `SUPABASE_PROJECT_ID` | `scripts/supabase-types.mjs:26` | Dev-tooling only | NO | N/A | Type-gen script | NOTE |
| `WATCH_POLL_INTERVAL_MS`, `WATCH_TIMEOUT_MS` | `scripts/ci-watch-pr.mjs:66-67` | CI-only | NO | N/A | None | NOTE |
| `AUDIT_ORPHANS_WRITE_BASELINE` | `scripts/audit-governance.mjs:335` | CI-only | NO | N/A | None | NOTE |

### 1.2 Silent dependencies (in code, missing from `.env.example`)

These are read by application code but NOT documented in `.env.example`, root `.env.example`, or any sibling — operator must guess or read source:

1. **`SENTRY_DSN`** — read at `apps/dashboard/sentry.server.config.ts:26`, `sentry.edge.config.ts:16`. Not in any `.env.example`. (HIGH — server-side error visibility silently off.)
2. **`NEXT_PUBLIC_SENTRY_DSN`** — read at `apps/dashboard/instrumentation-client.ts:20`. Not in any `.env.example`. (HIGH.)
3. **`SENTRY_ENV`** — read at `apps/dashboard/app/api/diagnostics/sentry/route.ts:122`. Not in any `.env.example`. (LOW.)
4. **`SENTRY_RELEASE`** — read at `apps/dashboard/app/api/diagnostics/sentry/route.ts:123`. Not in any `.env.example`. (MEDIUM.)
5. **`SENTRY_AUTH_TOKEN`** — used at `apps/dashboard/next.config.mjs:85`. Documented only via the gitignored `.env.sentry-build-plugin` convention; not in any `.env.example`. (MEDIUM.)
6. **`LOG_LEVEL`** — read at `apps/dashboard/lib/logger.ts:67`. Not in `.env.example`. (LOW.)
7. **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** — Documented in `apps/web/.env.example:25-26` but NOT in `apps/dashboard/.env.example` even though `apps/dashboard/lib/rate-limit.ts:10-11` reads them (and is the surface for WhatsApp + auth rate limits). (HIGH — operator copying just `apps/dashboard/.env.example` won't know to set them.)
8. **`SUPABASE_SERVICE_ROLE_KEY`** — Documented in `apps/web/.env.example:5` and root `.env.example:12`, but NOT in `apps/dashboard/.env.example` despite `packages/database/src/client.ts:63` being shared. (HIGH.)
9. **`WHATSAPP_ENABLED`** — Documented in `apps/dashboard/.env.example:16` but NOT mentioned in root or `apps/web/.env.example`; the strict `=== "true"` check is easy to miss. (MEDIUM.)
10. **`NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE`** — Read at `packages/ui/.../send-whatsapp-dialog.tsx:693`. Mentioned only as a commented-out example at `apps/dashboard/.env.example:63`. (LOW.)
11. **Supabase Edge function envs** (`RESEND_API_KEY`, `TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER`, `FCM_SERVER_KEY`, `NOTIFICATION_FROM_EMAIL`) — read inside `supabase/functions/send-notification/index.ts`. Listed in root `.env.example` but NOT documented as Supabase project secrets (set via `supabase secrets set`, not `.env.local`). Operator may incorrectly put them in `.env.local`. (MEDIUM — wrong-place risk.)

### 1.3 Hardcoded URLs that should be env vars

| File:line | Hardcoded value | Recommended env var | Notes |
|---|---|---|---|
| `apps/web/app/dashboard/page.tsx:4` | `"http://localhost:3001"` (fallback for missing `NEXT_PUBLIC_DASHBOARD_URL`) | Replace fallback with **build-time fail** (matches `docs/launch/CUSTOMER-FACING-PLAN.md:53`'s stated requirement that the missing var should fail the build, not silently render localhost) | The owner's flagged item #1 — the var exists but the fallback path is dangerous. |
| `packages/ui/src/components/composed/public-nav.tsx:19` | `"http://localhost:3001"` (same fallback) | Same — drop silent fallback in prod | Visible on every marketing page footer/nav. |
| `apps/web/app/(public)/developers/page.tsx:47` | `https://api.tacexpress.com/v1/shipments` (in a code sample) | `NEXT_PUBLIC_API_DOCS_BASE` or accept as documentation-only literal | Marketing copy; LOW. **But note the inconsistency** with the `.in` domain used everywhere else (`tacexpress.in` vs `tacexpress.com`). |
| `apps/web/app/(public)/contact/page.tsx:30` | `hello@tacexpress.com` (display) | accept as hardcoded constant; but **inconsistency**: `packages/ui/src/components/composed/footer.tsx:45` uses `contact@tacexpress.in` and `packages/ui/.../management/invite-staff-dialog.tsx:137` uses `teammate@tacexpress.in` placeholder | LOW — but customer-facing email addresses don't agree between marketing and footer. |
| `apps/web/app/(marketing)/page.tsx:31` | `"hello@tacexpress.com"` | Same inconsistency as above. | LOW |
| `apps/web/app/(public)/legal/privacy/page.tsx:50` | `privacy@tacexpress.com` | Inconsistent with `.in` domain. | LOW |
| `packages/ui/src/components/composed/footer.tsx:45` | `mailto:contact@tacexpress.in` | Inconsistent with marketing pages. | LOW |
| `packages/services/src/whatsapp.service.ts:162` | `"https://chat.leminai.com"` (default `WPBOX_BASE_URL`) | Already env-driven via `WPBOX_BASE_URL`; default is fine but should be exported as a named constant | NOTE |
| `apps/web/lib/site-url.ts:20` | `"https://tacexpress.in"` (`FALLBACK_SITE_URL`) | Already env-driven; fallback is acceptable | NOTE (good) |
| `supabase/functions/send-notification/index.ts:19` | `"no-reply@tac-express.in"` (default `NOTIFICATION_FROM_EMAIL`) | **Two domain spellings exist**: `tac-express.in` (this default) vs `tacexpress.in` (everywhere else). Pick one. | MEDIUM (deliverability + brand inconsistency — DNS records likely only on one of the two) |
| `packages/ui/src/components/composed/finance/invoice-print-view.tsx:117` | `email: "ops@tacexpress.in"` (and `COMPANY_DEFAULTS` block at `:112-117`) | This is the print-view component's fallback — should mirror the env-driven PDF generator (`packages/services/src/pdf/invoice-pdf.tsx`) or be removed. Currently a divergent source of truth for company info. | **HIGH** — two render paths (HTML print view vs PDF) read from different sources; legal tax doc consistency at risk. |
| `apps/dashboard/next.config.mjs:56`, `apps/web/next.config.mjs:4` | `"192.168.1.246"` in `allowedDevOrigins` | Dev-only; LOW but a personal LAN IP is committed to the repo. | LOW (info-leak NOTE) |
| `apps/dashboard/instrumentation-client.ts:42` | `tracePropagationTargets: ["localhost", /^\/(?!\/)/]` | Production same-origin regex is correct, but `"localhost"` in prod is dead weight — won't matter functionally. | NOTE |

### 1.4 Over-configuration (env vars that should probably be hardcoded constants)

| Var | Why over-configured |
|---|---|
| `WPBOX_LEAD_TEMPLATE_NAME`, `WPBOX_LEAD_TEMPLATE_LANGUAGE` (`packages/services/src/server.ts:100-102`) | Defaults `"lead_notification"` / `"en"`. The template name is **provisioned in WPBox out-of-band** — if the operator changes either side without coordinating, sends fail. A constant + code change is safer than a silent env drift. (Owner judgment call — keep if multi-tenancy is in scope.) |
| `NOTIFICATION_FROM_EMAIL` (`supabase/functions/send-notification/index.ts:19`) | The `from` address is bound to the verified domain in Resend. Changing it via env without updating Resend domain auth bricks email delivery silently. Better as a constant tied to the deployment. |
| `NEXT_PUBLIC_WEB_URL` | Defined in three `.env.example` files, read in zero. Either delete it or wire it to something. |
| `NEXT_PUBLIC_SENTRY_ENV`, `NEXT_PUBLIC_SENTRY_RELEASE`, `SENTRY_ALERT_NOTIFICATION_ACTION` | Declared in `turbo.json` for cache invalidation but never read in app code. Dead. |
| `ANTHROPIC_API_KEY` | In `.env.example` only; no code path consumes it. Dead. |
| `WPBOX_BASE_URL` (when only one provider) | If you'll never migrate off `chat.leminai.com`, env-bound only to enable tests is overkill — already has a default in code. NOTE only. |

### 1.5 Section 1 severity summary

| Severity | Count | Items |
|---|---:|---|
| **CRITICAL** | **17** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_DASHBOARD_URL` (ngrok in dashboard, missing in web), `WPBOX_API_TOKEN` (missing in web), `WPBOX_USER_ID` (missing in web), `COMPANY_LEGAL_NAME/ADDRESS/TEL/EMAIL/WEB/GSTIN/PAN/CIN`, `BANK_NAME/ACCOUNT/IFSC/SWIFT/UPI` — **the entire COMPANY_*/BANK_* set is missing from `apps/dashboard/.env.local` and any PDF render will throw `assertCompanyConfig()`** |
| **HIGH** | **9** | `INVOICE_PDF_SIGNING_SECRET` (verify on Vercel — present locally), `WHATSAPP_ENABLED` (verify drift), `WPBOX_LEAD_NOTIFICATION_PHONE` (missing → silent lead-notification failure), `UPSTASH_REDIS_REST_URL`/`TOKEN` (missing → rate limits off in prod), `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, dashboard `.env.example` missing `SUPABASE_SERVICE_ROLE_KEY` + `UPSTASH_*` (silent dep), `invoice-print-view.tsx` hardcoded company defaults divergent from env-driven PDF |
| **MEDIUM** | **10** | `WPBOX_LEAD_TEMPLATE_NAME/LANGUAGE`, `NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE`, `NEXT_PUBLIC_SITE_URL`, `SENTRY_AUTH_TOKEN`/`SENTRY_RELEASE`, Edge `RESEND_API_KEY`/`TWILIO_*`/`FCM_SERVER_KEY` placement risk, **`tac-express.in` vs `tacexpress.in` domain split** in `NOTIFICATION_FROM_EMAIL` default vs everywhere else, contact/marketing-email inconsistency (`@tacexpress.com` vs `@tacexpress.in`) |
| **LOW** | **8** | `WPBOX_BASE_URL`, `LOG_LEVEL`, `SENTRY_ENV`, `TWILIO_FROM_NUMBER`, dev-only `192.168.1.246` in `next.config.mjs`, marketing copy domain inconsistencies, etc. |
| **NOTE** | **12** | `NEXT_PUBLIC_WEB_URL` (dead), `NEXT_PUBLIC_SENTRY_ENV` (dead), `NEXT_PUBLIC_SENTRY_RELEASE` (dead), `SENTRY_ALERT_NOTIFICATION_ACTION` (dead), `ANTHROPIC_API_KEY` (dead), `NODE_ENV`/`NEXT_RUNTIME` (runtime-injected), `NEXT_PUBLIC_DESIGN` (mentioned in `docs/ROLLBACK-PLAYBOOK.md:207` but no code reads it — verify against current rollback intent), E2E + script vars (CI-only), Edge `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (auto-injected by Supabase) |

**Owner's three flagged gaps — confirmation:**
1. `NEXT_PUBLIC_DASHBOARD_URL` — **CONFIRMED.** Currently `https://pupil-rhyme-hence.ngrok-free.dev` in `apps/dashboard/.env.local:27`; **missing entirely from `apps/web/.env.local`** (the more dangerous gap — web is the customer-visible app).
2. `WPBOX_API_TOKEN` empty — **PARTIALLY CONFIRMED.** Set in `apps/dashboard/.env.local:15` (looks live), but **missing entirely from `apps/web/.env.local`** — and `/api/contact` lead notification runs out of the **web app** via `packages/services/src/server.ts`, so leads will silently fail to notify.
3. `INVOICE_PDF_SIGNING_SECRET` empty — **NOT CONFIRMED LOCALLY.** Set in `apps/dashboard/.env.local:23` with a 64-hex value that passes the `/^[0-9a-f]{64}$/i` validation. The owner's concern is likely about the **Vercel production env**, which this audit cannot read — verify on Vercel directly.

**Biggest hidden launch blocker not on the owner's list:** the entire `COMPANY_*` / `BANK_*` set (12 vars) is **missing from `apps/dashboard/.env.local`**, and `packages/services/src/pdf/invoice-pdf.tsx:assertCompanyConfig()` throws hard on any of them. The first WhatsApp invoice send, manual PDF render, or `/api/public/invoice-pdf` hit in production will 500. This is the single largest CRITICAL cluster.

---

## Section 2 — External Integrations & Deployment Surface

### 2.1 Discovered integrations

WPBox (WhatsApp via `chat.leminai.com`); Supabase (auth + Postgres + Storage + Edge Functions); Sentry (errors + replay, dashboard only); Upstash Redis (rate-limiting); Resend (email — edge function only); Twilio (SMS — edge function only); Firebase Cloud Messaging (push — edge function only); India Post pincode API (`api.postalpincode.in` — landing/address form); Vercel (implicit deploy host; no `vercel.json`); GitHub Actions (Supabase migration deploy); generic outbound webhooks (HMAC-signed dispatch from `dispatch-webhook`).

### 2.2 Per-integration analysis

#### 2.2.1 WPBox (WhatsApp via chat.leminai.com)

- **Config points** — `WPBOX_API_TOKEN`, `WPBOX_USER_ID`, optional `WPBOX_BASE_URL` (defaults `https://chat.leminai.com`), kill-switch `WHATSAPP_ENABLED` (route 503s unless literal `"true"`), `WPBOX_LEAD_NOTIFICATION_PHONE`, `WPBOX_LEAD_TEMPLATE_NAME` (default `lead_notification`), `WPBOX_LEAD_TEMPLATE_LANGUAGE` (default `en`), `NEXT_PUBLIC_WHATSAPP_INVOICE_TEMPLATE` (optional, default `tac_express_corridor_invoice`). Code: `packages/services/src/whatsapp.service.ts:489-505`, `apps/dashboard/.env.example:6-21,63`, `packages/services/src/server.ts:94-100`.
- **User-facing flows**:
  - Operator → customer invoice messages (direct + template modes, optional signed PDF as HEADER document) — `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:1-573`.
  - Operator manual retry of a failed send — `apps/dashboard/app/api/whatsapp/retry-send/route.ts:1-358`.
  - Lead-capture notification (template send to a configured ops number when a visitor submits `/api/contact`) — `packages/services/src/contact-lead.service.ts:112-207`.
  - WPBox template diagnostics — `apps/dashboard/app/api/whatsapp/test/route.ts:1-80`.
- **Failure mode** — Soft-fail by design. (a) Send-invoice surfaces 502 with full error envelope on transport, app-error, or WAMID-null silent-rejection. (b) Lead-notification failure is swallowed — lead row is captured regardless (`contact-lead.service.ts:152-207`); customer sees "Thanks". (c) Wrapper has a JSON→form-urlencoded auto-fallback (`whatsapp.service.ts:177-226`) but a semantic-failure short-circuit so WhatsApp's silent rejections do not duplicate API calls. (d) Kill-switch `WHATSAPP_ENABLED !== "true"` returns 503 to operators (`send-invoice/route.ts:141-149`, `retry-send/route.ts:62-71`). (e) The `whatsapp_sends` tracker is non-blocking — if the INSERT fails the send still goes (`whatsapp-tracked.service.ts:13-30`).
- **Verification status** — UNKNOWN (no test or runbook documenting end-to-end verification against the real WPBox tenant). There are extensive unit tests with `globalThis.fetch` mocks (`packages/services/src/__tests__/whatsapp.service.test.ts`, `whatsapp-tracked.service.test.ts`) but no smoke-script, no Playwright e2e, no runbook entry confirming `tac_express_corridor_invoice` is approved in the live LeminAi account. Decision doc notes the template must be Meta-approved before live notifications fire (`contact-lead.service.ts:37-40`).
- **Retry / fallback** — Per-request retry: transport-format JSON→form fallback inside `postSmart` only (`whatsapp.service.ts:177-226`). NO exponential backoff, NO circuit breaker, NO automatic background retry. Operator-driven manual retry exists with append-only new-row semantics + cross-operator concurrency guard (`whatsapp-tracked.service.ts:573-723`) and per-`originalSendId` Upstash 1-minute lock (`retry-send/route.ts:155-184`). 15-second timeout via `AbortSignal.timeout(15_000)` per attempt (`whatsapp.service.ts:272,377`).
- **Severity** — **CRITICAL**. Single external dependency for the entire customer-communications surface (invoice send, lead notification). Unverified live, soft-fail posture means a misconfigured template silently drops the lead-notification path.

#### 2.2.2 Supabase (DB + Auth + Storage + Edge Functions)

- **Config points** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (apps/web, edge functions), `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` + `SUPABASE_PROJECT_REF` (GH Actions). Code: `.env.example:7-12`, `packages/database/package.json:11-15`, `.github/workflows/migration-deploy.yml:25-37`. Storage buckets `invoices`, `manifests`, `shipping-labels` (`supabase/functions/generate-pdf/index.ts:13-17`).
- **User-facing flows** — Sign-in (cookie-bound SSR), all dashboard reads/writes, RLS-guarded customer/invoice/shipment tables, public AWB tracking (`/api/track/[awb]` uses anon-key REST), edge functions for PDF generation, webhook dispatch, scheduled SLA breach detection, notification fan-out. All apps use `@supabase/ssr` + `@supabase/supabase-js`.
- **Failure mode** — Tracking page renders an empty state on network failure (`packages/services/src/public-tracking.service.ts:17-44` returns null on any fetch reject). Dashboard proxy catches `AuthApiError` and falls through to `/sign-in` (`apps/dashboard/proxy.ts:84-99`). Contact form 500s if `contact_leads` table is missing (the migration-deploy workflow is **opt-in** and dormant — see § 2.2.10). Edge functions return 500 + JSON error on any thrown.
- **Verification status** — UNKNOWN. Migration-fresh-apply CI gate proves migrations compile against empty Postgres (referenced in `migration-deploy.yml:11-13`) but no documented end-to-end verification that production Supabase storage buckets exist, edge functions are deployed, or RLS policies are live. `docs/runbooks/DATABASE-RESTORE.md` exists for restore PITR but is not an integration verification.
- **Retry / fallback** — None at the Supabase-client layer (every service call is a single `await`). Public tracking specifically swallows errors and renders "not found" instead of throwing.
- **Severity** — **CRITICAL**. Single point of failure for auth, data, storage, and edge compute. Outage = full app outage.

#### 2.2.3 Sentry (`@sentry/nextjs` 10.53.1, dashboard only)

- **Config points** — `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`. Code: `apps/dashboard/sentry.server.config.ts:25-30`, `apps/dashboard/instrumentation-client.ts:19-63`, `apps/dashboard/instrumentation.ts`. **Not installed in apps/web** (the customer-facing landing has no Sentry).
- **User-facing flows** — Operator error reporting, RBAC-denial tagging, WhatsApp-send-tracker write-failure tagging, Session Replay on errors with default privacy masking.
- **Failure mode** — Sentry fails closed via init no-op when DSN unset (`sentry.server.config.ts:26`). `tracePropagationTargets` is scoped to same-origin + localhost so Supabase/Upstash never get sentry-trace headers (avoids CORS preflight breakage). No customer-visible impact if Sentry is down.
- **Verification status** — UNKNOWN. Test diagnostic route exists at `apps/dashboard/app/api/diagnostics/sentry/route.ts` but no runbook confirms it was fired in production. `docs/runbooks/sb-2-sentry-alert-setup.md` and `sentry-alert-rules.md` document manual alert setup but not end-to-end event capture.
- **Retry / fallback** — Sentry SDK has built-in retry on the envelope POST; tunneled via Next.js `tunnelRoute` (`/monitoring` is whitelisted in `apps/dashboard/proxy.ts:36-37`).
- **Severity** — **MEDIUM**. Observability outage is internal-only; customer-facing landing has no Sentry so issues there are silent.

#### 2.2.4 Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`)

- **Config points** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Code: `apps/web/lib/rate-limit.ts:15-18`, `apps/dashboard/lib/rate-limit.ts` (mirrored), `apps/web/.env.example:24-26`.
- **User-facing flows** — Rate-limiting of `/api/contact` (5/10min), `/api/track/[awb]` (30/min), `/sign-in` (10/min), `/api/whatsapp/*` (per-user + per-`originalSendId`), proxy-level public/auth gates.
- **Failure mode** — **Fail-open**. When env vars are missing OR Redis is unreachable, every request is allowed (`rate-limit.ts:18,77-88`). The proxy's rate-limit calls do not catch network errors from Upstash — a Redis outage would not block requests but could throw if the SDK rejects, depending on how `Ratelimit.limit()` handles network errors (uncaught in proxy).
- **Verification status** — UNKNOWN. No e2e test verifying real Upstash binding. No runbook entry.
- **Retry / fallback** — Built-in to `@upstash/ratelimit` SDK; explicit `analytics: true` enabled on all four limiters.
- **Severity** — **HIGH**. A misconfigured deploy (missing env vars) silently disables all rate limiting — including `/sign-in` credential stuffing protection and `/api/contact` spam.

#### 2.2.5 Resend (email, edge function only)

- **Config points** — `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` (default `no-reply@tac-express.in` — note hyphenated domain inconsistent with the landing's `tacexpress.in`). Code: `supabase/functions/send-notification/index.ts:14-19,34-62`.
- **User-facing flows** — Edge-function-only notification dispatch. Inline HTML template hand-rolled in the function (`send-notification/index.ts:39-48`). No code path in `apps/` or `packages/` calls this edge function — discoverable only via `supabase.functions.invoke('send-notification')` if invoked from a trigger, RPC, or scheduled job. No such caller found in this audit.
- **Failure mode** — On missing API key the function `console.warn`s and SKIPS the email (`index.ts:35-38`). On non-OK Resend response, throws → captured into the per-channel `errors[]` array (`index.ts:156-158`). DB `notifications` row is still inserted regardless.
- **Verification status** — UNKNOWN. No test, no runbook, no documented caller invocation pattern.
- **Retry / fallback** — None. Single fetch, no retry, no DLQ.
- **Severity** — **MEDIUM**. The integration is wired but currently has NO caller — the FROM domain (`tac-express.in`) does not match the landing site (`tacexpress.in`), and the inline HTML template includes hardcoded colors. If activated for production, the domain mismatch will degrade deliverability (SPF/DKIM not pointed at the right zone).

#### 2.2.6 Twilio (SMS, edge function only)

- **Config points** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Code: `supabase/functions/send-notification/index.ts:15-17,64-87`.
- **User-facing flows** — Same as Resend: edge-function-only, no caller found in this audit.
- **Failure mode** — Skip on missing credentials with `console.warn` (`index.ts:65-68`). Throw on non-OK Twilio response → into `errors[]` array.
- **Verification status** — UNKNOWN. No test, no runbook, no caller.
- **Retry / fallback** — None.
- **Severity** — **MEDIUM**. Same dormant-integration risk as Resend; no caller in the codebase.

#### 2.2.7 Firebase Cloud Messaging (push, edge function only)

- **Config points** — `FCM_SERVER_KEY` only. Code: `supabase/functions/send-notification/index.ts:18,89-111`. Uses the legacy `fcm.googleapis.com/fcm/send` endpoint (deprecated by Google — FCM HTTP v1 API is now required for new tokens).
- **User-facing flows** — Same edge-function-only path; no caller found.
- **Failure mode** — Skip on missing key, throw on non-OK response.
- **Verification status** — UNKNOWN.
- **Retry / fallback** — None.
- **Severity** — **HIGH**. The legacy FCM HTTP API (`/fcm/send`) is **deprecated** and rejected for new Firebase projects. Activating this path will fail immediately against any project created after mid-2024.

#### 2.2.8 India Post pincode API

- **Config points** — None (hardcoded `https://api.postalpincode.in/pincode/<pincode>`, no auth). Code: `packages/ui/src/components/composed/smart-address-fields.tsx:401-430`.
- **User-facing flows** — Address-form pincode autofill in quote / booking flows (city + state lookup).
- **Failure mode** — `force-cache` fetch; on non-OK or `Status !== "Success"` returns `null`, user keeps typing manually.
- **Verification status** — UNKNOWN.
- **Retry / fallback** — Browser HTTP cache, no programmatic retry.
- **Severity** — **LOW**. Graceful degradation built in.

#### 2.2.9 Outbound webhooks (HMAC-signed dispatch)

- **Config points** — Per-row `webhooks.url` + `webhooks.secret` in DB; no global env var. Code: `supabase/functions/dispatch-webhook/index.ts:42-99`.
- **User-facing flows** — Customer/partner subscribes to event types via the `webhooks` table; an event fires NOTIFY → this edge function POSTs the payload with `x-tac-signature: <sha256-hmac>` header.
- **Failure mode** — Each delivery attempt's result is recorded in `webhook_deliveries`; failures increment `failure_count` via RPC `increment_webhook_failure`. No retry loop; one attempt per event.
- **Verification status** — UNKNOWN.
- **Retry / fallback** — None — single attempt per event, failures are logged but not retried.
- **Severity** — **MEDIUM**. If launch ships any partner using webhooks, missed deliveries will not auto-retry; partners must scan `webhook_deliveries` themselves. **Note also that the `webhooks` and `webhook_deliveries` tables do not exist in production** (see § 3.3) — the function will 500 the first time it is invoked.

#### 2.2.10 Vercel + GitHub Actions (deployment surface)

- **Config points** — No `vercel.json` in repo. Vercel project assumed via `NEXT_PUBLIC_DASHBOARD_URL`, `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_SITE_URL` env wiring. Migration-deploy workflow at `.github/workflows/migration-deploy.yml:70-166` is **opt-in** behind the `vars.MIGRATION_DEPLOY_ENABLED` variable and **defaults to disabled** (`migration-deploy.yml:104-115`).
- **User-facing flows** — All. The dormant migration-deploy workflow means production-DB migrations require manual `supabase db push` (`migration-deploy.yml:38-58`).
- **Failure mode** — Forgotten manual push leaves prod schema behind code. The workflow header explicitly notes that 4 migrations between 2026-05-16 and 2026-05-18 were merged-but-not-deployed (`migration-deploy.yml:14-21`), including `contact_leads` which would cause `/api/contact` to 500 in production.
- **Verification status** — UNKNOWN whether `MIGRATION_DEPLOY_ENABLED` has been flipped on for the current production env. The workflow file ships dormant.
- **Retry / fallback** — Workflow has `concurrency` cancel-in-progress + post-deploy verify step that fails loudly if pending migrations remain.
- **Severity** — **CRITICAL** until the opt-in gate is flipped on AND the 4 already-merged-not-deployed migrations are backfilled.

### 2.3 Customer-facing URL audit

| Surface | Source file | URL construction | Currently points to | Should point to | Severity |
|---|---|---|---|---|---|
| Landing OG image / canonical URL | `apps/web/app/(marketing)/layout.tsx:25-55` | `metadataBase: new URL(siteUrl)`; OG image path `/images/tac-truck-hero.webp` resolved relative to `metadataBase` | `NEXT_PUBLIC_SITE_URL` env or fallback `https://tacexpress.in` (`apps/web/lib/site-url.ts:20-27`) | Production landing origin | LOW (validated + sanitized) |
| Sitemap | `apps/web/app/sitemap.ts:1-28` | `${siteUrl}${path}` for `/`, `/about`, `/pricing`, `/contact`, `/quote`, `/legal/*` | Same as above | Production landing origin | LOW |
| robots.txt | `apps/web/app/robots.ts:1-24` | `${siteUrl}/sitemap.xml` and `host: siteUrl` | Same | Production landing origin | LOW |
| WhatsApp invoice template HEADER (PDF link) | `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:414-447` + `packages/services/src/pdf/invoice-pdf-token.ts:89-103` | `${resolvePublicOrigin(req)}/api/public/invoice-pdf?p=<b64>&s=<hmac>` | `NEXT_PUBLIC_DASHBOARD_URL` env (preferred) or `x-forwarded-host` header; SSRF-validated via `isPubliclyReachableHttpUrl` (`apps/dashboard/lib/public-origin.ts:41-95`) | Production dashboard origin reachable by WhatsApp servers | HIGH if `NEXT_PUBLIC_DASHBOARD_URL` is missing in prod — falls back to request host; if behind a private LB hostname the PDF URL becomes un-fetchable by WhatsApp |
| Tracking URL embedded in invoice PDF QR | `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:421-423` | `${origin}/track/${awbNumber}` or `${origin}/track` | Resolved dashboard origin (`resolvePublicOrigin`) | The customer-facing tracking surface — likely the LANDING (`apps/web`) origin, NOT the dashboard | **HIGH** — QR currently points at the dashboard `/track` route (which exists at `apps/dashboard/app/track`), while the public marketing surface is the landing `apps/web/app/(public)/track/[awb]`. If customers scan the QR they land on a hostname that may require auth or be on a non-marketed subdomain |
| Public tracking page (landing) | `apps/web/app/(public)/track/[awb]/page.tsx:11-17,26-55` | Server component calls `createPublicTrackingService` against `NEXT_PUBLIC_SUPABASE_URL` directly | Supabase REST `/rest/v1/shipments` and `/rest/v1/tracking_events` via anon key (`packages/services/src/public-tracking.service.ts:18-44`) | Production Supabase URL | MEDIUM — relies on anon-key + RLS being correctly scoped to allow public reads of shipments + tracking_events |
| Public tracking API (landing) | `apps/web/app/api/track/[awb]/route.ts:106-109` | Same anon-key REST as above | Same | Same | MEDIUM (same as above) |
| Lead-notification WhatsApp template | `packages/services/src/contact-lead.service.ts:170-187` | Template `lead_notification` with positional params: reason, name, email, 200-char message excerpt; recipient phone from `WPBOX_LEAD_NOTIFICATION_PHONE` | The configured ops notification phone | Same | MEDIUM — template name + recipient must be configured and Meta-approved or every lead notification silently fails (lead row still captured) |
| Invoice direct WhatsApp message | `packages/services/src/whatsapp/invoice-replay-payload.ts:75-103` | Free-form text via `sendmessage`; subject to WhatsApp 24h customer-service window | Customer phone resolved through allow-list (customer.phone, notes.consignor.phone, notes.consignee.phone) | Same | MEDIUM — 24h window means most cold sends silently fail without WAMID |
| Invoice template WhatsApp message | `packages/services/src/whatsapp/invoice-replay-payload.ts:139-190` | Template `tac_express_corridor_invoice` with optional document HEADER | Customer phone | Same | HIGH — depends on the Meta-approved template existing in the live LeminAi account; UNKNOWN verification |
| Edge-function email template | `supabase/functions/send-notification/index.ts:39-48` | Inline HTML; FROM `no-reply@tac-express.in` | `NOTIFICATION_FROM_EMAIL` env or fallback `no-reply@tac-express.in` | Should match landing zone `tacexpress.in` (no hyphen) for SPF/DKIM alignment | **HIGH** — domain mismatch between landing (`tacexpress.in`) and email sender (`tac-express.in`) |
| Edge-function PDF storage URLs | `supabase/functions/generate-pdf/index.ts:347-371` | Path `<entity_type>/<entity_id>.pdf` in buckets `invoices`/`manifests`/`shipping-labels`; no signed URL minted here — only stored | Supabase Storage bucket | Same | MEDIUM — buckets are referenced but no audit confirms they exist in prod or that ACLs are correct |
| Dashboard cross-app link from landing | `packages/ui/src/components/composed/public-nav.tsx:19` | `process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001"` | env or **localhost** | Production dashboard origin | **CRITICAL** if `NEXT_PUBLIC_DASHBOARD_URL` is not set on the apps/web Vercel project — landing nav "Sign in" CTA points at `http://localhost:3001` |
| Apps/web `/dashboard` redirect | `apps/web/app/dashboard/page.tsx:4` | `redirect(process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001")` | env or **localhost** | Production dashboard origin | **CRITICAL** (same root cause) |
| Inbound webhook delivery (outbound from us) | `supabase/functions/dispatch-webhook/index.ts:54-99` | Each subscriber URL from `webhooks.url`; POST with `x-tac-signature` HMAC | Per-row | Per-row | LOW (subscriber-controlled) |
| Webhook callback URL (inbound from WPBox) | Not found | No WPBox webhook handler discovered in the codebase | N/A | A WPBox webhook handler would receive delivery-status callbacks; not implemented | **HIGH** if WPBox is configured to call us back — no handler means we lose delivery-status telemetry from the upstream |

### 2.4 Section 2 severity summary

- **CRITICAL (4)** — WPBox WhatsApp (unverified end-to-end, sole customer-comms channel); Supabase (single point of failure, no e2e verification); Vercel/GitHub-Actions migration-deploy workflow (dormant, 4 migrations historically missed); cross-app dashboard URL fallbacks to `localhost:3001` if env not set on Vercel.
- **HIGH (5)** — Upstash fail-open hides misconfiguration; FCM legacy endpoint is deprecated and will reject; QR tracking URL embedded in invoice PDFs likely points at the wrong app (dashboard vs landing); WPBox-signed-PDF URL fallback to `x-forwarded-host` may produce non-public URLs; missing WPBox inbound webhook handler.
- **MEDIUM (6)** — Sentry only on dashboard (landing errors are silent); Resend integration dormant + FROM-domain mismatch (`tac-express.in` vs `tacexpress.in`); Twilio integration dormant with no caller; outbound webhooks have no retry; public tracking RLS-dependence; lead-notification template approval unknown.
- **LOW (3)** — India Post pincode (graceful degrade); sitemap/robots/OG metadata (validated); subscriber-controlled webhook URLs.

The repeating systemic gap across every integration is **"verification status: UNKNOWN"** — there is no e2e runbook, smoke script, or Playwright suite that fires against a real upstream. Unit tests with `globalThis.fetch` mocks are extensive but prove nothing about prod credentials, deployed edge functions, approved WhatsApp templates, or correctly-configured Vercel env vars.

---

## Section 3 — Security & Authorization

> **Sources used:** Supabase MCP live introspection of project `skkappqeaxsdygwrbqni` (RLS via `pg_policies`, advisor lints, table grants, storage policies, function definitions) + read-only static review of `C:\tac\tw-prodaudit` at production HEAD. Where live and migration-file shapes diverge, the **live** shape is reported.

### 3.1 RBAC model summary

The role model is defined once in `packages/types/src/domain.types.ts:82-94` as a TS enum `UserRole` with 11 values: `SUPER_ADMIN, ADMIN, MANAGER, WAREHOUSE_IMPHAL, WAREHOUSE_DELHI, OPS, INVOICE, SUPPORT, WAREHOUSE_STAFF, OPS_STAFF, FINANCE_STAFF`. The same file declares:

- `ROLE_HIERARCHY` (line 297) — numeric ranks used by `hasMinimumRole`. Note `MANAGER=90`, `OPS=80`, `INVOICE=70`, but `FINANCE_STAFF=30` and `SUPPORT=20`. That puts FINANCE_STAFF BELOW warehouse roles in the hierarchy despite RLS treating FINANCE_STAFF as a finance-write role (asymmetry — see § 3.7).
- `ROLE_PERMISSIONS` (line 197) — per-role module + capability map (canViewFinance, canEditManifests, canManageUsers, canViewAuditLogs, canResolveExceptions, plus a hubRestriction for warehouse roles).
- `hasPermission` / `canAccessModule` — helpers used at the UI layer.

Role helpers live in `packages/auth/src/rbac.ts`: `hasMinimumRole`, `isWarehouseRole`, `isSuperAdmin`, `isAdminOrAbove`, `isManagerOrAbove`, plus per-role `getIdleMinutesForRole` (warehouse roles get 15 min idle, admins 60 — sound).

Source of truth at runtime: **`public.profiles.role`** (text column with a CHECK constraint enumerating the 11 values above). The DB function `public.get_user_role()` (SECURITY DEFINER, `SET search_path=public`) returns it; every RLS policy that branches on role calls `get_user_role()`. Code-side, every server check reads `profiles.role` via `adminService.getProfileById(user.id)` — never `user_metadata` (a previous bug; deliberately documented in `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:158-169`).

RBAC denial instrumentation: `packages/auth/src/rbac-instrumentation.ts` exposes `captureRbacDenial({requiredRole, actualRole, surface})` which throws a discriminated `RbacDeniedError` (`.code === "RBAC_DENIED"`) and emits a Sentry exception with stable tags (`rbac.denial`, `rbac.required_role`, `rbac.actual_role`, `rbac.surface`). All values are deterministic strings — no PII.

Session lifecycle: cookie-bound via `@supabase/ssr` in `packages/database/src/middleware.ts`. The Next 16 proxy `apps/dashboard/proxy.ts:69-112` handles refresh + the "no user on protected route → redirect to /sign-in" gate, with a try/catch that treats any auth-layer throw as `user=null` (good — prevents stale-cookie crashes).

### 3.2 API route authz coverage

| Route | Method | App | Authz check | Notes |
|---|---|---|---|---|
| `/api/health` | GET | dashboard | **None (public)** | Whitelisted in `proxy.ts:24-37`. Returns `{ok, ts}`. No info leak. (`route.ts:20-30`) |
| `/api/public/invoice-pdf` | GET | dashboard | **HMAC signature** (`verifyInvoicePdfToken`) | Signed self-contained payload, 30-day TTL, timing-safe compare, requires 64-hex `INVOICE_PDF_SIGNING_SECRET`. (`route.ts:93-103`) Sound design — no DB touch, no service-role key. **Public proxy rate limit applies** (`/api/public` is in `RATE_LIMITED_PUBLIC`). |
| `/api/diagnostics/sentry` | GET, POST | dashboard | `requireManager()` → `getUser()` → `getProfileById` → `isManagerOrAbove(role)` + `captureRbacDenial` + per-user `checkAuth` rate-limit | Solid. (`route.ts:31-97`) |
| `/api/whatsapp/send-invoice` | POST | dashboard | Kill-switch → `getUser()` → `getProfileById` → `isManagerOrAbove(role)` → `checkWhatsApp` per-user → zod body → IDOR-aware phone allow-list + ADMIN-gated override | Layered. (`route.ts:133-187`) Trust-boundary note documented inline — invoice `notes` JSON is operator-written, so a MANAGER who authored an invoice can pre-load the allow-list. Accepted risk. |
| `/api/whatsapp/retry-send` | POST | dashboard | Kill-switch → `getUser()` → `getProfileById` (errors → 500, not silent 403) → `isManagerOrAbove` + `captureRbacDenial` → per-user + per-`originalSendId` rate-limit | Best-in-class. (`route.ts:61-184`) |
| `/api/whatsapp/test` | GET | dashboard | Same MANAGER+ pattern; `checkWhatsApp` per-user | Good. (`route.ts:45-87`) |
| `/api/contact` | POST | web | **Public** (no auth) — `checkContactForm` IP rate-limit (5 / 10min) + zod schema + honeypot + service-role insert | Solid layered defense. (`route.ts:69-148`) IP comes from `x-forwarded-for`, falls back to `"anonymous"` — single attacker bypassing XFF would hit the shared `"anonymous"` bucket (still rate-limited, not bypassed). |
| `/api/track/[awb]` | GET | web | **Public** (no auth) — `checkTrackLookup` IP rate-limit (30/min) + zod AWB regex + anon-key Supabase | Sound. (`route.ts:62-132`) Reads `shipments` + `tracking_events` which have permissive `qual=true` SELECT policies (intentional, see § 3.3). |

No API route was found that lacks both authn and authz where authn should be required. The dashboard `proxy.ts` matcher gates everything outside `PUBLIC_PATHS = ["/sign-in", "/sign-up", "/track", "/api/public", "/api/health", "/api/webhooks", "/print", "/monitoring"]` with a `/sign-in` redirect — but **`/api/webhooks` is whitelisted in the proxy yet no `app/api/webhooks/*` route file exists**. Dead whitelist entry (low severity, but a future contributor adding webhooks under that path inherits public access).

The `/print/*` routes (label, invoice, manifest, invoice-label) bypass the proxy entirely and rely solely on the cookie-bound Supabase session inside the page component — verify in audit § 2 (UX) that those page components actually call `getUser()` before fetching data.

### 3.3 RLS policy audit

All 15 public tables have `relrowsecurity=true` (none with `relforcerowsecurity=true` — owners + service_role bypass, which is expected). Live `pg_policies` snapshot:

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|---|---|---|---|---|---|
| `audit_logs` | MANAGER+ (`get_user_role() ∈ {SUPER_ADMIN, ADMIN, MANAGER}`) | `auth.uid() IS NOT NULL` (any logged-in user) | **none** | **none** | UPDATE/DELETE intentionally absent — preserves audit immutability under RLS. App-side sentinel test `audit-logs-no-update-delete.test.ts` enforces the same on service_role traffic. **Finding:** INSERT is open to any authenticated user — a junior OPS_STAFF can fabricate an audit row claiming a senior action. Severity: **Medium** (forgery surface; mitigated only by `description`+`metadata` being free-text). Recommend `with_check` requiring `user_id = auth.uid()` or restricting to service role. |
| `contact_leads` | MANAGER+ | **none** | MANAGER+ | **none** | INSERT only via `createServiceRoleClient()` from `/api/contact`. Correct by design. |
| `customers` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | **none** | Any logged-in user can write any customer. Roles like SUPPORT (read-only per ROLE_PERMISSIONS) and WAREHOUSE_STAFF can still write. Severity: **High** (PII writeability + comment trail in `whatsapp-tracked` says "ADMIN/MANAGER write customers" — this mismatches reality). |
| `exceptions` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | **none** | Same as customers — RLS does not enforce the `canResolveExceptions` capability claimed in `ROLE_PERMISSIONS`. Status/severity churn is unrestrained. Severity: **Medium**. |
| `hubs` | `auth.role()='authenticated'` | SUPER_ADMIN only (ALL policy) | SUPER_ADMIN only | SUPER_ADMIN only | Correct. |
| `invoice_payments` | `auth.role()='authenticated'` | finance roles (SUPER_ADMIN, ADMIN, MANAGER, INVOICE, FINANCE_STAFF) — fixed in `20260515000002` | **none** | **none** | RPC-only mutation (`record_invoice_payment`), backed up by service-side sentinel + `withAudit` for `payment_delete`. Sound. |
| `invoices` | finance roles | finance roles | finance roles | **none** | Symmetric finance gate. Sound. |
| `manifest_shipments` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | _no policy_ | `auth.uid() IS NOT NULL` | Any logged-in user can delete a manifest-shipment join row. UPDATE is therefore implicitly DENIED for non-owner roles — but the RPC `add_shipment_to_manifest` is SECURITY DEFINER so it bypasses RLS. Severity: **Low**. |
| `manifests` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | **none** | Any logged-in user can create/update manifests. `ROLE_PERMISSIONS.canEditManifests` (false for warehouse, INVOICE, SUPPORT) is not enforced. Severity: **Medium**. |
| `notes` | authenticated | `auth.role()='authenticated' AND created_by = auth.uid()` | _no policy_ | own row OR SUPER_ADMIN | Solid. |
| `profiles` | own row only | own row only | own row only | **none** | Self-only access. Implication: **`getProfileById(otherUserId)` from `adminService` will return null for non-own profiles when called with a cookie-bound client** — the dashboard's manager-targeted notification fan-out in `contact-lead.service.ts:213-234` (`SELECT id FROM profiles WHERE role IN MANAGER_ROLES AND is_active`) **silently returns zero rows under the public-write path's service-role client (works) but would return nothing if ever called via a cookie client.** Confirm callers always use service-role for cross-user reads. Severity: **Low** (correctness; not a security gap). |
| `rate_cards` | authenticated | MANAGER+ (ALL policy) | MANAGER+ | MANAGER+ | Sound. |
| `shipments` | **`qual=true` (anon + authenticated)** | `auth.uid() IS NOT NULL` | `auth.uid() IS NOT NULL` | ADMIN+ | **DELIBERATELY PUBLIC SELECT** for `/api/track/[awb]` and the public `/track` page. Confirmed by `apps/web/app/api/track/[awb]/route.ts:107-109` using the anon key. Severity: **acceptable** but worth recording — anyone holding any AWB gets full shipment row (sender_name, receiver_name, receiver_phone, addresses, weights). If shipments table carries customer PII beyond AWB metadata, this is a **High** PII exposure. Recommend a narrow `select_public` policy restricting columns OR a service-role-fronted RPC like `get_shipment_public(awb_in)` returning a curated projection. |
| `tracking_events` | **`qual=true` (anon + authenticated)** | `auth.uid() IS NOT NULL` | _no policy_ | _no policy_ | Same posture as shipments. Acceptable for AWB-keyed reads, but anon can paginate the whole table via PostgREST — only the lack of `LIMIT NULL` and rate-limit protect it. Recommend pairing with a public `LIMIT` enforcement at the PostgREST layer or moving to a SECURITY DEFINER RPC. Severity: **Medium**. |
| `whatsapp_sends` | MANAGER+ | finance roles | finance roles | **none** | Sound. |

**Tables RLS expects but DB does not have:** `webhooks`, `webhook_deliveries`, `notifications`, `attachments`, `events`, `api_keys` — all referenced by edge functions (`dispatch-webhook`, `send-notification`, `generate-pdf`) and services (`webhook.service.ts`, `notification.service.ts`, `attachment.service.ts`, `api-key.service.ts`) but **do not exist in production schema** (confirmed via `pg_class`). Severity: **High operational** (every code path that touches them throws or silently no-ops; `send-notification` will 500 on first invocation; the `webhook_deliveries` insert in `dispatch-webhook` will fail). Also a **security implication**: any code branch that intends to write an audit-equivalent (`notifications`, `webhook_deliveries`) silently loses the row, so reconciliation is impossible. Note `contact-lead.service.ts:223` already writes to `notifications` — that insert silently fails on every contact-form submission.

**Storage RLS** (`storage.objects`): six buckets — `avatars` (public, broad SELECT — Supabase advisor `public_bucket_allows_listing` raised), `exception-photos`, `invoices`, `manifests`, `proof-of-delivery`, `shipping-labels` (all private, role-gated SELECT/INSERT). UPDATE/DELETE on storage objects have no policies → implicit deny (correct). The `avatars` bucket listing warning is **Low** severity — it allows enumerating filenames but objects are still individually fetched.

**Supabase advisor findings** (live, `get_advisors type=security`):

- `public_bucket_allows_listing` on `avatars` (WARN, Low).
- 13× `authenticated_security_definer_function_executable` (WARN, Informational) — every business RPC. These are intentional; the migrations `20260515000003`/`000004` deliberately REVOKE from PUBLIC and GRANT to `authenticated`, relying on internal role checks. The advisor cannot read intent.
- `auth_leaked_password_protection` (WARN) — Supabase HIBP integration is **disabled**. Severity: **Medium** — easy toggle, no code change, recommend enabling pre-launch.

**Anon/authenticated base-table grants:** `anon` and `authenticated` hold full DML (INSERT/UPDATE/DELETE/TRUNCATE) on every public table. This is standard Supabase posture (RLS is the gate, not column grants), but the broad `TRUNCATE` grant on `audit_logs` etc. is gratuitous and should be revoked. Severity: **Low**.

### 3.4 Public surface inventory

**Public pages** (apps/web `(public)` group):
`/`, `/about`, `/careers`, `/case-studies`, `/contact`, `/developers`, `/legal/cookies`, `/legal/privacy`, `/legal/terms`, `/pricing`, `/quote`, `/services`, `/services/[slug]`, `/status`, `/track`, `/track/[awb]`, `/sign-in`. The `/track/[awb]` page reads Supabase directly with anon key (`page.tsx:21-22`). The dashboard `/track/*` and `/print/*` are whitelisted by `proxy.ts`; verify their page components require auth where intended.

**Public API endpoints:**

| Endpoint | App | Rate limit | Input validation | What it exposes / accepts |
|---|---|---|---|---|
| `POST /api/contact` | web | IP, 5/10min | zod (name, email, company, reason enum, message; honeypot field) | Inserts to `contact_leads` via service-role; triggers WhatsApp template; fans out in-app notifications (currently silently lost — table missing). |
| `GET /api/track/[awb]` | web | IP, 30/min | zod regex `/^[A-Z0-9-]+$/i`, 3-30 chars | Reads `shipments` + `tracking_events` (publicly SELECTable). Returns full shipment row. |
| `GET /api/health` | dashboard | none (no body) | none | Liveness probe — returns `{ok:true, ts}`. |
| `GET /api/public/invoice-pdf` | dashboard | publicApi proxy, 60/min/IP | query params `p`+`s`; HMAC verification | Renders invoice PDF from signed payload (no DB read). |

**Public Supabase Edge Functions** (`supabase/functions/`):

All four functions use service-role and the `Deno.serve` default — **none enforce a JWT verification or signing-secret check**. By default Supabase edge functions require an anon-key Authorization header from the gateway, but they do **not** authenticate the caller as a specific user. Findings:

- `dispatch-webhook/index.ts` — accepts any POST body shaped like `DispatchPayload`, then signs+POSTs to URLs from the `webhooks` table (table doesn't exist → 500). **If the table is ever created, this function will dispatch on behalf of anyone who can reach the edge URL with an anon key. There is no caller authentication.** Severity (once `webhooks` table exists): **Critical** — attacker triggers arbitrary signed callbacks. Recommend `verify_jwt = true` in `supabase/config.toml` or an HMAC on the inbound payload.
- `generate-pdf/index.ts` — accepts `{entity_type, entity_id}` from any caller, fetches the entity with service-role (RLS bypassed), writes a PDF to private storage. **An anon-key caller can enumerate invoice IDs and read the PDFs from storage indirectly** (storage is private, but the function writes them; if the caller knows the storage path, they still need bucket policy access — currently role-gated, so the leak is contained to the file write itself). Still — no authn. Severity: **High** (PDF-write surface from anonymous traffic; storage I/O cost; potential for arbitrary writes if `entity_type` validation is loosened).
- `scheduled-sla-monitor/index.ts` — cron-only intent, but **no caller verification**. Anyone with the function URL can force-trigger SLA checks. Severity: **Medium** (cost + side-effects on `exceptions` table).
- `send-notification/index.ts` — accepts `{user_id?, channel, title, body, to_email?, to_phone?, fcm_token?}` and forwards to **Resend, Twilio, FCM** with our credentials. **No authn, no rate limit, no signature.** An attacker who reaches the function URL with the anon key (which they can extract from the browser bundle since it's `NEXT_PUBLIC_`) can use us as a free SMS/email/push relay to arbitrary `to_email`/`to_phone`. Severity: **Critical**. This endpoint must require either `verify_jwt = true` or a signing-secret check; right now the only barrier is the anon key, which is by design public.

**`/api/webhooks` is whitelisted in `apps/dashboard/proxy.ts:30` but no route file exists.** Dead whitelist; harmless today, latent footgun.

### 3.5 Secrets handling findings

- **No hardcoded credentials found.** Grep for `Bearer eyJ`, `sk_live_`, `pk_live_`, `sk_test_`, `Bearer [20+ chars]`, JWT-shaped tokens turned up only `.env.example` placeholder `"eyJ..."` strings and lockfile integrity hashes.
- **`NEXT_PUBLIC_*` prefix audit:** Every `NEXT_PUBLIC_*` env is intended for client exposure — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN`, `WEB_URL`, `DASHBOARD_URL`, `SITE_URL`, `WHATSAPP_INVOICE_TEMPLATE`. No accidental `NEXT_PUBLIC_SERVICE_ROLE`/`NEXT_PUBLIC_SECRET` leaks. `.env.example` files at `apps/web`, `apps/dashboard`, and root carry comments warning that WPBox tokens / Twilio / Resend / `SUPABASE_SERVICE_ROLE_KEY` must NEVER be `NEXT_PUBLIC_`.
- **Service-role usage** is confined to:
  - `packages/database/src/client.ts:61-72` — `createServiceRoleClient()` factory, documented as server-only.
  - `supabase/functions/*` — all four edge functions use service-role (acceptable).
  - Caller of `createServiceRoleClient()`: only `createContactLeadServerService`. Compliant.
- **`INVOICE_PDF_SIGNING_SECRET`** validated at use site to be 64 hex chars (32 bytes entropy) — sound. Failing closed if unset.
- **`console.log/info` of sensitive payloads:** none in `apps/*/app/api/**/route.ts` or `supabase/functions/**`. All log emission uses the `pino`-shaped `logger.{debug,warn,error}` with **explicit field whitelisting**: `errorMsg`, `invoiceNumber`, `userId` (debug-only and operator-facing), `attemptedFormats`, `rawResponseHead: result.rawResponse?.slice(0, 200)` (200-char truncation of vendor responses to bound retention).
- **Audit-log scrubbing:** `packages/services/src/audit.service.ts:104-114` writes only `{action, entity_type, entity_id, description, before_state, metadata}` — `before_state` carries full row snapshots which may include PII. The `with-audit.ts:55-61` PII note explicitly forbids passing `before_state` to Sentry; emission tags are deterministic (`audit.action`, `audit.entity_type`, `audit.write_failed`). Compliant.
- **Service-side debug logs in `whatsapp/send-invoice`** include `userId` at debug level only — fine.
- **`packages/services/src/payment.service.ts:257-268`** logs `console.warn(...)` with `invoiceId, amount, rpcError, rpcCode` when falling back to the racy two-step path. The amount is financial-PII-adjacent but bounded — acceptable.

### 3.6 Financial paths review

**Invoice creation** (`packages/services/src/invoice.service.ts`):

- `createInvoice` (line 42) — pure write; does not compute amount, totals, or tax. Receives `CreateInvoiceDbInput` (canonical DB shape) and inserts as DRAFT. Currency is implicit INR.
- Server-side amount computation lives in the SECURITY DEFINER RPC `generate_invoice(p_shipment_id, p_staff_id, p_discount)` (baseline migration line 535-576): `v_base_freight := chargeable_weight * rate_per_kg; v_total := greatest(0, base_freight - discount)`. **No tax, no fuel surcharge, no handling, no packing, no insurance** applied here — the RPC creates a DRAFT invoice that omits every charge the schema models. Where is the actual amount math? Distributed across the wizard UI + the route handler — confirm `packages/services/src/booking.service.ts` and `packages/services/src/einvoice.service.ts`. Severity: **High** — amount-calc logic is split between client and SQL; **no centralized unit-tested path produces the `total_amount` written to the DB**. Tests in `invoice.service.test.ts` exercise the insert path but not the math (the test file header explicitly notes "Multi-table transactional semantics … those need integration tests" — financial integration tests are missing).
- Rounding/multi-currency: no currency column on `invoices` (implicit INR); rounding is implicit in JS `Number` arithmetic (`Math.max(total - newAdvance, 0)`). **No tests for fractional-paise edge cases, no Bankers'-rounding, no Decimal library.** Severity: **Medium**.

**COD / payment recording** (`packages/services/src/payment.service.ts` + RPC `record_invoice_payment`):

- Canonical path: RPC takes `FOR UPDATE` row lock on `invoices`, INSERTs `invoice_payments` row, recomputes `advance_paid + balance + status` atomically. **Race-free** when the RPC is invoked.
- **Active race window:** `payment.service.ts:269-311` ships a `WARN`-logged fallback for the case where the RPC isn't deployed (or `isMissingInvoicePaymentsRelation` matches the error). The fallback reads `advance_paid`, computes `newAdvance = old + input.amount`, then writes — **classic lost-update race**. Comments document the race and reference tracking issue #9. The RPC **is currently deployed** (verified via `pg_get_functiondef`), so the fallback should be dormant — but it's still wired in. Severity: **High** if `isMissingInvoicePaymentsRelation` can be tricked into matching transient errors (e.g. a brief PostgREST schema-cache miss): a refresh-period burst could route a real payment through the racy path and silently double-credit. Recommend deleting the fallback now that #9 is live.
- **`PaymentResponseLostError`** (line 25) — recognised, typed; tells caller "do NOT retry". Caller-side handling in dashboard UI confirmed by tests. Sound.
- **`deletePayment`** wrapped by `withAudit` (action `payment_delete`); destructive op registry sentinel test (`destructive-op-registry-coverage.test.ts`) enforces wiring. Sound.

**Rate card application** (`packages/services/src/rate-card.service.ts`):

- `lookupRate(origin, dest, serviceLevel, weight)` delegates entirely to the `get_rate_card(text, text, text, numeric)` SQL RPC. The SQL function body was not shown above but is `language sql` + SECURITY DEFINER per `pg_proc`. **Precedence rules** (overlapping weight slabs, soft expiry, currency, hub aliases) live in the RPC body — verify in the SQL source (migration baseline) that ties are broken deterministically. Currently, `weight_slab_min/max` overlap is not constrained at the schema level (no exclusion constraint), so two cards `0-10` and `5-15` for the same lane would both match.
- **No tests** in `__tests__/` for `rate-card.service` (file absent from the test directory listing).

**Audit log coverage on financial mutations:**

- `invoice_cancel` — covered by `withAudit` (`invoice.service.ts:112-131`).
- `payment_delete` — covered (`payment.service.ts:341-362`).
- `manifest_shipment_remove` — covered (registry entry).
- `recordPayment` — **NOT audit-wrapped at the service layer**. The RPC writes to `invoice_payments` (which is the ledger), so the row itself IS the forensic record; but if a payment is RECORDED-AND-PARTIALLY-FAILS, there's no `audit_logs` row tying it to the operator. The destructive-op registry doc § 5.2 explicitly excludes non-primary mutations — this is by design. Acceptable.
- `issueInvoice`, `markPaid` — **not audited**. A status flip from ISSUED to PAID (which is a money-state-change) writes no `audit_logs` row. The `record_invoice_payment` RPC will normally drive that flip and the `invoice_payments` row is the proxy ledger; manual `markPaid` calls bypass it. Severity: **Medium** — recommend `withAudit` on `markPaid` with `before_state` = the prior invoice row.
- `shipment status changes` — the `update_shipment_status` RPC writes a row into `audit_logs` (action='STATUS_CHANGE') directly inside the RPC (baseline line 691-693). Good — uses SECURITY DEFINER to bypass the audit-logs INSERT-RLS-via-`auth.uid()` policy correctly.
- `resolve_exception` RPC writes `audit_logs` directly (line 652-653). Good.

### 3.7 Section 3 severity summary

| # | Finding | File / surface | Severity |
|---|---|---|---|
| 1 | `supabase/functions/send-notification` accepts any anon-key caller and dispatches paid Resend/Twilio/FCM messages with our credentials — no authn, no rate limit, no signature | `supabase/functions/send-notification/index.ts` | **Critical** |
| 2 | `supabase/functions/dispatch-webhook` will signed-POST to arbitrary URLs from a `webhooks` table; no caller auth (table currently missing — Critical the moment it's created) | `supabase/functions/dispatch-webhook/index.ts` | **Critical** (latent) |
| 3 | `customers` RLS allows any authenticated user to read/write/update; bypasses `ROLE_PERMISSIONS` claims (SUPPORT is meant to be read-only) | live `pg_policies` | **High** |
| 4 | `shipments` and `tracking_events` SELECT policies are `qual=true` (anon + authenticated full row read by AWB); if rows carry PII columns (receiver_phone, addresses, sender_name confirmed in `generate-pdf/index.ts`), this is a PII-by-AWB-guessing surface | live `pg_policies`, `apps/web/app/api/track/[awb]/route.ts` | **High** (PII) |
| 5 | `payment.service.ts` racy fallback path (`isMissingInvoicePaymentsRelation`) is still wired even though RPC is live in prod — transient PostgREST errors could route a real payment through the lost-update path | `packages/services/src/payment.service.ts:269-311` | **High** |
| 6 | Invoice amount math (tax, fuel surcharge, handling, packing, insurance) is not centralized in a tested service path; `generate_invoice` RPC only applies `base - discount`; no unit tests for total/balance math | `packages/services/src/invoice.service.ts`, baseline migration | **High** |
| 7 | Edge functions reference `webhooks`, `webhook_deliveries`, `notifications`, `attachments`, `events` tables that don't exist — every code path that writes there silently loses the row (incl. in-app manager notifications for new contact leads) | `contact-lead.service.ts:223`, all four edge functions, `webhook.service.ts`, `notification.service.ts`, `api-key.service.ts` | **High** |
| 8 | `supabase/functions/generate-pdf` and `scheduled-sla-monitor` accept any anon-key caller (no JWT verification, no HMAC); SLA monitor can be force-triggered, PDF generator can be enumerated | both index.ts files | **Medium-High** |
| 9 | `audit_logs` INSERT policy allows any `auth.uid() IS NOT NULL`; junior staff can forge audit rows | live `pg_policies` | **Medium** |
| 10 | `manifests` and `exceptions` RLS allows any authenticated user to write — `ROLE_PERMISSIONS.canEditManifests`/`canResolveExceptions` not enforced at DB layer | live `pg_policies` | **Medium** |
| 11 | `tracking_events` table is anon-SELECT-all without column projection — full enumeration via PostgREST pagination if rate limit absent | live `pg_policies` | **Medium** |
| 12 | `markPaid` + `issueInvoice` not audit-wrapped; status flip into PAID writes no `audit_logs` row when not driven through the RPC | `packages/services/src/invoice.service.ts:72-88` | **Medium** |
| 13 | Supabase Auth HIBP leaked-password check is disabled | advisor `auth_leaked_password_protection` | **Medium** |
| 14 | `ROLE_HIERARCHY` places `FINANCE_STAFF=30` and `SUPPORT=20` below warehouse roles (50-60), but RLS grants FINANCE_STAFF write to `invoices`/`invoice_payments` — `isManagerOrAbove(FINANCE_STAFF)=false` so the `/api/whatsapp/send-invoice` route gates FINANCE_STAFF OUT despite the DB allowing them in | `packages/types/src/domain.types.ts:297` vs RLS | **Medium** (consistency) |
| 15 | `/api/webhooks` whitelisted in `apps/dashboard/proxy.ts` PUBLIC_PATHS but no route exists — latent public-bypass for any future webhook handler under that prefix | `apps/dashboard/proxy.ts:30` | **Low** |
| 16 | `avatars` storage bucket has broad SELECT (listable) | Supabase advisor + `storage.objects` policies | **Low** |
| 17 | No unit/integration tests for `rate-card.service` precedence rules (overlapping weight slabs not constrained at schema layer) | absent test file | **Low** |
| 18 | `anon` and `authenticated` hold `TRUNCATE` on every public table (gratuitous grant; RLS still blocks but the grant is noise) | `information_schema.role_table_grants` | **Low** |

---

## Section 4 — Observability & Operational Readiness

### 4.1 Sentry wiring

**Dashboard (`apps/dashboard`):**
- Server runtime: `apps/dashboard/sentry.server.config.ts:25-30` initialises `@sentry/nextjs` with DSN from `SENTRY_DSN ?? NEXT_PUBLIC_SENTRY_DSN`, `tracesSampleRate: 0.1` in prod, `sendDefaultPii: false`. Tagger DI wiring at lines 34-44 bridges `@workspace/auth` + `@workspace/services` taggers into Sentry via `Sentry.withScope`.
- Edge runtime: `apps/dashboard/sentry.edge.config.ts:15-20` — same DSN/sampling/PII posture; no `@workspace/*` imports by design (avoids Node deps in edge bundle).
- Browser: `apps/dashboard/instrumentation-client.ts:19-63` initialises with `replayIntegration`, `replaysSessionSampleRate: 0.1` (prod), `replaysOnErrorSampleRate: 1.0`, `tracePropagationTargets` scoped to same-origin, plus `denyUrls`/`ignoreErrors` filters for browser-extension noise.
- Runtime hook: `apps/dashboard/instrumentation.ts:9-19` dispatches the correct config per runtime and re-exports `onRequestError = Sentry.captureRequestError` so unhandled route-handler / nested-RSC errors flow to Sentry.
- `apps/dashboard/package.json:15` declares `@sentry/nextjs ^10.53.1`.

**Web (`apps/web`):**
- **No Sentry installation.** No `sentry.*.config.ts`, no `instrumentation.ts`, no `@sentry/nextjs` in `apps/web/package.json`. `apps/web/next.config.mjs:1-7` is bare — no `withSentryConfig` wrapper. This is intentional per `apps/dashboard/instrumentation.ts:5` ("Dashboard-only: apps/web (landing) deliberately ships no Sentry") and the runbook header at `docs/runbooks/sentry-alert-rules.md:6` (`apps/web ships no Sentry`).
- **Risk:** the public marketing site, `/api/contact` (lead capture), and `/api/track/[awb]` (production tracking surface) have **no error telemetry**. A 500 on `/api/contact` is invisible until a customer complains.

**Supabase edge functions (`supabase/functions/`):**
- Four functions (`dispatch-webhook`, `generate-pdf`, `scheduled-sla-monitor`, `send-notification`) — **none import `@sentry/*` or call `Sentry.init`** (grep confirmed). Errors return `Response 500` with `error.message`; nothing is forwarded to Sentry.

**DSN sources:**
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` declared as build inputs in `turbo.json:28,32` and listed in `.env.example:23` (server-side only; web app is silent).
- `apps/dashboard/app/api/diagnostics/sentry/route.ts:99-101,111-128` exposes a manager-gated `GET` that reports `dsnConfigured` + `dsnHost` — the operator-runnable verification surface.
- **UNKNOWN whether DSN/auth-token are actually populated in production env**; nothing inside the repo can prove that.

**Source-map upload:**
- `apps/dashboard/next.config.mjs:79-89` wraps via `withSentryConfig` with `org: "tac-an"`, `project: "javascript-nextjs"`, `authToken: process.env.SENTRY_AUTH_TOKEN`, `widenClientFileUpload: true`, `tunnelRoute: "/monitoring"`. Upload no-ops without `SENTRY_AUTH_TOKEN`. The `/monitoring` tunnel is explicitly whitelisted in `apps/dashboard/proxy.ts:36` so envelopes from `/sign-in` (pre-auth) reach Sentry.
- **No `.sentryclirc`** in the repo. Token must be set in CI/Vercel env. `SENTRY_AUTH_TOKEN` is declared in `turbo.json:31` and `docs/runbooks/sb-2-sentry-alert-setup.md:9` documents it as a prereq.

**PII scrubbing:**
- `sendDefaultPii: false` set on all three runtimes (server `sentry.server.config.ts:29`, edge `sentry.edge.config.ts:19`, client `instrumentation-client.ts:34`).
- **No `beforeSend` hook anywhere** — grep returned no matches. Scrubbing relies entirely on `sendDefaultPii: false` + caller discipline (the `sentry-tagger` contract noted in `apps/dashboard/lib/logger.ts:58-63` requires deterministic strings only, never user objects).
- Session Replay uses Sentry default masking (`replayIntegration()` with no override) — `instrumentation-client.ts:6-7` documents that all text/inputs are masked, which is correct for a dashboard rendering customer data.
- **Risk:** no programmatic `beforeSend` allow-list. If a future caller passes an `email`/`phone` into `Sentry.captureException`'s `extra`, nothing strips it. Same risk for `Sentry.captureRequestError` (server) capturing query strings that may carry PII.

**Alert rules:**
- Spec: `docs/runbooks/sentry-alert-rules.md` § 2 defines 6 canonical alerts (Money-flow error P1, RBAC denial spike P2, API 5xx P1, Frontend crash P2, Slow ops-console pageloads P3, Diagnostic heartbeat info).
- Manual execution guide: `docs/runbooks/sb-2-sentry-alert-setup.md` (click-by-click).
- `docs/runbooks/sentry-alert-rules.md:10` explicitly notes the script-based path (`scripts/sentry/create-alert-rules.mjs`) was deleted in the repo re-foundation; provisioning is owner-run UI-only.
- **Provisioning status: UNKNOWN.** Neither runbook records a "rules created on YYYY-MM-DD" checkpoint. The verification path is documented (`docs/runbooks/sentry-alert-rules.md:116-121` — POST `/api/diagnostics/sentry` triggers heartbeat rule 6), but no record of execution.

### 4.2 Logging

**Library:**
- `pino ^9.14.0` declared in `apps/dashboard/package.json:29`. Single centralized logger at `apps/dashboard/lib/logger.ts:70-98` with env-aware level (`LOG_LEVEL ?? (NODE_ENV === "production" ? "info" : "debug")` at lines 66-68), ISO timestamps, and field redaction for `authorization`, `cookie`, `password`, `token`, `jwt`, `secret` (lines 81-95).
- **No logger in `apps/web`** — `pino` is not in `apps/web/package.json`. Public surfaces (`/api/contact`, `/api/track/[awb]`) emit no structured logs; they just return JSON responses.
- **No logger in `packages/services`** (grep returned zero `logger.*` hits) — services still use `console.*` in 7 production files: `contact-lead.service.ts` (6), `einvoice.service.ts` (1), `orbital.service.ts` (3), `payment.service.ts` (1), `whatsapp-tracked.service.ts` (6), `whatsapp.service.ts` (6), `pdf/invoice-pdf-token.ts` (1), `pdf/qr.ts` (1). Total 25 production-path `console.*` sites that won't be field-indexable.
- **No logger in `supabase/functions/*`** — edge functions log nothing structured.

**Logger usage in dashboard:**
- Only **4 API routes** import `logger`: `app/api/diagnostics/sentry/route.ts`, `app/api/public/invoice-pdf/route.ts`, `app/api/whatsapp/retry-send/route.ts`, `app/api/whatsapp/send-invoice/route.ts`. The fifth (`app/api/whatsapp/test/route.ts`) emits nothing structured (zero `console.*` / `logger.*` hits, confirmed); `app/api/health/route.ts` deliberately logs nothing.
- Where used, severities are correct: e.g. `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:494` (`log.error` on WPBox failure with truncated raw body); :529 (`log.error` on missing WAMID); :560 (`log.info` on success); :432, :441 (`log.debug` / `log.warn` for auto-PDF generation).
- Auth-failure path: `auth.getUser` failures in the diagnostics route get `log.warn` with sanitized err (`apps/dashboard/app/api/diagnostics/sentry/route.ts:36-41, 48-51`). Other routes silently catch `auth.getUser()` failures with `.catch(() => null)` — no warn emitted (e.g. `send-invoice` line 154) — undetectable auth-layer errors in those paths.

**Production level:**
- Default `info` in prod per `logger.ts:67-68` (LOG_LEVEL env override). Acceptable.

**Gaps:**
- Service-layer (packages/services) and apps/web emit no structured logs → most server-side work is invisible to log indexers.
- 25 `console.*` sites in services produce unstructured stdout that's hard to filter at 2am.
- WhatsApp tracker writes, payment paths, e-invoice, and contact-lead service all use `console.*` despite being money-flow / lead-capture surfaces.

### 4.3 Runbooks (inventory + gaps)

**Inventory (`docs/runbooks/`):**

| File | Summary |
|---|---|
| `DATABASE-RESTORE.md` | Full PITR/restore playbook with auth, prerequisites, 3 scenarios (bad migration, accidental delete, full project loss), V1-V4 verification invariants, cutover & postmortem template. RTO target: ≤4h scenarios 1/2, ≤8h scenario 3. Owner-only. |
| `PITR-PLAYBOOK.md` | Pointer/redirect to `DATABASE-RESTORE.md` (kept as grep handle). |
| `pi-1-migration-history-repair.md` | Owner-runnable repair for production `schema_migrations` table drift after baseline squash (Strategy A vs B). |
| `sb-2-sentry-alert-setup.md` | Click-by-click manual UI guide to create the 6 canonical Sentry alert rules. |
| `sentry-alert-rules.md` | Spec for the 6 canonical alerts + saved queries + verification path. |

Additional related docs at `docs/`:
- `docs/ROLLBACK-PLAYBOOK.md` — feature-level rollback (kill switches, file reverts per PR #8 features, NextAdmin multi-phase revert layers including DB Layer 5).

**Gaps cross-referenced against expected failure modes:**

| Failure mode | Runbook? |
|---|---|
| Sentry alerts setup | ✓ `sb-2-sentry-alert-setup.md` + `sentry-alert-rules.md` |
| DB restore / PITR | ✓ `DATABASE-RESTORE.md` |
| Migration repair | ✓ `pi-1-migration-history-repair.md` |
| Code rollback / feature flag | ✓ `docs/ROLLBACK-PLAYBOOK.md` |
| **WPBox / WhatsApp outage** | ✗ partial — `ROLLBACK-PLAYBOOK.md:27` documents the `WHATSAPP_ENABLED` kill switch but there is no incident-response runbook (where to look, who to call, retry/backoff posture, customer comms) |
| **Supabase platform outage** | ✗ no dedicated runbook. `DATABASE-RESTORE.md:93-95` mentions `status.supabase.com` checking, but no playbook for "Supabase is down, what do we tell customers / how do we degrade gracefully" |
| **Edge function failure** | ✗ none. Four edge functions (`dispatch-webhook`, `generate-pdf`, `scheduled-sla-monitor`, `send-notification`) have no observability and no runbook for diagnosing failure |
| **Vercel deploy rollback** | ✗ no runbook. `ROLLBACK-PLAYBOOK.md` covers code reverts but not "rollback the last Vercel deployment" UI path |
| **Secret rotation** | ✗ none. Grep for "secret rotation" returned no matches. Rotation procedure for `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `SENTRY_AUTH_TOKEN`, `WPBOX_API_TOKEN`, `INVOICE_PDF_SIGNING_SECRET`, `UPSTASH_REDIS_REST_TOKEN` not documented. `ROLLBACK-PLAYBOOK.md:29` notes rotating `INVOICE_PDF_SIGNING_SECRET` invalidates active URLs, but no rotation cadence/process |
| **On-call rotation** | ✗ explicitly WONTFIX-UNLESS-TRIGGERED in `CLAUDE.md § 6.2` (solo-owner project today; future location `docs/runbooks/ON-CALL.md`) |
| **Incident postmortem template** | ✓ partial — embedded inside `DATABASE-RESTORE.md § 8` only. Not generalized into a standalone `docs/incidents/_template.md`. No `docs/incidents/` directory exists at all (glob confirmed). |
| **Sentry alert-by-alert response playbook** | ✗ alerts define _what_ trips them; no runbook for "when Money-flow P1 fires at 02:00, do X, Y, Z" |

### 4.4 Backup and recovery

**Supabase backup configuration:**
- `docs/runbooks/DATABASE-RESTORE.md § 2` documents prerequisites P1-P4. **Retention values are placeholders** (`P2 retention = __ days`, lines 56) — owner must fill in after verifying Pro plan / PITR window. Default per Supabase Pro is 7 days, up to 28 days on Team plan.
- **P3 (daily logical backups)** described as a hard ship-blocker if absent (`DATABASE-RESTORE.md:61`).
- RTO targets stated: ≤4h for scenarios 1/2, ≤8h for scenario 3 (`DATABASE-RESTORE.md:29`). RPO target: "seconds-to-minutes if PITR available; up to 24h if only daily backups" (`DATABASE-RESTORE.md:310`).
- **Dry-run status:** `DATABASE-RESTORE.md § 9 / line 471` — the runbook was walked through against docs + MCP-introspected state on 2026-05-17 but **NOT executed against a real restore.** Owner-side dry-run on a Supabase branch is documented but not recorded as completed.
- **Risk:** prerequisite confirmation block (`DATABASE-RESTORE.md:64-73`) is empty placeholders. P1 (Pro plan), P2 (PITR enabled + retention), P3 (daily backups confirmed) all `□` unconfirmed in the file. Cannot tell from the repo whether the project actually has PITR enabled.

**Data export for customers:**
- **No `/api/export` endpoint.** Glob for `export.*csv` in `apps/dashboard/app/api` returned nothing.
- One client-side CSV export at `apps/dashboard/app/ops-console/shift-report/shift-report-client.tsx:39-71` (`exportCsv` builds a Blob from rendered rows). This is an internal ops convenience, not a customer-facing data export.
- **No customer self-service data export** (GDPR-style "export my data" + invoices/shipments dump). No webhook to push data into a customer warehouse. If a customer churns, there's no documented export path.

**Migration rollback strategy:**
- **No `down.sql` files anywhere** in `supabase/migrations/` (glob confirmed zero matches). Forward-only model is confirmed by `migration-deploy.yml:63` ("Forward-only. `supabase db push` does not run down-migrations.").
- `docs/ROLLBACK-PLAYBOOK.md § Layer 5 (lines 234-258)` shows inline `DROP …` statements for the NextAdmin phase 6 migrations (FTS, pgvector, embedding columns), but these are **prose in a doc** — not committed `down.sql` files; running them is a hand-written operation.
- **Recovery path is PITR**, not down-migration. `DATABASE-RESTORE.md § 5.A` is the canonical "bad migration shipped" remediation: in-place PITR to just-before the deploy, then re-apply only the good migrations. This is sound, but predicates on PITR being enabled (P2) which is unconfirmed.
- Migration deploy automation (`migration-deploy.yml`) is opt-in via `vars.MIGRATION_DEPLOY_ENABLED` — currently dormant (lines 67-68, 104-115). Until enabled, every migration deploy is manual.

### 4.5 Rate limiting and abuse protection

**Implementation:**
- Both apps use Upstash Redis via `@upstash/ratelimit`. **No-op when env unset** (`apps/dashboard/lib/rate-limit.ts:11-16`, `apps/web/lib/rate-limit.ts:15-18` — every request allowed if `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` is missing).
- **UNKNOWN whether Upstash env is populated in production** — repo cannot prove it.

**Dashboard buckets** (`apps/dashboard/lib/rate-limit.ts`):
- `ratelimit:public` — 60/min sliding window (line 35), consumed by proxy on `/api/public/*` + `/track/*`.
- `ratelimit:auth` — 10/min (line 58), consumed by proxy on `/sign-in`, `/auth/sign-in`, `/auth/callback`; also by `/api/diagnostics/sentry` per-user (`apps/dashboard/app/api/diagnostics/sentry/route.ts:73`).
- `ratelimit:whatsapp` — 30/min (line 83), consumed by `/api/whatsapp/send-invoice` and `/api/whatsapp/test` per-user.

**Web buckets** (`apps/web/lib/rate-limit.ts`):
- `ratelimit:public` — 60/min, applied via `apps/web/proxy.ts:9` for `/track`.
- `ratelimit:auth` — 10/min for `/sign-in`.
- `ratelimit:contact` — 5/10min (line 56), applied inside the handler at `apps/web/app/api/contact/route.ts:72-81`.
- `ratelimit:track` — 30/min (line 71), applied inside the handler at `apps/web/app/api/track/[awb]/route.ts:65-74`.

**Coverage by public endpoint:**

| Endpoint | Rate-limited? | Where |
|---|---|---|
| `apps/web` `POST /api/contact` | ✓ 5/10min per-IP | route handler line 72-81 |
| `apps/web` `GET /api/track/[awb]` | ✓ 30/min per-IP | route handler line 65-74 |
| `apps/web` `/sign-in` | ✓ 10/min per-IP | proxy.ts:10 |
| `apps/web` `/track` page | ✓ 60/min per-IP | proxy.ts:9 |
| `apps/dashboard` `/sign-in` | ✓ 10/min per-IP | proxy.ts:40 |
| `apps/dashboard` `/api/public/invoice-pdf` | ✓ 60/min per-IP | proxy.ts:39 |
| `apps/dashboard` `/api/health` | ✗ excluded from rate-limit matcher (intentional; health probes) | proxy.ts:29 (PUBLIC_PATHS) |
| `apps/dashboard` `/api/diagnostics/sentry` | ✓ per-user 10/min | route handler line 73 |
| `apps/dashboard` `/api/whatsapp/*` | ✓ per-user 30/min | handlers + lib |
| `apps/dashboard` `/api/webhooks/*` | ✗ no inbound webhook handlers exist in repo (only outbound `dispatch-webhook` edge function); `/api/webhooks` is in `PUBLIC_PATHS` (proxy.ts:30) but no route file exists — dead allow-list entry |

**Bot protection on public forms:**
- `/api/contact` honeypot: `apps/web/app/(public)/contact/contact-form.tsx:45-46, 141-152` — hidden `website` field, server-side silent-accept at `apps/web/app/api/contact/route.ts:108-113` (returns 200 even when bot fills it, defeating probing).
- **No captcha / hCaptcha / Turnstile / reCAPTCHA anywhere** (grep confirmed). For a public contact form this is acceptable given the honeypot + 5/10-min rate-limit + zod cap, but the only defense against a determined adversary is the IP rate-limit.
- `/sign-in` has no captcha and only IP-scoped 10/min rate-limit. Distributed credential-stuffing across many IPs would bypass it. Supabase Auth doesn't have its own lockout/CAPTCHA configured anywhere in repo.

**DDOS mitigation:**
- Strategy is **Vercel default + Upstash rate-limit**. No explicit edge WAF rules, no Vercel firewall config files in repo, no Cloudflare config. The proxy matchers (`apps/dashboard/proxy.ts:114-121`, `apps/web/proxy.ts:91-98`) only skip static assets and run rate-limit before routing.
- **Risk:** the rate-limit no-ops silently when Upstash env is unset (`apps/dashboard/lib/rate-limit.ts:12-16`, `apps/web/lib/rate-limit.ts:18`). There is no startup check / Sentry warning when this happens. A misconfigured production deploy could be entirely unprotected and the team would not be paged about it.

### 4.6 Section 4 severity summary

**Critical (ship-blocker):**
- `DATABASE-RESTORE.md § 2` prerequisites P1-P4 are **empty placeholders** — no confirmation that the production project actually has Pro plan, PITR enabled, daily backups, or an org Owner. The runbook itself flags this as a ship-blocker (`DATABASE-RESTORE.md:59-61`).
- **Sentry alert rules are documented but provisioning status UNKNOWN** — there is no record in either runbook that the 6 alerts have been created in the Sentry org. Without alerts, money-flow errors and API 5xx are silent.
- **Upstash rate-limit silently no-ops** if env unset — there is no startup guard ensuring rate-limiting is actually active in production.

**High:**
- **`apps/web` has zero Sentry** — public contact form, public AWB tracking, and the marketing surface emit no error telemetry. A 500 on `/api/contact` is invisible.
- **Supabase edge functions have no observability** — four functions (including the SLA monitor and webhook dispatcher) have no `Sentry.init`, no structured logs, and no runbook. Failures only surface as 500 responses to callers.
- **No down-migrations and no Vercel-rollback runbook** — recovery from a bad migration depends entirely on PITR, which is unconfirmed.
- **`packages/services` uses `console.*` in 7 production files (25 sites)** — money-flow paths (payment, e-invoice, WhatsApp tracker, contact-lead) emit unstructured logs that won't be field-indexed.
- **No secret-rotation runbook** — rotation procedure for Supabase service-role key, DB password, Sentry token, WPBox token, PDF signing secret, Upstash token is undocumented.
- **No `beforeSend` PII allow-list in Sentry** — relies entirely on `sendDefaultPii: false` + caller discipline. A future `Sentry.captureException(err, { extra: { email } })` would leak.

**Medium:**
- **No customer-facing data export** — no GDPR-style or churn-export endpoint.
- **No standalone incident postmortem template** — exists only embedded in `DATABASE-RESTORE.md § 8`. No `docs/incidents/` directory.
- **No WPBox / Supabase platform-outage runbooks** — only the kill-switch is documented (`ROLLBACK-PLAYBOOK.md:27`).
- **No per-alert response runbook** — alert definitions exist but not the "when this fires, do X" procedure.
- **Sign-in protected only by IP rate-limit** — no Supabase Auth lockout, no captcha; distributed credential-stuffing across IPs would bypass it.
- **`migration-deploy.yml` is dormant** (`MIGRATION_DEPLOY_ENABLED` opt-in defaults off) — every migration deploy is manual until owner flips the flag.

**Low / informational:**
- `/api/webhooks` is in dashboard `PUBLIC_PATHS` (proxy.ts:30) but no inbound webhook route exists — dead allow-list entry, harmless.
- Some dashboard routes silently swallow `auth.getUser()` errors with `.catch(() => null)` (e.g. `send-invoice/route.ts:154`) — undetectable auth-layer failures in those paths. Diagnostics route (line 36-41) does this correctly with a `log.warn`.
- On-call rotation explicitly WONTFIX-UNLESS-TRIGGERED in `CLAUDE.md § 6.2`; acceptable for solo-owner phase but should land before adding a second engineer.

---

## Section 5 — Testing & Quality Gates

### 5.1 Test count by package

Vitest baseline confirmed: **594 tests passing across 36 test files** (`vitest@4.1.5`, 15-23s duration, exit 0). No failing tests.

| Area | Test files | File paths |
|---|---:|---|
| `packages/services/src/__tests__` | 23 | `api-key.service.test.ts`, `attachment.service.test.ts`, `audit-logs-no-update-delete.test.ts`, `audit.service.test.ts`, `barcode-encode.test.ts`, `contact-lead.service.test.ts`, `destructive-op-registry-coverage.test.ts`, `hub.service.test.ts`, `invoice.service.test.ts`, `manifest.service.test.ts`, `notification.service.test.ts`, `orbital.service.test.ts`, `payment.service.test.ts`, `saved-view.service.test.ts`, `services-rpc-adoption.test.ts`, `shipment.service.test.ts`, `silent-by-design.test.ts`, `webhook.service.test.ts`, `whatsapp-tracked.service.test.ts`, `whatsapp.service.test.ts`, `with-audit.test.ts`, `with-rpc.test.ts` (+ helpers) |
| `packages/auth/src` | 3 | `rbac.test.ts`, `rbac-instrumentation.test.ts`, `sign-out-reason.test.ts` |
| `packages/ui/src/components/composed` | 6 | `auth/sign-in-error.test.ts`, `content-frame.test.ts`, `landing/landing-data.test.ts`, `ops-console/ops-content.test.ts`, `stat-card.test.ts`, `surface-card.test.ts` |
| `apps/dashboard/__tests__` | 5 | `api-routes-no-console.test.ts`, `audit-doc-references.test.ts`, `backlog-refs-drift.test.ts`, `ci-watch-script.test.ts`, `rbac-block-adoption.test.ts` |
| `apps/web` | 0 | No `*.test.*` files. |
| `packages/database` | 0 | No test files. |
| `packages/types` | 0 | No test files. |

Single vitest config at `vitest.config.ts:1-57` (env `happy-dom`, e2e/.claude/worktrees excluded). No `vitest.workspace.*` and no `playwright.config.*` files exist anywhere in the repo.

### 5.2 Critical-path coverage

| Path | Test exists? | Where | Severity if missing |
|---|---|---|---|
| Invoice CRUD + status transitions + multi-step linkage | YES | `packages/services/src/__tests__/invoice.service.test.ts` (lines 110-861) | — |
| Payment recording (RPC happy path, null-data lost-response, RPC error, RPC-missing fallback to INSERT) | YES (mock-only) | `packages/services/src/__tests__/payment.service.test.ts:76-700` | — |
| Currency / decimal-rounding contract on invoice amounts | NO explicit currency-precision test | No `toBeCloseTo`/`toFixed` in service tests | MEDIUM — relying on Postgres NUMERIC + JS `Number()` for INR (₹) amounts; no test asserts ₹1234.56 round-trips without float drift |
| Rate-card application (origin/dest/service/weight → rate) | PARTIAL | `services-rpc-adoption.test.ts:107-150` only asserts `get_rate_card` RPC call shape | MEDIUM — rate calculations unverified end-to-end |
| GST calculation | NO | `packages/services/src/gst.ts` exists but no test file references it | HIGH — GST is on every customer invoice; silent miscalculation is a tax-compliance risk |
| RBAC denial paths (non-privileged role → 403) | PARTIAL | `packages/auth/src/rbac.test.ts` covers helper matrices; `apps/dashboard/__tests__/rbac-block-adoption.test.ts` static-greps three named routes for `captureRbacDenial` adoption. NO live route handler is exercised end-to-end with a non-privileged JWT. | MEDIUM — adoption sentinel pins the call sites but actual HTTP-layer denial is asserted via grep |
| RLS-enforced tenant/cross-account boundaries | NO | No test fires a query under one role's JWT and asserts another tenant's row is invisible. There is no integration test against a real Postgres in the suite. | HIGH — RLS is the *only* data-isolation control; zero JS-side assertion |
| Money-flow integrations: WPBox / Supabase Edge Functions | NO (for edge funcs) / PARTIAL (WhatsApp) | `whatsapp.service.test.ts` + `whatsapp-tracked.service.test.ts` mock-based. Grep for `supabase.functions` in tests returns no matches | HIGH — Supabase edge functions execute money-flow side effects with zero JS-side coverage |
| Concurrent write race conditions | NO | Every `concurrent`/`race`/`Promise.all` hit in test files is a description string or unrelated setup, never two simultaneous writes. The `payment.service.ts:240` "racy by design" comment has no test cover. | MEDIUM — documented race window untested |
| Audit-log tamper resistance | YES | `audit-logs-no-update-delete.test.ts` static-greps source for forbidden `.update()`/`.delete()` against `audit_logs` | — |
| Sign-in error → user-visible message | PARTIAL | `sign-in-error.test.ts` (3 tests) covers formatter only — no full sign-in flow test | MEDIUM |
| Public AWB tracking (`/api/track/[awb]`) end-to-end | NO | Route exists at `apps/web/app/api/track/[awb]/route.ts:1-30`; no `apps/web/**/*.test.*` files | HIGH — first launch surface; zero coverage of rate-limit + zod + service path |
| Public contact / lead capture (`/api/contact`) | PARTIAL | Service-layer `contact-lead.service.test.ts` (10 it-blocks) covers the service. Route handler at `apps/web/app/api/contact/route.ts` uncovered. | MEDIUM |

### 5.3 Quality gates — current state

| Gate | Script | Result | Notes |
|---|---|---|---|
| `pnpm test` | `vitest run` | PASS — 594 tests / 36 files / 0 failures (15-23s) | Confirmed twice |
| `pnpm typecheck` | `turbo typecheck` (7 packages → `tsc --noEmit`) | PASS — 7/7 successful (1m4s, 4 cached) | |
| `pnpm lint` | `turbo lint` (7 packages → `eslint --max-warnings 0`) | PASS — 7/7 successful (1m16s, 0 cached) | `--max-warnings 0` enforced |
| `pnpm build` | `turbo build` | NOT RUN — per audit constraints | Script exists at `package.json:15` |
| `pnpm audit:governance` | `node scripts/audit-governance.mjs` | PASS — "Governance audit passed" | LAW 2 + LAW 8 enforcement |
| `pnpm audit:auth-boundary` | `node scripts/audit-auth-boundary.mjs` | PASS — "Auth boundary audit passed" | |
| `pnpm audit:design-spec` | `node scripts/audit-design-spec.mjs` | PASS — "Design-system spec clean. No drift detected." | |
| `pnpm audit:db-types-fresh` | `node scripts/audit-db-types-fresh.mjs` | **FAIL** — `20260522000001_auth_user_profile_trigger.sql` (2026-05-21 19:10:42 UTC) committed AFTER `packages/database/src/database.types.ts` (2026-05-21 19:09:29 UTC) | **GAP** — gate exists but is NOT in any CI workflow. On production HEAD the gate FAILS locally. |
| `pnpm test:routing-eval` | `tsx scripts/test-routing-eval.ts` | PASS — 44/44 routing entries valid | Skills/routing eval only |
| `pnpm audit:all` | composite of governance + auth-boundary + skills + design-spec + db-types-fresh + routing-eval | NOT RUN as a whole (db-types-fresh failure would short-circuit) | Composite definition: `package.json:26` |

**CI workflows** (only 2 exist; `.github/workflows/`):

1. **`architecture-gates.yml`** — triggers: PR to main + push to main on paths `apps/**`, `packages/**`, `scripts/**`, `supabase/**`, root manifests, `docs/backlog/**`, `.github/dependabot.yml`, the workflow itself. Jobs (all LOAD-BEARING, BLOCK merge):
   - `registry-check` — `pnpm --filter @workspace/ui registry:check` + `registry:smoke`
   - `governance` — `pnpm audit:governance`
   - `migrations-fresh-apply` — boots Supabase locally + `supabase db reset --debug` against empty Postgres
   - `npm-audit` — `pnpm audit --prod --audit-level moderate`
   - `backlog-refs-drift` — runs only `apps/dashboard/__tests__/backlog-refs-drift.test.ts`
   - `unit-tests` — `pnpm test` (full vitest suite — 594 tests). Permissions pinned `contents: read`.
   - `bundle-size` — `pnpm --filter dashboard build` + `pnpm measure:bundle` (uploads artifact)

2. **`migration-deploy.yml`** — push-to-main on `supabase/migrations/**`. Opt-in via `vars.MIGRATION_DEPLOY_ENABLED == 'true'`; default dormant.

**Workflows MISSING from CI**:
- `pnpm typecheck` — runs locally only. **NOT invoked by any workflow.** Production-HEAD passes locally but CI never enforces it.
- `pnpm lint` — runs locally only. **NOT invoked by any workflow.** `--max-warnings 0` is local-only.
- `pnpm audit:auth-boundary` — NOT in CI.
- `pnpm audit:design-spec` — NOT in CI.
- `pnpm audit:db-types-fresh` — NOT in CI (gate currently failing locally as of 2026-05-21).
- `pnpm audit:skills` / `pnpm test:routing-eval` — NOT in CI.

### 5.4 Skipped or muted tests

- `it.skip` / `describe.skip` / `test.skip` / `it.todo` / `test.todo` / `xit(` / `xdescribe(` / `fit(` — grep across all `**/*.{test,spec}.{ts,tsx,js,jsx}` files: **0 matches**.
- `@ts-expect-error` / `FIXME` / `TODO` in test files: **0 matches**.
- The string `test.skip` appears only in `AGENTS.md:405` (policy statement), `.claude/skills/tac-tdd/SKILL.md:176` (skill rule), and `docs/decisions/2026-05-17-payment-recording-e2e.md:140` (Playwright pattern for a spec **that does not exist on production HEAD**).
- No commented-out test blocks found in spot-checks.

### 5.5 Browser / E2E coverage

- `playwright.config.*` — **0 matches** anywhere in the repo.
- `apps/dashboard/e2e/**` — directory does NOT exist.
- `**/*.spec.ts` (any path) — **0 matches** (the suite uses `*.test.ts` exclusively).
- `@playwright/test` / `playwright` — appears in `package.json` ONLY inside the `clean` script's `playwright-report` directory-removal list (`package.json:27`); NO Playwright dependency declared in any package.
- `apps/web/**/*.test.*` — **0 files**. The customer-facing app has zero JS test coverage of any kind.
- `apps/dashboard/__tests__/**` is the only dashboard test surface — all 5 files are LINT-style sentinels (grep-against-source), NOT browser tests.

The decision doc at `docs/decisions/2026-05-17-payment-recording-e2e.md:1-159` (SB-4 / E1 carve-out) describes a Playwright spec, `_auth.setup.ts`, `playwright.config.ts`, and `.github/workflows/e2e.yml` as if they exist — **none of these artefacts are present on production HEAD**. SB-4 is described in the doc as "closed" but the deliverables are not in the tree.

**Gap**: zero browser-driven coverage of the golden booking flow, the sign-in flow, the public AWB tracking flow, and the payment-recording flow. The platform reaches first production launch with no E2E suite.

### 5.6 Section 5 severity summary

| Severity | Item |
|---|---|
| **HIGH** | No E2E / Playwright tests anywhere (golden booking, sign-in, tracking, payment-recording all uncovered at the browser layer). |
| **HIGH** | No RLS / cross-tenant integration tests — RLS is the only data-isolation control and is not asserted from JS. |
| **HIGH** | Supabase edge functions (`supabase/functions/*`) have zero JS-side test coverage. |
| **HIGH** | `apps/web` (customer-facing surface — landing, public tracking, contact, sign-in) has 0 test files. |
| **HIGH** | GST calculation (`packages/services/src/gst.ts`) has 0 test coverage. |
| **MEDIUM** | `audit:db-types-fresh` gate currently FAILS on production HEAD (`20260522000001_auth_user_profile_trigger.sql` newer than `database.types.ts`). |
| **MEDIUM** | `pnpm typecheck` and `pnpm lint` are NOT wired into any CI workflow — they pass locally but no merge-blocker enforces them. |
| **MEDIUM** | No currency-precision (₹ rounding) tests on the invoice/payment money path. |
| **MEDIUM** | Rate-card RPC tests assert call-shape only, not returned-rate correctness. |
| **MEDIUM** | Race condition documented at `payment.service.ts:240` ("racy by design, fixed by #9") has no test cover. |
| **MEDIUM** | RBAC denial is verified by static grep (`rbac-block-adoption.test.ts`), not by executing a request under a non-privileged JWT. |
| **LOW** | No skipped or `.todo` tests; no commented-out test blocks. Test hygiene clean. |
| **LOW** | `audit:auth-boundary`, `audit:design-spec`, `audit:db-types-fresh`, `audit:skills`, `test:routing-eval` all run locally but none are in any CI workflow. |

---

## Section 6 — Code Quality & Architecture (observational)

> Sample-flagged from a clean worktree at `C:\tac\tw-prodaudit` (production HEAD). NOT exhaustive — each subsection is capped at 3–5 striking examples. Severity trends LOW / NOTE unless flagged otherwise.

### 6.1 Law violations

**LAW 6 (no DB calls in components) — CLEAN.** No `createBrowserClient` / `supabase.` calls observed in any `apps/**/*.tsx` or `packages/ui/src/**/*.tsx`. The `fetch(` matches under `apps/dashboard/app/ops-console/**/*-live.tsx` are all react-query `refetch()` callbacks, not raw network calls.

**LAW 8 (`@supabase/supabase-js` outside packages/database) — CLEAN.** The only matches are inside `packages/database/src/client.ts`, `packages/database/src/supabase.types.ts`, and `packages/database/src/repositories/*.repo.ts` (all type imports). No `apps/` or other-package imports.

**LAW 10 (raw Tailwind color classes) — CLEAN.** No matches for `(bg|text|border)-(blue|red|green|...)-` in any `.tsx`. Semantic-token discipline is upheld.

**LAW 11 (arbitrary Tailwind values) — small surface, mostly via tokens.** A handful of true arbitrary literals remain:
- `packages/ui/src/components/primitives/chart.tsx:368` — `rounded-[2px]` (LAW 9 + LAW 11)
- `packages/ui/src/components/primitives/scroll-area.tsx:21` — `focus-visible:ring-[3px]`
- `packages/ui/src/components/composed/auth/sign-in-split-layout.tsx:84,90` — `min-h-[360px]`, `max-w-[320px]`
- `packages/ui/src/components/composed/smart-address-fields.tsx:700` — `sm:max-w-[220px]`
- `packages/ui/src/components/composed/public-nav.tsx:71,78` — `hover:translate-y-[1px] hover:translate-x-[1px]`

**LAW 13 (no curves) — CLEAN.** No `rounded-(full|3xl|2xl|xl|lg|md|sm)` matches anywhere under `packages/ui/src/**/*.tsx` or `apps/**/*.tsx`. Zero-radius discipline is universal.

**LAW 4 (fonts only in `apps/*/app/layout.tsx`) — ONE INTENTIONAL DEVIATION.**
- `apps/web/app/(marketing)/layout.tsx:3` imports `Noto_Serif` from `next/font/google` inside a nested route-group layout, not the root layout. The comment at lines 9–13 documents the rationale (display face for hero headings only). Severity: NOTE.

### 6.2 Dead file candidates (observation only — no recommendation)

- `packages/ui/src/components/HeroBadge.tsx` — no importer found.
- `packages/ui/src/components/pixel-perfect/border1.tsx`, `border2.tsx` — no external importer found.
- `packages/ui/src/components/composed/_archive/2026-05-16/{dashboard-header,lottie-hero,marquee,text-matrix-rain}.tsx` — explicitly archived.
- `packages/ui/src/components/composed/_archive/2026-05-26/ops-management-view.tsx` — same pattern.
- **v6/v7 fork still active in production code:**
  - `packages/ui/src/components/composed/customers/customer-form.tsx` (used on `customers/[id]/customer-detail-client.tsx:20`)
  - `packages/ui/src/components/composed/customers/v7-customer-form.tsx` (used on `customers/create/ops-create-customer-live.tsx:10`)
  - Same split exists for `finance/rate-card-form.tsx` vs `rates/v7-rate-card-form.tsx`, plus `v7-ops-{customers,dashboard,finance,inventory,manifests,scanning,notifications,analytics,shipments}.tsx` siblings. Per the user's MEMORY.md, v7 is canonical and v6 should archive — but the deferral marker in `CLAUDE.md § 6.1` (WONTFIX-UNLESS-TRIGGERED) is now contradicted by that memory. **Drift between authoritative docs.**

### 6.3 Pattern inconsistencies

- **Two competing form patterns for non-trivial forms.** RHF + zod in `customers/customer-form.tsx`, `auth/sign-in-form.tsx`, etc. Raw `useState` in `manifests/manifest-builder/manifest-builder-wizard.tsx:84-94` and `finance/record-payment-dialog.tsx:75-84`. `finance/invoice-wizard.tsx` is a hybrid. `tac-forms` skill mandates RHF; wizards are exceptions but not documented.
- **Service factory pattern is consistent** — only `packages/services/src/gst.ts` is a bare-export module (pure helpers, no DB dep — justified).
- **API route auth gating is consistent** — `getServerAuth` + `isXxxOrAbove(role)` + `captureRbacDenial(...)` pattern observed in every route handler sampled. Only `public/invoice-pdf/route.ts` deviates (HMAC-signature auth — documented design).
- **Component-level third-party HTTP fetch in a UI component.** `packages/ui/src/components/composed/smart-address-fields.tsx:407` calls `fetch('https://api.postalpincode.in/pincode/${pincode}')` directly. Not a Supabase call so it doesn't trip LAW 6 literally, but it's network logic embedded in a UI component.

### 6.4 Documentation gaps

- **CLAUDE.md § 6.1 vs MEMORY.md drift.** CLAUDE.md marks the v6/v7 canonical-form decision as WONTFIX-UNLESS-TRIGGERED (last reviewed 2026-05-16). MEMORY.md ("canonical-design-system.md") states v7 is canonical and v6 must be archived. The trigger fired but CLAUDE.md was never updated; the v6 files are still in active use. Severity: LOW.
- **Files referenced by CLAUDE.md all exist.** `.claude/skills/RESOLVER.md`, conventions/, `MANIFEST.json`, `docs/VIOLET-GRID-QUALITY.md`, `docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md` — all present.
- **CLAUDE.md root-path mismatch.** Line 182 says `MONOREPO ROOT: c:\tac\tac-express`, but the audit worktree is `c:\tac\tw-prodaudit` and the live dev path is `C:\tac-go\tac-express`. Stale absolute-path documentation. NOTE only.

### 6.5 Layer / cyclical issues — CLEAN

- `packages/database/src/**` imports only from `@workspace/types`. No `@workspace/services` or `@workspace/ui` imports. ✅
- `packages/types/src/**` has zero `@workspace/*` imports — true leaf. ✅
- `packages/auth/src/**` imports from `@workspace/database` and `@workspace/types` only. No `@workspace/services` import. ✅
- `packages/services/src/**` has zero `@workspace/auth` imports — auth never sits below services. ✅

### 6.6 Type-assertion smells

Dense cluster of `as unknown as` casts at the DB→domain boundary in services.

- `packages/services/src/customer.service.ts:6` — `id: row.id as unknown as Customer["id"]`
- `packages/services/src/exception.service.ts:8-18` — 6 casts in one mapper function
- `packages/services/src/manifest.service.ts:218, 241` — `} as unknown as ManifestSummary`
- `packages/services/src/invoice.service.ts:258` — `} as unknown as Invoice`
- `packages/services/src/shipment.service.ts:122, 203` — RPC payload erasure + `as unknown as ShipmentSummary`
- `packages/services/src/realtime.service.ts:29` — `"postgres_changes" as any` (the only ` as any` in services)
- `packages/services/src/barcode/encode.ts:54` and `packages/services/src/pdf/qr.ts:37` — `// @ts-expect-error` (justified module-resolution workaround)

Severity: LOW–MEDIUM. Worth a single helper / generic to centralize.

### 6.7 Components doing data fetching

- `packages/ui/src/components/composed/smart-address-fields.tsx:407` — direct `fetch('https://api.postalpincode.in/pincode/${pincode}')`. Only occurrence. Should live behind a service / `usePincodeLookup` hook.

### 6.8 Hardcoded business logic

- **SLA anomaly thresholds inside a UI component.** `packages/ui/src/components/composed/dashboard/anomaly-detector-widget.tsx:86-94` hard-codes `24h / 48h / 72h` STALLED→MEDIUM→HIGH→CRITICAL ladder inside the component. Clips LAW 7.
- **PDF tax-label strings.** `packages/services/src/pdf/invoice-pdf.tsx:974, 980` hard-code `"SGST @ 9%"` and `"IGST @ 18%"`. Amounts are dynamic; labels assume a fixed 9/9/18 split.
- **TTLs / quotas scattered as inline `const`.** `orbital.service.ts:52` `ORBITAL_AGGREGATION_LIMIT = 50000`; `payment.service.ts:102` `RELATION_MISSING_TTL_MS = 60_000`; `pdf/invoice-pdf-token.ts:35` `DEFAULT_TTL_MS = 30 days`.
- **Rate-limit knobs hardcoded** in `apps/dashboard/lib/rate-limit.ts`: `Ratelimit.slidingWindow(60, "1 m")` etc. Not env-tunable.

### 6.9 Section 6 severity summary

No HIGH or CRITICAL findings in this section. The codebase reads as one where structural laws (6, 8, 10, 13) are mechanically enforced via ESLint config + skill discipline; soft-edge concerns (form patterns, hardcoded thresholds, v6/v7 cleanup, type-cast hygiene) are accumulating at a manageable rate. Nothing here is a launch blocker.

---

## Synthesis

### Tally

| Severity | Approx count | Notes |
|---|---:|---|
| **CRITICAL** | **26** | Heavy concentration in env (17 vars + dashboard URL family), four integration-level criticals, two security criticals, three observability criticals. After deduplication of overlapping findings: **~24 unique CRITICAL clusters.** |
| **HIGH** | **31** | Distributed across env (9), integrations (5), security (6), observability (6), testing (5). |
| **MEDIUM** | **34** | Distributed across all sections. |
| **LOW** | **32** | Mostly Section 6 + small env / doc gaps. |
| **NOTE** | **15+** | Dead env vars, doc drift, runtime-injected vars. |

These are pre-deduplication counts. The CRITICAL/HIGH tables below consolidate overlapping findings to a single canonical row each.

### Critical findings — consolidated table

Sorted by impact (worst first). All require resolution before the product reaches a real first user.

| # | Finding | File(s) | Smallest closing action | Effort |
|---|---|---|---|---|
| C-1 | `supabase/functions/send-notification` exposes paid Resend/Twilio/FCM relay to anyone with the (browser-bundled) anon key — no authn, no rate limit, no signature. Free SMS/email/push relay. | `supabase/functions/send-notification/index.ts:1-200` | Set `verify_jwt = true` in `supabase/config.toml` for the function AND/OR add HMAC of `(timestamp + body)` checked against a server-only `EDGE_FN_SHARED_SECRET`. | 2 hours |
| C-2 | The entire `COMPANY_*` / `BANK_*` env set (12 vars) is missing from `apps/dashboard/.env.local`; `packages/services/src/pdf/invoice-pdf.tsx:assertCompanyConfig()` throws on any missing field. First invoice PDF render in production 500s. | `packages/services/src/pdf/invoice-pdf.tsx:100-160`; dashboard Vercel env | Populate the 12 vars on dashboard Vercel env (legal name, address, tel, email, web, GSTIN, PAN, CIN, bank name, account, IFSC, SWIFT, UPI). | 1 hour |
| C-3 | `NEXT_PUBLIC_DASHBOARD_URL` missing entirely from `apps/web/.env.local` AND set to ngrok in `apps/dashboard/.env.local`. Landing's "Sign in" CTA, public-nav "Open dashboard" link, and `/dashboard` redirect all fall back to `http://localhost:3001` in production. | `apps/web/app/dashboard/page.tsx:4`; `packages/ui/src/components/composed/public-nav.tsx:19`; `apps/dashboard/lib/public-origin.ts:126` | Set `NEXT_PUBLIC_DASHBOARD_URL` to the production dashboard origin on BOTH Vercel projects (apps/web and apps/dashboard). Also remove the `?? "http://localhost:3001"` fallback so missing-var fails the build. | 30 min |
| C-4 | `SUPABASE_SERVICE_ROLE_KEY` missing from `apps/web/.env.local` and `apps/web/.env.example`. `/api/contact` calls `createServiceRoleClient()` which throws → contact form drops every lead. | `packages/database/src/client.ts:63`; `packages/services/src/server.ts:95` | Set the service-role key on apps/web Vercel env AND add it to `apps/web/.env.example` with the standard "NEVER `NEXT_PUBLIC_`" warning. | 15 min |
| C-5 | `WPBOX_API_TOKEN` and `WPBOX_USER_ID` missing from `apps/web/.env.local`. `/api/contact` lead notification runs in apps/web and will fail every WhatsApp notification (lead row still captured; ops not paged). | `packages/services/src/whatsapp.service.ts:489-505`; `packages/services/src/server.ts:94-100` | Set both vars on apps/web Vercel env. | 15 min |
| C-6 | `dispatch-webhook` edge function will signed-POST to arbitrary URLs from `webhooks` table — no caller auth. Currently dormant because the `webhooks` table doesn't exist, but turns CRITICAL the moment the table is created. | `supabase/functions/dispatch-webhook/index.ts:42-99` | Same fix as C-1 (verify_jwt or HMAC) before creating the `webhooks` table. | 30 min (when migration lands) |
| C-7 | Tables `webhooks`, `webhook_deliveries`, `notifications`, `attachments`, `events`, `api_keys` referenced by services + edge functions don't exist in production. `contact-lead.service.ts:223` writes to `notifications` — every lead silently loses the in-app manager notification. `send-notification` 500s on first invocation. | `contact-lead.service.ts:223`; all four edge functions; `webhook.service.ts`, `notification.service.ts`, `attachment.service.ts`, `api-key.service.ts` | Decide: ship the missing schema (migrations) before launch, OR ifdef out the write paths until tables exist. The current state silently loses data. | half-day to 1 day |
| C-8 | WhatsApp end-to-end verification status UNKNOWN — no smoke test / runbook entry confirming `tac_express_corridor_invoice` template is Meta-approved + the LeminAi prod account is live. Customer-comms surface unverified. | `packages/services/src/__tests__/whatsapp.service.test.ts` (mocks only) | Owner-run smoke: send one template message + one direct message against live WPBox; record success in `docs/runbooks/wpbox-launch-verification.md`. | 1 hour |
| C-9 | Supabase migration-deploy workflow is **dormant** (`vars.MIGRATION_DEPLOY_ENABLED` opt-in, defaults off). Header documents 4 already-merged-not-deployed migrations including `contact_leads`. Without manual backfill, contact form 500s in production. | `.github/workflows/migration-deploy.yml:14-21, 67-115` | Verify current production schema matches HEAD via `supabase db diff`; manually `supabase db push` if behind; flip `MIGRATION_DEPLOY_ENABLED=true` in repo vars. | 1 hour |
| C-10 | Supabase backup prerequisites (Pro plan, PITR enabled, retention, daily backups, Owner role) are placeholder checkboxes in `DATABASE-RESTORE.md § 2` — none confirmed. Restore RTO/RPO is theoretical. | `docs/runbooks/DATABASE-RESTORE.md:56-73` | Owner verification: confirm plan tier, enable PITR, capture retention window, capture an Owner-role contact; check in updated runbook. | 1 hour |
| C-11 | Sentry alert rules provisioning status UNKNOWN. Spec + click-by-click runbook exist; no record they have been created in the Sentry org. Money-flow errors and 5xx are silent until alerts fire. | `docs/runbooks/sb-2-sentry-alert-setup.md`; `docs/runbooks/sentry-alert-rules.md` | Owner-run: walk the SB-2 guide; confirm all 6 alerts active; trigger heartbeat via `POST /api/diagnostics/sentry`; record date in the runbook. | 2 hours |
| C-12 | Upstash rate-limit silently no-ops when env unset; no startup check / Sentry warning surfaces this misconfiguration. A production deploy missing `UPSTASH_REDIS_REST_URL` accepts unlimited `/sign-in`, `/api/contact`, `/track/*` traffic. | `apps/dashboard/lib/rate-limit.ts:11-16`; `apps/web/lib/rate-limit.ts:15-18` | Add a one-time `instrumentation.ts` warning + `Sentry.captureMessage("ratelimit disabled")` when env missing in production; populate Upstash env in both Vercel projects. | 1 hour |
| C-13 | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` confirmed locally but **production posture unverified**. If either is missing, every page 500s on first request. | `packages/database/src/client.ts:11,62`; `packages/database/src/middleware.ts:7-10` | Verify both vars are set on both Vercel projects (apps/web + apps/dashboard) before launch. | 15 min |

### High findings — consolidated table

| # | Finding | File(s) | Smallest closing action | Effort |
|---|---|---|---|---|
| H-1 | `payment.service.ts` racy fallback path still wired despite `record_invoice_payment` RPC being live in prod. Transient PostgREST errors could route a real payment through the lost-update path. | `packages/services/src/payment.service.ts:269-311` | Delete the fallback branch; let any RPC-missing error throw with a Sentry alert. | 30 min |
| H-2 | Invoice amount math (tax, fuel surcharge, handling, packing, insurance) is not centralized in a tested service path. `generate_invoice` RPC only applies `base - discount`. No tests for total/balance math. | `packages/services/src/invoice.service.ts`; baseline migration `generate_invoice` | Create `packages/services/src/invoice-math.ts` with pure functions for total/tax/balance; unit tests; route both wizard + RPC through it. | 1 day |
| H-3 | `customers` table RLS allows any authenticated user to read/write/update; bypasses `ROLE_PERMISSIONS` claims. SUPPORT and WAREHOUSE_STAFF can edit customer PII. | live `pg_policies`; baseline migration `customers` policies | Tighten SELECT to MANAGER+ for non-warehouse roles or scope by hub; restrict INSERT/UPDATE to MANAGER+ via `get_user_role()`. Migration. | half-day |
| H-4 | `shipments` and `tracking_events` SELECT policies are `qual=true` (anon + authenticated full row read by AWB). Returns full PII (receiver_phone, addresses, sender_name) to anyone who guesses an AWB. | live `pg_policies`; `apps/web/app/api/track/[awb]/route.ts` | Replace anon-SELECT with `get_public_shipment(awb_in text)` SECURITY DEFINER RPC returning a curated column projection; update `public-tracking.service.ts` to use it. | half-day |
| H-5 | FCM `send-notification` path uses legacy `fcm.googleapis.com/fcm/send` endpoint (deprecated by Google for new projects). Activating push will fail immediately. | `supabase/functions/send-notification/index.ts:89-111` | Rewrite to FCM HTTP v1 API with OAuth2 service-account auth, OR delete the FCM branch if push is not in launch scope. | half-day |
| H-6 | Invoice QR code in WhatsApp PDF currently points at `${dashboardOrigin}/track/${awb}` (dashboard) instead of the landing public tracking URL. Customers may land on a non-marketed hostname requiring auth. | `apps/dashboard/app/api/whatsapp/send-invoice/route.ts:421-423` | Build the QR URL from `NEXT_PUBLIC_SITE_URL` (landing) instead of `resolvePublicOrigin(req)` (dashboard). | 1 hour |
| H-7 | `WPBOX_LEAD_NOTIFICATION_PHONE` missing — ops gets no WhatsApp page when a lead lands. Silent operational gap; lead row still captured. | `packages/services/src/server.ts:98` | Set the ops phone on apps/web Vercel env. | 15 min |
| H-8 | `UPSTASH_REDIS_REST_*` missing from `apps/dashboard/.env.example` despite `lib/rate-limit.ts` reading them. Silent dependency — operator copying just the dashboard example won't know to set them. | `apps/dashboard/.env.example` vs `apps/dashboard/lib/rate-limit.ts:10-11` | Add the two vars to `apps/dashboard/.env.example` with the same comment as `apps/web/.env.example`. | 5 min |
| H-9 | `SUPABASE_SERVICE_ROLE_KEY` missing from `apps/dashboard/.env.example` even though `packages/database/src/client.ts:63` is shared. | `apps/dashboard/.env.example` | Add the var with NEVER-`NEXT_PUBLIC_` warning. | 5 min |
| H-10 | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` not documented in any `.env.example`. Server-side error visibility silently off if either is unset. | all `.env.example` files | Add both vars with a comment explaining the dashboard-only intent. | 10 min |
| H-11 | `invoice-print-view.tsx` ships hardcoded `COMPANY_DEFAULTS` fallback that diverges from the env-driven PDF generator. Two render paths for the same legal tax document. | `packages/ui/src/components/composed/finance/invoice-print-view.tsx:112-117` | Read company info from the same env-loader as `packages/services/src/pdf/invoice-pdf.tsx`; throw if missing. | 1 hour |
| H-12 | `apps/web` ships zero Sentry. Public contact form, AWB tracking, and marketing surface emit no error telemetry. `/api/contact` 500s are invisible. | `apps/web/package.json` (no `@sentry/nextjs`); `apps/web/next.config.mjs` (no `withSentryConfig`) | Install `@sentry/nextjs` in `apps/web`; add minimal server config + `instrumentation.ts`; wrap `next.config.mjs` with `withSentryConfig`; reuse the same DSN. | half-day |
| H-13 | Supabase edge functions have no observability. Four functions (incl. SLA monitor + webhook dispatcher) have no Sentry, no structured logs, no runbook. | all four `supabase/functions/*/index.ts` | Add `Sentry.init` + a wrapper helper for `Deno.serve` that captures unhandled errors. Document per-function metrics. | half-day |
| H-14 | `packages/services` uses `console.*` in 7 production files (25 sites). Money-flow paths (payment, e-invoice, WhatsApp tracker, contact-lead) emit unstructured logs. | `packages/services/src/payment.service.ts`, `whatsapp.service.ts`, `whatsapp-tracked.service.ts`, `contact-lead.service.ts`, `einvoice.service.ts`, `orbital.service.ts`, `pdf/*` | Introduce a logger interface in `@workspace/services` (DI'd from caller); migrate the 25 sites; remove `console.*`. | 1 day |
| H-15 | No secret-rotation runbook. Rotation procedure for Supabase service-role key, DB password, Sentry token, WPBox token, PDF signing secret, Upstash token undocumented. | `docs/runbooks/` | Create `docs/runbooks/SECRET-ROTATION.md` listing each secret + the rotation cadence + the rollover steps. | 2 hours |
| H-16 | No `beforeSend` PII allow-list in Sentry. Relies entirely on `sendDefaultPii: false` + caller discipline. Future `Sentry.captureException(err, { extra: { email } })` would leak. | `apps/dashboard/sentry.server.config.ts`, `instrumentation-client.ts` | Add `beforeSend` hook scrubbing `email`, `phone`, `gstin`, `pan`, `awb` from `event.extra` / `event.request.query_string`. | 1 hour |
| H-17 | No `down.sql` files. Recovery from a bad migration depends entirely on PITR (unconfirmed). No Vercel deploy rollback runbook. | `supabase/migrations/`; `docs/runbooks/` | Document PITR-as-recovery in `DATABASE-RESTORE.md`; add `docs/runbooks/VERCEL-ROLLBACK.md` covering the deploy UI path. | 2 hours |
| H-18 | No E2E / Playwright tests anywhere. Golden booking, sign-in, public AWB tracking, and payment-recording all uncovered at the browser layer. SB-4 decision doc references files that don't exist on HEAD. | repo-wide | Carve a minimal Playwright config + the 3 golden specs from SB-4; wire into a CI workflow that runs against a preview deployment. | 2-3 days |
| H-19 | No RLS / cross-tenant integration tests. RLS is the only data-isolation control with zero JS assertion. | repo-wide | One integration spec that boots local Supabase, signs in as two roles, asserts cross-row invisibility. | 1 day |
| H-20 | Supabase edge functions have zero JS test coverage. | repo-wide | One spec per function exercising the happy path + the missing-table failure mode. | half-day |
| H-21 | `apps/web` (customer-facing surface) has zero test files. | `apps/web/` | Add `apps/web/__tests__/api/contact.test.ts` + `track-awb.test.ts` route-handler tests. | half-day |
| H-22 | GST calculation (`packages/services/src/gst.ts`) has zero test coverage. | `packages/services/src/gst.ts` | Add `__tests__/gst.test.ts` with intrastate vs interstate cases + rounding-to-paise. | 2 hours |
| H-23 | WhatsApp inbound webhook handler missing. WPBox callback delivery status not captured. | repo-wide (no handler) | Implement `apps/dashboard/app/api/webhooks/wpbox/route.ts` with signature verification + write to `whatsapp_sends.status`. | half-day |
| H-24 | `WHATSAPP_ENABLED` strict equality check — drift to anything other than the literal `"true"` silently disables WhatsApp. | `apps/dashboard/app/api/whatsapp/*/route.ts` | At app boot, log a Sentry breadcrumb / startup warning if env is set but != "true". | 30 min |

### Launch-readiness checklist — must close before first real user

These are the CRITICAL items synthesized into a sequenced checklist. Total estimated effort: **1–2 focused days of owner work plus one half-day on the schema decision (C-7).**

- [ ] **C-2** Populate 12 `COMPANY_*` + `BANK_*` env vars on dashboard Vercel env. *(1 hr)*
- [ ] **C-3** Set `NEXT_PUBLIC_DASHBOARD_URL` to production origin on BOTH Vercel projects; remove `?? "http://localhost:3001"` fallbacks. *(30 min)*
- [ ] **C-4** Set `SUPABASE_SERVICE_ROLE_KEY` on apps/web Vercel env; add to `apps/web/.env.example`. *(15 min)*
- [ ] **C-5** Set `WPBOX_API_TOKEN` + `WPBOX_USER_ID` on apps/web Vercel env. *(15 min)*
- [ ] **C-13** Verify `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set on both Vercel projects. *(15 min)*
- [ ] **C-9** Verify production Supabase schema matches HEAD; run any pending `supabase db push`; enable `MIGRATION_DEPLOY_ENABLED`. *(1 hr)*
- [ ] **C-7** Decision: ship the missing `webhooks` / `notifications` / etc. schema OR ifdef out the writes. Current state silently loses lead-notification rows. *(half-day to 1 day)*
- [ ] **C-1** Lock down `send-notification` edge function with `verify_jwt = true` or HMAC. Free SMS/email/push relay until this is done. *(2 hrs)*
- [ ] **C-6** Pre-emptively apply C-1 fix to `dispatch-webhook`, `generate-pdf`, `scheduled-sla-monitor` (same root cause). *(1 hr)*
- [ ] **C-10** Confirm Supabase Pro plan + PITR + retention + Owner contact in `DATABASE-RESTORE.md § 2`. *(1 hr)*
- [ ] **C-11** Provision the 6 Sentry alert rules per `sb-2-sentry-alert-setup.md`; verify heartbeat. *(2 hrs)*
- [ ] **C-12** Add startup warning when Upstash env missing in production; populate Upstash env on both Vercel projects. *(1 hr)*
- [ ] **C-8** Owner-run WPBox smoke (one template, one direct message); record verification date in a new `docs/runbooks/wpbox-launch-verification.md`. *(1 hr)*

### First week post-launch — HIGH items

Address within seven days of first user:

- [ ] **H-1** Delete payment-service racy fallback. *(30 min)*
- [ ] **H-3** Tighten `customers` RLS to MANAGER+ writes. *(half-day)*
- [ ] **H-4** Replace `shipments` + `tracking_events` anon SELECT with `get_public_shipment(awb)` RPC. *(half-day)*
- [ ] **H-6** Fix invoice QR to point at landing tracking URL, not dashboard. *(1 hr)*
- [ ] **H-7** Set `WPBOX_LEAD_NOTIFICATION_PHONE`. *(15 min)*
- [ ] **H-8, H-9, H-10** Backfill silent `.env.example` deps. *(20 min total)*
- [ ] **H-11** Consolidate invoice-print-view + PDF company-info source of truth. *(1 hr)*
- [ ] **H-12** Install Sentry in apps/web. *(half-day)*
- [ ] **H-13** Add Sentry to Supabase edge functions. *(half-day)*
- [ ] **H-16** Add `beforeSend` PII scrubber to Sentry. *(1 hr)*
- [ ] **H-17** Document PITR-as-recovery + add Vercel rollback runbook. *(2 hrs)*
- [ ] **H-22** Add GST calculation tests. *(2 hrs)*
- [ ] **H-23** Implement WPBox inbound webhook handler. *(half-day)*
- [ ] **H-24** Startup warning if `WHATSAPP_ENABLED` is set but not `"true"`. *(30 min)*
- [ ] **H-5** Decide on FCM: rewrite to v1 API or delete the branch. *(half-day or delete)*

### First month post-launch — MEDIUM items

Address within 30 days:

- [ ] **H-2** Centralize invoice amount math in `invoice-math.ts` with full tests. *(1 day)*
- [ ] **H-14** Migrate 25 `console.*` sites in services to structured logger via DI. *(1 day)*
- [ ] **H-15** Write secret-rotation runbook. *(2 hrs)*
- [ ] **H-18** Carve minimal Playwright E2E (3 golden flows) + CI wiring. *(2-3 days)*
- [ ] **H-19** Add cross-role RLS integration test. *(1 day)*
- [ ] **H-20** Add edge-function tests. *(half-day)*
- [ ] **H-21** Add `apps/web` route-handler tests. *(half-day)*
- [ ] M Wire `pnpm typecheck` + `pnpm lint` into the architecture-gates CI workflow.
- [ ] M Fix `audit:db-types-fresh` gate failure on HEAD; add to CI.
- [ ] M Add `audit:auth-boundary` + `audit:design-spec` + `audit:db-types-fresh` to CI.
- [ ] M Resolve `tac-express.in` vs `tacexpress.in` vs `tacexpress.com` domain split (pick one for FROM-emails, contact addresses, and marketing copy).
- [ ] M Tighten `audit_logs` INSERT policy to require `user_id = auth.uid()` or service-role.
- [ ] M Tighten `manifests` + `exceptions` RLS to match `ROLE_PERMISSIONS`.
- [ ] M Add `withAudit` on `markPaid` + `issueInvoice`.
- [ ] M Enable Supabase Auth HIBP leaked-password protection.
- [ ] M Add customer-facing data export endpoint.
- [ ] M Create `docs/incidents/_template.md` and `docs/incidents/` directory.
- [ ] M Add WPBox + Supabase platform-outage runbooks.
- [ ] M Add per-Sentry-alert response playbook.

---

## Notes & Out-of-Scope Observations

These observations surfaced during the audit but don't fit cleanly into the six sections:

1. **The audit itself confirmed the platform's strong foundation in some areas.** Test count (594), strict CI architecture gates, zero LAW 10 / 13 violations, clean dependency direction, no `as any` (one exception), no hardcoded secrets, deliberate fail-closed posture on `INVOICE_PDF_SIGNING_SECRET` — the architectural discipline is real. The CRITICAL findings cluster around (a) production env not yet populated, (b) edge functions deployed without authn, (c) schema/code drift (`webhooks`, `notifications` etc. expected by code but missing in DB). These are launch-prep gaps, not architectural rot.

2. **Decision doc / artifact drift.** `docs/decisions/2026-05-17-payment-recording-e2e.md` (SB-4) describes Playwright spec, `_auth.setup.ts`, `playwright.config.ts`, and a `.github/workflows/e2e.yml` as if they exist and are "closed." None are present on production HEAD. This is the same pattern as CLAUDE.md § 6.1 vs MEMORY.md drift — documents claiming completion outpace the code. A "decision-doc verification" sentinel (grep for files referenced in any `docs/decisions/*.md` and assert they exist) would close this gap.

3. **The `apps/web` security posture is materially weaker than `apps/dashboard`.** No Sentry, no structured logger, no Sentry-tagger DI, zero tests. The two apps share `packages/database` and `packages/services` but `apps/web` is the *more public* surface — and it has *less* observability. The asymmetry should be deliberately documented or flipped.

4. **No `vercel.json` in the repo.** All Vercel project config (build command, framework, output directory, headers, redirects, ENV) is implicitly managed via the Vercel UI. This is a configuration-not-as-code surface that could drift silently. Consider committing a minimal `vercel.json` per app for reproducibility.

5. **`apps/dashboard/__tests__/rbac-block-adoption.test.ts` pins exactly three route handlers** for `captureRbacDenial` adoption. Every new API route that does auth needs to be added to this allow-list manually, or the sentinel becomes stale. The sentinel itself is good; its maintenance is fragile.

6. **The phrase "verification status: UNKNOWN" appears in every integration section.** This is the most repeatable systemic gap. Building a small `scripts/smoke/` directory with one script per integration (each one network-hits the real upstream and exits 0/1) and a `docs/runbooks/SMOKE-CHECK.md` would convert "UNKNOWN" to a concrete pre-launch checklist item.

7. **The owner-flagged INVOICE_PDF_SIGNING_SECRET is set locally to a valid 64-hex value.** If the owner believes it's empty, they're describing a different environment (likely Vercel prod). The Vercel env cannot be inspected from inside the repo. The audit notes this gap but recommends the owner verify directly via the Vercel dashboard.

---

*End of audit. No PR opened. Owner reviews on branch `feat/prod-readiness-comprehensive-audit` before authorizing follow-up work.*
