# Rollback Playbook

How to back out specific feature areas without doing a full revert. Use
when a customer reports a regression and you need to disable the
feature within minutes, not within a redeploy cycle.

> **TL;DR**: prefer feature-flags over code-reverts. Code-reverts last.

## Decision tree

```
A regression was reported. Is there a runtime kill switch?
├── Yes → flip the switch (no redeploy)
└── No  → does a feature flag exist?
         ├── Yes → flip the flag in DB or env (no redeploy)
         └── No  → revert specific files at specific commits (this doc)
```

---

## Active runtime kill switches

These can be flipped without a redeploy cycle:

| Feature | Mechanism | How to disable |
|---|---|---|
| WhatsApp invoice send | Env: `WHATSAPP_ENABLED` | Set to anything other than `"true"` in Vercel/deploy env. Routes return 503 immediately. UI's Send button auto-disables (PR #40). |
| Sentry telemetry | Env: `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Unset to revert to no-telemetry. `Sentry.init()` is gated on DSN presence. |
| Public PDF route | Env: `INVOICE_PDF_SIGNING_SECRET` rotation | Rotate the HMAC secret to invalidate every already-sent signed URL. Live URLs return 401. |
| Auto-generated invoice PDF in WhatsApp | Env: `NEXT_PUBLIC_DASHBOARD_URL` set to localhost / unset | Forces the dialog into manual-URL mode. WhatsApp send still works; operator pastes URL manually. |
| Payment recording (currently disabled) | DB migration deploy gate | Until #9 lands, `recordPayment()` throws by design. No flip needed. |

---

## File-level reverts (PR #8 features)

Pre-PR-#8 baseline commit: **`9534b6f`** (Merge pull request #7).

When a feature can't be disabled via flag, revert these specific files
at the listed commit. Each entry assumes you're rolling back JUST that
feature — leaving the others in place.

### 1. TAC Orbital charts

**Symptom of regression**: charts on `/analytics` or `/home` render
incorrectly, throw on data shape, or trigger excessive Supabase reads.

**Files to revert** (at `9534b6f^`):
- `apps/dashboard/app/(dashboard)/analytics/analytics-client.tsx`
- `apps/dashboard/app/(dashboard)/home/home-client.tsx`
- `packages/services/src/orbital.service.ts` (delete)
- `packages/types/src/orbital.ts` (delete)
- `packages/ui/src/components/charts/` (entire directory — restore from `9534b6f`)

**Schema impact**: none. Orbital reads existing tables (`shipments`,
`invoices`, `manifests`). Reverting only removes UI + service layer.

**Watch for**: legacy `composed/charts/` directory was deleted in PR
#8. Restore it from `9534b6f` if any consumer imports from there.

### 2. Smart Address Fields

**Symptom**: invoice wizard's billing/sender/receiver fields fail to
hydrate from saved drafts, or `pincode` lookup throws.

**Files to revert**:
- `packages/ui/src/components/composed/smart-address-fields.tsx` (delete)
- `apps/dashboard/app/(dashboard)/customers/customer-form.tsx` (revert to
  plain inputs)
- `packages/ui/src/components/composed/finance/invoice-wizard.tsx` (revert
  the structured `billingLine1/Line2/City/State/Zip` additions)

**Schema impact**: ADDITIVE. Existing `notes.billing` JSON objects stay
on disk and are ignored by the reverted code. The legacy `notes.billingAddress`
joined string keeps working.

**Watch for**: `normalizeBillingDraft()` in
`@workspace/services/invoice-draft.service` references the structured
shape. Either revert it to a no-op or delete and adjust callers.

### 3. Auth redesign (split layout)

**Symptom**: split sign-in layout regresses on mobile or tablet, or the
Lottie animation fails to load.

**Files to revert**:
- `apps/dashboard/app/(public)/sign-in/[[...sign-in]]/page.tsx`
- `apps/web/app/sign-in/[[...sign-in]]/page.tsx`
- Delete the auth Lottie file under `public/lottie/` (large; gitignore
  or delete).

**Schema impact**: none. Auth flow is identical at the Supabase layer.

### 4. Dashboard home overhaul

**Symptom**: the `/home` page hero or dashboard header renders
incorrectly.

**Files to revert**:
- `apps/dashboard/app/(dashboard)/home/home-client.tsx` (must revert in
  lockstep with #1 if both rolled back together — they share the
  Orbital chart imports)
- `packages/ui/src/components/composed/dashboard-header.tsx` (the
  early-return added in PR #8)
- Restore the embedded hero-banner JSX from `9534b6f`.

**Schema impact**: none.

### 5. WhatsApp / Lemin invoice send

**Use the kill switch**, not a code revert: set `WHATSAPP_ENABLED=false`
in deploy env. `/api/whatsapp/send-invoice` and `/api/whatsapp/test`
return 503 immediately; UI Send button auto-disables (PR #40); no
redeploy needed.

If the upstream change requires a code-level rollback (e.g. WPBox API
signature change broke our request shape):
- `apps/dashboard/app/api/whatsapp/send-invoice/route.ts`
- `apps/dashboard/app/api/whatsapp/test/route.ts`
- `packages/services/src/whatsapp.service.ts`
- `packages/services/src/hooks/use-whatsapp.ts`
- `packages/ui/src/components/composed/finance/send-whatsapp-dialog.tsx`

**Schema impact**: none. WhatsApp metadata isn't persisted by the
dashboard.

### 6. Customer-list TanStack migration

**Symptom**: `/customers` table fails to render, sort, or filter.

**Files to revert**:
- `apps/dashboard/app/(dashboard)/customers/customers-client.tsx`
- `apps/dashboard/app/(dashboard)/customers/columns.tsx` (delete)
- The DataTable in `packages/ui/src/components/composed/data-table.tsx`
  was consolidated in PR #38. The customer list is now its only direct
  consumer; reverting the customer list to plain `<table>` is fine —
  DataTable can stay for future consumers.

**Schema impact**: none.

---

## How to invoke this playbook

1. Open the GitHub Issue tagged with the regression. Reference this
   doc by section.
2. Confirm the bug isn't fixable forward in <30 min. If it is, fix
   forward.
3. If reverting:
   - Create a `revert/` branch
   - Cherry-pick the inverse of the listed files
   - PR + ship as a hotfix
   - Add a follow-up issue describing what broke + what the proper
     fix should look like

---

## NextAdmin Refactor (multi-phase, 2026-05+)

The NextAdmin-inspired refactor reshapes layout tokens, page composition,
StatCard / DataTableCard / FormCard primitives, and adds Postgres FTS +
pgvector semantic search. Each phase ships as a single PR so any phase
can be reverted independently. Read in order: [Layer 1](#layer-1--git-tag-doomsday-button) is the
last-resort restore, [Layer 5](#layer-5--db-migration-rollback-phase-6-only) is the most invasive.

### Pre-refactor baseline tag

```bash
git tag --list pre-nextadmin-refactor-v1
# pre-nextadmin-refactor-v1 → commit 38e8848 (main @ PR #53 squash merge)
```

### Layer 1 — Git tag (doomsday button)

Full restore of every line. Use only when Layers 2–5 cannot localize the
problem.

```bash
git checkout pre-nextadmin-refactor-v1   # detached HEAD at the baseline
git checkout -b recovery/full-restore     # branch
# Cherry-pick any non-refactor commits that landed after the tag, then PR.
```

### Layer 2 — Phase-level PR revert

Each phase below is one PR. `gh pr revert <PR#>` rolls back a phase
without touching the others. Phases must not be bundled.

| Phase | Scope | Touches DB? |
|---|---|---|
| 1 | spacing tokens + responsive padding + `PageShell` `wide` variant | No |
| 2 | `StatCard` consolidation (replaces `HeroStatsCard` + ad-hoc KPIs) | No |
| 3 | `DataTableCard` wrapper around existing `composed/data-table.tsx` | No |
| 4 | Form primitives: `FormCard` / `FormStepper` / `FormGrid` / `FormFooter` | No |
| 5 | Two-column detail-page pattern (Shipment, Customer) | No |
| 6a | FTS migration (`search_vector` generated columns + GIN indexes) | Yes |
| 6b | pgvector extension + embedding columns + HNSW + write-time trigger | Yes |
| 6c | `global_search` RPC + `packages/services/src/search.service.ts` + `GlobalSearch` UI | No |

### Layer 3 — Design-version flag (per-user)

Refactored pages branch on `useDesignVersion()` from
`@workspace/ui/hooks/use-design-version`. Default is `v6` (current). Set
`v7` to opt into the new design. Resolution order:

1. `window.localStorage['tac-design']` — per-user override
2. `process.env.NEXT_PUBLIC_DESIGN` — per-deploy default
3. `'v6'` — hard-coded default

**Per-user revert** (no redeploy, no PR):

```js
// In browser DevTools, on any TAC Express tab:
localStorage.setItem('tac-design', 'v6')
location.reload()
```

**Deploy-wide revert** (Vercel/env): set `NEXT_PUBLIC_DESIGN=v6` (or
unset it). Forces every user back to v6 on next page load.

The admin-only Settings → System toggle ships with Phase 1 so
non-technical reviewers can switch without DevTools.

### Layer 4 — Visual regression baseline

Run the full Playwright visual suite at the start of each phase and
before merge. Unexpected delta on an unrelated page → block the PR.

```bash
pnpm --filter dashboard playwright test --grep @visual
```

### Layer 5 — DB migration rollback (Phase 6 only)

Each migration in `supabase/migrations/<timestamp>_<slug>/` ships with a
matching `down.sql` (LAW-aligned with `tac-supabase-schema`). Order
matters — drop dependents first:

```sql
-- Phase 6c
DROP FUNCTION IF EXISTS public.global_search(text, vector(384), text, text[], int);

-- Phase 6b
DROP TRIGGER  IF EXISTS shipments_embedding_sync ON public.shipments;
DROP INDEX    IF EXISTS shipments_embedding_hnsw_idx;
ALTER TABLE   public.shipments DROP COLUMN IF EXISTS embedding;
-- (repeat for invoices / manifests / customers if rolled out)
DROP EXTENSION IF EXISTS vector;   -- only after confirming no other consumer

-- Phase 6a
DROP INDEX    IF EXISTS shipments_search_idx;
ALTER TABLE   public.shipments DROP COLUMN IF EXISTS search_vector;
-- (repeat for invoices / manifests / customers if rolled out)
```

Search RPC is gated behind `SEARCH_V2_ENABLED` (Supabase env). Flip to
`false` to disable the new search UI without a code revert; UI falls
back to the legacy command palette.

### Decision tree — "It looks wrong, restore"

```
Just my session?           → localStorage.setItem('tac-design','v6'); reload          (Layer 3)
One phase regressed?       → gh pr revert <phase-PR#>                                  (Layer 2)
Token/primitive broke unrelated pages? → gh pr revert <Phase-1-PR>                     (Layer 2)
Search perf bad?           → set SEARCH_V2_ENABLED=false in Supabase env               (Layer 5)
Whole refactor wrong?      → branch from `pre-nextadmin-refactor-v1`, reapply non-refactor work   (Layer 1)
```

## Refs

- Issue #13 (parent rollback-readiness scope)
- Issue #18 (this doc's tracker)
- PR #8 baseline: `9534b6f`
- PR #14 (slicing rule — prevents future PRs from being this hard to
  roll back)
- Tag `pre-nextadmin-refactor-v1` → baseline for the multi-phase NextAdmin refactor
