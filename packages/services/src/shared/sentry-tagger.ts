// Pluggable Sentry emitter for packages/services.
//
// Identical contract to packages/auth/src/sentry-tagger.ts — duplicated
// rather than shared because cross-package coupling between auth and
// services would be a worse architectural smell than two small ~50 LoC
// modules with the same shape. Each package owns its registration
// state; apps wire both independently.
//
// See packages/auth/src/sentry-tagger.ts for the longer rationale on
// why we use dependency injection here instead of a direct Sentry
// import (apps/web does not have @sentry/nextjs).

/**
 * Tag values MUST be deterministic strings. Forbidden in tag values:
 *   - user.email / user.full_name (PII)
 *   - row data from Supabase responses (potentially PII)
 *   - full Postgres error objects (`hint` may contain row context)
 *   - JWTs / session tokens (credentials)
 *
 * For per-event user identity, the consumer registers a separate
 * `Sentry.setUser({ id })` upstream — never include id in tags either.
 */
export type TagMap = Record<string, string>

export interface TaggedEmitter {
  captureException(error: unknown, tags: TagMap): void
}

let registered: TaggedEmitter | null = null

/** Wire a backend at app startup. Pass `null` to deregister (tests). */
export function registerSentry(emitter: TaggedEmitter | null): void {
  registered = emitter
}

/** Read the current emitter — for tests + the sentinel that verifies wiring. */
export function getRegisteredEmitter(): TaggedEmitter | null {
  return registered
}

/**
 * Emit a tagged exception via the registered backend. No-op if no
 * backend is registered. Defensive try/catch — instrumentation must
 * NEVER throw into the caller's code path.
 */
export function emitTaggedException(error: unknown, tags: TagMap): void {
  if (!registered) return
  try {
    registered.captureException(error, tags)
  } catch {
    // Swallow.
  }
}
