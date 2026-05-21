# Migration Spec — Retire `paper-*` → Pure shadcn + Violet Grid

> **Status:** IN PROGRESS on branch `refactor/paper-to-violet-grid`.
> - ✅ **Phase 1 complete**: 2 forms + 3 tables + 8 button files → shadcn primitives.
> - 🔄 **Phase 2 started**: dead `OpsListState` removed.
> - ✅ **Phase 3 — `paper-*` *non-color* tokens fully eradicated:**
>   - `tracking-paper-*` letter-spacing scale → semantic `--tracking-{id,crumb,tag,nav,badge,label,eyebrow,subtitle,wordmark,display}` (all callers migrated, paper tokens removed).
>   - `text-paper-*` font-size scale → semantic `--text-ui-{9..32}` (all callers migrated, paper tokens removed).
>   - All value-identical (zero metric change); verified live on the `apps/web` preview; gates green at every commit. `apps/web` public surface is fully paper-free.
> - ⏭️ **Remaining — requires the auth-gated dashboard to verify (NOT value-identical / structural):**
>   1. `paper-*` **color** tokens (`bg-paper-card`, `text-paper-fg-*`, ok/warn/err/info, `.paper-*` utility classes) → semantic. Real visual change on the ops-console.
>   2. The three paper **fonts** (Inter / JetBrains Mono / Instrument Serif) → Outfit / IBM Plex Mono / Noto Serif (LAW 4).
>   3. ops-console **structural** primitive swaps (`OpsCard`/`OpsTable`/`OpsButton`/`OpsField` → compose shadcn).
>   4. Delete the `paper-*` block + paper fonts from `globals.css`; add the **Phase 4 regression gate**.
>   8 paper-entangled button files (invoice-wizard, send-whatsapp-dialog, aging-buckets, smart-address-fields, saved-view-selector, sidebar, notification-bell, scanning-console) fold into (1)–(3) so each is touched once.
>
> **Blocker:** items 1–3 live behind `/ops-console` auth (Supabase backend unreachable in this env). They need a test login or dev auth-bypass to verify per this spec's DoD — they must not be done blind.
> **Date:** 2026-05-22
> **Origin:** [2026-05-22 shadcn purity audit](../audits/2026-05-22-shadcn-purity-audit.md)
> **Brainstorming decisions:**
> 1. **Visual target:** Converge ops-console to **Violet Grid** (dark-first zinc/violet,
>    Outfit/IBM Plex Mono/Noto Serif). Discard the warm-ivory paper aesthetic.
> 2. **Scope:** Eradicate the `paper-*` namespace **repo-wide** (ops-console + the 31
>    leaked non-ops-console files + the token/font block in `globals.css`).
> 3. **Sequencing:** **Phased, quick-wins first.** Each phase independently shippable.

---

## Goal

Every UI element in the repo is a shadcn-sourced primitive (in `packages/ui`) or a
composition of them, themed **only** with semantic Violet-Grid tokens. The parallel
`paper-*` design system — its hand-rolled primitives, its ivory theme, and its
Inter / JetBrains Mono / Instrument Serif fonts — is fully removed.

## Why this is more than the audit implied

`paper-*` is not an alias layer over the semantic tokens. `globals.css` defines it as
an **independent theme**: ivory light base (`--paper-bg: #FFFDF7`), its own
ok/warn/err/info ramps, and **three non-Violet-Grid fonts** (`--paper-font-display:
Inter`, `--paper-font-mono: JetBrains Mono`, `--paper-font-serif: Instrument Serif`).
So the migration removes a competing theme + font stack + primitive library, not just
raw HTML tags. This also closes a standing **LAW 4 (fonts)** violation.

---

## Non-Goals

- **Not** changing the locked divergences from preset `b5Fxrc2eNU`: `radix-lyra`
  style, `@remixicon/react` icons, and Orbital chart colors stay.
- **Not** redesigning ops-console information architecture or page layouts — only the
  token + primitive substrate changes; pages keep their structure.
- **Not** touching `composed/_archive/**`.
- **Not** converting print views away from raw `<table>` (raw tables are required for
  print fidelity) — but their `paper-*` tokens DO migrate to print-safe semantic tokens.

---

## Phase 0 — Pre-flight: close primitive-coverage gaps (blocks all later phases)

Before substituting anything, ensure the shadcn primitives we need exist in
`packages/ui`, sourced via the CLI/`@tac` registry (never hand-rolled). From the audit,
gaps are:

| Need | Current state | Action (per `tac-shadcn`) |
|------|---------------|---------------------------|
| `select` primitive | `registry/select.json` exists, no `primitives/select.tsx` | `cd packages/ui && pnpm dlx shadcn@4.7.0 add @tac/select`, then re-theme |
| `kbd` primitive | none (only `OpsKbd`) | source `kbd` via shadcn or author a minimal `@tac/kbd`; re-theme |
| `error-state` display | `primitives/error-boundary.tsx` is a boundary, not a display card | extract/confirm an `ErrorState` display surface (mirror `empty-state.tsx`) |
| signal tokens (success/warning/info) | confirm `--success` / `--warning` / `--info` (or equivalents) exist in `globals.css` semantic block | if missing, add them so paper ok/warn/info have semantic targets |

Confirm already-present targets: `components/button.tsx` (Button), `primitives/`
`card`, `table`, `badge`, `input`, `label`, `tabs`, `toggle-group`, `skeleton`,
`empty-state`, `dropdown-menu`, `separator`, `charts/kpi-tile.tsx`.

**DoD:** every Ops* primitive has a named shadcn target; `pnpm typecheck && lint && test` green.

---

## Phase 1 — Quick wins (self-contained, low blast radius)

No ops-console dependency. Ship independently.

1. **Hand-rolled forms → form primitives**
   - `composed/shipments/create-shipment-form.tsx` — 14 raw `<input>/<select>` (lines 170–248) → `Input` / `Label` / `Select`. Remove the `inputClass` constant.
   - `composed/finance/rate-card-form.tsx` — 9 raw `<input>/<select>` (lines 63–101) → `Input` / `Label` / `Select`. Remove `INPUT_CLS` / `SELECT_CLS`.
2. **On-screen raw tables → Table primitive**
   - `composed/management/roles-matrix.tsx` (77–116)
   - `composed/management/hubs-manager.tsx` (173–239)
   - `composed/manifests/manifest-builder/step-add-shipments.tsx` (267–325)
3. **Raw `<button>` → Button** — the ~33 occurrences across 18 composed files (audit Finding D). Preserve documented a11y patterns (e.g. `data-table.tsx:186` sortable header, the `notification-bell` link-or-button pattern) by using `Button asChild` / `buttonVariants` rather than dropping the semantics.

**DoD per item:** TDD where logic exists; visual parity verified; quality gates green.

---

## Phase 2 — ops-console primitive migration (the core)

Rebuild each `Ops*` primitive's internals on the shadcn target + **semantic tokens**,
keeping the `Ops*` export signature stable so call sites don't churn. Migrate in
**ascending blast-radius order** to validate the pattern on cheap cases first:

| Order | Ops primitive | Consumers | shadcn target | Notes |
|------:|---------------|----------:|---------------|-------|
| 1 | `OpsListState` | 0 | — | **delete** (dead code; barrel-only) |
| 2 | `OpsKbd` | 1 | new `Kbd` (Phase 0) | |
| 3 | `OpsPanelTabs` | 1 | `Tabs` | already wraps Radix tabs; just re-token |
| 4 | `OpsTopbar` | 1 | `Button`, `DropdownMenu` | 4 raw `<button>` → Button |
| 5 | `OpsGrowthChart` | 2 | `chart` + `ToggleGroup` | 3 raw range `<button>` → ToggleGroup |
| 6 | `OpsDashboard` | 2 | composition | re-token only |
| 7 | `OpsErrorState` | 3 | `ErrorState` (Phase 0) | |
| 8 | `OpsDetailFrame` | 3 | composition chrome | re-token only |
| 9 | `OpsSkeleton*` | 5 | `Skeleton` | |
| 10 | `OpsEmptyState` | 6 | `EmptyState` | |
| 11 | `OpsTable*` | 8 | `Table` | also fixes header-row `<tr>` pattern in pages |
| 12 | `OpsField*` | 10 | `Input`/`Select`/`Label` | |
| 13 | `OpsStatCard` | — | `charts/kpi-tile.tsx` | fold into existing KPI tile |
| 14 | `OpsBadge` | 15 | `Badge` (+ `sla-badge` where SLA) | map paper ok/warn/err/info → signal tokens |
| 15 | `OpsButton` | 17 | `Button` | map paper variants → Button variants |
| 16 | `OpsCard` | 18 | `Card` | |
| 17 | `OpsPageHead` | ~20 | composition chrome | re-token only |
| 18 | `OpsFrame` | ~21 | composition chrome | re-token only |

Also fix raw controls leaking into `pages/*` (audit §2): `ops-settings-view`,
`ops-inventory-view`, `ops-scanning-view`, `contact-leads-view`.

**Wrapper policy:** chrome composers (`OpsFrame`, `OpsPageHead`, `OpsDetailFrame`,
`OpsDashboard`) may remain as **composed** components (composition is allowed) — they
just must compose shadcn primitives + semantic tokens. Base duplicates (`OpsCard`,
`OpsTable`, `OpsBadge`, `OpsButton`, `OpsField*`, `OpsSkeleton`, `OpsEmptyState`,
`OpsErrorState`, `OpsKbd`) should ultimately resolve to direct primitive usage; an
interim re-themed wrapper is acceptable to bound the diff, with a follow-up inlining.

**DoD per primitive:** before/after screenshot of ≥1 consuming page; WCAG AA preserved
(the paper tokens carried tuned AA notes — the semantic equivalents must match or beat
them); quality gates green.

---

## Phase 3 — Token + font consolidation (repo-wide eradication)

1. **Migrate the 31 leaked non-ops-console files** off `paper-*` (audit Finding E):
   `footer.tsx`, `globe-hero.tsx`, `hub-context-switcher.tsx`, `awb-input.tsx`,
   `saved-view-selector.tsx`, `smart-address-fields.tsx`, `sidebar/sidebar.tsx`,
   all `landing/*`, all `scanning/*`, all `manifests/manifest-builder/*`,
   `notes/notes-panel.tsx`, `notifications/notification-inbox.tsx`, `bookings/*`,
   `finance/aging-buckets.tsx`, `finance/payment-timeline.tsx`, `management/*`,
   `maps/live-corridor-map.tsx`, `audit/audit-diff-viewer.tsx`,
   `shift-report/shift-report-view.tsx`, `shipments/shipping-label.tsx`,
   `wasteland-landing.tsx`. ⚠️ Some are `apps/web` landing surfaces — verify marketing visuals.
2. **Apply the token mapping** (light/dark both):

   | `paper-*` | → semantic Violet-Grid |
   |-----------|------------------------|
   | `--paper-bg` | `--background` |
   | `--paper-2` | `--sidebar` / `--muted` |
   | `--paper-3` | `--accent` / hover (`--muted`) |
   | `--paper-card`, `--paper-card-2` | `--card` |
   | `--paper-line`, `-2`, `-3` | `--border` (+ stronger weight where needed) |
   | `--paper-fg-1` | `--foreground` |
   | `--paper-fg-2`, `-3` | `--muted-foreground` |
   | `--paper-fg-4` | `--muted-foreground` (placeholder) |
   | `--paper-violet`, `-2`, `-50` | `--primary` (+ pressed/tinted) |
   | `--paper-ok`/`-bg` | `--success` (+ subtle bg) |
   | `--paper-warn`/`-bg` | `--warning` |
   | `--paper-err`/`-bg` | `--destructive` |
   | `--paper-info`/`-bg` | `--info` |
   | `font-paper-mono` (JetBrains Mono) | `font-mono` (IBM Plex Mono) |
   | `--paper-font-display` (Inter) | `font-sans` (Outfit) |
   | `--paper-font-serif` (Instrument Serif) | `font-serif` (Noto Serif) |

3. **Delete** the entire `paper-*` token block (both light & dark) and the three paper
   font declarations from `globals.css`, plus any `@font-face`/font loader for Inter /
   JetBrains Mono / Instrument Serif that exists solely for paper.

**DoD:** `grep -r "paper-" packages/ui apps` returns **zero** matches (outside
`_archive` and this doc); fonts load only Outfit/IBM Plex Mono/Noto Serif; gates green.

---

## Phase 4 — Regression gate (lock it in)

- Lint rule / Vitest guard forbidding raw `<button|input|select|textarea|table|thead|tbody|tr|td|th>` JSX in `packages/ui/src/components/composed/**` and `apps/**` (allowlist: `data-table.tsx`, `*print*`).
- Guard forbidding any `paper-*` class/token and the three paper fonts repo-wide.
- Wire both into the quality-gates command set so purity can't regress.

**DoD:** the guard fails on a deliberately-introduced raw `<button>` and on a `bg-paper-card`; passes on the migrated tree.

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| ops-console is the primary logistics surface; full re-theme = high visual-regression risk | Phase 2 ordered by blast radius; per-page before/after screenshots; ship per-primitive |
| Light→dark flip (ivory → zinc/violet) changes contrast everywhere | Preserve/beat the paper tokens' tuned WCAG AA ratios; run `tac-accessibility` checks |
| 31 leaked files include `apps/web` landing/marketing | Treat marketing surfaces as a distinct review with design sign-off |
| Wide codemod (15–20 consumer files per primitive) | Stable `Ops*` signatures in Phase 2 keep call sites unchanged; inline as follow-up |
| Print fidelity | Keep raw `<table>` in print views; migrate only their tokens |

## Definition of Done (whole migration)

- [ ] `grep -r "paper-" packages/ui apps` → 0 (excl. `_archive`, this doc)
- [ ] No raw primitive JSX in `composed/**` or `apps/**` (excl. allowlist)
- [ ] Only Outfit / IBM Plex Mono / Noto Serif fonts load
- [ ] ops-console renders dark-first Violet Grid, WCAG AA holds
- [ ] Regression gate active in quality-gates
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green at every phase boundary

## Suggested follow-ups (not in this spec)

- Inline the interim `Ops*` wrappers into direct primitive usage (Phase 2 debt).
- Re-evaluate whether any ops-console chrome composer is generic enough to promote to a shared `composed/` layout primitive.
