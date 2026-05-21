// Inherits the default `happy-dom` environment from vitest.config.ts —
// gives us `window` + `sessionStorage` so the helpers exercise their
// real branches (not just the SSR no-op fallbacks).
import { describe, it, expect, beforeEach } from "vitest"

import {
  claimSignOutReason,
  clearSignOutReason,
  consumeSignOutReason,
  SIGNOUT_REASON_KEY,
} from "./sign-out-reason"

// jsdom provides `window` + `sessionStorage` so the helpers exercise their
// real branches (not just the SSR no-op fallbacks).

describe("sign-out reason coordination", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  describe("claimSignOutReason", () => {
    it("writes the reason under the documented key", () => {
      claimSignOutReason("idle")
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBe("idle")
    })

    it("overwrites a prior claim (last writer wins)", () => {
      claimSignOutReason("idle")
      claimSignOutReason("user")
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBe("user")
    })
  })

  describe("consumeSignOutReason", () => {
    it("returns the claimed reason", () => {
      claimSignOutReason("idle")
      expect(consumeSignOutReason()).toBe("idle")
    })

    it("clears the marker after reading (single-use)", () => {
      claimSignOutReason("user")
      consumeSignOutReason()
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBeNull()
    })

    it("returns null when nothing was claimed", () => {
      expect(consumeSignOutReason()).toBeNull()
    })

    it("returns null and ignores invalid stored values", () => {
      // Defensive: if some other code wrote junk under the same key, we
      // mustn't trust it as a valid SignOutReason.
      window.sessionStorage.setItem(SIGNOUT_REASON_KEY, "definitely-not-a-reason")
      expect(consumeSignOutReason()).toBeNull()
    })

    it("does NOT clear an invalid value (caller can debug it)", () => {
      window.sessionStorage.setItem(SIGNOUT_REASON_KEY, "weird")
      consumeSignOutReason()
      // The handshake contract is "I only consume my own valid markers."
      // Leaving the junk in place lets the next dev see it during triage.
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBe("weird")
    })
  })

  describe("clearSignOutReason", () => {
    it("removes a claimed reason without reading it", () => {
      claimSignOutReason("idle")
      clearSignOutReason()
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBeNull()
    })

    it("is a no-op when nothing was claimed", () => {
      // Just verifying it doesn't throw.
      expect(() => clearSignOutReason()).not.toThrow()
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBeNull()
    })
  })

  describe("handshake (claim → consume → clear)", () => {
    it("supports the documented happy path", () => {
      // 1. Initiator claims before signOutBrowser()
      claimSignOutReason("user")

      // 2. SessionGuard observes SIGNED_OUT, consumes
      const reason = consumeSignOutReason()
      expect(reason).toBe("user")

      // 3. After consume, marker is gone — initiator's clear() is a no-op
      expect(() => clearSignOutReason()).not.toThrow()
      expect(window.sessionStorage.getItem(SIGNOUT_REASON_KEY)).toBeNull()
    })

    it("supports the rejected-signOut path (claim → clear)", () => {
      // signOutBrowser() rejected — initiator must clear so SessionGuard
      // doesn't yield to a phantom claim later.
      claimSignOutReason("idle")
      clearSignOutReason()
      expect(consumeSignOutReason()).toBeNull()
    })
  })
})
