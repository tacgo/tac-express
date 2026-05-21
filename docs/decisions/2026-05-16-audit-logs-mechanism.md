# DECISION: Audit-Logs Mechanism — Hybrid Wrapper + Sentinel (Option C)

**Date:** 2026-05-16
**Author:** Claude Code session (PM / CTO / Senior FSE / Security-architect lens)
**#102 sub-item:** audit_logs hardening for destructive operations
**Status:** ADOPTED — applies to PR 1 (this PR) and PR 2 (adoption follow-up)

---

## TL;DR

For payment-delete / invoice-cancel / manifest-revert audit capture:

- **Mechanism:** Hybrid (Option C) — a `withAudit()` JS-side wrapper in `packages/services/src/shared/`, PLUS a hardcoded **destructive-op registry** sentinel that fails CI if any registry method is not wrapped.
- **Failure mode:** audit write happens BEFORE the destructive op. If the audit insert fails → throw, destructive op never runs (no destruction without an audit row). If the destructive op fails after the audit row is written → re-throw; the orphaned audit row is preserved as forensic signal (an attempt-vs-completion mismatch is observable). The intentional skew is toward more visibility, never less.
- **Atomicity gap acknowledgement:** Supabase's PostgREST client cannot issue multi-statement transactions from JS. True atomicity (audit + destructive in one transaction) requires option A (SECURITY DEFINER RPC). For the three named ops, the JS-side wrapper is the right tradeoff per the reasoning below; PRs that introduce new destructive ops with stricter atomicity needs may upgrade individual ops to option A without changing the registry contract.
- **Application-layer hole closure:** the destructive-op registry + the LAW 6/7 architecture-flow gate (UI may not call Supabase directly; only services may) together close the hole that option C otherwise has. The remaining hole — direct SQL via admin tooling / migrations / service_role bypass — is acknowledged in writing (see § 5.3 below).
- **Bailout:** this PR ships infrastructure only (option-C plumbing). Adoption in the three destructive ops is PR 2.

---

## 1. Why this decision was non-trivial

The prompt assumed a greenfield audit-logs table. Reality on `main` at 814bbff:

| Assumption | Reality |
|---|---|
| audit_logs table doesn't exist | EXISTS — baseline migration 20260515000001, 0 rows, RLS on |
| Need to define RLS from scratch | EXISTS — INSERT policy `auth.uid() IS NOT NULL`, SELECT policy MANAGER+, NO UPDATE policy, NO DELETE policy (structurally tamper-evident) |
| Need to design service | EXISTS — `packages/services/src/audit.service.ts` with `createAuditService()` exposing `listAuditLogs()` (used) and `logEvent()` (orphaned + broken) |
| Three destructive ops need wiring | TWO exist (`deletePayment`, `cancelInvoice`); manifest-revert has NO method today |
| Audit-write mechanism is a fresh decision | DB-internal audit writes ALREADY EXIST inside SECURITY DEFINER RPCs (`resolve_exception`, `update_shipment_status`) — option A is partially live precedent |

The real work is hardening a half-built surface, not greenfield design.

### Bugs surfaced during PHASE-0

- `audit.service.ts.logEvent()` inserts `old_values`, `new_values`, `ip_address`, `user_agent` columns — none exist in the schema. Type mapper reads the same phantom columns. Call would fail at runtime; nobody calls it, so the bug has been silent.
- `AuditLog` type in `packages/types/src/audit.types.ts` claims fields the schema doesn't supply.
- Generated `database.types.ts` agrees with the SCHEMA, contradicting the service.

PR 1 fixes these as a side-effect of the schema hardening — without this fix, any new audit caller would fail. This is **cast-comment-as-bug-ticket** (CodeRabbit catalog entry #11 equivalent): an unused service with a known-broken impl is a latent bug, not benign dead code.

---

## 2. Mechanism options — full evaluation

### Option A — Database trigger / RPC-internal

**Shape:** for each destructive op, write a SECURITY DEFINER RPC that performs both the destruction and the audit insert in one transaction. OR install a generic trigger on `invoice_payments` / `invoices` / `manifests` that writes audit rows.

**Strengths:**
- Single-transaction atomicity for audit + destruction. No orphaned rows in either direction.
- Cannot be forgotten by future contributors — every code path that triggers the DELETE/UPDATE writes an audit row, including direct SQL, admin tools, and migrations that issue these statements.
- Precedent in this codebase: `resolve_exception` + `update_shipment_status` already audit DB-side.

**Weaknesses:**
- For per-op RPCs: substantial new server-side surface — 2–3 new SECURITY DEFINER functions, each with their own auth checks, search_path locks, advisor compliance. Each is also a new migration. Larger PR; harder to evolve; harder to unit-test in Vitest.
- For generic triggers: scope creep risk (the trigger fires on EVERY delete/update, not just destructive intent), and PostgreSQL has no way to distinguish "this DELETE is part of a payment-delete user action" from "this DELETE is part of a cascade cleanup."
- Tension with LAW 6/7 (business logic in `packages/services`) — though as the precedent shows, the law admits SECURITY DEFINER RPCs for atomic concerns.
- Service-layer unit tests in Vitest don't exercise the trigger / RPC code path; coverage moves to integration tests against a real Postgres (or pgTAP), which this repo doesn't have a green floor for yet.

### Option B — Pure service-layer hook

**Shape:** each destructive service method explicitly inserts an audit row before / after the destructive call.

**Strengths:**
- Fully testable in Vitest (mock the audit insert via `makeDb`).
- Consistent with LAW 6/7 — business logic stays in services.
- Explicit at the call site — reviewer can see the audit pairing.

**Weaknesses:**
- **The next contributor adding a destructive op can forget the hook. That is exactly the failure mode an audit log exists to prevent.** This is the load-bearing weakness of pure B.
- No structural enforcement; relies on review discipline.
- Bypassable by any code path outside `packages/services` (admin tooling, migrations, raw RPCs), but LAW 6/7 already constrains those.

### Option C — Hybrid: withAudit wrapper + sentinel test

**Shape:**
- Add `packages/services/src/shared/with-audit.ts` exporting `withAudit({ action, entityType, entityId, beforeState, metadata }, async () => destructiveOp())`.
- Add a hardcoded `DESTRUCTIVE_OP_REGISTRY` typed against the `AuditAction` enum.
- Add a sentinel test: for each registry entry, assert the corresponding service-method source contains a `withAudit(` call. A meta-sentinel pins the registry size to force conscious intent on additions / removals (per `docs/patterns/coderabbit-catalog.md` § 7.2 forcing-function pattern — entry #8 satisfies + Exclude exhaustiveness + entry #6 anchor-scoped windows).

**Strengths:**
- Testable + explicit (B's wins).
- Hard to forget (the sentinel fails CI if a registry entry isn't wrapped).
- Encourages a single audit shape — the wrapper enforces it.
- Stable API: future destructive ops add a registry entry + a `withAudit` call; the wrapper handles everything else.

**Weaknesses:**
- Still bypassable by non-service code paths (admin tooling, raw RPCs, migrations issuing destructive SQL).
- Atomicity gap vs option A (covered in § 3 below).

---

## 3. The decision: **Option C** with audit-first ordering

### Selection reasoning

Three factors decide:

**(a) Codebase ergonomics.** The Sprint 2 service-test floors (payment / invoice / shipment) all use the canonical `makeDb` + `makeBuilderSpy` helpers. A JS-side `withAudit` wrapper plugs into this pattern directly. Three new SECURITY DEFINER RPCs would each need their own integration-test floor — which doesn't exist yet, would be a separate forward-investment, and pulls the audit-logs PR's scope across a new test-infrastructure boundary.

**(b) Forcing function rigor.** The sentinel registry pattern is the same shape as five other forcing-function sentinels already shipped in this repo (RBAC block-adoption, pino-no-console, audit-doc-references, canonical-rules-tag-contract, silent-by-design). Adoption is mechanical for contributors and CI; the failure mode if someone forgets is "build red on a specific test," not "audit logs silently miss an op."

**(c) Future migrations to A.** Adopting C now does not foreclose moving any individual op to A later. The registry sentinel just asserts a `withAudit(` reference per entry; if an op moves to a SECURITY DEFINER RPC, the service method either keeps a thin `withAudit({ ...metadata, mechanism: "rpc" }, () => db.rpc(...))` wrapping (the RPC does the real work + atomic audit; the wrapper records the call shape for the registry's sake), or the registry entry is upgraded to assert RPC adoption directly. Either upgrade is a one-line registry edit + a one-line service-method edit.

### Ordering: audit-first, fail-loud

The wrapper executes in this order:

```
1. Capture before_state by reading the row to be destroyed (single SELECT).
2. INSERT into audit_logs with action, entity_type, entity_id, before_state.
3. If audit insert fails → THROW. Destructive op never runs.
4. Execute destructive op.
5. If destructive op fails → re-throw. Audit row is preserved as an "attempt" record.
```

**Why fail-loud on audit failure:** an audit log that can be skipped under load is not an audit log. For destructive ops, the cost of blocking the destruction is operational (a user sees an error and tries again); the cost of silent audit miss is forensic (a deletion happened with no record). The first is recoverable; the second is not. Prompt's guidance explicitly: "For an audit surface, blocking is usually correct (no audit = no destruction)."

**Why skew toward visibility on destructive-op failure:** the audit row stays. An orphaned audit row is observable signal (an auditor reviewing the log sees an action with `before_state` recorded but no corresponding state change in the target table). This is preferable to losing the attempt record entirely.

---

## 4. Atomicity gap acknowledgement

The wrapper performs two separate PostgREST round-trips (audit INSERT, then destructive op). Between those two writes, a process crash, network failure, or DB failover could leave the system in either:

| State | Cause | Observability |
|---|---|---|
| Audit row exists; destructive op did NOT run | Network failure between step 2 and step 4 | Auditor sees "attempt without effect" — investigate. |
| Audit row exists; destructive op succeeded | Normal happy path | Auditor sees full record. |
| Audit row does NOT exist; destructive op succeeded | **Cannot happen** — step 3 throws if audit insert fails. | n/a |
| Neither | Service-level guard rejected the call before reaching withAudit | Standard service-layer error; no audit record by design. |

The "cannot happen" guarantee is the load-bearing property. Audit-first ordering makes false-negative (silent destruction) impossible; only false-positive (orphaned attempt) is possible, and it's observable.

For ops where false-positive orphans are unacceptable (e.g., a future financial-reconciliation op where an "attempted" record creates audit confusion), upgrade that specific op to Option A via SECURITY DEFINER RPC. The registry entry then asserts RPC adoption instead of wrapper adoption. The upgrade is per-op, not all-or-nothing.

---

## 5. Application-layer hole enumeration

Per the security-architect guidance, Option C's hole is "anything that mutates data outside packages/services is invisible to it." Enumeration:

### 5.1 Service-layer destructive ops (CLOSED by Option C)

- `deletePayment` (payment.service.ts) → wrapped by `withAudit` in PR 2
- `cancelInvoice` (invoice.service.ts) → wrapped by `withAudit` in PR 2
- `revertManifest` (manifest.service.ts) → method does not exist today; **deferred to PR 2** where the method is designed + wrapped concurrently

### 5.2 Other potentially-destructive service methods (CLASSIFIED, not currently in registry)

A grep across `packages/services/src/*.service.ts` for `.delete()` and `.update(`:
- `manifest.service.ts:removeShipmentFromManifest` — destructive (removes manifest-shipment join row). NOT in registry by design: this is a manifest-composition edit, not a destruction of a primary record. If future product policy treats this as an auditable destructive op, add to the registry.
- `manifest.service.ts:departManifest`, `arriveManifest`, `reconcileManifest`, `closeManifest` — status transitions, not destructions; not in registry.
- Various services use `.update()` for normal mutations (status changes, field edits). Not destructive.

The registry's scope is **destruction of a primary financial / shipment / manifest record, OR a status transition that cannot be reversed without operator action.** This is documented in the registry file's header comment.

### 5.3 Application-layer code outside packages/services (DOES NOT EXIST per LAW 6/7)

LAW 6 ("no DB call in any component — only via `packages/services`") and LAW 8 ("no `@supabase/supabase-js` import in `apps/` — only via `packages/database`") together preclude any application code from issuing destructive SQL directly. The `pnpm audit:governance` CI gate enforces this.

### 5.4 Direct-SQL holes (ACKNOWLEDGED, not closed by Option C)

These can still bypass Option C entirely:

| Path | Hole shape | Mitigation |
|---|---|---|
| Admin running `psql` directly against the DB | Bypasses everything. | Operationally constrained — admin DB credentials are limited; production access requires a separate runbook. |
| Migrations issuing destructive SQL (e.g., `DELETE FROM invoice_payments WHERE ...`) | Bypasses the wrapper. | PR review + the migrations-fresh-apply gate. Future improvement: add a migration-lint rule that flags `DELETE` / destructive `UPDATE` and requires an audit-row INSERT in the same migration. NOT in scope this PR. |
| Supabase service_role JWT issuing destructive REST calls | Bypasses RLS entirely, including the no-UPDATE / no-DELETE policies on audit_logs itself. | service_role keys are restricted to server-side code (`packages/database` admin client + edge functions). Possession of service_role = god mode, and we accept this. |
| Future Supabase Edge Functions performing destructive ops | Could bypass `packages/services`. | NOT IN SCOPE this PR. If introduced, the function must call the same `withAudit` shape — enforced by PR review until codified. |

These holes are real but out of scope for PR 1. They are filed for awareness; mitigations live in operational runbooks, not in this PR.

---

## 6. Tamper-evidence properties (preserved from baseline, restated)

The existing baseline migration already provides:

- RLS ENABLED on `audit_logs`.
- **NO UPDATE policy** for any role. Postgres default-deny means UPDATE is rejected for every authenticated principal.
- **NO DELETE policy** for any role. Same default-deny semantics.
- INSERT policy: `auth.uid() IS NOT NULL` — any authenticated user may write an audit row (the wrapper enforces shape; RLS enforces "must be authenticated").
- SELECT policy: `get_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')`.

**Service-role bypass note:** Supabase's `service_role` JWT bypasses RLS by design. `packages/database/src/admin.ts` (the admin client) MUST NEVER issue UPDATE or DELETE against `audit_logs`. PR 1 adds a sentinel asserting no `audit_logs` UPDATE/DELETE statement appears anywhere under `packages/services/`, `packages/database/`, `supabase/functions/`. This sentinel runs as part of the standard test suite.

PR 1 does NOT loosen any existing RLS policy. It does NOT add an UPDATE or DELETE policy. The tamper-evidence properties are preserved.

---

## 7. Why this PR splits cleanly into two

Per the prompt's bailout clause:

**PR 1 (this PR — infrastructure):**
- Migration: add `before_state jsonb`, add CHECK constraint on `action`
- Fix `audit.service.ts` to match the actual schema (drop the phantom-column references, add `before_state` support)
- Update `AuditLog` type in `packages/types`
- Regenerate `database.types.ts`
- Add `withAudit` wrapper at `packages/services/src/shared/with-audit.ts`
- Add `DESTRUCTIVE_OP_REGISTRY` (typed) at `packages/services/src/shared/destructive-op-registry.ts`
- Add sentinel test: `__tests__/destructive-op-registry-coverage.test.ts` — fails CI if any registry entry is not withAudit-wrapped. Initially the registry contains the three planned actions; the sentinel verifies the **wrapper API + types + meta-sentinel exhaustiveness**, but the per-method "is wrapped?" assertion is deferred to PR 2 (the methods don't exist / aren't adopted yet). PR 1's sentinel asserts the registry shape and the wrapper's contract.
- Add sentinel test: `__tests__/audit-logs-no-update-delete.test.ts` — grep-style assertion that no UPDATE/DELETE against `audit_logs` exists in `packages/`, `apps/`, or `supabase/functions/`.
- Tests for `audit.service.ts` (logEvent happy path, error path, all-three-actions enum coverage, all-three-entities enum coverage)
- Tests for `withAudit` (audit-first ordering, fail-loud on audit failure, audit-row preserved on destructive failure, all three enum actions)

**PR 2 (next session — adoption):**
- Adopt `withAudit` in `deletePayment` (payment.service.ts)
- Adopt `withAudit` in `cancelInvoice` (invoice.service.ts)
- Design + add `revertManifest` method in `manifest.service.ts` (with its own design sub-decision: which manifest status transitions count as "revert"?), then adopt `withAudit`
- Flip the PR 1 sentinel from "wrapper-contract-only" to "every registry entry is wrapped in its service file"
- Update each service's test floor to cover the audit pairing

Both PRs are independently coherent. PR 1 ships a complete, tested infrastructure with no behavioral change to existing flows. PR 2 is pure adoption — no schema or wrapper changes, only registry-entry-by-registry-entry wiring.

The split is along a real seam, not a half-finished table.

---

## 8. References

- `supabase/migrations/20260515000001_baseline_from_production.sql` (existing audit_logs definition, lines 365-375; RLS policies lines 907-911)
- `packages/services/src/audit.service.ts` (existing broken `logEvent` impl)
- `packages/types/src/audit.types.ts` (existing `AuditLog` type, claims phantom fields)
- `packages/database/src/database.types.ts:15-47` (generated types — agree with schema, disagree with service)
- `packages/services/src/shared/with-rpc.ts` (precedent for the wrapper-at-shared/ shape)
- `docs/patterns/coderabbit-catalog.md` § 7.2 forcing-function sentinel pattern
- `docs/audits/2026-05-15-rbac-denial-audit.md` (precedent for PHASE-A audit matrix in PR body)
- `docs/retros/2026-05-16-shipment-service-tests.md` (PR #132 — test-floor pattern this PR's tests follow)
