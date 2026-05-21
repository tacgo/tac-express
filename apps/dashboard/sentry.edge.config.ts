// Sentry edge-runtime init for the dashboard (middleware + edge routes).
//
// Kept deliberately minimal: NO @workspace/* imports here. The DI tagger
// backends live in the Node server config — pulling packages/services or
// packages/auth into the edge bundle would drag Node-only deps (pino,
// supabase) into the edge runtime, and nothing emits tagged exceptions
// from the edge layer today.
//
// Same env-DSN + no-PII + scaled-sampling posture as the server config.

import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: true,
  sendDefaultPii: false,
})
