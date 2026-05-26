# Typography Correctness Audit — 2026-05-27

> **Session type:** Read-only audit. No code was changed.
> **Scope:** `packages/ui/src/styles/globals.css`, `apps/dashboard/app/layout.tsx`,
>   `packages/ui/components.json`, and three live pages inspected via browser
>   computed styles.
> **Auditor:** Claude Sonnet 4.6 — static code read + chrome-devtools-mcp computed inspection.
> **Branch:** `feat/typography-audit` (doc only, no PR).
> **Deliverable:** Answers to seven audit questions + three intervention arcs ranked by leverage.

---

## Q1 — What fonts are currently loaded?

### Declared in `apps/dashboard/app/layout.tsx`

| Variable | Family | Weights | Styles | Display |
|----------|--------|---------|--------|---------|
| `--font-sans` | Outfit | 300 400 500 600 700 800 | normal | swap |
| `--font-mono` | IBM Plex Mono | 300 400 500 600 700 | normal | swap |
| `--font-serif` | Noto Serif | 400 500 600 700 800 | normal + italic | swap |

All three are loaded via `next/font/google` with `preload: false` (avoids
preloaded-but-unused resource warnings) and `display: "swap"`.

The HTML element receives:
```html
class="antialiased [--font-sans:Outfit] [--font-mono:'IBM Plex Mono'] [--font-serif:'Noto Serif'] font-sans"
```

### CSS custom properties in `globals.css`

```css
--font-sans:    'Outfit'
--font-mono:    'IBM Plex Mono'
--font-serif:   'Noto Serif'
--font-heading: var(--font-serif)   /* alias used by heading tokens */
```

### Body rendering baseline

Applied to `html` / `body` in globals.css:

```css
text-rendering: optimizeLegibility;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
font-feature-settings: "liga" 1, "kern" 1, "calt" 1;
font-optical-sizing: auto;
```

---

## Q2 — What are the typographic tokens?

All tokens are defined in `packages/ui/src/styles/globals.css` inside
`@layer utilities`. All sizes expressed as `rem` (root base 16px unless
browser override).

### Display / Heading register — Noto Serif

| Token | Size | Weight | Letter-spacing | Line-height | Feature-settings |
|-------|------|--------|---------------|-------------|------------------|
| `.t-display` | 3rem / 48px | 800 | −0.045em | 1.03 | liga kern ss01 |
| `.t-h1` | 1.75rem / 28px | 700 | −0.035em | 1.12 | — |
| `.t-h2` | 1.375rem / 22px | 700 | −0.03em | 1.18 | — |
| `.t-h3` | 1.125rem / 18px | 600 | −0.022em | 1.28 | — |
| `.t-h4` | 0.9375rem / 15px | 600 | −0.016em | 1.35 | — |

### Body / Label register — Outfit

| Token | Size | Weight | Letter-spacing | Line-height | Notes |
|-------|------|--------|---------------|-------------|-------|
| `.t-body` | 0.9375rem / 15px | 400 | −0.01em | 1.6 | Reading text |
| `.t-body-sm` | 0.8125rem / 13px | 400 | −0.01em | 1.55 | — |
| `.t-caption` | 0.75rem / 12px | 400 | −0.005em | 1.5 | Sets `color: muted-foreground` |
| `.t-overline` | 0.6875rem / 11px | 500 | 0.1em | 1.4 | uppercase |

### Data / Mono register — IBM Plex Mono

| Token | Size | Weight | Letter-spacing | Line-height | Notes |
|-------|------|--------|---------------|-------------|-------|
| `.t-data` | 2.5rem / 40px | 600 | −0.05em | 1 | tabular-nums, tnum+zero |
| `.t-data-md` | 2rem / 32px | 700 | −0.04em | 1.05 | tabular-nums |
| `.t-data-sm` | 1.25rem / 20px | 500 | −0.018em | 1.1 | tabular-nums |
| `.t-mono` | 0.8125rem / 13px | 400 | 0em | 1.5 | tabular-nums, tnum |
| `.t-mono-sm` | 0.6875rem / 11px | 400 | 0em | 1.4 | tabular-nums, tnum |

### Structural label tokens — IBM Plex Mono

| Token | Size | Weight | Letter-spacing | Notes |
|-------|------|--------|---------------|-------|
| `.tac-mono-label` | 0.6875rem / 11px | 600 | 0.08em | uppercase, color: primary |
| `.tac-mono-label-base` | 0.6875rem / 11px | 600 | 0.08em | uppercase, no color override |

### Orbital chart tokens (restricted — chart components only)

| Token | Size | Letter-spacing | Notes |
|-------|------|---------------|-------|
| `.tac-caption` | 0.6875rem / 11px | 0.08em | uppercase, muted |
| `.tac-axis` | 0.6875rem / 11px | 0.04em | tabular-nums |
| `.tac-tag` | 0.625rem / 10px | 0.06em | uppercase, muted |

**Total token surface:** 5 heading + 4 body/label + 5 data + 2 structural = **16 named tokens**,
plus 3 Orbital-only tokens scoped to `@workspace/ui/components/charts`.

---

## Q3 — Where is each token used? (usage counts)

Counts from `grep -r` across the full monorepo source (`.tsx`, `.ts`, `.css`).

| Rank | Token | Count | Top consumers |
|------|-------|-------|---------------|
| 1 | `tac-mono-label` | 102 | nav sidebar groups, Paper v6 table headers, audit log rows |
| 2 | `t-mono` | 62 | DataTable grid container, cell wrappers, AWB spans |
| 3 | `t-body` | 57 | marketing pages, prose blocks |
| 4 | `t-body-sm` | 47 | form helper text, notification items |
| 5 | `t-mono-sm` | 38 | DataTable column headers, badge text |
| 6 | `t-overline` | 27 | KPI tile labels, card eyebrows |
| 7 | `t-caption` | 20 | page descriptions, card subtitles, search result counts |
| 8 | `t-data` | 20 | KPI tiles (Active Shipments, In Transit, etc.) |
| 9 | `t-h4` | 16 | chart titles, panel headers, card titles |
| 10 | `t-h1` | 13 | page titles (`<h1>`) |
| 11 | `tac-tag` | 11 | Orbital chart legend tags |
| 12 | `t-h2` | 6 | section headings (landing page) |
| 13 | `t-data-sm` | 5 | KPI delta readouts |
| 14 | `t-data-md` | 5 | KPI secondary values |
| 15 | `t-h3` | 4 | landing page sub-sections |
| 16 | `t-display` | 2 | landing hero headline |

`t-h4` (16) shoulders most of the panel/chart title work; `tac-mono-label` (102)
dominates the structural label layer.

---

## Q4 — What typographic registers exist? What is missing?

### Mapped registers

| Register | Purpose | Token(s) |
|----------|---------|----------|
| Display | Hero headline, single use | `t-display` |
| H1–H4 | Page → panel hierarchy | `t-h1` … `t-h4` |
| Body prose | Reading text | `t-body`, `t-body-sm` |
| Caption | Short descriptors, subtitles | `t-caption` |
| Overline | KPI labels, card eyebrows | `t-overline` |
| KPI data | Large numeric readouts | `t-data`, `t-data-md`, `t-data-sm` |
| Inline data | Table cell values, AWBs | `t-mono`, `t-mono-sm` |
| Structural labels | Nav group headers, Paper table headers | `tac-mono-label`, `tac-mono-label-base` |

### Gaps

**No form field label token.** Every `<label>` in the manifest builder,
shipment form, and customer form uses ad-hoc Tailwind utilities:
`font-mono font-medium uppercase leading-none tracking-widest text-muted-foreground`.

Browser inspection confirms these resolve to IBM Plex Mono 16px / weight 500 /
ls 1.6px / uppercase. That is significantly larger than `tac-mono-label`
(11px 600 0.08em) and creates visual equivalence between section group headers
(ROUTE, FLIGHT DETAILS) and individual field labels (FROM HUB, AIRLINE CODE) —
both render at 16px IBM Plex Mono with only a weight distinction (400 vs 500)
that is perceptually weak at this size.

**No nav-item body token.** Sidebar navigation items inherit from `font-sans`
without a named token, producing Outfit at Tailwind's default sizes (sm/xs).
This is lower priority — nav items are consistent with each other even without
a token — but means sidebar refinements accumulate raw utility classes.

---

## Q5 — What does the shadcn preset provide?

From `packages/ui/components.json`:

```json
{
  "style": "radix-lyra",
  "baseColor": "zinc",
  "cssVariables": true,
  "iconLibrary": "remixicon"
}
```

- **`radix-lyra`** is the TAC-registered custom shadcn style (not upstream
  `default` or `new-york`). It supplies the component CSS variable contracts
  (`--input`, `--ring`, `--card`, `--popover`, etc.) that map to Violet Grid
  tokens in `globals.css`.
- **`baseColor: zinc`** sets the neutral scale for unstyled component tokens
  before the Violet Grid overrides apply.
- **`cssVariables: true`** means all shadcn utilities reference CSS variables
  rather than hardcoded Tailwind colors — safe for theme switching.

The preset does not contribute any typographic tokens of its own; all font
and type-scale declarations are TAC-owned in `globals.css`.

---

## Q6 — Font-feature-settings and rendering properties

### Baseline (all elements via html/body)

```css
text-rendering: optimizeLegibility;   /* enable kerning pairs + ligatures */
-webkit-font-smoothing: antialiased;  /* greyscale sub-pixel: off */
-moz-osx-font-smoothing: grayscale;
font-feature-settings: "liga" 1,      /* standard ligatures */
                       "kern" 1,      /* kerning pairs */
                       "calt" 1;      /* contextual alternates */
font-optical-sizing: auto;            /* font drives optical sizing by size */
```

### Token-level additions

| Token | Added features | Purpose |
|-------|---------------|---------|
| `.t-display` | `"ss01" 1` | Noto Serif stylistic alternate at 3rem |
| `.t-data`, `.t-data-md`, `.t-data-sm` | `"tnum" 1, "zero" 1` | tabular-nums, slashed zero for KPI readouts |
| `.t-mono`, `.t-mono-sm` | `"tnum" 1` | tabular-nums for table cell data |

### Computed observations (browser)

- `t-h1` on `/ops-console`: Noto Serif 28px, weight 700, ls −0.98px — matches
  spec (−0.035em × 28 = −0.98px). ✓
- `t-data` on KPI tiles: IBM Plex Mono 40px, weight 600, ls −2px — matches
  spec (−0.05em × 40 = −2px). ✓
- `t-overline` on KPI labels: Outfit 11px, weight 500, ls 1.1px, uppercase —
  matches spec (0.1em × 11 = 1.1px). ✓
- `t-caption` on page descriptions: Outfit 12px, weight 400, ls −0.06px —
  matches spec (−0.005em × 12 = −0.06px). ✓
- `t-h4` on chart and panel titles: Noto Serif 15px, weight 600, ls −0.24px —
  matches spec (−0.016em × 15 = −0.24px). ✓

Rendering properties are landing correctly on the token-classed elements.
No rendering regressions found on the nominal path.

---

## Q7 — Computed typography on the three inspected pages

### Page 1: `/ops-console/manifests/create`

| Element | Computed | Token / source |
|---------|----------|----------------|
| `h1` "New Manifest" | Noto Serif 28px 700 ls−0.98px | `t-h1` ✓ |
| Page description | Outfit 12px 400 ls−0.06px | `t-caption` ✓ |
| Section group label "ROUTE" | IBM Plex Mono 16px 400 ls1.6px uppercase | Raw utilities (`font-mono uppercase tracking-widest`) — no token |
| Field label "FROM HUB" | IBM Plex Mono 16px 500 ls1.6px uppercase | shadcn `<Label>` with raw utilities — no token |
| Field label "ETD" / "ETA" | IBM Plex Mono 16px 500 ls1.6px uppercase | Same — no token |
| Toggle control label "Only Ready Status" | Outfit 16px 400 ls−0.4px | Bare `grid gap-1.5` — no token, no uppercase |
| Notes field label | Outfit 16px 400 ls−0.4px | Same |
| Breadcrumb env "IMPHAL // PROD" | IBM Plex Mono 9px 400 ls1.62px uppercase | `font-mono text-3xs tracking-subtitle` |
| Breadcrumb page "Rate Cards" | IBM Plex Mono 12px 500 ls1.2px uppercase | Sidebar nav item style |

**Observation — label scale collision:** Section group labels and field labels both
render at 16px IBM Plex Mono. The only distinction is weight 400 vs 500, which
is not sufficient visual separation at this size. Toggle labels (Outfit 16px, no
uppercase) add a third label style at the same size with a different face.

### Page 2: `/ops-console` (dashboard)

| Element | Computed | Token / source |
|---------|----------|----------------|
| `h1` "Dashboard" | Noto Serif 28px 700 | `t-h1` ✓ |
| Page description | Outfit 12px 400 ls−0.06px | `t-caption` ✓ |
| Page overline "PLATFORM" | IBM Plex Mono 9px 500 ls1.26px uppercase | Sidebar group label (button variant) |
| Hero sub-title "Operations Overview" | Noto Serif 15px 600 ls−0.24px | `t-h4` ✓ |
| KPI label "Active Shipments" | Outfit 11px 500 ls1.1px uppercase | `t-overline` ✓ |
| KPI value "0" | IBM Plex Mono 40px 600 ls−2px | `t-data` ✓ |
| Chart title "Growth" | Noto Serif 15px 600 ls−0.24px | `t-h4` ✓ |
| Chart subtitle "DELIVERY ACTIVITY…" | IBM Plex Mono (inferred) uppercase | Raw utilities — no token |
| Calendar header "MAY 2026" | IBM Plex Mono 16px 400 ls1.6px uppercase | `rdp-caption_label` (react-day-picker default) |
| Calendar sub "Scheduled manifests by…" | IBM Plex Mono 10px 400 ls1px uppercase | Raw utilities (`font-mono text-2xs uppercase tracking-widest`) |
| CTA button "New Shipment" | Outfit 12px 500 ls−0.4px | Button primitive — no t-* token |

**Observation — calendar heading at 16px:** The react-day-picker default
`rdp-caption_label` renders at 16px IBM Plex Mono — the same scale collision as
the form labels. This is a third context where 16px IBM Plex Mono appears
without a token.

### Page 3: `/ops-console/rates`

| Element | Computed | Token / source |
|---------|----------|----------------|
| `h1` "Rate Cards" | Noto Serif 28px 700 | `t-h1` ✓ |
| Page overline "BUSINESS" | IBM Plex Mono 9px 500 ls1.26px uppercase | Sidebar group label |
| Page description | Outfit 12px 400 ls−0.06px | `t-caption` ✓ |
| Card title "ACTIVE RATE CARDS" | Outfit 11px 500 ls1.1px uppercase | `t-overline` ✓ |
| Card subtitle "8 records" | Outfit 12px 400 ls−0.06px | `t-caption` ✓ |
| Column header "ROUTE", "SERVICE"… | IBM Plex Mono 11px 400 **ls: normal** uppercase | `t-mono-sm uppercase tracking-wider` — **letter-spacing not landing** |
| Route cell "IMPHAL → NEW DELHI" | IBM Plex Mono 14px 400 ls: normal | `font-mono tabular-nums text-sm` |
| Service cell "PRIORITY" | Outfit 12px 400 **ls: −0.06px** uppercase | `t-caption uppercase tracking-wider` — **letter-spacing conflict** |
| Rate cell "₹240" | IBM Plex Mono 14px 400 ls: normal | `font-mono tabular-nums text-sm` ✓ |
| Search input | IBM Plex Mono 12px 400 ls−0.4px uppercase | `text-xs font-mono uppercase tracking-wider` |
| Pagination "Page 1 of 1" | IBM Plex Mono (inherited) 13px | `font-mono text-xs tabular-nums` |

**Two concrete letter-spacing failures on this page:**

1. **Column headers:** `t-mono-sm uppercase tracking-wider` computes
   `letter-spacing: normal` (the CSS keyword). Neither the token's `0em` nor
   `tracking-wider`'s `0.05em` is landing. The column headers render with
   default optical spacing rather than the specified open tracking.

2. **Service cell:** `t-caption uppercase tracking-wider` computes
   `letter-spacing: −0.06px`. This is `t-caption`'s `−0.005em` value,
   meaning `t-caption` is winning over `tracking-wider` in CSS output order.
   An uppercase Outfit label gets slightly negative letter-spacing — the
   opposite of the intended positive tracking for all-caps text.

---

## Synthesis — Three intervention arcs

The audit identified three distinct problems. Each is stated as a constraint
violation, not a style preference.

### Arc 1 — Fix DataTable column header letter-spacing (one line, system-wide)

**Problem:** Every DataTable column header in the system (`v7-ops-shipments`,
`v7-ops-manifests`, `v7-ops-customers`, `v7-ops-rate-cards`) uses
`t-mono-sm uppercase tracking-wider` on the columnheader div. The computed
`letter-spacing` is the CSS keyword `normal`. The intended positive tracking
(open-set uppercase mono label) is not rendering.

**Root cause:** `t-mono-sm` specifies `letter-spacing: 0em` and `tracking-wider`
specifies `letter-spacing: 0.05em`. Both are `@layer utilities`; the later
definition in the compiled CSS wins. Based on computed output (`normal`),
neither property is landing — suggesting the keyword `normal` from a higher
scope (likely a Tailwind v4 CSS-variable-based utility whose variable is
undefined) takes precedence.

**Fix path:** Replace `t-mono-sm uppercase tracking-wider text-muted-foreground`
on the `columnheader` className in `data-table.tsx` with `tac-mono-label-base
text-muted-foreground`. `tac-mono-label-base` has uppercase, 0.08em letter-spacing,
and weight 600 baked in as a single CSS rule — no multi-class specificity
conflict. One targeted edit to `data-table.tsx`; all four DataTable consumers
inherit the fix.

**Leverage:** Highest. One file, four tables, system-wide consistency.

---

### Arc 2 — Establish a form field label token (eliminate the 16px IBM Plex Mono sprawl)

**Problem:** Form field labels across manifests, shipments, and customer forms
render at IBM Plex Mono 16px via ad-hoc utilities. This is visually the same
scale as the section group headers (ROUTE, FLIGHT DETAILS), producing a flat
hierarchy where labels, group names, and the react-day-picker calendar heading
all land at the same 16px weight. Labels should subordinate to section headers.

Three distinct surfaces show this pattern:
- `<Label>` components in manifest builder (FROM HUB, AIRLINE CODE, FLIGHT DATE, etc.)
- Section group headings in the same form (ROUTE, FLIGHT DETAILS)
- The react-day-picker `rdp-caption_label` (MAY 2026) on the calendar

The existing `tac-mono-label` token (11px IBM Plex Mono 600 0.08em uppercase)
is the correct scale for dense-form field labels; it already governs nav group
headers and Paper table headers. The form labels are not using it.

**Fix path:**
1. Audit the `<Label>` component in `packages/ui/src/components/primitives/`
   (or wherever the shadcn label is wrapped) — add `tac-mono-label-base` as
   the default className so field labels inherit the correct scale without per-site
   overrides.
2. Override the `rdp-caption_label` style in the Calendar primitive's CSS to
   use `tac-mono-label-base` scale.
3. Section group headings in the manifest form use `font-mono uppercase
   tracking-widest text-muted-foreground` directly — these may intentionally be
   larger than field labels (serving as section dividers). If so, leave them and
   document the distinction. If not, token-ize them too.

**Leverage:** Medium-high. Addresses the most visually jarring inconsistency
(same-size label and section header), fixes all forms at once via the shared
Label primitive.

---

### Arc 3 — Resolve t-caption + tracking-wider collision in badge cells (scoped, low risk)

**Problem:** Table cell service/status labels in `v7-ops-rate-cards.tsx` (and
any other table cell using `t-caption uppercase tracking-wider`) compute
`letter-spacing: −0.06px` — the t-caption negative value — instead of the
intended `tracking-wider` positive value. Uppercase labels at 12px Outfit with
negative letter-spacing are optically compressed; the convention for all-caps
labels in this system is positive tracking.

**Root cause:** `t-caption` and `tracking-wider` conflict on the `letter-spacing`
property. In the compiled CSS, `t-caption` appears after `tracking-wider` in
`@layer utilities`, so `t-caption`'s `−0.005em` wins.

**Fix path:** Replace `t-caption uppercase tracking-wider` with
`tac-mono-label-base` for table cell badge labels that render service/status
strings as ALL-CAPS mono labels. The visual result shifts from Outfit 12px to
IBM Plex Mono 11px, which is consistent with the mono-label vocabulary already
used for table column headers and nav group labels. If Outfit is required for
these cells specifically, add a dedicated `t-badge-label` token to globals.css
(Outfit 0.6875rem 500 0.1em uppercase — same shape as t-overline but at 11px).

**Leverage:** Low-medium. Narrow scope (rate cards and similar cells), low
visual severity (the negative tracking is perceptually subtle at 12px). Correct
to fix but not blocking.

---

## Appendix — Raw computed data

### `/ops-console/manifests/create` — label element samples

| Selector | font-family | font-size | font-weight | letter-spacing | text-transform |
|----------|-------------|-----------|-------------|---------------|----------------|
| `h1.t-h1` | Noto Serif | 28px | 700 | −0.98px | none |
| `p.t-caption` (page desc) | Outfit | 12px | 400 | −0.06px | none |
| Label (FROM HUB) | IBM Plex Mono | 16px | 500 | 1.6px | uppercase |
| Section group (ROUTE) | IBM Plex Mono | 16px | 400 | 1.6px | uppercase |
| Toggle label (Only Ready Status) | Outfit | 16px | 400 | −0.4px | none |

### `/ops-console` — dashboard samples

| Selector | font-family | font-size | font-weight | letter-spacing | text-transform |
|----------|-------------|-----------|-------------|---------------|----------------|
| `h1.t-h1` | Noto Serif | 28px | 700 | −0.98px | none |
| KPI label `.t-overline` | Outfit | 11px | 500 | 1.1px | uppercase |
| KPI value `.t-data` | IBM Plex Mono | 40px | 600 | −2px | none |
| Chart title `.t-h4` | Noto Serif | 15px | 600 | −0.24px | none |
| Sidebar group label | IBM Plex Mono | 9px | 500 | 1.26px | uppercase |
| rdp-caption_label | IBM Plex Mono | 16px | 400 | 1.6px | uppercase |

### `/ops-console/rates` — table samples

| Selector | font-family | font-size | font-weight | letter-spacing | text-transform |
|----------|-------------|-----------|-------------|---------------|----------------|
| Column header `[role=columnheader]` | IBM Plex Mono | 11px | 400 | **normal** | uppercase |
| Route cell span | IBM Plex Mono | 14px | 400 | normal | none |
| Service cell span `.t-caption` | Outfit | 12px | 400 | **−0.06px** | uppercase |
| Rate cell span | IBM Plex Mono | 14px | 400 | normal | none |
| Card title `.t-overline` | Outfit | 11px | 500 | 1.1px | uppercase |
| Card subtitle `.t-caption` | Outfit | 12px | 400 | −0.06px | none |
