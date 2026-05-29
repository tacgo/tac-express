import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.error(
        "[startup] UPSTASH_REDIS_REST_URL/TOKEN not set — " +
          "contact-form and tracking rate limiters are disabled.",
      )
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(
        "[startup] SUPABASE_SERVICE_ROLE_KEY not set — " +
          "/api/contact will 500 on every submission (lead capture broken).",
      )
    }
    if (!process.env.NEXT_PUBLIC_DASHBOARD_URL) {
      console.error(
        "[startup] NEXT_PUBLIC_DASHBOARD_URL not set — " +
          "the Sign-in CTA and /dashboard redirect point at localhost:3001.",
      )
    }
  }
}

export const onRequestError = Sentry.captureRequestError
