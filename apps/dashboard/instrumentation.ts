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

  // Startup guards — emit once at server boot. These fire in both runtimes
  // so the warning lands in Vercel function logs regardless of route type.
  if (process.env.NODE_ENV === "production") {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      const msg =
        "UPSTASH_REDIS_REST_URL/TOKEN not set — all rate limiters are disabled. " +
        "Sign-in, WhatsApp, and public routes accept unlimited traffic."
      console.error("[startup]", msg)
      Sentry.captureMessage(msg, "warning")
    }

    const wa = process.env.WHATSAPP_ENABLED
    if (wa !== undefined && wa !== "true") {
      const msg = `WHATSAPP_ENABLED is set to "${wa}" (not "true") — all WhatsApp sends will 503.`
      console.warn("[startup]", msg)
      Sentry.captureMessage(msg, "warning")
    }
  }
}

export const onRequestError = Sentry.captureRequestError
