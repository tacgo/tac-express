// Next.js instrumentation hook — loads the correct Sentry init for the
// active runtime, and forwards nested-RSC / route-handler errors to Sentry.
//
// Dashboard-only: apps/web (landing) deliberately ships no Sentry. See
// packages/auth/src/sentry-tagger.ts for the dependency-injection rationale.

import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

export const onRequestError = Sentry.captureRequestError
