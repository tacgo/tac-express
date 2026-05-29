// Sentry server (Node runtime) init for the public-facing apps/web.
// H-12: previously apps/web shipped no Sentry — /api/contact 500s and
// /api/track/[awb] failures were invisible.

import * as Sentry from "@sentry/nextjs"

const isProd = process.env.NODE_ENV === "production"

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
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
})
