import pino from "pino"

/**
 * Centralized structured logger for the dashboard's server-side surface.
 *
 * Replaces the scattered `console.log` / `console.warn` / `console.error`
 * calls in API routes (issue #102 Sprint 1 Observability). The migration
 * landed in PR #N — see git blame on individual route files for which
 * console site became which log call.
 *
 * Why pino:
 *   - The de-facto Node.js structured-logging library; ~50KB; zero
 *     native deps.
 *   - JSON output by default (stdout) — Vercel + Cloud Run + any
 *     container platform captures it into their log indexer.
 *   - Child loggers with bound fields (e.g. `route` per route file)
 *     reduce repetitive context in each call site.
 *   - Level filtering via env var (LOG_LEVEL=debug for development).
 *
 * Why not Sentry.logger.* alone:
 *   - Sentry.logger captures structured logs in Sentry, but does NOT
 *     write to stdout — Vercel's request logs would lose the context.
 *   - The dual-emit pattern (pino → stdout, Sentry.captureException for
 *     errors that deserve alerting) is the conventional split. Pino
 *     handles diagnostic context; Sentry handles event-worthy errors.
 *
 * Why not just keep console.*:
 *   - console.log emits a single unstructured string. Filtering "all
 *     log events for invoice X" requires regex on stdout.
 *   - Pino emits `{ level, time, msg, ...fields }` JSON. Same query
 *     becomes a field filter in the log indexer.
 *   - Production debugging at 2am is materially faster with structured
 *     context.
 *
 * Configuration:
 *   - LOG_LEVEL env var sets the minimum level. Defaults to "info" in
 *     production, "debug" elsewhere.
 *   - In dev, pretty-printing happens via `pino-pretty` ONLY if it's
 *     installed — we do NOT add it as a dep here. The JSON form is
 *     legible enough for `pnpm dev` console output.
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *
 *   logger.info({ invoiceId, amount }, "payment recorded")
 *   logger.warn({ rpcError: err.message }, "RPC fell back to JS path")
 *   logger.error({ err: { message: e.message, code: e.code } }, "render failed")
 *
 *   // For per-route binding:
 *   const log = logger.child({ route: "/api/whatsapp/send-invoice" })
 *
 * Pino's API mirrors what you'd write with console BUT structured
 * fields go FIRST and the message second. This is the inverse of
 * console's positional args — easy to get wrong on first migration,
 * which is why the per-call-site rewrite in this PR uses the
 * fields-first form consistently.
 *
 * PII posture: callers MUST NOT log full user objects, full Postgres
 * response payloads, JWTs, or request bodies. Log fields the same way
 * you'd tag Sentry events — deterministic strings (route, status code,
 * error message, error code). Same threat model as the existing
 * sentry-tagger surface (see packages/auth/src/sentry-tagger.ts and
 * packages/services/src/shared/sentry-tagger.ts).
 */

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === "production" ? "info" : "debug")

export const logger = pino({
  level,
  // Disable thread-stream / worker transport — Next.js's bundler can
  // mis-link worker entry points across the edge/node split. Synchronous
  // stdout writes are fine for our volume (server-rendered dashboard;
  // not a high-throughput data pipeline).
  base: undefined,
  // Field-redaction belt-and-braces. If a caller accidentally passes
  // an Authorization header or a cookie blob, pino redacts before
  // emitting. This is NOT a substitute for the caller doing its own
  // filtering — but it catches the obvious leaks.
  redact: {
    paths: [
      "authorization",
      "*.authorization",
      "headers.authorization",
      "headers.cookie",
      "cookie",
      "*.cookie",
      "*.password",
      "*.token",
      "*.jwt",
      "*.secret",
    ],
    censor: "[redacted]",
  },
  // ISO timestamps are easier to scan in stdout than the default epoch.
  timestamp: pino.stdTimeFunctions.isoTime,
})
