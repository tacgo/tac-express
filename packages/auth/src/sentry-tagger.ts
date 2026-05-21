// Pluggable Sentry emitter — registered by the consuming app at startup.
//
// Why dependency injection instead of `import * as Sentry from "@sentry/nextjs"`:
//
//   - packages/auth is imported by apps/dashboard (has @sentry/nextjs) AND
//     apps/web (does NOT have @sentry/nextjs). A direct import would either
//     (a) force apps/web to install Sentry, or (b) break the apps/web build.
//   - peerDependencies would warn but not fail under pnpm strict, but would
//     still pull Sentry into apps/web's bundle once a single helper here is
//     imported transitively.
//   - Dynamic import + try/catch makes the emission path async, which is
//     awkward for synchronous denial gates.
//
// The injection pattern keeps packages/auth backend-agnostic — Sentry is the
// only consumer today, but the same shape works for any future "ship this
// structured event somewhere" backend (Datadog, OTLP, an audit-log table).
//
// Registration is one-time at app start. Apps that don't register a tagger
// silently no-op — this matches PR #111's fail-quiet posture for Sentry init
// without a DSN.

/**
 * Tag values MUST be deterministic strings. Forbidden in tag values:
 *   - user.email / user.full_name (PII)
 *   - request bodies (potentially PII)
 *   - full error objects (may contain row data with PII)
 *   - JWTs / session tokens (credentials)
 *
 * For per-event user identity, the consumer registers a separate
 * `Sentry.setUser({ id })` call upstream — never include id in tags either,
 * since high-cardinality tags balloon the Sentry index.
 */
export type TagMap = Record<string, string>

export interface TaggedEmitter {
  /**
   * Emit a structured exception with the given tags. The consumer wraps
   * this in `Sentry.withScope` so the tags scope to this one event.
   */
  captureException(error: unknown, tags: TagMap): void
}

let registered: TaggedEmitter | null = null

/**
 * Wire a backend (typically @sentry/nextjs via apps/dashboard) at app
 * startup. Pass `null` to deregister (useful in tests).
 */
export function registerSentry(emitter: TaggedEmitter | null): void {
  registered = emitter
}

/**
 * Read the current emitter — exported for tests + the cross-package
 * sentinel that verifies the registration contract.
 */
export function getRegisteredEmitter(): TaggedEmitter | null {
  return registered
}

/**
 * Emit a tagged exception via the registered backend. No-op if no
 * backend is registered (apps/web, test envs without Sentry).
 *
 * Wrapped in try/catch defensively — instrumentation must NEVER throw
 * into the caller's denial path. A failed emit is a worse error than
 * a missed event.
 */
export function emitTaggedException(error: unknown, tags: TagMap): void {
  if (!registered) return
  try {
    registered.captureException(error, tags)
  } catch {
    // Swallow — instrumentation throwing would mask the actual error.
  }
}
