import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { UserRole } from "@workspace/types"

import {
  RbacDeniedError,
  RBAC_DENIAL_TAG_KEYS,
  captureRbacDenial,
} from "./rbac-instrumentation"
import { registerSentry, getRegisteredEmitter } from "./sentry-tagger"

/**
 * Tests for the RBAC denial Sentry-emission helper. Mocks the
 * registered backend rather than @sentry/nextjs directly — packages/auth
 * has no @sentry/nextjs import, by design (apps/web doesn't have it).
 *
 * Tag-shape assertions here are the source of truth for the canonical
 * alert rule in scripts/sentry/canonical-rules.mjs (rule 5: RBAC denial
 * spike). The cross-package sentinel test enforces that contract.
 *
 * PII assertions verify the helper NEVER captures user.email, user.id,
 * full user objects, request bodies, or JWTs in tag values or in the
 * synthesized error.
 */

const captureExceptionMock = vi.fn()

beforeEach(() => {
  captureExceptionMock.mockClear()
  registerSentry({ captureException: captureExceptionMock })
})

afterEach(() => {
  registerSentry(null)
})

describe("captureRbacDenial", () => {
  it("emits to the registered backend with the canonical tag shape", () => {
    captureRbacDenial({
      requiredRole: UserRole.MANAGER,
      actualRole: UserRole.OPS_STAFF,
      surface: "/api/whatsapp/send-invoice",
    })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [error, tags] = captureExceptionMock.mock.calls[0]!

    expect(error).toBeInstanceOf(RbacDeniedError)
    expect(tags).toEqual({
      [RBAC_DENIAL_TAG_KEYS.denial]: "true",
      [RBAC_DENIAL_TAG_KEYS.requiredRole]: String(UserRole.MANAGER),
      [RBAC_DENIAL_TAG_KEYS.actualRole]: String(UserRole.OPS_STAFF),
      [RBAC_DENIAL_TAG_KEYS.surface]: "/api/whatsapp/send-invoice",
    })
  })

  it("returns the RbacDeniedError without throwing (caller decides to throw / redirect)", () => {
    const ret = captureRbacDenial({
      requiredRole: UserRole.ADMIN,
      actualRole: UserRole.SUPPORT,
      surface: "OpsManagementView",
    })

    expect(ret).toBeInstanceOf(RbacDeniedError)
    expect(ret.code).toBe("RBAC_DENIED")
    expect(ret.requiredRole).toBe(UserRole.ADMIN)
    expect(ret.actualRole).toBe(UserRole.SUPPORT)
    expect(ret.surface).toBe("OpsManagementView")
  })

  it("is a no-op when no backend is registered (apps/web, test envs without Sentry)", () => {
    registerSentry(null)
    expect(getRegisteredEmitter()).toBe(null)

    // Doesn't throw, doesn't emit anywhere
    const ret = captureRbacDenial({
      requiredRole: UserRole.MANAGER,
      actualRole: UserRole.OPS,
      surface: "/api/anything",
    })

    expect(ret).toBeInstanceOf(RbacDeniedError)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("swallows backend exceptions — instrumentation never disturbs the caller's path", () => {
    const throwingBackend = {
      captureException: vi.fn(() => {
        throw new Error("backend exploded")
      }),
    }
    registerSentry(throwingBackend)

    expect(() =>
      captureRbacDenial({
        requiredRole: UserRole.MANAGER,
        actualRole: UserRole.OPS,
        surface: "/api/x",
      }),
    ).not.toThrow()

    expect(throwingBackend.captureException).toHaveBeenCalledTimes(1)
  })

  it("PII audit: tag values contain no email-shaped or name-shaped strings", () => {
    captureRbacDenial({
      requiredRole: UserRole.MANAGER,
      actualRole: UserRole.OPS_STAFF,
      surface: "/api/whatsapp/send-invoice",
    })

    const [, tags] = captureExceptionMock.mock.calls[0]!
    for (const v of Object.values(tags as Record<string, string>)) {
      expect(v).not.toMatch(/@/) // no email
      expect(v).not.toMatch(/\s/) // no human name (would contain space)
      expect(v).not.toMatch(/eyJ/) // no JWT prefix
      expect(v.length).toBeLessThan(80) // tag values stay short
    }
  })

  it("PII audit: synthesized RbacDeniedError message contains only role names + surface (no user-controlled content)", () => {
    const err = captureRbacDenial({
      requiredRole: UserRole.ADMIN,
      actualRole: UserRole.WAREHOUSE_STAFF,
      surface: "/admin/users",
    })

    // The error message is also captured by Sentry. Verify it contains
    // only the deterministic strings we control.
    expect(err.message).toBe(
      `Role ${String(UserRole.WAREHOUSE_STAFF)} cannot access /admin/users ` +
        `(requires ${String(UserRole.ADMIN)})`,
    )
    expect(err.message).not.toMatch(/@/)
    expect(err.message).not.toMatch(/eyJ/)
  })

  it("tag-key contract: RBAC_DENIAL_TAG_KEYS exposes exactly the keys the canonical alert rule consumes", () => {
    // This test is paired with scripts/sentry/canonical-rules.mjs rule 5
    // ("RBAC denial spike — javascript-nextjs"). If RBAC_DENIAL_TAG_KEYS
    // changes, update the rule + EMITTED_TAG_KEYS in canonical-rules.mjs.
    expect(Object.values(RBAC_DENIAL_TAG_KEYS)).toEqual([
      "rbac.denial",
      "rbac.required_role",
      "rbac.actual_role",
      "rbac.surface",
    ])
  })
})
