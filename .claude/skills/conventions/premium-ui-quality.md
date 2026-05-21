# Convention — Premium UI Quality

> Cross-cutting rule. Applies to every UI-touching task.
> Authority: `docs/VIOLET-GRID-QUALITY.md` (full quality bar) + `tac-ui-rubric` (measurable scoring).

---

## The 10/10 Contract

Every UI surface ships only if **all** hold:

1. `tac-ui-rubric` score ≥ 90 / 100
2. All four states designed: loaded / loading / empty / error
3. No banned patterns from `docs/VIOLET-GRID-QUALITY.md` (gradient blob hero, glassmorphism, soft shadows, equal-grid KPI rows, "Welcome back!", indigo, emoji icons, etc.)
4. At least one **Distinctive Detail** (rubric criterion 10) — the surface could be screenshot-identified as TAC Express without the wordmark.

## The 10 required qualities (paraphrased — full spec in `docs/VIOLET-GRID-QUALITY.md`)

1. **Earned Layout** — asymmetric grids over equal splits
2. **Hierarchy by Scale Contrast** — ≥ 2× size ratio between display and body
3. **Tabular Data Discipline** — every numeric in `font-mono tabular-nums`; field keys in `.tac-mono-label`
4. **Surface Depth via Tier Tokens** — use `--surface-elevated/floating`, never `shadow-2xl` blur to fake depth
5. **Three-Layer Motion Vocabulary** — map each animation to `--motion-instant/smooth/expressive`
6. **State Choreography** — design all four states with intent (icon + eyebrow + headline + CTA for empty/error)
7. **Focus & Hover Polish** — `tac-focus-premium` + `tac-hover-lift` on every interactive element
8. **Earned Atmosphere** — one signature per hero (scanline OR gradient OR glow OR asymmetric grid)
9. **Mission-Control Voice** — terse, technical, uppercase mono labels; no "Welcome back!" / no marketing fluff in dashboard
10. **Distinctive Detail** — at least one bespoke moment per surface (not generic shadcn template)

## Banned patterns (refuse to ship)

| Banned | Replacement |
|---|---|
| Centered hero with gradient blob | Asymmetric 7/5 hero + `tac-scanline` |
| "Hello, [name]! Welcome back to your dashboard." | `[VERB] [NOUN]` page title + `[N] · [State]` subtitle |
| Three feature cards in a row, equal width, soft shadow | Asymmetric `grid-cols-12 col-span-{X,Y,Z}` with brutalist offset |
| `rounded-lg / rounded-full` | `--radius: 0rem` always (LAW 13) |
| `bg-gradient-to-r from-purple-500 to-blue-500` | `t-gradient-hero` on hero h1 only |
| `shadow-2xl` blur to fake depth | `--surface-elevated` tier + `shadow-md` brutalist offset |
| Glassmorphism / `backdrop-blur` | Solid surfaces with 1px borders |
| Emoji icons | `@workspace/ui/icons` (Remix Icon) only |
| Auto-advancing carousel | Don't ship one |
| Two+ accent hues in one section | One violet primary + at most one status hue |

## When to invoke the rubric

- Pre-merge gate on any PR touching `apps/web` or `apps/dashboard`
- When the user asks "is this 10/10?" / "score this UI" / "audit this page"
- As the final step in `tac-code-review` for UI changes

## Cross-references

- Token reference: `tac-design-tokens` skill
- Component patterns: `tac-premium-patterns` skill
- Motion vocabulary: `tac-micro-interactions` skill
- Scoring engine: `tac-ui-rubric` skill
- Full quality bar: `docs/VIOLET-GRID-QUALITY.md`
- Current baseline: `docs/UI-AUDIT-BASELINE.md`
