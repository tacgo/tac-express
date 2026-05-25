import { describe, it, expect } from "vitest"

import { describeSignInError } from "./sign-in-error"

describe("describeSignInError", () => {
  it("maps browser fetch failures to a connectivity message (not a credential error)", () => {
    const networkMessages = [
      "Failed to fetch", // Chromium
      "Load failed", // Safari
      "NetworkError when attempting to fetch resource", // Firefox
    ]
    for (const m of networkMessages) {
      expect(describeSignInError(new TypeError(m))).toMatch(
        /reach the authentication server/i,
      )
    }
  })

  it("passes through Supabase auth error messages unchanged", () => {
    expect(describeSignInError(new Error("Invalid login credentials"))).toBe(
      "Invalid login credentials",
    )
  })

  it("falls back to a credentials hint for empty / non-error inputs", () => {
    expect(describeSignInError(null)).toMatch(/check your credentials/i)
    expect(describeSignInError({})).toMatch(/check your credentials/i)
    expect(describeSignInError(new Error(""))).toMatch(/check your credentials/i)
  })
})
