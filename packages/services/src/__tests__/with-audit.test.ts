import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  AUDIT_WRITE_TAG_KEYS,
  AuditWriteFailedError,
  withAudit,
} from "../shared/with-audit"
import { registerSentry } from "../shared/sentry-tagger"
import { makeDb } from "./helpers/make-db"
import { makeBuilderSpy } from "./helpers/make-builder-spy"

/**
 * Test floor for withAudit — the canonical wrapper for destructive
 * service operations (decision doc:
 * docs/decisions/2026-05-16-audit-logs-mechanism.md).
 *
 * Load-bearing properties under test
 * ----------------------------------
 *   1. ORDERING: the audit-row INSERT happens BEFORE the destructive op.
 *      Tests verify the call order via a tableCalls array; not just
 *      that both calls happened.
 *   2. FAIL-LOUD on audit failure: if the audit insert errors, an
 *      AuditWriteFailedError is thrown AND the destructive op is
 *      never invoked. The Sentry emission carries deterministic tags
 *      (no row data).
 *   3. PRESERVE on destructive failure: if the destructive op errors
 *      AFTER the audit row was written, withAudit re-throws but the
 *      audit row remains (no compensating action).
 *   4. EVERY destructive AuditAction is exercised through the wrapper
 *      end-to-end — compile-time exhaustiveness + runtime sweep.
 */

const captureExceptionMock = vi.fn()

beforeEach(() => {
  captureExceptionMock.mockClear()
  registerSentry({ captureException: captureExceptionMock })
})

afterEach(() => {
  registerSentry(null)
})

describe("withAudit / ordering", () => {
  it("writes the audit row BEFORE invoking the destructive op", async () => {
    // Ordering test strategy: read the recorded .insert call count
    // FROM INSIDE destructiveOp. If the insert ran first (per the
    // wrapper's contract), the spy already shows one .insert call by
    // the time destructiveOp executes. If the wrapper accidentally
    // ran the destructive op first, the assertion below would fail
    // because spy.calls.insert.length would still be 0.
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    let insertCountAtDestructiveTime = -1
    const destructiveOp = vi.fn(async () => {
      insertCountAtDestructiveTime = spy.calls.insert.length
    })
    await withAudit(
      db,
      {
        action: "payment_delete",
        entityType: "payment",
        entityId: "pay-1",
        beforeState: { id: "pay-1", amount: 100 },
      },
      destructiveOp,
    )
    expect(insertCountAtDestructiveTime).toBe(1)
    expect(destructiveOp).toHaveBeenCalledTimes(1)
    expect(spy.calls.insert.length).toBe(1)
  })

  it("passes the full audit payload — action + entity + before_state + description + metadata", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    await withAudit(
      db,
      {
        action: "invoice_cancel",
        entityType: "invoice",
        entityId: "inv-1",
        beforeState: { id: "inv-1", status: "ISSUED", total_amount: 2000 },
        description: "Cancelled by operator following customer dispute",
        metadata: { reason_code: "DISPUTE", ticket_id: "T-99" },
      },
      async () => {},
    )
    // catalog entry #1 — value contract over call existence.
    const insertedRow = spy.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertedRow).toEqual({
      action: "invoice_cancel",
      entity_type: "invoice",
      entity_id: "inv-1",
      description: "Cancelled by operator following customer dispute",
      before_state: { id: "inv-1", status: "ISSUED", total_amount: 2000 },
      metadata: { reason_code: "DISPUTE", ticket_id: "T-99" },
    })
  })

  it("returns the destructiveOp's return value to the caller", async () => {
    const { builder } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const result = await withAudit(
      db,
      {
        action: "manifest_shipment_remove",
        entityType: "manifest",
        entityId: "man-1",
        beforeState: { id: "man-1", status: "DEPARTED" },
      },
      async () => ({ reverted: true, freedShipments: 7 }),
    )
    expect(result).toEqual({ reverted: true, freedShipments: 7 })
  })
})

describe("withAudit / fail-loud on audit failure", () => {
  it("throws AuditWriteFailedError when the audit insert errors and NEVER invokes the destructive op", async () => {
    const AUDIT_ERR = {
      code: "23514",
      message:
        'new row for relation "audit_logs" violates check constraint "audit_logs_destructive_action_check"',
    }
    const { builder } = makeBuilderSpy({ data: null, error: AUDIT_ERR })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const destructiveOp = vi.fn(async () => {})

    await expect(
      withAudit(
        db,
        {
          action: "payment_delete",
          entityType: "payment",
          entityId: "pay-1",
          beforeState: { id: "pay-1" },
        },
        destructiveOp,
      ),
    ).rejects.toBeInstanceOf(AuditWriteFailedError)

    expect(destructiveOp).not.toHaveBeenCalled()
  })

  it("the thrown AuditWriteFailedError carries the bundle-safe discriminator code + input identity", async () => {
    const AUDIT_ERR = { code: "42501", message: "permission denied" }
    const { builder } = makeBuilderSpy({ data: null, error: AUDIT_ERR })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const destructiveOp = vi.fn(async () => {})
    try {
      await withAudit(
        db,
        {
          action: "invoice_cancel",
          entityType: "invoice",
          entityId: "inv-1",
          beforeState: { id: "inv-1" },
        },
        destructiveOp,
      )
      throw new Error("expected withAudit to reject")
    } catch (err) {
      expect(err).toBeInstanceOf(AuditWriteFailedError)
      const e = err as AuditWriteFailedError
      expect(e.code).toBe("AUDIT_WRITE_FAILED")
      expect(e.action).toBe("invoice_cancel")
      expect(e.entityType).toBe("invoice")
      expect(e.entityId).toBe("inv-1")
      expect(e.cause).toMatchObject({ code: "42501" })
      expect(e.name).toBe("AuditWriteFailedError")
    }
  })

  it("emits a Sentry exception with deterministic tags (no row data) on audit failure", async () => {
    const AUDIT_ERR = { code: "42501", message: "permission denied" }
    const { builder } = makeBuilderSpy({ data: null, error: AUDIT_ERR })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    await expect(
      withAudit(
        db,
        {
          action: "manifest_shipment_remove",
          entityType: "manifest",
          entityId: "man-1",
          beforeState: { id: "man-1", secret: "PII-SHAPED" },
        },
        async () => {},
      ),
    ).rejects.toBeInstanceOf(AuditWriteFailedError)
    expect(captureExceptionMock).toHaveBeenCalledTimes(1)
    const firstCall = captureExceptionMock.mock.calls[0]!
    const emittedErr = firstCall[0]
    const tags = firstCall[1]
    expect(emittedErr).toBeInstanceOf(AuditWriteFailedError)
    expect(tags).toEqual({
      [AUDIT_WRITE_TAG_KEYS.audit]: "true",
      [AUDIT_WRITE_TAG_KEYS.action]: "manifest_shipment_remove",
      [AUDIT_WRITE_TAG_KEYS.entityType]: "manifest",
    })
    // PII posture — before_state's "secret" must NOT appear in tag values.
    const tagBlob = JSON.stringify(tags)
    expect(tagBlob).not.toContain("PII-SHAPED")
    expect(tagBlob).not.toContain("man-1") // entityId is also not a tag
  })
})

describe("withAudit / destructive-op failure leaves the audit row in place", () => {
  it("re-throws the destructive-op error without rolling back the audit row", async () => {
    // Mirror the ordering-test strategy: read spy.calls.insert.length
    // from inside the destructiveOp's invocation. We assert the audit
    // insert already ran before the destructive failure.
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)

    const destructiveErr = new Error("foreign key violation")
    let insertCountAtDestructiveTime = -1
    const destructiveOp = vi.fn(async () => {
      insertCountAtDestructiveTime = spy.calls.insert.length
      throw destructiveErr
    })

    await expect(
      withAudit(
        db,
        {
          action: "payment_delete",
          entityType: "payment",
          entityId: "pay-1",
          beforeState: { id: "pay-1" },
        },
        destructiveOp,
      ),
    ).rejects.toBe(destructiveErr)

    // Audit insert ran first; destructive attempt ran second. The
    // wrapper does NOT attempt to delete / undo the audit row — that
    // would defeat the tamper-evidence guarantee (the DB also refuses
    // DELETE on audit_logs anyway).
    expect(insertCountAtDestructiveTime).toBe(1)
    expect(spy.calls.insert.length).toBe(1)
    expect(destructiveOp).toHaveBeenCalledTimes(1)
    // No Sentry emission for destructive-op failure — that's the
    // caller's concern (the caller already has its own error
    // instrumentation per service-method conventions). The wrapper only
    // emits on audit-write failure.
    expect(captureExceptionMock).not.toHaveBeenCalled()
  })
})

describe("withAudit / destructive-action sweep", () => {
  // Per the audit.service test floor pattern (catalog entry #8), every
  // destructive AuditAction MUST round-trip through the wrapper with
  // its expected entity type. The compile-time check in
  // destructive-op-registry.ts ensures literals stay synchronized;
  // this runtime sweep verifies the wrapper's payload for each.
  const CASES: Array<{
    action: "payment_delete" | "invoice_cancel" | "manifest_shipment_remove"
    entityType: "payment" | "invoice" | "manifest"
  }> = [
    { action: "payment_delete", entityType: "payment" },
    { action: "invoice_cancel", entityType: "invoice" },
    { action: "manifest_shipment_remove", entityType: "manifest" },
  ]

  for (const { action, entityType } of CASES) {
    it(`wraps ${action} on a ${entityType} end-to-end`, async () => {
      const { builder, spy } = makeBuilderSpy({ data: null, error: null })
      const db = makeDb({})
      vi.mocked(db.from).mockReturnValue(builder)
      const destructiveOp = vi.fn(async () => undefined)
      await withAudit(
        db,
        {
          action,
          entityType,
          entityId: `${entityType}-1`,
          beforeState: { id: `${entityType}-1`, sample: "value" },
        },
        destructiveOp,
      )
      const insertedRow = spy.firstCallArgs("insert")?.[0] as Record<string, unknown>
      expect(insertedRow.action).toBe(action)
      expect(insertedRow.entity_type).toBe(entityType)
      expect(insertedRow.before_state).toEqual({
        id: `${entityType}-1`,
        sample: "value",
      })
      expect(destructiveOp).toHaveBeenCalledTimes(1)
    })
  }
})
