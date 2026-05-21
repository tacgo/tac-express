// Sentry client (browser) init for the dashboard.
//
// Adapted from the @sentry/wizard output to TAC Express conventions:
//   - DSN from NEXT_PUBLIC_SENTRY_DSN (inlined at build; fail-quiet if unset).
//   - sendDefaultPii: false — no auto-attached PII from the browser.
//   - Session Replay stays on Sentry's default privacy masking (all text and
//     inputs masked) — required since the dashboard renders customer data.
//   - Replay + traces sampling scale down in production.

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
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
