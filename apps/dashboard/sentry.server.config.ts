// Sentry server (Node runtime) init for the dashboard.
//
// Adapted from the @sentry/wizard output to TAC Express conventions:
//   - DSN from env, never hardcoded (LAW: no hardcoded values; fail-quiet
//     without a DSN — Sentry.init no-ops, matching the DI tagger posture).
//   - sendDefaultPii: false — the dashboard handles customer + RBAC data;
//     Sentry must not auto-attach IPs / headers / cookies. PII rules are
//     enforced at the tag layer too (see sentry-tagger.ts).
//   - Sample rates scale down in production.
//
// This is also where the dependency-injected tagger from packages/auth and
// packages/services is wired to a real Sentry backend (Node only — those
// packages pull Node-only deps, so they are NOT imported into the edge
// bundle; nothing emits tagged exceptions from the edge runtime).

import * as Sentry from "@sentry/nextjs"
import {
  registerSentry as registerAuthSentry,
  type TaggedEmitter,
} from "@workspace/auth"
import { registerSentry as registerServicesSentry } from "@workspace/services"

const isProd = process.env.NODE_ENV === "production"

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProd ? 0.1 : 1,
  enableLogs: true,
  sendDefaultPii: false,
})

// Bridge the backend-agnostic tagger to Sentry. `withScope` keeps each
// event's tags isolated so concurrent emits never bleed into one another.
const sentryEmitter: TaggedEmitter = {
  captureException(error, tags) {
    Sentry.withScope((scope) => {
      scope.setTags(tags)
      Sentry.captureException(error)
    })
  },
}

registerAuthSentry(sentryEmitter)
registerServicesSentry(sentryEmitter)
