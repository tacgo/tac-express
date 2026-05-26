# shadcn Purity — Final Cleanup Spec

> **Date:** 2026-05-26
> **Supersedes:** `docs/audits/2026-05-22-shadcn-purity-audit.md` (stale — predates WS-4B)
> **Status:** AWAITING OWNER AUTHORIZATION — do not begin any phase without explicit approval
> **Method:** Fresh re-audit via grep/read of current codebase state. No files modified.

---

## A. Re-Audit Findings (Current State)

The 2026-05-22 audit was accurate at the time. WS-4B (Phases 5–10c, completed 2026-05-26)
retired ten paper primitives and migrated all main list routes, create routes, and detail
routes off the `paper-*` system. The table below shows what actually remains.

### Finding A — ops-console Ops* primitive library

Ten primitives confirmed **RETIRED** by WS-4B. Zero remaining consumers.

| Primitive | Retired in | Replacement |
|-----------|-----------|-------------|
| `OpsDetailFrame` | Phase 10c | `DetailShell` (`packages/ui/composed/detail-shell.tsx`) |
| `OpsTimeline` | Phase 10c | `TrackingTimeline` (`composed/shipments/tracking-timeline.tsx`) |
| `OpsShipmentStepper` | Phase 10c | `ShipmentStepper` (`composed/shipments/shipment-stepper.tsx`) |
| `OpsPanelTabs` + List/Trigger/Content | Phase 10c | `ShipmentDetailTabs` |
| `OpsEmptyState` | Phase 10c | `EmptyState` primitive |
| `OpsSkeleton` + Row + StatCard | Phase 10c | `Skeleton` primitive |
| `OpsKbd` | Phase 6 | inline `<kbd>` with v7 tokens |
| `OpsErrorState` | Phase 6 | `EmptyState` (error rendering) |
| `OpsStatCard` | Phase 6 | `StatCard` (KPI surfaces) |
| `OpsDashboard` | Phase 5 | `V7OpsDashboard` |

Nine primitives still **LIVE** in the exported barrel. Consumer counts are dramatically
lower than the audit stated. Table shows current position and recommended disposition.

| Primitive | Audit (05-22) | Live consumers now | Recommendation |
|-----------|:---:|:---:|---|
| `OpsShell` | — | **1** — `apps/dashboard/app/ops-console/layout.tsx` | **Keep.** It is the layout-level shell for the entire ops-console. Rename deferred to v8. |
| `OpsTopbar` | — | **1** — consumed by `OpsShell` | **Keep.** Structural layout. Raw `<button>` in it → Phase 3. |
| `OpsFrame` | ~21 | **3** — `rates/create`, `manifests/create`, `customers/create` page.tsx | **Retire** in Phase 4-A. Swap to `PageShell` + inline header. |
| `WorkflowShell` | — | **2** — `shipments/create`, `finance/create` page.tsx | **Keep.** Not a paper primitive — it's a semantic wizard container (1120 px max-width). No token debt. |
| `OpsPageHead` | ~20 | **4** — the 3 above + `shipments/create` | **Retire** in Phase 4-A. Inline header composition. Note a11y constraint below. |
| `OpsCard` | ~18 | **0 live routes** | Dead render in 2 schema-home form files + 1 reference variant. Phase 4-B/C. |
| `OpsButton` | 17 | **0 live routes** | Same as OpsCard. Phase 4-B/C. |
| `OpsBadge` | 15 | **0 live routes** | Same. Phase 4-B/C. |
| `OpsField*` | 10 | **0 live routes** | Same. Phase 4-B/C. |
| `OpsTable` | 8 | **0 live routes** | Only in reference design variant. Phase 4-C. |
| `OpsTabs` | — | **0 live routes** | Only in reference design variant. Phase 4-C. |

> **a11y constraint on OpsPageHead:** `shipments/create/page.tsx` has an axe annotation
> explaining OpsPageHead is required because the wizard step indicator is not an `<h1>`,
> and without it the page fails WCAG 2.4.6 / 1.3.1 (`page-has-heading-one`). Retiring
> OpsPageHead on this route requires the replacement composition to include an `<h1>`.
> `manifests/create` has the same constraint (same comment). The inline v7 header pattern
> already does this (`<h1 className="font-mono …">`), so retirement is safe if done correctly.

**Delta from audit:** The consumer collapse is large — OpsFrame went from ~21 to 3,
OpsPageHead from ~20 to 4, OpsCard/OpsButton from ~15-18 to 0 live-route consumers.
WS-4B did the heavy lifting. What remains is cleanup.

---

### Finding B — raw `<table>` outside the data-table primitive

All three on-screen violations from the 05-22 audit are **RESOLVED**.

| File | Audit status | Current status |
|------|-------------|----------------|
| `management/roles-matrix.tsx` | ❌ raw table | ✅ **CLEAN** — no raw `<table>` elements |
| `management/hubs-manager.tsx` | ❌ raw table | ✅ **CLEAN** — no raw `<table>` elements |
| `manifests/manifest-builder/step-add-shipments.tsx` | ❌ raw table | ✅ **CLEAN** — no raw `<table>` elements |
| `finance/invoice-print-view.tsx` | ⚠️ print-justified | Unchanged — still justified |
| `manifests/manifest-print-view.tsx` | ⚠️ print-justified | Unchanged — still justified |

**Finding B is fully resolved. Phase 2 = zero work.**

---

### Finding C — hand-rolled form controls

Both violations are **RESOLVED**. The live routes now render V7 forms; the old v6 form
modules remain only as **schema homes** (Zod schema + TypeScript type exports).

| Route | Audit status | Current status |
|-------|-------------|----------------|
| `shipments/create` | ❌ raw `<input>`/`<select>` in `create-shipment-form.tsx` | ✅ **RESOLVED** — route renders `V7CreateShipmentWizard` |
| `rates/create` | ❌ raw `<input>`/`<select>` in `rate-card-form.tsx` | ✅ **RESOLVED** — route renders `V7RateCardForm` |
| `customers/create` | (not in 05-22 audit) | ✅ **CLEAN** — route renders `V7CustomerForm` |

`ops-customer-form.tsx` and `ops-rate-card-form.tsx` still contain JSX render code
(using OpsCard/OpsButton/OpsField) but that JSX is never called by any live route.
These are dead renders inside schema-home modules. Phase 4-B below handles them.

**Finding C is fully resolved. Phase 1 = zero work.**

---

### Finding D — raw `<button>` in composed components

The audit listed ~33 raw buttons across 18 files. WS-4B migrated the major view routes,
so several of those files are now v7. Current count: **15 files** with at least one
raw `<button>` in `packages/ui/src/components/composed/` (archive excluded).

| File | `<button>` count | Assessment |
|------|:---:|---|
| `notification-bell.tsx` | 7 | 1 is inside `<PopoverTrigger asChild>` (legitimate); ~5 should be `Button` |
| `sidebar/sidebar.tsx` | 4 | Likely Sidebar primitive internals or `asChild` patterns — verify before swapping |
| `finance/invoice-wizard.tsx` | 2 | Likely step navigation — should be `Button` |
| `scanning/scanning-console.tsx` | 2 | Interactive submit buttons — should be `Button` |
| `ops-console/ops-topbar.tsx` | (not yet counted) | Was 4 in audit; still needs verification |
| `ops-console/ops-growth-chart.tsx` | `<button` in range toggle | Range toggle (7D/30D/90D) — should be `ToggleGroup` or `Button` |
| `ops-console/ops-volume-chart.tsx` | `<button` in range toggle | Same |
| `finance/aging-buckets.tsx` | 1 | Should be `Button` |
| `finance/send-whatsapp-dialog.tsx` | (unverified) | Likely dialog action — `Button` |
| `scanning/v7-ops-scanning.tsx` | (unverified) | v7 file — verify |
| `settings/v7-ops-settings.tsx` | (unverified) | v7 file — verify |
| `support/v7-contact-leads.tsx` | (unverified) | v7 file — verify |
| `smart-address-fields.tsx` | (unverified) | Pincode suggestion — may need `Button asChild` |
| `saved-view-selector.tsx` | (unverified) | Filter pill — may need `Button` |

**Estimated true swap count after removing legitimate asChild/Radix patterns:
~20–28 raw buttons to replace with `Button` or `ToggleGroup` primitives across ~12 files.**
Finding D remains partially open.

---

### Finding E — `paper-*` token namespace

**Visual concern: RESOLVED** (per WS-4B Phase 10d). All `--paper-*` CSS variables now
alias canonical Violet Grid tokens. `bg-paper-card` renders identically to `bg-card`.
There are no two-design-system visual discrepancies remaining.

**Naming concern: OPEN.** Three categories of cleanup remain:

**E-1: `paper-label` / `paper-stat-value` utility classes in TSX (invisible to users)**

These are CSS utility classes defined in `globals.css` (`.paper-label` at line 1383,
`.paper-stat-value` at line 1429). Still used as class strings in:

| File | Uses |
|------|------|
| `ops-console/ops-revenue-radial-chart.tsx` | 3 × `paper-label` |
| `ops-console/ops-upcoming-calendar.tsx` | 2 × `paper-label` (2 more in comments) |
| `ops-console/ops-shipment-bar-chart.tsx` | 3 × `paper-label` |
| `ops-console/ops-growth-chart.tsx` | 1 × `paper-label` (1 in comment) |
| `ops-console/ops-volume-chart.tsx` | 1 × `paper-label` (1 in comment) |
| `ops-console/pages/ops-management-view.tsx` | 1 × `paper-label` + 1 × `paper-stat-value` |

Rename target for `paper-label`: inline `font-mono text-2xs uppercase tracking-widest text-muted-foreground`
(matches `FIELD_LABEL` constant in `detail-shell.tsx`).
Rename target for `paper-stat-value`: inline v7 equivalent (font-sans, bold, tabular-nums, text-foreground).

**E-2: `bg-paper-*` / `border-paper-*` / `text-paper-*` Tailwind class strings (near-zero)**

Only 1 occurrence in `ops-button.tsx` — inside a code comment (`text-paper-NN`), not a
class string. Effectively zero TSX usage of prefixed paper utility classes.

**E-3: `--paper-*` alias block in `globals.css` (deferred until E-1 + Phase 4 complete)**

- 16 `--paper-*` custom property definitions (lines 236–269)
- 29 `--color-paper-*` / `--font-paper-*` `@theme inline` entries (lines 524–552)
- ~40 references to `--paper-*` within CSS rules (brutalist shadow patterns,
  `.paper-label`, `.paper-stat-value` utility definitions, one comment)
- **Total: ~85 occurrences** of `--paper-` across globals.css

These aliases CANNOT be deleted until: (a) all `paper-label` / `paper-stat-value` class
strings are removed from TSX (E-1 above), and (b) no other TSX file uses any
`bg-paper-*` / `border-paper-*` class string. Once those are clear, the full alias
block can be deleted in one sweep (~85 lines removed, net positive).

---

## B. Phase Plan

> **Execution order matters.** Phase 4-B must precede Phase 4-C, and both must precede
> Phase 5-E3. Phases 3 and 4-A are independent of each other and can run in parallel.

### Phase 1 — Form controls (Finding C residual)

**ZERO WORK.** Both flagged routes are wired to V7 forms. Skip.

---

### Phase 2 — Raw tables (Finding B residual)

**ZERO WORK.** All three on-screen raw tables were migrated by WS-4B. Skip.

---

### Phase 3 — Raw button consolidation (Finding D)

**Trigger:** Owner approves this phase.

**Scope:** ~12 files, ~20–28 actual swaps.

**Approach per file:**

1. Read each file in the Finding D table above (the "unverified" ones first).
2. For each raw `<button>`:
   - If inside `PopoverTrigger asChild`, `TooltipTrigger asChild`, `DropdownMenuTrigger asChild`,
     or similar Radix asChild wrapper → **leave as-is** (the asChild pattern requires a native element).
   - If it has `onClick` / `type="submit"` / `type="button"` with no parent asChild → swap to
     `<Button>` or `<Button variant="ghost">` as appropriate.
   - For range-toggle buttons in `ops-growth-chart.tsx` and `ops-volume-chart.tsx` → swap to
     `ToggleGroup` + `ToggleGroupItem` (three items: 7D / 30D / 90D), consistent with how
     `ChartAreaInteractive` implements its time-range selector.
3. For `notification-bell.tsx`: the dismiss button and "mark all read" button are not in
   asChild contexts → swap to `Button variant="ghost" size="icon"`. The PopoverTrigger asChild
   button stays raw (or swap to `Button asChild`, both are correct).

**Estimated size:** ~20–28 line changes across ~12 files.

**Gate:** `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm test`

---

### Phase 4 — Residual Ops* primitive retirement

Three independent sub-phases. Can be committed separately.

#### Phase 4-A: Retire OpsFrame + OpsPageHead on create route pages

**Files:** 3–4 page.tsx files (`rates/create`, `manifests/create`, `customers/create`,
`shipments/create`).

**Transform per file:**
```tsx
// Before (rates/create, customers/create, manifests/create):
<OpsFrame>
  <OpsPageHead eyebrow="X" title="Y" sub="Z" />
  <SomeLiveComponent />
</OpsFrame>

// After:
<PageShell>
  <header className="pb-4 border-b border-border">
    <p className="font-mono text-2xs uppercase tracking-widest text-muted-foreground">X</p>
    <h1 className="font-sans text-2xl font-bold text-foreground mt-0.5">Y</h1>
    <p className="t-body-sm text-muted-foreground mt-1">Z</p>
  </header>
  <SomeLiveComponent />
</PageShell>
```

For `shipments/create`, the inline `<h1>` satisfies the axe `page-has-heading-one`
constraint noted in the existing code comment. For `manifests/create`, same.

After this sub-phase: `OpsFrame` has 0 live consumers, `OpsPageHead` has 0 live consumers.
`WorkflowShell` is unaffected (kept — it is not an Ops primitive, just a max-width wrapper).

**Estimated size:** ~40–60 lines changed across 4 files (mostly substitution, not deletion).

**Gate:** Standard quality gates + visual check on each route in browser.

#### Phase 4-B: Strip dead JSX renders from form schema-home modules

`ops-customer-form.tsx` and `ops-rate-card-form.tsx` export both a JSX form component
AND a Zod schema + TypeScript type. The JSX component is never called (live routes use
V7 forms). The schema + type IS still used (V7CustomerForm, V7RateCardForm import them).

**Transform:** Delete the JSX render function and all JSX-only imports (OpsCard, OpsButton,
OpsField, OpsFieldSelect, etc.) from each file. Keep the Zod schema and TypeScript type
export. Add a comment pointing to the V7 form that replaced the render.

After this sub-phase: `OpsCard`, `OpsButton`, `OpsBadge`, `OpsField*` all have zero
remaining JSX references outside their own component file and the reference design variant.

**Estimated size:** ~50–80 lines deleted per file, 2 files = ~100–160 line deletions.

**Gate:** `pnpm typecheck` (the type exports must remain intact).

#### Phase 4-C: Archive OpsManagementView (reference design variant)

`ops-management-view.tsx` is explicitly documented as "a parallel paper-style design variant
kept in @workspace/ui for design-system reference and potential future use." The production
management route uses `management-client.tsx` (a completely separate file with no paper
primitive usage). `OpsManagementView` is never rendered.

**Transform:**
1. Move `ops-management-view.tsx` to `packages/ui/src/components/composed/_archive/2026-05-26/ops-management-view.tsx`.
2. Remove its export from `ops-console/pages/index.ts` (or wherever it is re-exported).
3. Remove the `OpsTabs` export from `ops-console/index.ts` (0 consumers outside management-view).
4. Remove the `OpsTable` suite export from `ops-console/index.ts` (0 consumers outside management-view).
5. Remove the `OpsCard`, `OpsButton`, `OpsBadge`, `OpsField*` exports from `ops-console/index.ts`
   (0 consumers remain after 4-B completes).

After this sub-phase: `OpsFrame`, `WorkflowShell`, `OpsPageHead` (both retired in 4-A),
`OpsShell`, `OpsTopbar`, `OpsAccessFallback`, the chart widgets, and `OpsGrowthAreaChart`
etc. are the only remaining exports from `ops-console/index.ts`. All paper primitive
duplicates are gone from the active package.

`OpsButton` and `OpsCard` component files (`ops-button.tsx`, `ops-card.tsx`, etc.) can be
deleted from disk after this sub-phase. Add deletion to the same commit.

**Estimated size:** ~10 line changes to index.ts exports + 1 file move + ~5 file deletions.

**Gate:** `pnpm typecheck && pnpm build` (check no import resolution errors).

---

### Phase 5 — paper-* class name sweep

> **Prerequisite:** Phase 4-B and 4-C complete (all `paper-label` / `paper-stat-value`
> usages outside chart files are gone, so no stale references remain after this sweep).

#### Phase 5-E1: Rename `paper-label` / `paper-stat-value` in chart/widget files

**Files:** 5 chart files + 0 others (ops-management-view archived in 4-C removes the
`ops-management-view.tsx` occurrences automatically).

Rename `paper-label` → `FIELD_LABEL` constant import from `detail-shell.tsx`, OR inline
`font-mono text-2xs uppercase tracking-widest text-muted-foreground`. Chart files are
self-contained, so use inline class string (no new import needed).

Rename `paper-stat-value` → appropriate v7 typography (`font-sans font-bold tabular-nums
text-foreground`).

**Estimated size:** ~12–18 line changes across 5 files.

#### Phase 5-E3: Delete paper-* alias block from globals.css

> **Gate before running:** `grep -r "paper-label\|paper-stat-value\|bg-paper-\|border-paper-\|text-paper-\|font-paper-" packages/ui/src/components --include="*.tsx" | wc -l`
> must return **0**.

Delete from `globals.css`:
- Lines ~236–269: the 16 `--paper-*` custom property definitions
- Lines ~524–552: the 29 `--color-paper-*` / `--font-paper-*` `@theme inline` entries
- Lines ~1319–1440 area: the `.ops-console`-scoped CSS block that references `--paper-*`
  (already dead after `.ops-console` scope retirement in Phase 10d), including `.paper-label`
  and `.paper-stat-value` utility class definitions

**Net change:** ~85 lines deleted from globals.css.

**Gate:** `pnpm typecheck && pnpm build && pnpm lint --max-warnings 0`

---

### Phase 6 — Lint gate (regression prevention)

Add an ESLint `no-restricted-syntax` rule to the shared config that forbids raw
`<button>`, `<input>`, `<select>`, `<textarea>`, and `<table>` elements in:
- `packages/ui/src/components/composed/**`
- `apps/dashboard/**` (excluding `app/*/route.ts` and `layout.tsx`)

**Exception patterns** (document as ESLint disable comments with reason):
- `*asChild*` + raw element: Radix asChild pattern requires native element
- `finance/invoice-print-view.tsx` + `manifest-print-view.tsx`: print-view raw tables
- `data-table.tsx`: canonical grid-based data table primitive with ARIA roles

**Implementation:** Add to `packages/eslint-config/index.js` or create a new
`packages/eslint-config/rules/no-raw-interactive.js` if the main config is complex.

**Estimated size:** ~30–40 lines in ESLint config. Expect some existing violations to surface
on first run — fix them as part of this phase, not before.

**Gate:** `pnpm lint --max-warnings 0` across the monorepo.

---

## C. Rubric Impact

**Be honest: most of this work is invisible to users.**

WS-4B already resolved the visual inconsistencies the 05-22 audit was measuring. The
work in this spec is code health and regression prevention, not premium-feel improvement.

| Phase | User-visible impact | Code health impact |
|-------|--------------------|--------------------|
| Phase 1 & 2 | None (already resolved) | N/A |
| Phase 3 (buttons) | Marginal — Button focus ring and hover state are slightly more consistent than bare `<button>` | Primitive consistency |
| Phase 4-A (OpsFrame/OpsPageHead) | None — PageShell renders identically | 4 files off the paper barrel |
| Phase 4-B (dead form renders) | None | ~160 dead LOC removed, schema-homes become clean |
| Phase 4-C (OpsManagementView archive) | None | OpsCard/OpsButton/OpsBadge/OpsField/OpsTable/OpsTabs off the barrel |
| Phase 5 (paper-* sweep) | None — tokens already alias canonical values | One token system, ready for alias deletion |
| Phase 6 (lint gate) | None | Regression prevention |

If the goal is to move the UI rubric score or improve premium feel, this is the wrong sprint.
The work that would move the rubric score is Body 3 polish: empty states, micro-interactions,
skeleton loading choreography, data-dense table hierarchy — none of which are in scope here.

---

## D. Estimated Total Scope

| Phase | Files changed | Lines changed (net) | Commits | Session estimate |
|-------|:---:|:---:|:---:|---|
| Phase 1 (Finding C) | 0 | 0 | 0 | — |
| Phase 2 (Finding B) | 0 | 0 | 0 | — |
| Phase 3 (raw buttons) | ~12 | +25 / −5 | 1–2 | 1–2 hours |
| Phase 4-A (OpsFrame/Head) | 4 | ~+50 / −30 | 1 | 30–45 min |
| Phase 4-B (dead form renders) | 2 | ~0 / −160 | 1 | 30 min |
| Phase 4-C (archive ref variant + barrel cleanup) | ~8 | ~0 / −200 | 1 | 45 min |
| Phase 5-E1 (paper-label rename) | 5 | ~+12 / −10 | 1 | 20 min |
| Phase 5-E3 (globals.css cleanup) | 1 | ~0 / −85 | 1 | 20 min |
| Phase 6 (lint gate) | 1–2 | +35 / 0 | 1 | 30–45 min |
| **TOTAL** | **~35** | **~+120 / −490** | **7–9** | **~4–6 hours** |

This is a **small-to-medium single session**, not a multi-week rebuild. Net LOC is strongly
negative (roughly −370 lines). The codebase gets smaller and cleaner.

---

## E. Non-Goals

This spec explicitly does **NOT**:

- Change the `b5Fxrc2eNU` preset (it stays as the recorded foundation)
- Switch from `radix-lyra` style to `maia` style
- Switch from `@remixicon/react` to Tabler icons
- Switch from Orbital chart palette to yellow
- Rebuild or re-architect any route or page
- Touch `apps/*` boundaries beyond what Phase 4-A requires (create route page.tsx files)
- Touch the data layer, hooks, services, or route handlers (read-only throughout)
- Touch `OpsShell` or `OpsTopbar` beyond Phase 3 raw-button swaps (structural layout, not paper primitives)
- Touch `WorkflowShell` (it is not a paper primitive — it is a semantic wizard container with no token debt)
- Improve premium feel, Body 3 polish, micro-interactions, or display moments
- Touch `.ops-console` scope CSS or paper aliases at `:root` EXCEPT in Phase 5-E3
- Touch print views (`invoice-print-view.tsx`, `manifest-print-view.tsx`)
- Replace the chart widget suite (`OpsGrowthAreaChart`, `OpsVolumeBarChart`, etc.) — these are legitimate domain components, not paper primitives
- Introduce a new design system, preset, or identity

---

## Authorization Checkpoint

> The owner must approve each phase before execution begins. Phases 3, 4-A, 4-B,
> 4-C, 5-E1, 5-E3, and 6 can each be independently approved and executed.
> The only hard ordering constraints are:
> - 4-B before 4-C (4-C removes barrel exports that 4-B clears of JSX consumers)
> - 4-C before 5-E3 (archive removes the last ops-management-view paper-label usages)
> - 5-E1 before 5-E3 (chart files must be cleared before alias block deleted)
>
> **Stop here. The spec is the artifact. Execution begins only on explicit authorization.**
