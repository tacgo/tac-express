# Preset Convergence Playbook — shadcn `b5Fxrc2eNU` composition, Violet Grid identity

> **Version 1.0 — 2026-05-24.** The build contract for converging TAC Express's
> ops-console onto the **composition philosophy** of the shadcn create preset
> [`b5Fxrc2eNU`](https://ui.shadcn.com/create?preset=b5Fxrc2eNU), while keeping
> the **Violet Grid identity** (the Fourteen Laws) fully intact.
>
> Audited live 2026-05-24 (preview + all three "Get Code" tabs + raw theme tokens).

---

## 0. The core finding — tokens already match; only composition is missing

Side-by-side, the preset's theme tokens are (almost) byte-identical to this repo's
`globals.css` — the team adopted them in PR #12:

| Token | Preset | This repo |
|---|---|---|
| `--radius` | `0` | `0` ✅ |
| `--border` | `oklch(0.92 0.004 286.32)` | identical ✅ |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` | identical ✅ |
| `--background` (light) | `oklch(1 0 0)` | identical ✅ |
| `--primary` | indigo hue ~277 | violet hue ~277 ✅ |
| fonts | Outfit + Noto Serif | Outfit + Noto Serif (+ IBM Plex Mono) ✅ |

**Therefore: do NOT run `init --preset` or `apply --preset`** (both forbidden by
`SHADCN-FOUNDATION.md §4/§8` — they re-scaffold/overwrite and risk the production
dashboard, and would only re-install tokens we already have). **Do NOT use
`rounded-2xl`** — the preset is `radius: none`; LAW 13 is `radius: 0`; they agree.

The premium feel of the preset comes from **composition + cadence**, captured below.

---

## 1. Identity = LOCKED (do not change)

These stay exactly as the Violet Grid defines them — confirmed in scope 2026-05-24:

- **0rem radius** (sharp corners). LAW 13.
- **IBM Plex Mono + tabular-nums** for all data (AWB, IDs, weights, currency, timestamps). LAW 12. `.t-data` metric values stay mono.
- **Violet single-hue Orbital charts** (NOT the preset's yellow ramp).
- **Remixicon** (NOT Tabler) · **radix-lyra** component style (NOT maia).
- **Brutalist offset shadows** (NOT soft blur).
- Uppercase mono eyebrows (`tac-mono-label` / `.t-overline`) stay.

---

## 2. Composition rules (adopt from the preset)

### 2.1 Centered, bounded containers (RULE 5 — no edge-to-edge sprawl)
- Every page routes through `PageShell` (`max-w-page-content` 1280 / `max-w-page-wide` 1536), centered `mx-auto`. Shell-tier ceiling `max-w-control` (1600) already enforces this.
- Forms: cap at a reading measure (`FormCard maxWidth`), never full-bleed.

### 2.2 Everything lives in a card (RULE 6 — no floating content in a void)
The preset has **zero** loose content — every block is a grouped surface:
```
<section card> = header(serif title + muted subtitle [+ action]) → body → [footer action]
```
- Surface: `bg-card border border-border shadow-[var(--shadow-brutal-sm)]`, `p-[var(--spacing-card-pad)]` (24px).
- Header: `.t-h4`/`.t-h3` (Noto Serif) title + `.t-caption text-muted-foreground` subtitle. Optional right-aligned action (`Button` sm / `ghost`).
- Group related stats/forms/lists INTO a card; never leave them bare on the page canvas.

### 2.3 Spacing rhythm (strict 4-multiple)
- Allowed scale: `4 / 8 / 12 / 16 / 24 / 32 / 48`. Inter-card gap `gap-6` (24). Page section gap `space-y-6`/`space-y-8`. Card padding 24 (`--spacing-card-pad`). No arbitrary `[px]` — use tokens (`max-w-control`, `max-h-table-viewport`, `--spacing-field-*`).

### 2.4 Asymmetric composition (RULE 8/dashboard)
- No 4-equal KPI grids, no 6/6, no 3-equal. Use a 12-col grid with a dominant primary (e.g. 5/3/2/2, 5/4/3). A hero metric leads (`StatCard variant="hero"` → `.t-data` 40px). Alerts (exceptions) get a `border-l-destructive` signal regardless of size.

### 2.5 Typography cadence (within identity)
- Headings: Noto Serif via `.t-h1..h4`. Subtitles: `.t-caption text-muted-foreground`.
- Metric values: `.t-data` / `.t-data-sm` (mono, tabular) — KEEP mono (LAW 12).
- Eyebrows: `.t-overline` / `tac-mono-label`. Body copy: `.t-body` / `.t-body-sm` (Outfit).
- Calm density: generous line-height, muted secondary text — avoid wall-to-wall uppercase mono *outside* eyebrows + data.

### 2.6 Surface layering (RULE supporting "tonal depth")
- `bg-background` canvas → `bg-card` surface → nested `bg-muted/30` sub-zones. Use `bg-surface-elevated` for the primary data surface; brutalist offset shadow signals elevation. Borders are `border-border` (1px).

### 2.7 Tables (RULE 10) — already converged on `DataTable`
- Sticky header, faceted filters, row actions, status chips, density — done. Wrap in `DataTableCard` (header + count) so the table is a grouped surface, never floating.

### 2.8 Forms (RULE 9) — guided workflow
- Section eyebrow headings, semantic field widths (`max-w-field-code/sm/md`), sticky action rail. Pattern proven on the manifest wizard; apply to create-shipment + invoice.

---

## 3. Build order (RULE 12 — systems before pages)

1. **Shell + composition primitives** — `PageShell`, a canonical `SurfaceCard` (header/body/footer), section grouping helpers. (Most already exist; standardize + document.)
2. **Dashboard** — asymmetric constellation (done) + a page-overview/hero surface + grouped panels.
3. **Data surfaces** — shipments (done) → manifests / inventory / finance / exceptions: `DataTableCard` + toolbar + chips.
4. **Forms** — manifest (done) → create-shipment + invoice wizards.
5. **The 5 v6-only routes** → v7 variants, then retire `OpsFrame` + dead paper components.

---

## 4. Verification loop (mandatory, every surface)

```
audit → critique → build → runtime-verify (authenticated :3001) → tac-ui-rubric (≥ 90/100)
      → refine → compare against preset composition → repeat
```
- Runtime-verify visually in the preview; capture metrics (grid tracks, font sizes, sticky behavior) not just impressions.
- Gate: `pnpm lint --max-warnings 0`, `pnpm test`, rubric ≥ 90.

### 4.1 tac-ui-rubric — operational composition penalties (apply on every score)
On top of the standard 10 criteria, deduct for composition failures that make
the UI read as "premium admin template" instead of "operational command software":

| Penalty | −pts | Trigger |
|---|---|---|
| Excessive whitespace / empty void | −10 | floating content on a giant canvas; ungrouped bare elements |
| Uniform card grid | −8 | 4-equal / 3-equal / 6-6 layouts; no dominant surface |
| Equal-weight layout | −6 | every surface the same visual weight; no `command`/`tactical` tiers |
| Isolated sections | −5 | sections not grouped into SurfaceCards; no layering |
| Template-like symmetry | −5 | mirror-balanced SaaS composition; no asymmetric operational grouping |
| Decorative-not-operational | −6 | a surface that doesn't carry live state / workflow / intelligence |

A surface that trips two or more of these is **not shippable** regardless of its
base rubric score — rebuild the composition.

---

## 5. Operational Experience Directive (permanent)

> The platform must always feel connected to a **live logistics network**. Every
> page must communicate movement, activity, flow, alerts, system state, and
> command readiness. The product must feel **alive** — never a static admin panel.

Concrete obligations per surface:
- **Live signal** — a `tac-blink` status dot + "LIVE / synced HH:MM" somewhere
  in the orchestration layer (honor `prefers-reduced-motion`).
- **Orchestration layer** — every major page opens with a `command` SurfaceCard:
  operational overview + live network state + the primary **workflow launchers**
  (New Shipment / New Manifest / Scan). It is the page's command center, not a
  decorative banner.
- **System state** — surface alerts (exceptions), in-flight counts, next
  departure, sync status — context that implies an operating network behind it.
- **Charts are embedded intelligence** — framed inside a SurfaceCard with a
  title + supporting state line; never a bare floating widget.
- **Identity stays tactical** — mono metadata, sharp radius, violet Orbital
  signal, brutalist structure. Premium ≠ soft generic SaaS.

---

## 6. Skills to spawn (per task)

| Task | Skill |
|---|---|
| Any new surface/redesign | `tac-brainstorming` (spec) → `tac-premium-patterns` (composition) |
| Token decisions | `tac-design-tokens` |
| Authoring/re-theme | `tac-ui-authoring` · `tac-shadcn` (only `@tac` registry adds — never `init`/`apply`) |
| Score the result | `tac-ui-rubric` (≥ 90 gate) |
| External design inspiration | `frontend-design` filtered through `tac-uipro-bridge` |
| Recurring pattern → permanent rule | `tac-skillify` (codify this playbook's checks) |

---

## 7. Hard stops (will refuse)

- `shadcn init` / `apply` / `migrate icons` on this repo.
- `rounded-2xl` or any non-zero radius.
- Soft blur shadows, glassmorphism, raw hex, arbitrary `[px]`.
- Mono on headings/body, or removing mono from data.
- Mutating production data; pushing/PR without explicit ask.
