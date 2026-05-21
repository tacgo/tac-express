// Sentry client (browser) init for the dashboard.
//
// Adapted from the @sentry/wizard output to TAC Express conventions:
//   - DSN from NEXT_PUBLIC_SENTRY_DSN (inlined at build; fail-quiet if unset).
//   - sendDefaultPii: false — no auto-attached PII from the browser.
//   - Session Replay stays on Sentry's default privacy masking (all text and
//     inputs masked) — required since the dashboard renders customer data.
//   - Replay + traces sampling scale down in production.
//   - denyUrls / ignoreErrors filter third-party noise (browser extensions,
//     injected scripts, benign browser quirks) so it never reaches Sentry.
//     This is the correct response to extension-origin events like the
//     Backbone-style `updateFrom` TypeError — that frame is injected code,
//     not our app.

import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  integrations: [Sentry.replayIntegration()],
  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: true,
  replaysSessionSampleRate: isProd ? 0.1 : 1,
  replaysOnErrorSampleRate: 1.0,
  sendDefaultPii: false,

  // Drop events whose top frames originate from browser extensions or
  // injected third-party scripts — none of this is TAC Express code.
  denyUrls: [
    /^(chrome|moz|safari|safari-web|ms-browser)-extension:\/\//i,
    /^chrome:\/\//i,
    /^webkit-masked-url:/i,
    /extensions\//i,
  ],

  // Suppress well-known benign browser noise + non-actionable injected errors.
  ignoreErrors: [
    // Layout observer churn — not a real fault.
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Opaque cross-origin script errors (third-party / extension).
    "Script error.",
    // Rejections with no Error payload — usually third-party.
    "Non-Error promise rejection captured",
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
