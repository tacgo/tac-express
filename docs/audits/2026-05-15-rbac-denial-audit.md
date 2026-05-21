# RBAC Denial + RPC Migration Audit — 2026-05-15

> **Purpose:** classify every `canAccess` / `canDo` / role-gate call site as **BLOCK** / **GATE** / **AMBIGUOUS**, and every `.rpc(...)` site as **DIRECT-WRAP** / **SELECTIVE** / **DEFERRED**, BEFORE any adoption code lands. Issue #112's load-bearing safeguard: classification first, instrumentation second. The audit is committed as the first commit of PR α so reviewers can independently verify the bucketing.

**Scope:** all of `apps/` + `packages/` excluding tests + node_modules.
**Branch baseline:** `main` at `e333e0c` (post-#113).
**Helpers consumed:** `captureRbacDenial` (from `@workspace/auth`) and `withRpc` / `captureSupabaseRpcError` (from `@workspace/services`).

---

## 0. Executive summary

| Class | Count | Action in PR α |
|---|---|---|
| RBAC **BLOCK** sites | 3 | Adopt `captureRbacDenial` at each |
| RBAC **GATE** sites | ~10 | Do NOT adopt — silent UX behavior, not page-worthy |
| RBAC **AMBIGUOUS** sites | 1 | Document, leave un-adopted, file follow-up |
| RPC **DIRECT-WRAP** sites | 5 | Wrap with `withRpc(name, exec)` |
| RPC **SELECTIVE** sites | 3 | Selectively call `captureSupabaseRpcError` on the real-error branch (skip RPC-not-deployed fallback) |
| RPC **DEFERRED** sites | 1 | `// SENTRY-MIGRATION-DEFERRED: <reason>` comment + follow-up |

**Total RBAC sites considered:** ~14 (3 BLOCK + ~10 GATE + 1 AMBIGUOUS).
**Total RPC sites considered:** 9 (payment.service already adopted in PR #113 — counted as a 10th but out of this PR's scope).

---

## 1. Methodology

**RBAC inventory queries:**

```bash
grep -rn "canAccess\|canDo\|hasMinimumRole\|isAdminOrAbove\|isManagerOrAbove\|isWarehouseRole\|isSuperAdmin\|canAccessModule" \
  apps/ packages/ --include="*.ts" --include="*.tsx" \
  | grep -v __tests__ | grep -v node_modules
```

**RPC inventory query:**

```bash
grep -rn "\.rpc(" packages/services/src/ --include="*.ts" \
  | grep -v __tests__ | grep -v "with-rpc.ts"
```

**Classification axes:**

| Class | Definition |
|---|---|
| **BLOCK** | Server-side enforcement that terminates the request with 401/403 OR redirects. False return → user *cannot* perform the action. **A spike here means probing or misrouted automation — page-worthy.** |
| **GATE** | UI conditional rendering. False return → the UI element is hidden or disabled. Normal traffic at any role; not page-worthy. **Instrumenting these would generate noise that mutes rule 5 within a week.** |
| **AMBIGUOUS** | Branches that gate "extra information" or "admin-only content" within an already-authorized flow. Not strictly a denial; defer pending design discussion. |
| **DIRECT-WRAP** | RPC site with no fallback branch — `withRpc(name, exec)` is a drop-in replacement. |
| **SELECTIVE** | RPC site with an `isMissingRpcOrRelation`-style fallback (issue #19 pattern). The fallback is normal business state during migration windows; emitting on it would create alert noise. Call `captureSupabaseRpcError` only on the real-error branch (`if (!isMissingRpcOrRelation(rpc.error)) { captureSupabaseRpcError(...); throw rpc.error }`). |
| **DEFERRED** | RPC site that already swallows errors by design (e.g. a `try { rpc } catch { return [] }` pattern for non-critical background data). Adopting would change observable behavior. Mark with `// SENTRY-MIGRATION-DEFERRED: <reason>` + file follow-up. |

---

## 2. RBAC denial sites

### 2.1. BLOCK (3 sites — adopt `captureRbacDenial`)

| # | File | Line | Gate predicate | Denial response | Surface ID |
|---|---|---|---|---|---|
| 1 | [`apps/dashboard/app/api/diagnostics/sentry/route.ts`](../../apps/dashboard/app/api/diagnostics/sentry/route.ts) | 79 | `!isManagerOrAbove(role)` | `403 "Insufficient permissions. Sentry diagnostics require MANAGER or above."` | `/api/diagnostics/sentry` |
| 2 | [`apps/dashboard/app/api/whatsapp/send-invoice/route.ts`](../../apps/dashboard/app/api/whatsapp/send-invoice/route.ts) | 189 | `!isManagerOrAbove(role)` | `403 "Insufficient permissions. Sending invoices via WhatsApp requires MANAGER or above."` | `/api/whatsapp/send-invoice` |
| 3 | [`apps/dashboard/app/api/whatsapp/test/route.ts`](../../apps/dashboard/app/api/whatsapp/test/route.ts) | 54 | `!isManagerOrAbove(role)` | `403 "Insufficient permissions. WhatsApp diagnostics require MANAGER or above."` | `/api/whatsapp/test` |

**Required role tag:** `MANAGER` (the floor for all three).
**Actual role tag:** `role` value at the gate (UserRole enum, deterministic string).
**Surface tag:** literal route path (no user-controlled segments — all three are static).
**Adoption pattern (per BLOCK site):**

```ts
import { captureRbacDenial } from "@workspace/auth"
import { UserRole } from "@workspace/types"

if (!role || !isManagerOrAbove(role)) {
  captureRbacDenial({
    requiredRole: UserRole.MANAGER,
    actualRole: role ?? UserRole.OPS_STAFF, // sentinel for "no role / not authenticated"
    surface: "/api/whatsapp/send-invoice", // hardcoded; never req.url
  })
  return NextResponse.json({ error: "...", status: 403 })
}
```

Note: `captureRbacDenial` returns the constructed `RbacDeniedError` but does NOT throw — these routes already return `NextResponse.json(..., { status: 403 })`. We invoke the helper for the side-effect (emit) only.

### 2.2. GATE (~10 sites — do NOT adopt)

| # | File | Pattern |
|---|---|---|
| 1 | [`packages/ui/src/components/composed/dashboard/quick-actions.tsx`](../../packages/ui/src/components/composed/dashboard/quick-actions.tsx) | Filters dashboard quick-action chips by `canAccessModule(a.module)` |
| 2 | [`packages/ui/src/components/composed/sidebar/sidebar.tsx`](../../packages/ui/src/components/composed/sidebar/sidebar.tsx) | Filters sidebar items by `canAccess(item.module)` |
| 3 | [`packages/ui/src/components/composed/sidebar/nav-config.ts`](../../packages/ui/src/components/composed/sidebar/nav-config.ts) | Module-membership check |
| 4 | [`packages/ui/src/hooks/use-rbac.ts`](../../packages/ui/src/hooks/use-rbac.ts) | The hook itself — composes the predicates |
| 5+ | Various `packages/ui` components consuming `useRBAC().canAccessModule` for conditional UI | Same shape — UI element shown/hidden |

**Why GATE:**
- Normal operator traffic invokes these on every page load. A WAREHOUSE_STAFF user viewing the dashboard "denies" 6 sidebar items per render — that's 60+ events/minute under normal load.
- A "false" from `canAccessModule` produces silent UX (the element doesn't render). The user isn't blocked from anything — they just don't see something they wouldn't use anyway.
- Adopting `captureRbacDenial` here would saturate the rule 5 alert and force operators to mute it.

**Rule of thumb:** if the false branch produces silent UX, it's a GATE. If the false branch produces 401/403/redirect, it's a BLOCK.

### 2.3. AMBIGUOUS (1 site — RESOLVED #115 → silent by design)

| # | File | Line | Predicate | Why ambiguous |
|---|---|---|---|---|
| 1 | [`apps/dashboard/app/api/whatsapp/send-invoice/route.ts`](../../apps/dashboard/app/api/whatsapp/send-invoice/route.ts) | 335 | `const isAdmin = isAdminOrAbove(role)` | Used inside a COMPOUND denial condition: `(phone-mismatch && (!override || !admin))` returns 403. Role is one of multiple factors, not the sole gate. False-from-role + false-from-override-flag both produce 403. |

**RESOLUTION (#115):** RBAC-EMISSION SILENT-BY-DESIGN. The site is NOT a canonical RBAC denial — emitting `captureRbacDenial` would mis-attribute non-role denials (admin without override flag) as RBAC events. The MANAGER block-gate at line 189 is the canonical RBAC adoption site for this route. Source comment refreshed in commit landing this resolution. Full rationale + revisit triggers in `docs/runbooks/sentry-alert-rules.md § 4.1` (Sentry deactivated).

> Note: line reference updated from `:325` (the audit's initial approximation) to `:335` (the actual line of the `isAdminOrAbove` call). The behavior described is unchanged.

---

## 3. RPC call sites

### 3.1. DIRECT-WRAP (5 sites — `withRpc(name, exec)` drop-in)

| # | File | Line | RPC name | Notes |
|---|---|---|---|---|
| 1 | [`packages/services/src/exception.service.ts`](../../packages/services/src/exception.service.ts) | 48 | `resolve_exception` | No fallback; `throw error` on error |
| 2 | [`packages/services/src/manifest.service.ts`](../../packages/services/src/manifest.service.ts) | 125 | `close_manifest_atomic` | No fallback; `throw error` on error |
| 3 | [`packages/services/src/rate-card.service.ts`](../../packages/services/src/rate-card.service.ts) | 96 | `get_rate_card` | No fallback; `throw error` on error |
| 4 | [`packages/services/src/shipment.service.ts`](../../packages/services/src/shipment.service.ts) | 90 | `generate_awb_number` | No fallback; `throw error` on error |
| 5 | [`packages/services/src/shipment.service.ts`](../../packages/services/src/shipment.service.ts) | (post-wrapper line) | (no second RPC site beyond line 118; see SELECTIVE 3.2.3) | — |

**Adoption pattern:**

```ts
import { withRpc } from "./shared/with-rpc"

// Before:
const { data, error } = await db.rpc("get_rate_card", args)
// After:
const { data, error } = await withRpc("get_rate_card", () => db.rpc("get_rate_card", args))
```

Return shape identical; existing callers don't change.

### 3.2. SELECTIVE (3 sites — `captureSupabaseRpcError` on real-error branch only)

| # | File | Line | RPC name | Fallback discriminator |
|---|---|---|---|---|
| 1 | [`packages/services/src/booking.service.ts`](../../packages/services/src/booking.service.ts) | 200 | `convert_booking_to_shipment` | `isMissingRpcOrRelation(rpc.error)` |
| 2 | [`packages/services/src/manifest.service.ts`](../../packages/services/src/manifest.service.ts) | 90 | `add_shipment_to_manifest` | Inline check on `PGRST202` / `42883` / `/function .* does not exist/i` |
| 3 | [`packages/services/src/shipment.service.ts`](../../packages/services/src/shipment.service.ts) | 118 | `bulk_create_shipments` | `isMissingRpcOrRelation(rpc.error)` |

**Adoption pattern:**

```ts
if (rpc.error && !isMissingRpcOrRelation(rpc.error)) {
  captureSupabaseRpcError("convert_booking_to_shipment", rpc.error)
  throw rpc.error
}
// fallback path runs only when RPC is missing — silent during migration window
```

**Why not `withRpc` here:** `withRpc` emits on ANY error. The "RPC not yet deployed" fallback is normal business state during issue #19 / #9 migration windows; emitting on it would create alert noise that gets rule 4 muted.

### 3.3. DEFERRED (1 site — RESOLVED #115 → silent by design)

| # | File | Line | RPC name | Resolution |
|---|---|---|---|---|
| 1 | [`packages/services/src/dashboard.service.ts`](../../packages/services/src/dashboard.service.ts) | 228 | `detect_sla_breaches` | Silent-by-design. Option (a) chosen: keep silent, document explicitly. |

**RESOLUTION (#115):** SENTRY-SILENT-BY-DESIGN. The widget powered by this RPC degrades gracefully — silent failure is the contract, not the bug. Adopting `withRpc()` would saturate rule 4 during migration windows and operator-mute that rule → real RPC failures elsewhere lose their paging signal. Full rationale + revisit triggers in `docs/runbooks/sentry-alert-rules.md § 4.1` (Sentry deactivated).

**Updated marker pattern (in source after the resolution):**

```ts
async getSLABreaches(limit = 10): Promise<SLABreach[]> {
  try {
    // SENTRY-SILENT-BY-DESIGN (decision recorded #115, runbook § 4.1):
    // [full rationale + revisit triggers — see source]
    const { data, error } = await db.rpc("detect_sla_breaches" as never)
    // ...
```

**Revisit triggers (also documented at source):**
- If we accumulate ≥3 RPC sites that want low-severity emission, build an `emitTaggedInfo` helper and revisit.
- If a customer-facing impact is ever traced back to a silent `detect_sla_breaches` failure, escalate.

---

## 4. Adopting at the BLOCK sites — PII attestation

Every field captured at the three BLOCK sites:

| Field | Source | PII risk | Mitigation |
|---|---|---|---|
| `rbac.denial` | hardcoded `"true"` | None | — |
| `rbac.required_role` | `UserRole.MANAGER` (literal) | None | Enum value |
| `rbac.actual_role` | `role` from `profile.role`, validated against `Object.values(UserRole)` (whatsapp routes) or sentinel `UserRole.OPS_STAFF` for unauthenticated | None | Enum value; never user.email/user.id/full row |
| `rbac.surface` | hardcoded route path (`/api/whatsapp/send-invoice` etc.) | None | Literal string per site; no `req.url` derivation, no body fields |
| `RbacDeniedError.message` | template using above fields | None | Constructed only from deterministic strings |

**Explicit non-capture (verified per site):**
- No `user.id` in tags (Sentry.setUser is the consumer's responsibility upstream)
- No `user.email` / `user.full_name`
- No request body, query params, headers
- No session / JWT / cookie
- No `req.url` / dynamic route segments (all three BLOCK sites have static paths)

---

## 5. Total LoC estimate

| Concern | Files touched | Estimated additions |
|---|---|---|
| 3 BLOCK adoptions (helper call + import) | 3 | ~30 |
| 5 DIRECT-WRAP migrations | 4 | ~25 |
| 3 SELECTIVE migrations | 3 | ~30 |
| 1 DEFERRED marker | 1 | ~6 |
| Unit tests (per migrated service file + per BLOCK site) | ~7 new test files | ~600 |
| Runbook + handoff + retro | 3 | ~250 |
| **Total** | **~21 files** | **~941 additions** |

Well under the §7a 1500-LoC cap. No bailout activation required.

---

## 6. Follow-up scope (filed alongside PR α)

1. ~~**Dashboard SLA-breaches RPC (DEFERRED):** decide silent-vs-info-vs-error semantics for `dashboard.service.ts:228`. May require a new helper (`emitTaggedInfo` for low-severity emission).~~ **RESOLVED #115** → silent by design + documented (§ 3.3 above; runbook § 4.1).
2. ~~**AMBIGUOUS site:** clarify whether `isAdminOrAbove` at `send-invoice/route.ts:325` deserves a sub-role observability surface.~~ **RESOLVED #115** → silent by design (compound-condition denial, not canonical RBAC; § 2.3 above; runbook § 4.1).
3. **`canAccessModule` traffic at GATE sites — STATUS: WONTFIX-UNLESS-TRIGGERED.**
   Investigate whether a sampled emission (1% of GATE traffic) would surface UX patterns useful for product without saturating rule 5.

   **Trigger conditions for re-opening (revisit on any of these):**
   - Product or UX requests "where do non-admin users hit gated features" / "which features are non-admin users attempting" → file tracker + scope.
   - A real incident traces back to undetected GATE-site abuse (e.g. probing, automated scraping) → file tracker + escalate scope.
   - Sentry rule 5 (RBAC denial spike) accumulates ≥3 alert-fatigue mutes traceable to GATE-traffic noise → revisit *adoption* boundary, not new emission.

   **Why not file a tracker now:** the use case is speculative; building sampled-emission infrastructure for a "maybe" surface is premature optimization. The grep handle for future discovery is `WONTFIX-UNLESS-TRIGGERED` in this file — `grep -r WONTFIX-UNLESS-TRIGGERED docs/audits/` lands the next contributor here without needing to know item 3 exists.

   *Last reviewed: 2026-05-16. If still un-triggered at 2026-08-16, re-evaluate the wontfix call.*

---

## 7. Sign-off

The classification above is the binding contract for PR α's adoption commits. Reviewers should:
1. Sanity-check that every BLOCK site listed in § 2.1 is server-side enforcement (401/403/redirect).
2. Sanity-check that every GATE site listed in § 2.2 produces only silent UX.
3. Sanity-check that the AMBIGUOUS site (§ 2.3) genuinely does not produce a denial response.
4. Verify the DIRECT-WRAP / SELECTIVE / DEFERRED bucketing against the actual file contents (each row links to file:line).

If any classification is contested, fix the audit doc FIRST, re-commit, then proceed with adoption. Adoption that doesn't match the audit doc is a process failure, not just a code review failure.
