// Structured Sentry emission on RBAC denial.
//
// This module IS the canonical denial-event surface for packages/auth. The
// existing rbac.ts helpers (canAccess, canDo, hasMinimumRole) return
// booleans — they intentionally don't emit, because the caller decides
// whether a `false` is "you can't see this UI element" (silent) or "you
// hit a gate you weren't supposed to reach" (page-worthy).
//
// Callers that want the second behavior wire `captureRbacDenial` into
// their denial path. The first PR adopts this at a single representative
// site (apps/dashboard server-side route handler); a follow-up will
// migrate the remaining surfaces.
//
// Tag shape (this is the contract the canonical alert rule keys off —
// changes here MUST be reflected in scripts/sentry/canonical-rules.mjs
// and the cross-package sentinel test):
//
//   rbac.denial         = "true"           (constant — alert filter)
//   rbac.required_role  = <UserRole>       (enum string)
//   rbac.actual_role    = <UserRole>       (enum string)
//   rbac.surface        = <route/component> (caller-provided identifier)
//
// PII posture: all tag values are deterministic strings sourced from
// the role enum + the caller's hardcoded surface identifier. No
// user-controlled input, no email/name/session.

import type { UserRole } from "@workspace/types"

import { emitTaggedException, type TagMap } from "./sentry-tagger"

/**
 * Stable tag-key contract — exported so the cross-package sentinel test
 * can verify scripts/sentry/canonical-rules.mjs filters reference only
 * keys actually emitted here.
 */
export const RBAC_DENIAL_TAG_KEYS = {
  denial: "rbac.denial",
  requiredRole: "rbac.required_role",
  actualRole: "rbac.actual_role",
  surface: "rbac.surface",
} as const

/**
 * Discriminator for "the role gate refused this request". Distinct from
 * any generic AuthError so consumers can branch on `.code` across
 * package boundaries without depending on instanceof + the same bundle.
 */
export class RbacDeniedError extends Error {
  readonly code = "RBAC_DENIED" as const
  readonly requiredRole: UserRole
  readonly actualRole: UserRole
  readonly surface: string

  constructor(input: {
    requiredRole: UserRole
    actualRole: UserRole
    surface: string
  }) {
    super(
      `Role ${String(input.actualRole)} cannot access ${input.surface} ` +
        `(requires ${String(input.requiredRole)})`,
    )
    this.name = "RbacDeniedError"
    this.requiredRole = input.requiredRole
    this.actualRole = input.actualRole
    this.surface = input.surface
  }
}

export interface CaptureRbacDenialInput {
  requiredRole: UserRole
  actualRole: UserRole
  /**
   * Caller-provided identifier of the surface that denied access.
   * MUST be deterministic (route path, component name, server-action key).
   * MUST NOT include user-controlled input (no query params, no body).
   *
   * Examples (good):  "/api/whatsapp/send-invoice", "OpsCreateInvoice"
   * Examples (bad):   "/api/track/" + req.params.awb  (high-cardinality + PII risk)
   */
  surface: string
}

/**
 * Emit a structured `RbacDeniedError` to the registered Sentry backend
 * (or no-op if Sentry isn't wired). Tags follow `RBAC_DENIAL_TAG_KEYS`.
 *
 * Returns the constructed error so the caller can also throw / redirect
 * with it (the helper does NOT throw itself — instrumentation never
 * disturbs the denial decision).
 *
 * Usage pattern:
 *
 *   if (!canAccess(actualRole, "finance")) {
 *     throw captureRbacDenial({
 *       requiredRole: UserRole.MANAGER,
 *       actualRole,
 *       surface: "/api/whatsapp/send-invoice",
 *     })
 *   }
 */
export function captureRbacDenial(input: CaptureRbacDenialInput): RbacDeniedError {
  const error = new RbacDeniedError(input)
  const tags: TagMap = {
    [RBAC_DENIAL_TAG_KEYS.denial]: "true",
    [RBAC_DENIAL_TAG_KEYS.requiredRole]: String(input.requiredRole),
    [RBAC_DENIAL_TAG_KEYS.actualRole]: String(input.actualRole),
    [RBAC_DENIAL_TAG_KEYS.surface]: input.surface,
  }
  emitTaggedException(error, tags)
  return error
}
