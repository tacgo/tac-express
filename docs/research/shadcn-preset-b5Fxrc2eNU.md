# shadcn `/create` Preset Analysis — `b5Fxrc2eNU`

> **Source:** <https://ui.shadcn.com/create?preset=b5Fxrc2eNU>
> **Captured:** 2026-05-22 · rendered live in Chromium; tokens/fonts/components read from the
> same-origin preview iframe (`/preview/radix/preview-02`) DOM, not inferred from the URL.

## 1. Decoded preset (ground truth)

The preview iframe request spells out every encoded choice:

```
/preview/radix/preview-02
  ?preset=b5Fxrc2eNU
  &style=maia
  &baseColor=zinc
  &theme=indigo
  &chartColor=yellow
  &font=outfit
  &fontHeading=noto-serif
  &iconLibrary=tabler
  &radius=none
```

| Knob | Value |
|------|-------|
| Style | **Maia** (newest shadcn style, not default/new-york) |
| Base color | **Zinc** (cool neutral, hue ≈ 285°) |
| Theme (accent) | **Indigo** |
| Chart palette | **Yellow** (amber/gold ramp) |
| Body font | **Outfit** |
| Heading font | **Noto Serif** |
| Mono font | *not overridden* → Geist Mono fallback |
| Icon library | **Tabler Icons** |
| Radius | **none (0)** |
| Mode | **Dark** (`color-scheme: dark`) |

## 2. Install command (from "Get Code")

```bash
pnpm dlx shadcn@latest init --preset b5Fxrc2eNU --template next
```

- **Templates offered:** Next.js · Vite · TanStack Start · Laravel · React Router · Astro
- **Base lib:** Radix UI or Base UI
- **Options:** Use pointer on buttons · Create a monorepo · Enable RTL support · (pnpm/npm/yarn/bun)
- There is **no public `/r/*.json`** for a preset — it is decoded by the CLI via `--preset`
  (verified: `/api/presets/b5Fxrc2eNU` → 404).

## 3. Theming — resolved design tokens (OKLCH, dark)

**Neutrals (Zinc base)**

| Token | Value | ≈ |
|-------|-------|---|
| `--background` | `oklch(0.141 0.005 285.8)` | near-black (~zinc-950) |
| `--card` / `--popover` / `--sidebar` | `oklch(0.21 0.006 285.9)` | ~zinc-900 |
| `--secondary` / `--muted` / `--accent` | `oklch(0.274 0.006 286)` | ~zinc-800 |
| `--foreground` | `oklch(0.985 0 0)` | near-white |
| `--muted-foreground` | `oklch(0.705 0.015 286)` | ~zinc-400 |
| `--border` | `oklch(1 0 0 / 10%)` | 10% white |
| `--input` | `oklch(1 0 0 / 15%)` | 15% white |
| `--ring` | `oklch(0.552 0.016 285.9)` | desaturated zinc |

**Accent (Indigo theme)**

| Token | Value | Note |
|-------|-------|------|
| `--primary` | `oklch(0.398 0.195 277.4)` | deep indigo-violet (hue 277°) |
| `--primary-foreground` | `oklch(0.962 0.018 272.3)` | near-white, violet tint |
| `--sidebar-primary` | `oklch(0.585 0.233 277.1)` | brighter, more saturated indigo |
| `--destructive` | `oklch(0.704 0.191 22.2)` | red |

**Chart ramp (Yellow → bronze)**

| Token | Value |
|-------|-------|
| `--chart-1` | `oklch(0.905 0.182 98.1)` — bright yellow |
| `--chart-2` | `oklch(0.795 0.184 86.0)` — gold |
| `--chart-3` | `oklch(0.681 0.162 75.8)` — amber |
| `--chart-4` | `oklch(0.554 0.135 66.4)` — bronze |
| `--chart-5` | `oklch(0.476 0.114 61.9)` — dark bronze |

**Shape & elevation**

- `--radius: 0` → sharp corners everywhere (confirmed: primary button `border-radius: 0px`).
- Buttons render `box-shadow: none` — flat, no soft elevation.

## 4. Typography — three-font, role-split

| Role | Font | Evidence |
|------|------|----------|
| Body / UI / labels / buttons | **Outfit** | body & primary button = Outfit; button 14px / 500 |
| Headings — card titles | **Noto Serif** | `Contribution History` title = "Noto Serif", 16px / 500 |
| Large data figures | **Outfit** semibold | `$420,000` = Outfit, 30px / 600 |
| Mono | Geist Mono (fallback) | no custom mono; no mono element rendered |

Signature move: **serif (Noto Serif) titles + geometric sans (Outfit) for all functional text,
including large numerics.**

## 5. Components present (shadcn `data-slot` inventory)

The `preview-02` "financial dashboard" exercises ~40 distinct primitives. Counts = rendered instances:

- **Shell / layout:** `sidebar` (+ `sidebar-menu` ×14, `sidebar-group`), `card` (37 — dominant) with full
  `card-header/title/description/content/footer/action`, `separator` (9)
- **Data display:** `table` (rows ×5, cells ×25), `chart` (9 — Recharts), `badge` (10), `progress` (3),
  `skeleton` (8 — loading states), avatars (via `item-media`)
- **`item` list primitive:** `item` (28) + `item-content/title/description/media/actions/footer/group`
- **Forms / inputs:** `field` system (`field-label` ×32, `field-group`, `field-set`, `field-legend`,
  `field-separator`), `input` (7), `input-group` (8, addon/control/button), `textarea`, `select` +
  `native-select`, `checkbox` (5), `radio-group`, `switch` (3), `slider` (6: track/range/thumb),
  `toggle-group` (10), `calendar`, `label`
- **Nav / overlays:** `dropdown-menu` (6), `tabs` (list/trigger/content), `accordion` (3),
  `breadcrumb` (link/page/separator)
- **States:** `empty` (4 — icon/header/title/description/content)
- **Buttons:** 71 instances (most-used interactive primitive)

## 6. Icons

- **Tabler Icons** — 75 of 85 SVGs carry `tabler-icon`; rendered `size-4` (16px), `shrink-0`.
- Most-used: `chevron-right` (7), `x` (5). The other ~10 SVGs are Recharts surfaces, not icons.

## 7. Characterization

Dark, sharp-edged, **editorial-fintech**: zinc cool-gray canvas, single **deep-indigo** accent/CTA,
**yellow→bronze** charts for warm contrast, **zero radius + no shadows** (flat/brutalist), and a
**Noto Serif / Outfit** serif-sans editorial pairing. Tabler icons, Maia style.

## 8. Relevance to TAC Express (Violet Grid)

This preset is **strikingly close to our own Violet Grid stack**: Outfit + Noto Serif, `radius: 0`,
flat/brutalist treatment, violet/indigo signal on a zinc-dark base. Divergences to fix before it would
be Violet-Grid-compliant:

- shadcn's flat `box-shadow: none` here vs. our **brutalist offset shadows** (`--shadow-brutal*`).
- This preset leaves mono at Geist fallback; our data font is **IBM Plex Mono**.
- Chart ramp is yellow→bronze, not our chart tokens.

Useful as a *starting reference* for seeding `packages/ui` tokens, but not a drop-in.
