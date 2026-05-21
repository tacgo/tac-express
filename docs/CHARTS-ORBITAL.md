# TAC Orbital · Telemetry Chart System (Reconciled)

> Adoption of the chart system specified in `docs/dashboard/` into TAC Express
> v5.0 / v6 codebase. This document captures the reconciled rules — what was
> kept verbatim, what was changed, and why.
>
> Source: [`docs/dashboard/README.md`](./dashboard/README.md).
> Canonical home: `packages/ui/src/components/charts/`.

---

## 1. Purpose

A single, brutalist chart language for the entire TAC Express dashboard.
Replaces the donut-and-curve mix with primitives that obey the Fourteen Laws:
zero radius, monospace data labels, brutalist offset shadows on the *frame*
(not the chart), at most two hues per chart, sharp corners everywhere.

## 2. Reconciliation table

Differences from the source spec in `docs/dashboard/`:

| Source rule | Reconciled rule | Reason |
|---|---|---|
| `--radius*: 0.125rem` system override | **Removed.** Use the existing `--radius: 0rem` in [globals.css:81](../packages/ui/src/styles/globals.css). | LAW 13 mandates 0rem radius — sharp corners. |
| `rounded` / `rounded-sm` utility classes inside primitives | Replaced with **no class** (or `rounded-none` defensively). | Same as above. |
| `@repo/ui`, `@repo/services` import aliases | Rewritten to `@workspace/ui`, `@workspace/services`. | tac-express monorepo conventions. |
| `cn` from `../../lib/utils` | Same path — primitives placed at `packages/ui/src/components/charts/`. | Resolves to [`packages/ui/src/lib/utils.ts`](../packages/ui/src/lib/utils.ts). |
| `border-r border-card` on `SegmentBar` cells | Kept. `--card` is defined in our token set. | No change needed. |
| Tooltip `bg-popover text-popover-foreground` | Kept. Both tokens already exist. | No change needed. |

## 3. Token additions

The following tokens are appended to [globals.css](../packages/ui/src/styles/globals.css)
in `:root` (light) and overridden where contrast demands it in `.dark`. Tailwind v4
bridge entries land inside the existing `@theme inline` block.

```css
/* Chart palette */
--chart-primary
--chart-primary-muted

/* Structural */
--chart-axis
--chart-grid
--chart-track

/* SLA semantic — reserved for ontime/late/breached components only */
--chart-ontime
--chart-late
--chart-breached

/* Single-hue intensity ramp (heatmap, density) */
--chart-ramp-1 .. --chart-ramp-5
```

Tailwind utilities exposed: `bg-chart-primary`, `text-chart-axis`, `border-chart-grid`,
`fill-chart-ramp-3`, `stroke-chart-late`, etc.

## 4. Typography utilities (added under `@layer components`)

| Class | Purpose |
|---|---|
| `tac-caption` | Mono, 11px, ALL-CAPS, wide tracking — chart frame headers |
| `tac-tag` | Mono, 10px, ALL-CAPS — sub-labels, legend entries |
| `tac-axis` | Mono, 11px, tabular numerics — axis ticks |
| `tac-readout` | `tnum lnum` font features, tight tracking — KPI values |

These complement the existing `t-display / t-h1..h4 / t-data / t-overline / t-mono`
type scale and **do not** override it. Use the chart utilities only for
chart-internal text.

## 5. Hard rules (enforced by review)

1. **Two hues max** per chart: `--chart-primary` + `--chart-primary-muted`.
2. **`ontime / late / breached` are SLA-state only.** Never decorative.
   Success Rate gauge is `--chart-primary`, not `--chart-ontime`.
3. **No donuts. No smooth curves.** `stepAfter` only. Donuts → `SegmentBar`.
   Percentages → `ProgressMeter`.
4. **N < minimum → `ChartEmptyState`.** Defaults: time series 3, buckets 2,
   ranks/heatmap 1.
5. **Radius stays 0rem.** Never reintroduce `--radius*: 0.125rem`.

## 6. Server vs client matrix

| Primitive | Mode |
|---|---|
| `ChartFrame`, `ChartEmptyState`, `KpiTile`, `SegmentBar`, `RankBarChart`, `LaneHeatmap` | Server-safe |
| `ProgressMeter` (uses `motion/react`) | Client (`"use client"`) |
| `StepAreaChart`, `StackedColumnChart`, `OrbitalTooltip` (uses Recharts) | Client (`"use client"`) |

## 7. Removed (Phase 5 sunset)

The following legacy primitives were deleted as part of the Orbital migration:

- `packages/ui/src/components/composed/charts/` — entire directory (9 files: `service-mix-donut`, `gauge-chart`, `revenue-trend-chart`, `shipment-trend-chart`, `status-distribution-chart`, `hub-performance-chart`, `top-customers-bar`, `sla-breach-chart`, `lane-heatmap`).
- `packages/ui/src/components/composed/dashboard/kpi-card.tsx` and `kpi-grid.tsx` — orphaned after Analytics + Home migrations; superseded by `KpiTile`.

All consumers have migrated to `@workspace/ui/components/charts` (Orbital). Donut and gauge primitives are forbidden going forward.

## 8. Adoption phases

| Phase | PR | Scope |
|---|---|---|
| 0 | this doc | Reconciliation (no code change) |
| 1 | PR-1 | Port primitives + token patch — primitives ship inert |
| 2 | PR-2 | Service-layer adapters (`packages/services/src/orbital/*`) |
| 3 | PR-3 | Analytics page rewrite |
| 4 | PR-4 | Overview/home page rewrite |
| 5 | PR-5 | Sunset: delete legacy `composed/charts/*` and orphaned `kpi-card.tsx` |
| 6 | PR-6 | Tests + skill markdown updates |
