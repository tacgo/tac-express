# Decision: WhatsApp failed-sends operator view (W2 PR 1, read path)

**Date:** 2026-05-17
**Author:** Claude Code (Opus 4.7) in PM-mode + Senior Frontend Architect + Designer + CTO.
**Status:** ACCEPTED — implemented in PR feat/whatsapp-retry-ui-142 (PR 1 of a 2-PR split).
**Scope:** the READ path of backlog item W2 / issue #142 — give operators a UI surface to SEE failed WhatsApp sends. The WRITE path (retry button + retry API route) is deferred to PR 2 per the bailout.

---

## 0. TL;DR — bailout fired; split along the read/retry seam

The brief named the seam explicitly: *"If the PHASE-0/PHASE-A inventory shows the full feature clearly exceeds one coherent PR, SPLIT along that seam: PR 1 (this session): visibility… PR 2 (next session): the retry action."*

| Aspect | PR 1 (this session) | PR 2 (filed as follow-up) |
|---|---|---|
| User capability | Operator can SEE failed WhatsApp sends | Operator can RETRY a failed send |
| New service method | `listFailedWhatsappSends(filters)` | wires existing `retryWhatsappSend(originalSendId, replayPayload)` to the UI |
| API routes | `GET /api/whatsapp/failed-sends` (server-rendered; see § B note) | `POST /api/whatsapp/retry-send` |
| UI components | `WhatsAppSendStatusBadge`, `FailedSendsTable`, `OpsWhatsAppFailedSendsView` (pure, prop-driven) | `RetryWhatsappSendButton` + state-handling extensions to the live wrapper |
| Independently coherent? | YES — visibility IS the gap PR #141 left open. Operators can audit failed deliveries with NO new functionality from PR 1 alone. | YES — wires existing primitives into the existing view |

Filing the follow-up issue before this session ends with the "do not bundle" marker. PR 1's body + the retro name PR 2's exact scope.

---

## A. COMPONENT BOUNDARY

Strict separation per LAW 5 (no UI components in apps/) and LAW 6/7 (no DB / business logic in components):

### packages/ui/src/components/composed/ — pure, prop-driven

1. **`whatsapp/whatsapp-send-status-badge.tsx`** — pure status badge.
   - **Props:** `{ status: WhatsAppSendStatus, className?: string }`
   - **Built on:** brutalist span (mirrors the existing `exception-severity-badge.tsx` pattern in the same project — font-mono, border, uppercase, semantic tokens only).
   - **Why a new badge (not reuse shadcn Badge):** the existing `exception-severity-badge` is the established project pattern for status-conveying badges; it's a sibling composed-component, not a shadcn primitive rebuild. Per LAW 14 we're not rebuilding shadcn `<Badge>` — we're following the existing "small composed status-badge mirroring exception-severity-badge" pattern. (If a future refactor consolidates all status badges into one parameterizable component, that's a separate cleanup PR.)

2. **`whatsapp/failed-sends-table.tsx`** — pure table.
   - **Props:** `{ rows: FailedWhatsappSendRow[], onRowClick?: (row) => void }`
   - **Built on:** the existing project `DataTable` component (`packages/ui/src/components/composed/data-table.tsx`) — which already builds on `@tanstack/react-table`. NO direct table rebuild. Columns are defined inside the new component (TanStack `ColumnDef<>` shape) and consume the pure `WhatsAppSendStatusBadge`.
   - **PII consideration:** the table shows `phone`, `endpoint`, `template_name?`, `attempt_no`, `error_message`, `queued_at`, `completed_at`. The `raw_response` field is NOT shown — too verbose for a list view and PII-dense (deferred to a future per-row detail view).

3. **`ops-console/pages/ops-whatsapp-failed-sends-view.tsx`** — the page-shape view.
   - **Props:** `{ rows: FailedWhatsappSendRow[] }`
   - **Built on:** the existing `OpsFrame` + `OpsPageHead` + `OpsCard` shell (same as `ops-notifications-view.tsx`). Composes the table inside a card. Pure — no fetching, no callbacks.
   - **Header:** mission-control style — eyebrow "WhatsApp", title "Failed Sends", subtitle naming the time window ("last 7 days"). Empty-state handled by `DataTable`'s built-in empty row (consistent with other operator pages).

### apps/dashboard/ — page composition + role-gating + data fetch

4. **`apps/dashboard/app/ops-console/whatsapp/failed-sends/page.tsx`** — thin server-component page. Imports the live wrapper. Sets `dynamic = "force-dynamic"` + a metadata title. Mirrors the established page-pattern (notifications/page.tsx).

5. **`apps/dashboard/app/ops-console/whatsapp/failed-sends/ops-whatsapp-failed-sends-live.tsx`** — the server-side data wrapper. Reads cookies, calls `getServerAuth(cookieStore)` + role-gates via `isManagerOrAbove(role)` mirroring `apps/dashboard/app/api/whatsapp/send-invoice/route.ts`. On RBAC denial: emits `captureRbacDenial(...)` and returns a minimal "Not authorized" view. On allowed: calls the new service method directly + passes rows to the pure view.
   - **Why server-rendered, not API-routed:** for a READ-only path, Next 16 server components can call services directly. An API route adds a network hop without a corresponding gain. PR 2's RETRY action (a mutation triggered by a button click) needs a POST route — that's where the api/whatsapp/retry-send route lives. The asymmetry is deliberate: read-side server-render; write-side API route. Same shape as several existing operator pages in the project.

### Boundary attestation

ZERO reusable UI components live in `apps/`. The two `apps/dashboard/.../whatsapp/failed-sends/*` files are page composition + data wiring only — they do NOT contain prop-driven reusable UI. LAW 5 respected.

---

## B. DATA READ PATH

```
   apps/dashboard/.../failed-sends/page.tsx                    (server component)
                 ↓
   apps/dashboard/.../failed-sends/ops-whatsapp-failed-sends-live.tsx
       (server component: auth + role-gate + service call)
                 ↓
   createTrackedWhatsAppServerService(cookieStore)             (existing factory; PR #141)
       .listFailedWhatsappSends({ limit: 50, sinceDays: 7 })   (NEW service method this PR)
                 ↓
   db.from("whatsapp_sends").select(...).eq("status","failed").gte(...).order(...).limit(...)
                 ↓
   PII-respecting RLS (SELECT scope = MANAGER+ only, per migration 20260517000001 § STEP 3)
                 ↓
   FailedWhatsappSendRow[] flows up as props
                 ↓
   <OpsWhatsAppFailedSendsView rows={rows} />                  (pure UI; packages/ui)
```

### Why one new service method (not "extend the existing wrapper")

The existing `TrackedWhatsAppService` interface in PR #141 exposes sends + retry. Adding `listFailedWhatsappSends` here:
- Lives in the same file (`packages/services/src/whatsapp-tracked.service.ts`) — keeps the WhatsApp tracking surface coherent.
- Method-level addition; the interface gets one new method. Tests mock via the established `makeDb` pattern.
- Returns rows typed as `FailedWhatsappSendRow` = `Pick<WhatsAppSendRow, ...selected fields>` — narrower than the full row to avoid leaking unused PII shape to the UI.

### RLS implication

`whatsapp_sends_select_admin` policy restricts SELECT to `SUPER_ADMIN / ADMIN / MANAGER`. Even if a lower-role caller somehow got past the page's role-gate, RLS would return zero rows for them. Defense-in-depth.

### Default filters

- `status = 'failed'` (only failed sends in this view).
- `completed_at >= now() - 7 days` (matches the migration header's documented retry-window query).
- Sorted `completed_at DESC` (most-recent first).
- Limited to 50 rows (sufficient for an operator triage view; pagination is a future enhancement if the volume justifies it).

---

## C. RETRY ACTION PATH — DEFERRED TO PR 2

Bailout fired. PR 2 will add:

```
   button click in <RetryWhatsappSendButton onRetry={…} />     (pure UI; packages/ui)
                 ↓
   live-component handler in apps/dashboard
                 ↓
   POST /api/whatsapp/retry-send (apps/dashboard, role-gated)  (NEW)
                 ↓
   svc.retryWhatsappSend(originalSendId, replayPayload)        (existing primitive; PR #141)
                 ↓
   { result, newSendId } returned
                 ↓
   live-component triggers refetch / optimistic state update
                 ↓
   PR 1's table re-renders with the new attempt row appearing
```

PR 2 scope is fully named in the follow-up issue filed this session. PR 1 ships with NO retry-related code in the components or the page — the visibility piece is the unit of value.

---

## D. STATUS MODEL

From `packages/types/src/whatsapp-send.types.ts` + the migration:
- `WhatsAppSendStatus = "queued" | "sent" | "failed"`
- Append-only-per-attempt row model: each retry is a NEW row with `attempt_no = previous + 1` and `original_send_id = previous.id`. **The failed row is never modified.**

### What this view shows

- **`status='failed'`** rows only (in this view).
- Each failed row is its own line item; if a send was retried 3 times (3 separate API calls), 3 separate rows appear. The operator can see the full attempt chain via `attempt_no` (column shown) + `original_send_id` (used for future grouping; not shown as a column in V1).

### What retry does (PR 2 preview, for the operator mental model)

A retry inserts a NEW row (`attempt_no = N+1`, `original_send_id = the failed row's id`). The failed row stays in this view; the new attempt either succeeds (it disappears from this view because it's now `status='sent'`) or fails again (and shows up as a new row in this view with the linkage). PR 1 doesn't act on this; it just displays the rows.

### What does NOT appear in this view

- `status='queued'` rows: an in-flight send not yet completed — operator has no action; auto-refresh would help (future enhancement).
- `status='sent'` rows: successful sends; the per-invoice history is a future view, not the failed-sends triage view.
- WAMID-null is one CAUSE of `status='failed'` (PR #148 added the `semanticFailure` flag at the service-result level; the persisted row has `status='failed' + error_message` like any other failure). The view shows `error_message` so the operator can distinguish semantic-failure ("WhatsApp rejected...") from transport-failure ("Network error...").

---

## E. SEMANTIC-TOKEN / SCOPE CHECK

### Tokens audit

The new components need to convey:
- `failed` status — `text-destructive` + `border-destructive/40` + `bg-destructive/5` (matches `exception-severity-badge.tsx::STATUS_STYLES.OPEN`).
- `queued` (not in this view but defined for completeness) — `text-accent-warning` + `border-accent-warning/40` + `bg-accent-warning/5`.
- `sent` (not in this view but defined for completeness) — `text-primary` + `border-primary/40` + `bg-primary/5` (mirrors `STATUS_STYLES.RESOLVED`).

All three semantic tokens already exist in `packages/ui/src/styles/globals.css` (verified). **No new tokens added.** No Tailwind color classes. No arbitrary values.

### Visual identity

TAC Express v5.0 Violet Grid:
- `--radius: 0rem` (LAW 13) — sharp corners only.
- Brutalist offset shadows — only where the existing `OpsCard` already uses them; no new shadow utilities.
- Plus Jakarta Sans / IBM Plex Mono — fonts inherited from the app layout; no font declaration in components (LAW 4).
- Icons via `@workspace/ui/icons` (which proxies @remixicon/react) (LAW 2).
- No motion/react animation in V1 — the operator-triage view is functional, not decorative.

**Note on the brief's "TAC Orbital + 0.125rem" framing:** the brief's preamble used stale terminology. AGENTS.md and globals.css are the authoritative sources; followed them. The brief's PROJECT LAWS list correctly defers to globals.css. Recorded for posterity — when a brief's design-system-name differs from AGENTS.md, AGENTS.md wins.

### Scope boundary (explicit per the brief)

- **In scope:** READ-ONLY visibility view of failed WhatsApp sends (PR 1 of a 2-PR split).
- **NOT in scope this PR:** the retry button + retry API route + post-retry state handling — deferred to PR 2.
- **NOT in scope this session at all:** #143 (automated background retry), #144 (Meta delivery webhook), #145 (immutability sentinel for whatsapp_sends).

---

## PHASE-A INVENTORY

### Component list (final)

| Component | Package | Pure? | Props / shadcn primitive | New tests |
|---|---|---|---|---|
| `WhatsAppSendStatusBadge` | `packages/ui/src/components/composed/whatsapp/` | YES | `{ status: WhatsAppSendStatus; className? }` | Vitest + RTL (status mapping + uppercase class) |
| `FailedSendsTable` | `packages/ui/src/components/composed/whatsapp/` | YES | `{ rows: FailedWhatsappSendRow[]; onRowClick?(row) }` — built on existing `DataTable` | Vitest + RTL (renders columns + uses status badge) |
| `OpsWhatsAppFailedSendsView` | `packages/ui/src/components/composed/ops-console/pages/` | YES | `{ rows: FailedWhatsappSendRow[] }` — built on `OpsFrame` + `OpsPageHead` + `OpsCard` + the above table | (covered transitively + the live-component test) |
| `OpsWhatsAppFailedSendsLive` | `apps/dashboard/app/ops-console/whatsapp/failed-sends/` | NO (server component; auth + service call) | (no exported props) | — (server component; tested via the service-method test) |
| `page.tsx` | `apps/dashboard/app/ops-console/whatsapp/failed-sends/` | NO (server page entry) | — | — |
| `listFailedWhatsappSends` service method | `packages/services/src/whatsapp-tracked.service.ts` | (service code) | `({ limit?, sinceDays? }) → FailedWhatsappSendRow[]` | Vitest + makeDb (happy + filter values + empty + error) |
| `FailedWhatsappSendRow` type | `packages/types/src/whatsapp-send.types.ts` | (type) | `Pick<WhatsAppSendRow, ...>` | — |

### Test plan

- **Service-method tests** (extend `packages/services/src/__tests__/whatsapp-tracked.service.test.ts`): happy path (rows returned), filter values asserted (status='failed', sinceDays cutoff via `.gte("completed_at", iso)`, `.order("completed_at",{ascending:false})`, `.limit(50)`), empty result, error rethrow. Uses `makeDb` + `makeBuilderSpy` per the established pattern. Estimated: ~5 new test cases.
- **Component tests** (vitest + @testing-library/react, matching `packages/ui/src/components/button.test.tsx` shape): `WhatsAppSendStatusBadge` (renders status text, applies correct class for each status, exposes the label uppercased). `FailedSendsTable` (renders rows, calls onRowClick when row clicked, renders empty state when no rows). Estimated: ~6 new test cases.
- **No new e2e**: the e2e workflow's `visual + a11y` job covers existing routes; a new admin route is added but not exercised in the snapshot baseline. Per the brief's "do NOT build a new e2e framework," I match the existing pattern — which appears to be: page-level e2e is added in a separate sweep, not per-PR. (Confirmed by surveying existing operator pages in apps/dashboard: most don't have per-page e2e specs.)
- **No new test infrastructure.** Reuses `makeDb`, `makeBuilderSpy`, vitest, @testing-library/react.

### a11y checklist

- **Table semantics:** uses the existing `DataTable` component, which renders a real `<table>` with `<thead>` / `<tbody>` / proper roles. ✅
- **Status NOT conveyed by color alone:** the `WhatsAppSendStatusBadge` shows the status TEXT (uppercase) inside the badge. Color is decorative reinforcement, not the only signal. ✅
- **Row click affordance:** `DataTable`'s `onRowClick` adds `role="button"` semantics + keyboard activation (per the existing DataTable contract); PR 1's table uses it for "show details" in a future iteration, currently no-op (the prop is omitted entirely in V1 to avoid a click that does nothing).
- **Page heading hierarchy:** `OpsPageHead` provides `<h1>` semantics for the page title. ✅
- **No new aria patterns introduced** — the components reuse established a11y machinery from the existing project components.

### LoC estimate

| Surface | LoC (approx) |
|---|---|
| `WhatsAppSendStatusBadge` | ~30 |
| `FailedSendsTable` | ~120 (column defs + the date-format helper inline + the DataTable wiring) |
| `OpsWhatsAppFailedSendsView` | ~50 |
| `OpsWhatsAppFailedSendsLive` (server) | ~50 |
| `page.tsx` | ~15 |
| Service method + types | ~50 |
| Tests (service + component) | ~200 |
| Backlog update + retro + handoff | ~250 |

Total: ~750 LoC, ~25% docs. Comfortably within a one-PR scope.

---

## Cross-references

- [#142](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/142) — the issue this discharges (PR 1 of 2)
- [PR #141](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/pull/141) — the whatsapp_sends table + the `retryWhatsappSend` primitive PR 2 will wire to a button
- `docs/decisions/2026-05-17-whatsapp-sends-mechanism.md` — the row-model decision (append-only-per-attempt) that drives this view's column choices
- `docs/backlog/production-readiness.md` — backlog item W2 (status updates this PR)
- AGENTS.md § 3 + § 4 — the design-system + 14 laws this PR follows
