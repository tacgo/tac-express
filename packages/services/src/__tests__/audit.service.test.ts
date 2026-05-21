import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  AuditAction,
  DestructiveAuditAction,
  DestructiveAuditEntityType,
  UUID,
} from "@workspace/types"
import { DESTRUCTIVE_AUDIT_ACTIONS } from "@workspace/types"

// Branded-UUID cast helper for test fixture values. The runtime value is
// just a string; the cast satisfies the AuditLogFilters.userId/entityId
// branded type at compile time without forcing a real uuid generator
// into the test surface.
const asUUID = (value: string): UUID => value as unknown as UUID

import { createAuditService } from "../audit.service"
import { makeDb } from "./helpers/make-db"
import { makeBuilderSpy, makeBuilderSpyByTable } from "./helpers/make-builder-spy"

/**
 * Test floor for audit.service.ts — paired with the audit-logs
 * destructive-op hardening (#102 risk-rank #1, PR 1 of a 2-PR split per
 * the bailout clause; decision doc:
 * docs/decisions/2026-05-16-audit-logs-mechanism.md).
 *
 * History: replaces a prior 4-case smoke-test version that asserted
 * against the OLD schema (`old_values`, `new_values`, `ip_address`,
 * `user_agent` — columns that never existed) and used an out-of-date
 * AuditAction vocabulary (`"CREATE"`, `"update"`). The replacement is
 * structured against the canonical `makeDb` + `makeBuilderSpy`
 * helpers and value-asserts every load-bearing column.
 *
 * Scope
 * -----
 *   - mapAuditLog reads the schema-correct columns including the new
 *     before_state (added in migration 20260516000001).
 *   - listAuditLogs filter pass-through, pagination, count, no-data,
 *     error path.
 *   - logEvent insert payload shape, defaults, error path.
 *   - Every destructive AuditAction in DESTRUCTIVE_AUDIT_ACTIONS
 *     survives logEvent's insert payload verbatim — compile-time
 *     exhaustiveness + runtime sweep.
 *
 * Out of scope (covered elsewhere)
 * --------------------------------
 *   - The DB CHECK constraint `audit_logs_destructive_action_check`
 *     is verified by the migrations-fresh-apply CI gate via the
 *     migration's own do$$ verification block.
 *   - The withAudit wrapper's ordering / fail-loud semantics live in
 *     with-audit.test.ts.
 *   - The registry-coverage sentinel lives in
 *     destructive-op-registry-coverage.test.ts.
 *   - The no-UPDATE / no-DELETE-against-audit_logs sentinel lives in
 *     audit-logs-no-update-delete.test.ts.
 */

beforeEach(() => {
  vi.clearAllMocks()
})

describe("audit.service / listAuditLogs", () => {
  it("reads every documented column from the row, including before_state", async () => {
    const ROW = {
      id: "log-1",
      user_id: "user-1",
      action: "payment_delete",
      entity_type: "payment",
      entity_id: "pay-1",
      description: "Operator removed duplicate payment",
      before_state: { id: "pay-1", amount: 250 },
      metadata: { reason_code: "DUPLICATE" },
      created_at: "2026-05-16T10:00:00Z",
    }
    const { fromImpl, spies } = makeBuilderSpyByTable({
      audit_logs: { data: [ROW], error: null, count: 1 },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)
    const service = createAuditService(db)
    const result = await service.listAuditLogs()
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      id: "log-1",
      userId: "user-1",
      action: "payment_delete",
      entityType: "payment",
      entityId: "pay-1",
      description: "Operator removed duplicate payment",
      beforeState: { id: "pay-1", amount: 250 },
      metadata: { reason_code: "DUPLICATE" },
      createdAt: "2026-05-16T10:00:00Z",
    })
    expect(spies.audit_logs!.calls.select.length).toBeGreaterThan(0)
  })

  it("returns sensible defaults when nullable columns are absent", async () => {
    const ROW = {
      id: "log-2",
      user_id: null,
      action: "STATUS_CHANGE",
      entity_type: "shipment",
      entity_id: null,
      description: null,
      before_state: null,
      metadata: null,
      created_at: "2026-05-16T10:01:00Z",
    }
    const { fromImpl } = makeBuilderSpyByTable({
      audit_logs: { data: [ROW], error: null, count: 1 },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)
    const service = createAuditService(db)
    const result = await service.listAuditLogs()
    const log = result.data[0]!
    expect(log.userId).toBeNull()
    expect(log.entityId).toBeNull()
    expect(log.description).toBe("")
    expect(log.beforeState).toBeNull()
    expect(log.metadata).toEqual({})
  })

  it("forwards every filter field to the matching column via .eq / .gte / .lte", async () => {
    const { fromImpl, spies } = makeBuilderSpyByTable({
      audit_logs: { data: [], error: null, count: 0 },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)
    const service = createAuditService(db)
    await service.listAuditLogs({
      userId: asUUID("user-1"),
      entityType: "payment",
      entityId: asUUID("pay-1"),
      action: "payment_delete",
      dateFrom: "2026-05-01T00:00:00Z",
      dateTo: "2026-05-31T23:59:59Z",
    })
    const eqArgs = spies.audit_logs!.calls.eq
    expect(eqArgs).toContainEqual(["user_id", "user-1"])
    expect(eqArgs).toContainEqual(["entity_type", "payment"])
    expect(eqArgs).toContainEqual(["entity_id", "pay-1"])
    expect(eqArgs).toContainEqual(["action", "payment_delete"])
    expect(spies.audit_logs!.calls.gte).toContainEqual(["created_at", "2026-05-01T00:00:00Z"])
    expect(spies.audit_logs!.calls.lte).toContainEqual(["created_at", "2026-05-31T23:59:59Z"])
  })

  it("propagates query errors verbatim", async () => {
    const ERR = { code: "42501", message: "permission denied for table audit_logs" }
    const { fromImpl } = makeBuilderSpyByTable({
      audit_logs: { data: null, error: ERR, count: null },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)
    const service = createAuditService(db)
    await expect(service.listAuditLogs()).rejects.toMatchObject({ code: "42501" })
  })

  it("treats missing pagination input as page 1 with the default page size", async () => {
    const ROWS = Array.from({ length: 25 }, (_, i) => ({
      id: `log-${i}`,
      user_id: null,
      action: "STATUS_CHANGE",
      entity_type: "shipment",
      entity_id: null,
      description: "",
      before_state: null,
      metadata: null,
      created_at: "2026-05-16T10:00:00Z",
    }))
    const { fromImpl } = makeBuilderSpyByTable({
      audit_logs: { data: ROWS, error: null, count: 100 },
    })
    const db = makeDb({})
    vi.mocked(db.from).mockImplementation(fromImpl)
    const service = createAuditService(db)
    const result = await service.listAuditLogs()
    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(25)
    expect(result.total).toBe(100)
    expect(result.hasMore).toBe(true)
  })
})

describe("audit.service / logEvent", () => {
  it("inserts the schema-correct columns with the input values", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const service = createAuditService(db)
    await service.logEvent({
      action: "payment_delete",
      entityType: "payment",
      entityId: "pay-1",
      description: "operator removed duplicate",
      beforeState: { id: "pay-1", amount: 250 },
      metadata: { reason_code: "DUPLICATE" },
    })
    expect(db.from).toHaveBeenCalledWith("audit_logs")
    // catalog entry #1 — value contract over call existence.
    const insertedRow = spy.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertedRow).toEqual({
      action: "payment_delete",
      entity_type: "payment",
      entity_id: "pay-1",
      description: "operator removed duplicate",
      before_state: { id: "pay-1", amount: 250 },
      metadata: { reason_code: "DUPLICATE" },
    })
  })

  it("supplies safe defaults for description / metadata / nullables", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const service = createAuditService(db)
    await service.logEvent({
      action: "STATUS_CHANGE",
      entityType: "shipment",
    })
    const insertedRow = spy.firstCallArgs("insert")?.[0] as Record<string, unknown>
    expect(insertedRow).toEqual({
      action: "STATUS_CHANGE",
      entity_type: "shipment",
      entity_id: null,
      description: "",
      before_state: null,
      metadata: {},
    })
  })

  it("propagates insert errors verbatim — the caller decides the response", async () => {
    const ERR = {
      code: "23514",
      message: "new row for relation \"audit_logs\" violates check constraint",
    }
    const { builder } = makeBuilderSpy({ data: null, error: ERR })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const service = createAuditService(db)
    // Destructive action without before_state — the DB CHECK would
    // reject this in production. We assert the service surfaces the
    // error rather than swallowing it.
    await expect(
      service.logEvent({
        action: "invoice_cancel",
        entityType: "invoice",
        entityId: "inv-1",
      }),
    ).rejects.toMatchObject({ code: "23514" })
  })
})

describe("audit.service / AuditAction exhaustiveness", () => {
  // Compile-time exhaustiveness for the destructive-action subset
  // (catalog entry #8 — satisfies + Exclude). Duplicate of the
  // type-level check in destructive-op-registry.ts; kept here as a
  // SECOND sentinel since the registry's check could become accidentally
  // dead-code-eliminated by aggressive tree-shaking in some build configs.
  const _ALL_DESTRUCTIVE = [
    "payment_delete",
    "invoice_cancel",
    "manifest_shipment_remove",
  ] as const satisfies readonly DestructiveAuditAction[]
  type _DestructiveMissing = Exclude<DestructiveAuditAction, (typeof _ALL_DESTRUCTIVE)[number]>
  const _destCovered: _DestructiveMissing extends never ? true : never = true
  void _destCovered

  it("DESTRUCTIVE_AUDIT_ACTIONS export matches the literal list", () => {
    expect([...DESTRUCTIVE_AUDIT_ACTIONS]).toEqual([
      "payment_delete",
      "invoice_cancel",
      "manifest_shipment_remove",
    ])
  })

  it("every destructive action survives logEvent's insert payload verbatim", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const service = createAuditService(db)

    const ENTITY_TYPE_BY_ACTION: Record<DestructiveAuditAction, DestructiveAuditEntityType> = {
      payment_delete: "payment",
      invoice_cancel: "invoice",
      manifest_shipment_remove: "manifest",
    }

    for (const action of DESTRUCTIVE_AUDIT_ACTIONS) {
      await service.logEvent({
        action,
        entityType: ENTITY_TYPE_BY_ACTION[action],
        entityId: `${action}-id`,
        beforeState: { id: `${action}-id` },
      })
    }
    const payloads = spy.argsFor("insert") as Array<Record<string, unknown>>
    expect(payloads.map((p) => p.action)).toEqual([...DESTRUCTIVE_AUDIT_ACTIONS])
    expect(payloads.every((p) => p.before_state !== null)).toBe(true)
    expect(payloads.every((p) => p.entity_id !== null)).toBe(true)
  })

  it("historical non-destructive actions still pass through (back-compat)", async () => {
    const { builder, spy } = makeBuilderSpy({ data: null, error: null })
    const db = makeDb({})
    vi.mocked(db.from).mockReturnValue(builder)
    const service = createAuditService(db)

    const HISTORICAL: AuditAction[] = ["STATUS_CHANGE", "RESOLVED"]
    for (const action of HISTORICAL) {
      await service.logEvent({ action, entityType: "shipment" })
    }
    const payloads = spy.argsFor("insert") as Array<Record<string, unknown>>
    expect(payloads.map((p) => p.action)).toEqual(["STATUS_CHANGE", "RESOLVED"])
  })
})
