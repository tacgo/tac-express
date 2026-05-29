import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: isProd ? 0.1 : 1,
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.extra) {
      for (const key of ["email", "phone", "gstin", "pan", "awb", "address"]) {
        if (key in event.extra) delete event.extra[key]
      }
    }
    if (event.request?.query_string) {
      event.request.query_string = "[SCRUBBED]"
    }
    return event
  },
  tracePropagationTargets: ["localhost", /^\/(?!\/)/],
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    "Script error.",
    "Non-Error promise rejection captured",
  ],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
