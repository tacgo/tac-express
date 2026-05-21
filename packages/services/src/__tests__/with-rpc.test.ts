import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  RPC_UNKNOWN_ERROR_CODE,
  SUPABASE_RPC_TAG_KEYS,
  SupabaseRpcError,
  captureSupabaseRpcError,
  withRpc,
} from "../shared/with-rpc"
import {
  registerSentry,
  getRegisteredEmitter,
} from "../shared/sentry-tagger"

/**
 * Tests for the Supabase RPC Sentry-emission helpers. Mocks the
 * registered backend rather than @sentry/nextjs directly — packages/services
 * has no @sentry/nextjs import, by design (apps/web doesn't have it).
 *
 * Tag-shape assertions here are the source of truth for the canonical
 * alert rule in scripts/sentry/canonical-rules.mjs (rule 4: Supabase RPC
 * failures). The cross-package sentinel test enforces that contract.
 *
 * PII assertions verify the helper NEVER captures row data, full
 * Postgres response payloads, or hint strings that might contain
 * user content in tag values.
 */

const captureExceptionMock = vi.fn()

beforeEach(() => {
  captureExceptionMock.mockClear()
  registerSentry({ captureException: captureExceptionMock })
})

afterEach(() => {
  registerSentry(null)
})

describe("captureSupabaseRpcError", () => {
  it("emits the canonical tag shape with rpc_name + error_code", () => {
    captureSupabaseRpcError("record_invoice_payment", {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      hint: "consider upserting",
    })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [error, tags] = captureExceptionMock.mock.calls[0]!

    expect(error).toBeInstanceOf(SupabaseRpcError)
    expect(tags).toEqual({
      [SUPABASE_RPC_TAG_KEYS.rpc]: "true",
      [SUPABASE_RPC_TAG_KEYS.rpcName]: "record_invoice_payment",
      [SUPABASE_RPC_TAG_KEYS.errorCode]: "23505",
    })
  })

  it("uses the sentinel error_code when code is missing (no crash)", () => {
    captureSupabaseRpcError("some_rpc", {
      message: "something broke",
      // no code
    })

    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe(
      RPC_UNKNOWN_ERROR_CODE,
    )
  })

  it("uses the sentinel error_code when code is empty/whitespace", () => {
    captureSupabaseRpcError("some_rpc", { code: "   ", message: "x" })
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe(
      RPC_UNKNOWN_ERROR_CODE,
    )
  })

  it("does NOT pass the raw error object — synthesized SupabaseRpcError only", () => {
    // Postgres error responses can contain row data via `details`. If we
    // passed the raw err to Sentry, that data ends up in the issue's
    // `extra` field. We synthesize a SupabaseRpcError that captures only
    // explicit safe fields (message/code/hint), nothing else.
    const rawErr = {
      code: "23505",
      message: "duplicate key",
      hint: "consider upserting",
      details: "Key (email)=(alice@example.com) already exists.", // ← PII!
    }
    captureSupabaseRpcError("my_rpc", rawErr)

    const [error] = captureExceptionMock.mock.calls[0]!
    const errStr = JSON.stringify(error, Object.getOwnPropertyNames(error as object))
    expect(errStr).not.toContain("alice@example.com")
    expect(errStr).not.toContain("details")
  })

  it("PII audit: tag values are deterministic short strings", () => {
    captureSupabaseRpcError("update_invoice", {
      code: "P0001",
      message: "RLS denied",
    })
    const [, tags] = captureExceptionMock.mock.calls[0]!
    for (const v of Object.values(tags as Record<string, string>)) {
      expect(v).not.toMatch(/@/) // no email
      expect(v).not.toMatch(/eyJ/) // no JWT
      expect(v.length).toBeLessThan(80)
    }
  })

  it("is a no-op when no backend is registered", () => {
    registerSentry(null)
    expect(getRegisteredEmitter()).toBe(null)

    expect(() =>
      captureSupabaseRpcError("anything", { code: "X", message: "y" }),
    ).not.toThrow()

    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("swallows backend exceptions", () => {
    registerSentry({
      captureException: vi.fn(() => {
        throw new Error("backend exploded")
      }),
    })

    expect(() =>
      captureSupabaseRpcError("rpc_x", { code: "1", message: "m" }),
    ).not.toThrow()
  })
})

describe("withRpc", () => {
  it("passes through on success without emitting", async () => {
    const exec = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null })
    const result = await withRpc("happy_rpc", exec)

    expect(result).toEqual({ data: { id: 1 }, error: null })
    expect(exec).toHaveBeenCalledTimes(1)
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })

  it("captures on error and returns the same {data, error} shape", async () => {
    const errObj = { code: "PGRST116", message: "more than one row" }
    const exec = vi.fn().mockResolvedValue({ data: null, error: errObj })
    const result = await withRpc("plural_rpc", exec)

    expect(result.error).toBe(errObj)
    expect(result.data).toBeNull()
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const [, tags] = captureExceptionMock.mock.calls[0]!
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.rpcName]).toBe(
      "plural_rpc",
    )
    expect((tags as Record<string, string>)[SUPABASE_RPC_TAG_KEYS.errorCode]).toBe(
      "PGRST116",
    )
  })

  it("does NOT throw when exec resolves with an error — caller branches on result.error", async () => {
    const exec = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: "X", message: "fail" } })
    await expect(withRpc("rpc_x", exec)).resolves.toMatchObject({
      data: null,
      error: { code: "X" },
    })
  })

  it("tag-key contract: SUPABASE_RPC_TAG_KEYS exposes exactly the keys the canonical alert rule consumes", () => {
    // Paired with scripts/sentry/canonical-rules.mjs rule 4
    // ("Supabase RPC failures — javascript-nextjs").
    expect(Object.values(SUPABASE_RPC_TAG_KEYS)).toEqual([
      "supabase.rpc",
      "supabase.rpc_name",
      "supabase.error_code",
    ])
  })
})
