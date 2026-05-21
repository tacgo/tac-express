# Project-Wide shadcn Purity Audit

> **Date:** 2026-05-22
> **Goal:** Every UI element must be a shadcn-sourced primitive (or a composition of
> them). Hand-rolled / raw-HTML primitives are forbidden.
> **Reference foundation:** shadcn `/create` preset **`b5Fxrc2eNU`**
> (see [`docs/research/shadcn-preset-b5Fxrc2eNU.md`](../research/shadcn-preset-b5Fxrc2eNU.md)).
> **Method:** Static audit (Glob/Grep/Read) of `apps/web`, `apps/dashboard`, and
> `packages/ui/src/components`. No files modified.

---

## 0. Verdict (TL;DR)

| Layer | Status |
|-------|--------|
| `apps/web` (landing + all public pages + sign-in) | ✅ **CLEAN** — 0 raw primitives, all UI from `@workspace/ui` |
| `apps/dashboard` (auth, ops-console, track, print) | ✅ **CLEAN at the boundary** — 0 raw primitives, LAW 5 satisfied |
| `packages/ui` primitives | ✅ shadcn-sourced, themed |
| `packages/ui` **composed / ops-console** | ❌ **MAJOR VIOLATION** — a full hand-rolled parallel primitive library on a separate `paper-*` token system |

**The apps are not the problem.** Every violation lives *upstream* in
`packages/ui/src/components/composed/` — chiefly the **`ops-console/` "paper"
primitive library**, which is hand-rolled from raw HTML and duplicates the real
shadcn primitives. The apps then faithfully import those non-compliant components.

---

## 1. Project components vs the `b5Fxrc2eNU` preset

The preset is the recorded foundation. The project intentionally diverges on three
axes (locked, per `tac-shadcn` skill) and aligns on the rest:

| Axis | Preset `b5Fxrc2eNU` | This project | Compliance |
|------|---------------------|--------------|------------|
| Radius | `none` | `--radius: 0rem` | ✅ aligned |
| Base color | `zinc` | `zinc` | ✅ aligned |
| Theme / accent | `indigo` | `indigo` | ✅ aligned |
| Body / heading font | Outfit / Noto Serif | Outfit / Noto Serif (+ IBM Plex Mono) | ✅ aligned |
| Style | `maia` | `radix-lyra` | 🔒 intentional (locked) |
| Icon library | `tabler` | `@remixicon/react` | 🔒 intentional (locked) |
| Chart palette | `yellow` | Orbital | 🔒 intentional (locked) |
| **Component sourcing** | **100% shadcn primitives** | **shadcn primitives + a hand-rolled `paper-*` parallel library** | ❌ **divergent** |

**The decisive gap is the last row.** The preset's `preview-02` is built entirely
from ~40 stock shadcn primitives (`button`, `card`, `table`, `badge`, `field`,
`input`, `tabs`, `sidebar`, `chart`, `empty`, `skeleton`, …). The project's
`packages/ui/primitives/` set mirrors most of these correctly — but the
**ops-console subsystem ignores them** and re-implements its own button/card/table/
badge/field/tabs/skeleton/empty/error from raw HTML on a `paper-*` token namespace.

---

## 2. Finding A — the `ops-console/` hand-rolled "paper" primitive library

Location: `packages/ui/src/components/composed/ops-console/`.
Every `ops-*` base element is hand-rolled from raw HTML and uses `paper-*` tokens
(`bg-paper-card`, `border-paper-line`, `font-paper-mono`, `--paper-fg-1`,
`text-paper-11`, …) instead of the semantic Violet-Grid tokens (`bg-card`,
`border-border`, `text-foreground`). It duplicates primitives that already exist.

| File | Component(s) | Raw element | Duplicates primitive | Tokens |
|------|--------------|-------------|----------------------|--------|
| `ops-card.tsx` | `OpsCard` | `<div>` | `primitives/card.tsx` | `paper-*` |
| `ops-table.tsx` | `OpsTable`+5 | `<table>/<thead>/<tbody>/<tr>/<th>/<td>` | `primitives/table.tsx` | `paper-*` |
| `ops-badge.tsx` | `OpsBadge` | `<span>` | `primitives/badge.tsx` | `paper-*` |
| `ops-field.tsx` | `OpsFieldInput/Select/Label` | `<input>/<select>/<label>` | `primitives/input.tsx`, `label.tsx` | `paper-*` |
| `ops-skeleton.tsx` | `OpsSkeleton`+2 | `<div>/<tr>/<td>` | `primitives/skeleton.tsx` | `paper-*` |
| `ops-empty-state.tsx` | `OpsEmptyState` | `<div>/<h3>/<p>` | `primitives/empty-state.tsx` | `paper-*` |
| `ops-error-state.tsx` | `OpsErrorState` | `<div>/<h3>/<p>` | `primitives/error-boundary.tsx` | `paper-*` |
| `ops-tabs.tsx` | `OpsTabs` | `<div role=tablist>` + OpsButton | `primitives/tabs.tsx` | `paper-*` (indirect) |
| `ops-button.tsx` | `OpsButton` | `<button>` (Slot if asChild) | gap (no `button.tsx` in primitives/) | `paper-*` |
| `ops-kbd.tsx` | `OpsKbd` | `<span>` | gap (no kbd primitive) | `paper-*` |
| `ops-panel-tabs.tsx` | `OpsPanelTabs`+3 | none (wraps Radix tabs) — re-themes only | `primitives/tabs.tsx` | `paper-*` |
| `ops-frame.tsx` | `OpsFrame` | `<div>/<span>` | chrome (no equiv) | `paper-*` |
| `ops-page-head.tsx` | `OpsPageHead` | `<div>/<h1>` | chrome | `paper-*` |
| `ops-topbar.tsx` | `OpsTopbar` | `<header>` + **4 raw `<button>`** | chrome | `paper-*` |
| `ops-detail-frame.tsx` | `OpsDetailFrame` | `<header>/<h1>/<aside>` | chrome | `paper-*` |
| `ops-stat-card.tsx` | `OpsStatCard` | `<div>/<span>` | KPI tile (wraps OpsCard) | `paper-*` |
| `ops-dashboard.tsx` | `OpsDashboard` | `<div>/<span>` | composition | `paper-*` |
| `ops-growth-chart.tsx` | `OpsGrowthAreaChart` | chart primitive + **3 raw `<button>`** (range toggle) | partial | `paper-*` |
| `ops-list-state.tsx` | `OpsListState` | `<div>` (composite) | empty/error/skeleton combo | `paper-*` |
| `ops-access-fallback.tsx` | `OpsAccessFallback` | `<div>/<p>` | — | ✅ **semantic tokens** (only compliant file) |

**Raw controls leaking into the `pages/*` view files** (bypassing even OpsButton/OpsField):
- `pages/ops-settings-view.tsx`: raw `<input>` :433; raw `<button>` :450, :458, :482, :490
- `pages/ops-inventory-view.tsx`: raw `<input>` :163; raw `<button>` :180, :188, :208
- `pages/ops-scanning-view.tsx`: raw `<button>` :63
- `pages/contact-leads-view.tsx`: raw `<button>` :168; raw detail `<tr>` :212

**Blast radius (distinct consumer files)** — the cost of migration:

| Primitive | Consumers | | Primitive | Consumers |
|-----------|-----------|---|-----------|-----------|
| `OpsFrame` | ~21 | | `OpsField*` | 10 |
| `OpsPageHead` | ~20 | | `OpsTable` | 8 |
| `OpsCard` | ~18 | | `OpsEmptyState` | 6 |
| `OpsButton` | 17 | | `OpsSkeleton` | 5 |
| `OpsBadge` | 15 | | `OpsErrorState` | 3 |

`OpsListState` has **0 external consumers** (dead-ish — only the barrel re-exports it).

---

## 3. Finding B — raw `<table>` outside the data-table primitive

| File | Lines | Category |
|------|-------|----------|
| `management/roles-matrix.tsx` | 77–116 | ❌ on-screen — should use Table primitive |
| `management/hubs-manager.tsx` | 173–239 | ❌ on-screen — should use Table primitive |
| `manifests/manifest-builder/step-add-shipments.tsx` | 267–325 | ❌ on-screen — should use Table primitive |
| `finance/invoice-print-view.tsx` | 304–400 | ⚠️ print view — raw table justified for print fidelity |
| `manifests/manifest-print-view.tsx` | 158–221 | ⚠️ print view — justified |
| `data-table.tsx` | 50–60, 236–237 | ✅ **NOT a violation** — the canonical grid-based TanStack data-table primitive (documented, ARIA-roled) |

---

## 4. Finding C — hand-rolled form controls

| File | Controls | Detail |
|------|----------|--------|
| `shipments/create-shipment-form.tsx` | 14 raw `<input>`/`<select>` (lines 170–248) | uses `inputClass` constant instead of Input/Select primitives |
| `finance/rate-card-form.tsx` | 9 raw `<input>`/`<select>` (lines 63–101) | uses `INPUT_CLS`/`SELECT_CLS` constants |

These are the **most clear-cut, self-contained** violations to fix first.

---

## 5. Finding D — raw `<button>` in composed (non-ops-console)

~33 real interactive `<button>` elements across 18 files that should use the Button
primitive. Highest concentrations:
- `notification-bell.tsx` (:55, :69, :113, :219, :227 — some a11y-documented)
- `sidebar/sidebar.tsx` (:162, :278, :295, :369)
- `user-menu.tsx` (:40, :70, :84)
- `finance/*` (invoice-wizard :247/:387, send-whatsapp-dialog :418/:508, rate-card-form :105, rate-card-table :69, aging-buckets :249)
- `data-table.tsx` (:265/:273 pagination; :186 a11y-justified sortable header)
- forms/actions: `auth/sign-in-form.tsx:85`, `exceptions/exception-resolve-form.tsx:56`, `manifests/manifest-action-bar.tsx:43`, `scanning/scanning-console.tsx:244/:379`, `manifests/offline-indicator.tsx:51`, `manifests/manifest-builder/step-add-shipments.tsx:200/:327`, `dashboard/date-range-selector.tsx:52`, `smart-address-fields.tsx:279`, `saved-view-selector.tsx:138`, `management/hubs-manager.tsx:218`

A few inside `PopoverTrigger asChild` / documented a11y patterns are borderline-acceptable but still merit a `Button` for consistency.

---

## 6. Finding E — `paper-*` token namespace leakage

The `paper-*` namespace is **not confined to ops-console** — it appears in **31
additional composed files**, e.g. `footer.tsx`, `globe-hero.tsx`,
`hub-context-switcher.tsx`, `awb-input.tsx`, `saved-view-selector.tsx`,
`smart-address-fields.tsx`, `sidebar/sidebar.tsx`, all `landing/*`,
all `scanning/*`, all `manifests/manifest-builder/*`, `notes/notes-panel.tsx`,
`notifications/notification-inbox.tsx`, `bookings/*`, `finance/aging-buckets.tsx`,
`finance/payment-timeline.tsx`, `management/*`, `maps/live-corridor-map.tsx`,
`audit/audit-diff-viewer.tsx`, `shift-report/shift-report-view.tsx`,
`shipments/shipping-label.tsx`, `wasteland-landing.tsx`.

This is a parallel design token system competing with the semantic Violet-Grid
tokens. "Pure shadcn" requires consolidating onto the semantic tokens.

---

## 7. What is NOT a violation (confirmed clean)

- `apps/web` & `apps/dashboard`: 0 raw primitives, no foreign UI libs (`@mui`,
  `@chakra`, `@headlessui`, `antd`, …), LAW 5 satisfied (only providers/guards in
  `apps/*/components/`). All UI imports resolve to `@workspace/ui`.
- `packages/ui/src/components/primitives/*`: shadcn-sourced and themed.
- `data-table.tsx`: intentional grid-table primitive.
- `composed/_archive/*`: archived, out of scope.

---

## 8. Remediation plan (approval-gated)

> ⚠️ This is a large, cross-cutting refactor with a wide blast radius (OpsFrame ~21,
> OpsPageHead ~20, OpsCard ~18 consumers). Per `tac-shadcn` §0 and the
> friction-protocol, **replacing the ops-console "paper" system is a
> `tac-brainstorming` design-approval event, not an inline change** — the `paper-*`
> aesthetic may be an intentional ops-console design language. Confirm intent before
> executing. Recommended sequencing once approved:

1. **Quick wins (self-contained, low risk):**
   - `create-shipment-form.tsx` + `rate-card-form.tsx` → swap raw inputs/selects for `Input`/`Label`/`Select` primitives (Finding C).
   - 3 on-screen raw tables (`roles-matrix`, `hubs-manager`, `step-add-shipments`) → `Table` primitive (Finding B).
2. **Button consolidation:** replace the ~33 raw `<button>` (Finding D) with `Button`/`buttonVariants`, keeping documented a11y patterns intact.
3. **ops-console primitive migration (the big one):** map each `Ops*` primitive to its shadcn counterpart, retheme via a `paper`-variant on the real primitives (or fold `paper-*` into semantic tokens), then codemod the ~consumer counts above. Delete `OpsListState` (0 consumers).
4. **Token consolidation:** collapse the `paper-*` namespace into the semantic
   Violet-Grid tokens (Finding E) so one token system remains.
5. **Gate it:** add a lint rule / test forbidding raw `<button|input|select|textarea|table>` in `packages/ui/src/components/composed/**` and `apps/**`, so the purity can't regress.

Each step ends with the standard quality gates (`pnpm typecheck && lint && test`).
