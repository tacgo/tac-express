# TAC Express — Design System

> **Authority:** This file is the canonical visual identity for TAC Express.
> **Source of truth:** `packages/ui/src/styles/globals.css` is the implementation. This document explains *why* and *how to extend it*. If there is ever a conflict, the CSS is correct and this file is updated.
> **Version:** 5.0 — Violet Grid (May 2026)
> **Roadmap:** [`docs/VIOLET-GRID-V6-EVOLUTION.md`](docs/VIOLET-GRID-V6-EVOLUTION.md) — additive evolution to surface depth tiers, color-mix overlay tokens, 3-layer motion vocabulary, container queries, density modes, and premium hover/focus polish. **Phase 1 foundations have shipped** (May 2 2026); phases 2-5 remain.

---

## 0. Identity

**TAC Express v5.0 — Violet Grid** is a logistics mission-control aesthetic: dense, technical, sharp-cornered, and dark-first. It marries the structural rigor of NASA telemetry interfaces with the offset-shadow brutalism of industrial signage. The primary signal is a precise violet — professional enough for an enterprise dashboard, distinctive enough to win design awards.

### Premium Positioning

The system feels expensive because of *restraint*, not ornament. The premium read comes from:

- **Engineered geometry** — sharp 0rem corners + 1px borders + sharp offset shadows — communicates precision and accountability the way a Bloomberg terminal or a Linear app does.
- **Tabular data discipline** — every numeric value renders in IBM Plex Mono with `tabular-nums`. Numbers line up. KPIs feel weighted.
- **One hue, with conviction** — a single saturated violet (`oklch(0.5393 0.2713 286.7462)`) carries the brand. We never blend it with cyan, indigo, or teal accents on the same surface.
- **Choreographed motion** — instant on mission-control surfaces (80ms linear), considered on marketing surfaces (150–300ms with `--ease-smooth`), bouncy only on press (`--ease-spring`).
- **Typography hierarchy** — premium type utilities (`.t-display`, `.t-h1`, `.t-data`, `.t-overline`) include negative letter-spacing, balanced wrapping, ligatures, and tabular nums by default.

This is what "premium" looks like in this system: nothing extra. Every line is structural; every animation has intent.

### Three pillars

1. **Mission-Control density** — tabular layouts, monospace data, FUI overlays (grids, crosshairs, scanlines).
2. **Violet signal palette** — one primary hue (violet) anchors the brand. Status uses green/amber/red.
3. **Brutalist structure** — 0px radius, 1px borders, 1–16px offset shadows. No glassmorphism, no soft drop shadows, no curved decorations.

> **The rule:** the interface should look like it is operating physical machinery, not curating a content feed.

---

## 1. Geometry

| Token | Value |
|-------|-------|
| `--radius` | `0rem` |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-xl` | all `var(--radius)` (0px) |

**LAW 13** — straight lines only. No `rounded-full`, no curved bezier paths used for decoration, no organic blobs. Allowed: 90° angles, sharp corners, geometric grids, crosshairs, brackets, hazard stripes.

---

## 2. Color (OKLCH only — LAW 1)

All colors live in `packages/ui/src/styles/globals.css`. Never hardcoded. Never as Tailwind color classes (`bg-blue-500` is a LAW 10 violation).

### Core surface tokens (light & dark)

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--background` | `oklch(0.9940 0 0)` | `oklch(0.2223 0.0060 271)` | Page canvas |
| `--foreground` | `oklch(0.1200 0.015 264)` | `oklch(0.9556 0.0074 264)` | Primary text |
| `--card` | `oklch(1 0 0)` | `oklch(0.2568 0.0076 274)` | Panel surface |
| `--popover` | `oklch(1 0 0)` | `oklch(0.2568 0.0076 274)` | Floating surface |
| `--surface` | `oklch(0.9700 0.0050 264)` | `oklch(0.2837 0.0137 274)` | Mid-layer surface |
| `--border` | `oklch(0.8200 0.02 286)` | `oklch(0.3280 0.0195 280)` | All structural framing |
| `--muted` | `oklch(0.9400 0.0100 264)` | `oklch(0.3003 0.0094 271)` | De-emphasized surface |
| `--muted-foreground` | `oklch(0.4000 0.015 264)` | `oklch(0.6351 0.0094 264)` | Secondary text |

### Brand & status

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--primary` | `oklch(0.5393 0.2713 286.7462)` | `oklch(0.6132 0.2294 291.7437)` | Violet — CTAs, focus rings, primary signal |
| `--accent-success` | `oklch(0.60 0.18 150)` | same | Delivered, paid, healthy |
| `--accent-warning` | `oklch(0.72 0.18 80)` | same | In-transit, due-soon, attention |
| `--accent-danger` / `--destructive` | `oklch(0.5885 0.2090 24)` / `oklch(0.6368 0.2078 25)` | same | Delayed, breached, error |
| `--accent-info` | `oklch(0.5393 0.2713 286.7462)` | `oklch(0.6132 0.2294 291.7437)` | Data signal |

### Charts (5-step indigo ramp)

`--chart-1` through `--chart-5` step through the violet ramp. Use them in this order to guarantee chromatic harmony.

### Print

`--print-bg`, `--print-fg`, `--print-border` force black-on-white for AWB labels, manifests, and invoices regardless of theme.

---

## 3. Shadows (LAW 9)

There are **no soft drop shadows**. All Tailwind shadow utilities (`shadow-sm`, `shadow-md`, `shadow-lg`) resolve to `none`. Two brutalist offsets are available:

| Token | Value |
|-------|-------|
| `--shadow-brutal-sm` | `2px 2px 0 0 var(--border)` |
| `--shadow-brutal` | `4px 4px 0 0 var(--border)` |

For focus or active state emphasis, use the **signal glow** utility (1px ring + 8px color-mix bloom on `--primary`), not blur shadows.

---

## 4. Typography

| Role | Font | CSS variable | Usage |
|------|------|--------------|-------|
| Sans (UI / headings) | **Plus Jakarta Sans** | `--font-sans` | All UI text |
| Mono (data / numbers) | **IBM Plex Mono** | `--font-mono` | AWBs, weights, timestamps, currency, codes |
| Serif (prose / quotes) | **Lora** | `--font-serif` | Blockquotes, editorial content |

**LAW 4** — fonts are declared exactly twice in the repo: `apps/web/app/layout.tsx` and `apps/dashboard/app/layout.tsx`. Do not declare fonts elsewhere.

### Premium Type Scale (`.t-*` utilities)

These utilities encode the premium hierarchy — kerning, ligatures, balanced text, and tabular nums baked in. Prefer them over ad-hoc `text-*` classes on branded surfaces.

| Class | Family | Size | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `.t-display` | sans | 3rem | 800 | -0.045em | Hero displays |
| `.t-h1` | sans | 1.75rem | 700 | -0.035em | Page titles |
| `.t-h2` | sans | 1.375rem | 700 | -0.030em | Section heads |
| `.t-h3` | sans | 1.125rem | 600 | -0.022em | Sub-section heads |
| `.t-h4` | sans | 0.9375rem | 600 | -0.016em | Panel heads |
| `.t-body` | sans | 0.9375rem | 400 | -0.010em | Reading text |
| `.t-body-sm` | sans | 0.8125rem | 400 | -0.010em | Dense reading text |
| `.t-caption` | sans | 0.75rem | 400 | -0.005em | Captions (muted) |
| `.t-overline` | sans | 0.6875rem | 500 | +0.10em | Eyebrow labels (uppercase) |
| `.t-data` | mono | 2.5rem | 600 | -0.05em | KPI displays (tabular-nums) |
| `.t-data-sm` | mono | 1.25rem | 500 | -0.018em | Inline KPIs |
| `.t-mono` | mono | 0.8125rem | 400 | 0 | Inline mono data |
| `.t-mono-sm` | mono | 0.6875rem | 400 | 0 | Dense mono cells |

### Premium Text Effects (use sparingly — hero only)

```tsx
.t-gradient-primary    Violet gradient → headings & key labels
.t-gradient-hero       Wider violet sweep → t-display on hero
.t-gradient-success    Green gradient → positive KPI values
.text-glow-primary     Violet text-shadow bloom → dark mode hero only
.text-shadow-sm/md/lg  Subtle to heavy text shadow scale
```

### Data Display Pattern

Numeric data **must** render in mono. Pair every monospaced value with a `.tac-mono-label` for the field key:

```tsx
<dl>
  <dt className="tac-mono-label">AWB</dt>
  <dd className="font-mono tabular-nums">TAC25040000123</dd>
</dl>
```

### Extra-small text scale

Tailwind v4 default scale is augmented for dense FUI panels:

- `text-3xs` → `0.5625rem`
- `text-2xs` → `0.625rem`

---

## 5. Motion (LAW 3)

Animation is allowed only via:

1. `motion` (motion/react) — for component-level transitions
2. `tw-animate-css` — for utility classes (`animate-in`, `fade-in`, `slide-in-from-bottom-*`, etc.)
3. CSS `@keyframes` defined inside `globals.css` — for global, structural motion (scanlines, marquee, terminal-blink)

`framer-motion` (legacy package name), `gsap`, and `@motionone/react` are forbidden. The new `motion` package (same publisher) IS allowed.

### Easing & duration tokens

| Token | Value |
|-------|-------|
| `--duration-fast` | `80ms` |
| `--duration-base` | `150ms` |
| `--duration-slow` | `300ms` |
| `--duration-slower` | `500ms` |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| `--ease-linear` | `linear` |

### Choreography Recipes (the premium cadence)

| Surface | Treatment |
|---|---|
| Mission-control panel hover | `transition-all duration-fast ease-linear` — machine-like, instant |
| Mission-control card lift | `hover:-translate-x-0.5 hover:-translate-y-0.5` (preserves brutalist offset read) |
| Marketing hero entrance | Stagger `.animate-in fade-in slide-in-from-bottom-4 duration-slow` with sibling `delay-100` / `delay-200` |
| Modal / sheet open | `duration-base` with `--ease-smooth` |
| Button press | `transition-transform duration-base ease-[var(--ease-spring)] active:scale-[0.98]` — confident bounce |
| KPI value count-up | `motion`/react `<motion.span>` with `useSpring` on a `MotionValue` |
| Status badge state change | `tw-animate-css` `.animate-in zoom-in-50 duration-fast` |

**Default for mission-control surfaces:** `transition-all duration-fast ease-linear`. Machine-like, instant.
**Default for branded marketing surfaces:** `transition-all duration-base ease-[var(--ease-smooth)]`. Considered, intentional.

### Reduced-motion safety

`globals.css` already includes a global `prefers-reduced-motion` override. For component-level safety, especially with structural FUI motion:

```tsx
className="tac-scanline motion-reduce:hidden"
className="tac-blink motion-reduce:animate-none"
```

---

## 6. FUI Utility Classes

Defined in `globals.css` under `@layer utilities`:

| Class | Description |
|-------|-------------|
| `.tac-fui-panel` | Solid card surface, 1px border |
| `.tac-fui-border` | 1px solid border on `--background` |
| `.tac-fui-hover` | Instant border + 5%-mix background on hover |
| `.tac-mono-label` | Uppercase mono caps, tight tracking, primary color |
| `.tac-fui-crosshair` | Centered `+` decoration via `::before` |
| `.tac-signal-glow` | 1px ring + 8px primary color-mix bloom |
| `.tac-hazard-stripes` | -45° primary/background repeating gradient |
| `.tac-hazard-stripes-muted` | -45° border/transparent repeating gradient |
| `.tac-scanline` | 2px primary line scanning vertically (4s loop) |
| `.tac-blink` | 1s step terminal blink |
| `.tac-surface` / `.tac-overlay` / `.tac-code-bg` | Surface convenience classes |
| `.tac-print-label` | Print-safe black-on-white wrapper |

---

## 7. Component Authoring Rules

Every UI component **must**:

1. Live in `packages/ui/src/components/` — never in `apps/`. (LAW 5)
2. Use `cva` for variants and `cn` for className composition.
3. Use a `data-slot="..."` attribute as the styling hook.
4. Be exported as a **named** export — never default.
5. Reference colors only via semantic tokens (`bg-primary`, `text-foreground`, `border-border`, `bg-accent-success`).
6. Reference radius only via `var(--radius-*)` or scale tokens — never hardcoded.

If a shadcn primitive exists for the need, **wrap and style** it. Do not rebuild from scratch (LAW 14).

---

## 8. Layout Density

- Visible structural lines: prefer `divide-x`, `divide-y`, `border` over whitespace separation.
- Asymmetric grids (e.g. 2 / 7 / 3) feel more technical than even thirds.
- Default panel padding: `p-4` (16px). Dense list rows: `py-2 px-3`.

---

## 9. Interactive States

| State | Treatment |
|-------|-----------|
| Hover | `border-primary` + 5% primary-mix background + `transition-all duration-fast ease-linear` |
| Focus | 1px sharp `outline-ring` (no fuzzy ring, no glow) |
| Active | Background shifts instantly (no fade) |
| Disabled | `opacity-50 pointer-events-none` |

---

## 10. Print

The dashboard supports printing AWB labels, manifests, and invoices.

- Sidebar, header, theme toggle, notifications, and any element with `data-print-hide="true"` are hidden via `@media print`.
- Backgrounds force white in print mode.
- All print artifacts use `--print-bg`, `--print-fg`, `--print-border` for guaranteed contrast.

---

## 11. Laws (full list lives in `AGENTS.md` § 4)

| # | Law |
|---|-----|
| 1 | No color value outside `globals.css` |
| 2 | Icons only via `@workspace/ui/icons` (Remix Icon) |
| 3 | Animation only via `motion` or `tw-animate-css` or `@keyframes` in globals.css |
| 4 | Fonts declared only in the two `layout.tsx` files |
| 5 | UI components only in `packages/ui` |
| 6 | No DB calls in components — only via `packages/services` |
| 7 | No business logic in components |
| 8 | `@supabase/supabase-js` only in `packages/database` |
| 9 | No hardcoded spacing/radius/shadow |
| 10 | No Tailwind color classes (`bg-blue-500` etc.) |
| 11 | No arbitrary Tailwind values (`w-[347px]`) |
| 12 | `pnpm` only |
| 13 | Straight lines only |
| 14 | Wrap shadcn primitives — never rebuild |
