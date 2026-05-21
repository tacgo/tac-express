# Violet Grid — Design Quality Rules (Anti-Template, Anti-AI-Slop)

> **Authority:** This document is the project's premium-quality rule sheet. It complements `DESIGN_SYSTEM.md` (the visual spec) and the Fourteen Laws (the ESLint-enforced constraints). It is what `tac-ui-rubric` audits against, and what every premium feature must clear.
> **Origin:** Adapted from the affaan-m/everything-claude-code `rules/web/design-quality.md` rule, refit to TAC Express v6 Violet Grid.
> **Version:** 1.0 — May 2026

---

## Why this document exists

The Fourteen Laws prevent **wrong** code (raw hex, forbidden packages, components in `apps/`). But you can pass every law and still ship UI that reads as *generic Tailwind/shadcn template*. This document defines the line between **compliant** and **premium**.

Score every UI surface against the 10 required qualities below. A surface that fails any of them on a feature PR is **not 10/10** — it is below standard, even if every law passes.

---

## The 10 Required Qualities

### 1. Earned Layout
Every section justifies why it occupies its space. No "three feature cards in a row because three is a magic number". Asymmetric grids (5/4/3, 7/5, 8/4) read as engineered; even grids (4/4/4, 6/6, 3/3/3/3) read as default.

**Pass:** A KPI row uses `grid-cols-12 col-span-{5,4,3}` because the lead KPI is most important. A hero uses 7/5 because the data panel earns its width.
**Fail:** A KPI row uses `grid-cols-4` with four equal cards. A hero uses centered text because that's the default.

### 2. Hierarchy by Scale Contrast
The eye should rank content in <1 second without reading. Display vs h1 vs body should be ≥2× size ratio with weight + tracking shifts.

**Pass:** `t-display` (3rem/800/-0.045em) over `t-body` (0.9375rem/400) — readable from 2 meters.
**Fail:** Hero h1 at 1.5rem semibold; body at 1rem regular; subtitle at 1.125rem regular. All blur together.

### 3. Tabular Data Discipline
Every numeric value renders in `font-mono` with `tabular-nums`. Field keys carry `tac-mono-label`. Columns don't shift width when values change.

**Pass:** AWB column uses `font-mono tabular-nums tracking-pdf-awb`; `<dt className="tac-mono-label">` for keys.
**Fail:** Numbers in `font-sans`; "ON-TIME RATE" label in plain `text-xs`; columns reflow as values update.

### 4. Surface Depth via Tier Tokens
Use `--surface-base` / `--surface-elevated` / `--surface-floating` / `--surface-interactive` / `--surface-hover` / `--surface-active`. The brutalist offset shadow does the depth work — never `shadow-2xl` blur.

**Pass:** Page = `bg-background`; KPI cards = `bg-surface-elevated` + `shadow-sm`; modals = `bg-surface-floating` + `shadow-md`.
**Fail:** Everything `bg-card`; depth faked with `shadow-2xl` (which resolves to brutalist offset anyway, so the developer is confused about how depth works in this system).

### 5. Three-Layer Motion Vocabulary
Map every animation to `--motion-instant` (mission-control hover/data), `--motion-smooth` (modal/sheet), or `--motion-expressive` (hero/onboarding). If you can't tell which one a motion is, it's the wrong motion.

**Pass:** Hover = 80ms linear; modal = 180ms smooth; hero entrance = 320ms spring with stagger.
**Fail:** `transition-all duration-300` on everything.

### 6. State Choreography
Every interactive surface designs all four states: loaded / loading / empty / error. Skeletons match shape. Empty states have intent (icon + title + helpful copy + CTA). Errors recover (retry / view logs).

**Pass:** Empty list = `RiInboxLine` + "NO RECORDS" eyebrow + `t-h3` headline + `<Button>Create shipment</Button>`.
**Fail:** Empty list = "No data found." centered in gray.

### 7. Focus & Hover Polish
Every focusable element has `tac-focus-premium` (1px outline + 8px primary bloom). Every interactive surface has `tac-hover-lift` or `tac-fui-hover`. The default browser focus ring (gray dotted) is never visible.

**Pass:** `focus-visible:tac-focus-premium` on every Button / Link / Tab; `tac-hover-lift` on every clickable card.
**Fail:** Clickable card has only border-color shift on hover; native focus ring on inputs.

### 8. Earned Atmosphere
Use *one* atmospheric layer per hero — `tac-scanline`, hero gradient text, `text-glow-primary` (dark mode), or asymmetric grid. Stacking all four = template gradient blob.

**Pass:** Hero with `tac-hero-bleed` background + `tac-scanline` overlay + `t-gradient-hero` h1 — done.
**Fail:** Hero with gradient blob + glassmorphism panel + emoji + animated background pattern + glow + bento grid.

### 9. Mission-Control Voice
Every label is terse and technical. Field keys are uppercase mono. Headlines are imperative. No "Welcome back!", no "Hope you're having a great day", no marketing copy in the dashboard.

**Pass:** "ACTIVE MANIFESTS" / "ON-TIME RATE" / "CREATE SHIPMENT" / "12 hubs · 47 lanes · last sync 14:23".
**Fail:** "Your Shipments" / "Looking great today!" / "Let's get started" / "Welcome to your dashboard".

### 10. Distinctive Detail
Every surface has at least one detail that couldn't be on any other dashboard. The dashed-square dot on the timeline. The mono-spaced AWB hero in the drawer header. The 1px scanline. The hazard stripes on error scan cards. **If you screenshot this without the brand wordmark, can someone identify it as TAC Express?**

**Pass:** A list view that uses `tac-mono-label` row indices, square (not circle) status dots, an asymmetric 8/4 detail panel.
**Fail:** A list view that looks like every shadcn data-table demo on the internet.

---

## Banned Patterns

These are the AI-slop tells. If you see one in your output, redesign:

| Banned | Replacement |
|---|---|
| Centered hero with gradient-blob background | Asymmetric 7/5 hero + `tac-scanline` |
| "Hello, [name]! Welcome back to your dashboard." | `[VERB] [NOUN]` page title + `[N] · [State]` subtitle |
| Three feature cards in a row, equal width, soft shadow | Asymmetric KPI constellation (`grid-cols-12 col-span-{5,4,3}`) with offset shadow |
| `rounded-lg` / `rounded-xl` / `rounded-full` anywhere | `--radius: 0rem` always (LAW 13) |
| `bg-gradient-to-r from-purple-500 to-blue-500` | `t-gradient-hero` (defined in globals.css) on hero h1 only |
| `shadow-2xl` blur to fake depth | `--surface-elevated` tier + `shadow-md` (brutalist 6px offset) |
| Glassmorphism / `backdrop-blur` | Solid surfaces with 1px borders |
| Generic emoji icons (`🚀 ✨ 💎`) | `@workspace/ui/icons` (Remix Icon) only |
| Auto-advancing carousel | Don't ship one. Let the user drive. |
| Animated gradient borders | `border border-border` + `tac-signal-glow` on focus |
| Particle / blob backgrounds | `tac-hazard-stripes` for warnings; `tac-scanline` for telemetry — never decoration |
| Two+ accent hues in one section | One violet primary + at most one status hue (success/warning/danger) |

---

## Severity Ladder

When auditing UI in a PR or via `tac-ui-rubric`:

| Severity | Trigger | PR action |
|---|---|---|
| **CRITICAL** | Banned pattern in shipped code | Block merge |
| **HIGH** | Required quality scored < 5 | Block merge until fixed |
| **MEDIUM** | Required quality scored 5-7 | Comment with remediation; may merge if scope is constrained |
| **LOW** | Required quality scored 8-9 | Note for follow-up; merge ok |

`tac-ui-rubric` produces these severities automatically.

---

## Confidence threshold

When commenting on a PR or design, only flag findings you are **>80% confident about**. Style preferences ("I'd use a different shade of violet") are not findings; banned patterns and quality failures are.

Consolidate findings: "5 KPI tiles missing tac-hover-lift" beats five separate comments.

---

## Verdicts

Every UI-touching PR ends with one of:

- **APPROVE** ✅ — score ≥ 90, no banned patterns, all qualities ≥ 8
- **WARNING** ⚠️ — score 75-89; 1-2 qualities at 5-7; merge-able with follow-up issue
- **BLOCK** ⛔ — score < 75 OR any banned pattern OR any quality < 5

---

## Cross-References

- Token reference: `tac-design-tokens` skill
- Component patterns: `tac-premium-patterns` skill
- Motion vocabulary: `tac-micro-interactions` skill
- Scoring engine: `tac-ui-rubric` skill
- Constraint system: `tac-fourteen-laws` skill + `AGENTS.md` § 4
- Visual spec: `DESIGN_SYSTEM.md`
- v6 evolution: `docs/VIOLET-GRID-V6-EVOLUTION.md`
- uipro filter: `tac-uipro-bridge` skill
