# TAC Express — UI/UX Consistency Playbook

> **Authority:** this is the standing operating procedure for every customer-facing UI session in tac-express. It codifies the eight discipline areas that prevent the kind of drift the 2026-05-19 landing audit (72/100) surfaced: dead utility classes, off-scale type, padding inconsistency, opacity-modifier proliferation, and missing state choreography.
>
> **Cross-reference chain:** [`AGENTS.md` § 0](../../AGENTS.md) routes here for UI tasks → this playbook calls into the specialist skills (`tac-ui-authoring`, `tac-design-tokens`, `tac-premium-patterns`, `tac-micro-interactions`, `tac-ui-rubric`) → `packages/ui/src/styles/globals.css` is the underlying token truth.
>
> **Version:** 1.0 — landing-audit-driven (2026-05-19).
> **When this playbook updates:** when a new drift pattern emerges from a CodeRabbit finding, a tac-ui-rubric score below 75, or a recurring fix the agent has to make twice. Add an entry under the relevant section; bump version.

---

## 0. When to read this

Load this playbook BEFORE writing or modifying ANY customer-facing UI surface — every page in `apps/web/app/(public)/`, every component in `packages/ui/src/components/composed/` consumed by `apps/web`, every shared primitive that ships on the landing surface.

Internal `apps/dashboard` UI follows the same laws but has its own pattern library (ops-console). When in doubt, the playbook applies.

The eight discipline areas below are NOT a checklist of suggestions. They are the standard. A PR that violates one of them is non-conforming until either (a) the violation is fixed or (b) the playbook is amended with the new exception and its justification.

---

## 1. TOKEN DISCIPLINE — "a value used once earns a name, not an exemption"

### The rule

Every color, spacing, radius, shadow, typography, motion, and tracking value MUST resolve through a semantic token defined in [`packages/ui/src/styles/globals.css`](../../packages/ui/src/styles/globals.css).

- **Colors:** `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--muted-foreground`, `--border`, `--accent-{success,warning,danger,info}`, `--surface-{base,elevated,floating,interactive,hover,active}`, `--overlay-{primary,fg}-{soft,subtle,medium,strong}`.
- **Shadows:** `--shadow-{2xs,xs,sm,md,lg,xl,2xl}` (all brutalist offsets, `Npx Npx 0 0 var(--border)`). Tailwind `shadow-*` utilities resolve to these. The aliases `--shadow-brutal-sm` and `--shadow-brutal` exist for legacy callers.
- **Radius:** `--radius: 0rem` (LAW 13). No exceptions. Ever.
- **Tracking:** `--tracking-paper-{tight,snug,id,04,06,08,10,12,14,18,20}` ([globals.css:595](../../packages/ui/src/styles/globals.css)).
- **Motion:** `--motion-{instant,smooth,expressive}` (intent-named, v6) and the underlying `--duration-*` / `--ease-*`.
- **Typography classes:** `.t-display`, `.t-h1..h4`, `.t-body`, `.t-body-sm`, `.t-caption`, `.t-overline`, `.t-data`, `.t-data-sm`, `.t-mono`, `.t-mono-sm` ([globals.css:1001-1119](../../packages/ui/src/styles/globals.css)).

### How to add a token (the only legitimate path when no token fits)

1. **Confirm no existing token fits.** Read [`globals.css`](../../packages/ui/src/styles/globals.css) — the tracking system has eleven steps, the shadow system has seven, the type scale has eleven classes. Most "I need a new value" instincts are actually "I haven't found the existing token."
2. **Justify the gap in one sentence.** Example: "The hero LOCATE button needs 0.30em tracking — the scale stops at 0.20em (`paper-20`) and 0.30em is a deliberate display-wordmark tracking that the rest of the wordmark scale doesn't cover."
3. **Add the token to globals.css** in BOTH `:root` and `.dark` blocks (if it differs per theme).
4. **Add a one-line comment** explaining when to use it. Example: `--tracking-paper-30: 0.30em;   /* LOCATE button + display wordmark — landing hero only */`.
5. **Refactor the caller** to use the new token. Delete the local `eslint-disable` or `// design-locked` comment that justified the bypass.
6. **Add a routing-eval entry** if the new token gains a meaningful trigger phrase ("the LOCATE-button tracking", "wordmark tracking" etc.). See `.claude/skills/evals/routing.jsonl`.

### Anti-pattern (live in the repo — to be cleaned up)

**Wasteland-landing.tsx:127:** `tracking-[0.3em]` carries `// eslint-disable-next-line no-restricted-syntax -- design-locked`. This is the WRONG resolution. The value gets used; the agent gets an exemption. The next agent reads the file, sees `[0.3em]`, infers "arbitrary values are fine if you add a comment." The system rot starts. **Correct resolution:** add `--tracking-paper-30: 0.30em` to globals.css, drop the disable.

### The rule, stated as code (paste before opening any PR that touches a UI surface)

```bash
# Detect arbitrary Tailwind values in changed UI files (ignoring approved exceptions):
git diff --name-only main...HEAD -- 'packages/ui/**/*.tsx' 'apps/web/**/*.tsx' 'apps/dashboard/**/*.tsx' \
  | xargs grep -nE '\[[0-9]+(\.[0-9]+)?(px|rem|em)\]|\[#[0-9a-f]+\]|\[(rgb|hsl|oklch)\(' \
  | grep -v '// design-locked' \
  | grep -v 'aspect-\['
# Expected: zero matches (aspect ratios are the only allowed arbitrary, and even those should use aspect-video where possible).
```

---

## 2. THE TYPE SCALE — "no surface escapes it"

### The rule

Every text element uses one of the eleven type classes in [`globals.css` § 1001-1119](../../packages/ui/src/styles/globals.css):

| Class | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `.t-display` | 3rem | 800 | -0.045em | Hero headline, landing display |
| `.t-h1` | 1.75rem | 700 | -0.035em | Section header, page H1 |
| `.t-h2` | 1.375rem | 700 | -0.03em | Sub-section, card title |
| `.t-h3` | 1.125rem | 600 | -0.022em | Card sub-header, dialog title |
| `.t-h4` | 0.9375rem | 600 | -0.016em | Field label, small heading |
| `.t-body` | 0.9375rem | 400 | -0.01em | Body copy, paragraph |
| `.t-body-sm` | 0.8125rem | 400 | -0.01em | Secondary copy |
| `.t-caption` | 0.75rem | 400 | -0.005em | Helper text under inputs |
| `.t-overline` | 0.6875rem | 500 | 0.1em | Eyebrow, column header |
| `.t-data` | 2.5rem | 600 | -0.05em | KPI metric (mono) |
| `.t-data-sm` | 1.25rem | 500 | -0.018em | Table numeric cell (mono) |
| `.t-mono` | 0.8125rem | 400 | 0em | Mono body (codes, AWBs) |
| `.t-mono-sm` | 0.6875rem | 400 | 0em | Mono caption |

For raw inline text styling on the **same surface** as a `.t-*` class, two options exist: (a) compose the `.t-*` class with a one-word modifier (`.t-display.uppercase.text-glow-primary` is legitimate); (b) if a one-off variant is needed often enough to deserve a name, add a new `.t-*` class to globals.css.

### Anti-pattern (in the repo — flagged by the 2026-05-19 audit)

**Wasteland-landing.tsx:363-364:** the testimonial quote uses `font-mono text-lg md:text-xl text-foreground font-medium uppercase tracking-wide leading-relaxed` — NONE of those tokens route through the `.t-*` scale. This is the surface that escapes. **Correct resolution:** either `<blockquote className="t-h3 font-mono uppercase">` (closest existing fit) or add a new `.t-quote` class to globals.css if testimonials become a repeated pattern.

**Footer.tsx:24:** `text-sm font-medium text-foreground/80 mb-8 leading-relaxed` for the address line. Should be `.t-body-sm text-foreground/80`. Same shape, on the type scale, one fewer raw class.

**Footer.tsx:37, 47, 57:** the three footer column headings — `text-sm font-bold ... tracking-paper-20 uppercase font-mono` — duplicate `.t-overline`'s job at the wrong size. Should be `.t-overline`. Three places, one fix.

### How to pick the right type token

```
Is this a hero / display headline?        → .t-display
Is this the H1 of a page or section?      → .t-h1
Is this a card title or sub-section?      → .t-h2
Is this a card body header?               → .t-h3
Is this a field label?                    → .t-h4
Is this body copy?                        → .t-body  (or .t-body-sm if it's secondary)
Is this an eyebrow or column header?      → .t-overline
Is this a number? (AWB, weight, $$)       → .t-data / .t-data-sm / .t-mono / .t-mono-sm
None of the above?                        → Stop. Why is this text on the screen at all?
                                            If the answer survives Karpathy ("what's its
                                            job?"), add a token. Otherwise delete the text.
```

---

## 3. SPACING & RHYTHM — "same-content cards get same padding"

### The rule

Spacing values come from the Tailwind 4-multiple scale (`p-1, p-2, p-3, p-4, p-6, p-8, p-12, p-16, p-24`). Arbitrary spacing (`p-[13px]`, `m-[27px]`) is banned by LAW 11. Per-surface rhythm is set by section padding (`py-24`, `py-16`) and is consistent across siblings of the same role.

**Section padding (vertical):** `py-24` for "breathe" sections, `py-16` for "compact" sections. Mixing is allowed if narratively justified — the hero typically uses `pt-32 pb-16` to accommodate the fixed nav above.

**Container max-width:** `max-w-6xl` is the landing default. Marketing pages can use `max-w-4xl` for narrower copy-heavy reads. The dashboard uses `max-w-screen-2xl`. Never mix `max-w-7xl` (Tailwind's default) — `max-w-6xl` is the brand floor.

**Card padding:** every card on the same surface, carrying the same content shape, uses the same padding. If three cards in a row have an id-badge + title + metric + desc — they all get `p-8`. Not `p-8 / p-12 / p-2`. Period.

**Card padding allowed variations:**
- A row of "small" cards (icon + 1-line label) → `p-4` or `p-6`.
- A row of "default" cards (title + body + meta) → `p-8`.
- A row of "feature" cards (hero copy + chart + CTA) → `p-12`.

The choice depends on content density. Mixing two padding tiers in the same row is a violation — it reads as inconsistent, not intentional, regardless of column-span asymmetry.

### Anti-pattern (in the repo — flagged by the 2026-05-19 audit)

**Wasteland-landing.tsx:**
- Three metric cards at [:270-293](../../packages/ui/src/components/composed/wasteland-landing.tsx): `p-8` uniform ✅
- Chart card at [:357](../../packages/ui/src/components/composed/wasteland-landing.tsx): `p-8 md:p-12` — bumps to feature-tier on md+ for no narrative reason. ❌
- Integration dock image card at [:478](../../packages/ui/src/components/composed/wasteland-landing.tsx): `p-2` — two-pixel inset on a hero-adjacent media card. ❌

**Correct resolution:** pick one padding tier per visual role. Media frames (image, video) sit at `p-2`; content cards sit at `p-8`. The chart card carries content, so `p-8` everywhere.

### Section rhythm — the section ladder

```
LogisticsHero:       pt-32 pb-16  (fixed-nav clearance + breathe-down)
BusinessUtility:     py-24        (full breathe)
ResultsChart:        py-24        (full breathe)
SystemCompatibility: py-24        (full breathe)
ClosingCta:          py-24        (full breathe — when added; see WS-2)
Footer:              pt-24 pb-12  (full breathe up, tight down to edge)
```

When adding a new section, match the existing ladder. If a new section needs different rhythm, justify in the PR description: "this section is a quote interlude; py-16 reads as breath between two py-24 panels."

---

## 4. COMPONENT LOCATION & REUSE — "wrap shadcn, never rebuild; extract on the second consumer"

### The rule (LAW 5 + LAW 14)

- Every customer-facing UI component lives in [`packages/ui/src/components/`](../../packages/ui/src/components/) — `primitives/` for shadcn wrappers, `composed/` for business compositions.
- Never put `<DropdownMenu>`, `<Sheet>`, `<Dialog>`, `<Tabs>`, `<Tooltip>`, `<Select>`, `<Command>`, `<Toast>` etc. inline in `apps/web/` or `apps/dashboard/`. These live in `packages/ui/src/components/primitives/` as shadcn-wrapped exports.
- Never rebuild what shadcn already provides. Wrap and style only (LAW 14).

### The extract-on-second-consumer rule

The first consumer of a pattern proves the pattern's shape. The SECOND consumer triggers the extraction. Pre-abstracting on one use case bakes in assumptions the second use will violate.

**Specific examples from the landing audit:**

- The TAC Express wordmark (`<span className="font-sans font-black italic text-primary text-2xl tracking-tighter uppercase">TAC</span><span ...>E<span className="text-accent-warning">X</span>PRESS</span>`) appears at [public-nav.tsx:39-49](../../packages/ui/src/components/composed/public-nav.tsx) AND [footer.tsx:13-22](../../packages/ui/src/components/composed/footer.tsx). Two consumers — extract to `<TacWordmark size="md" />` in `packages/ui/src/components/primitives/tac-wordmark.tsx`. The next consumer (the sign-in page header, eventually) will use the primitive instead of triple-coding the wordmark.
- The AWB-input + LOCATE-button pattern at [wasteland-landing.tsx:97-141](../../packages/ui/src/components/composed/wasteland-landing.tsx) currently has ONE consumer. When the `/track/[awb]` page or the quote rate-calculator gains an AWB-input field — extract to `<AwbInput />` then. Not before.

### What does NOT get extracted

- A composition that exists in exactly one place and has zero foreseeable second consumer. Premature abstraction is a CodeRabbit catalog entry (#9 — "abstract on second use").
- A composition whose extraction would carry > 3 boolean props or > 2 generic type parameters. That's a sign the consumers aren't actually the same component, just adjacent ones.

### Anti-pattern (in the repo — flagged by the audit)

The TAC wordmark in two places is the canonical example. Two months from now without extraction, the brand color of the `<X>` in `EX` will drift between nav and footer — and nobody will notice until a designer screenshots both side-by-side.

---

## 5. THE OPACITY-MODIFIER RULE — "named overlay tokens beat bespoke /N alphas"

### The rule

When you need a semi-transparent color overlay, prefer the named overlay tokens over bespoke `text-foreground/N` or `bg-primary/N` modifiers:

| Need | Use | Not |
|---|---|---|
| Soft primary tint (≈5%) | `bg-primary-soft` / `border-primary-soft` | `bg-primary/5` |
| Subtle primary tint (≈10%) | `bg-primary-subtle` / `border-primary-subtle` | `bg-primary/10` |
| Medium primary tint (≈15%) | `bg-primary-medium` / `border-primary-medium` | `bg-primary/15` or `bg-primary/20` |
| Strong primary tint (≈25%) | `bg-primary-strong` / `border-primary-strong` | `bg-primary/25` or `bg-primary/30` |
| Soft fg overlay (≈4%) | `bg-fg-soft` | `bg-foreground/4` |
| Subtle fg overlay (≈8%) | `bg-fg-subtle` | `bg-foreground/8` |

The underlying CSS variables live at [globals.css:162-167 + 381-386](../../packages/ui/src/styles/globals.css) as `--overlay-primary-{soft,subtle,medium,strong}` / `--overlay-fg-{soft,subtle}` and are exposed as Tailwind utilities via `--color-primary-{soft,subtle,medium,strong}` / `--color-fg-{soft,subtle}` (see [globals.css:549-554](../../packages/ui/src/styles/globals.css)) — so the utility names are `bg-primary-soft` etc. (no `overlay-` prefix on the utility). They use `color-mix(in oklch, var(--primary) N%, transparent)`, meaning the SAME visual relationship holds in both light + dark mode (the alpha % is constant; the underlying color changes).

### When the bespoke /N is allowed

Two cases only:
1. **Hover-deemphasis on text:** `hover:text-foreground/70` is fine — it's a one-step opacity drop on a known foreground, used widely as a "less prominent" hover. Don't tokenize the entire opacity space for one use.
2. **Border opacity for HUD overlays:** `border-primary/20` for the brutalist framing corners is part of the design vocabulary (a 20% violet edge that reads as "system-marker, not content-edge"). It's used 6+ times in the landing — it deserves a token. **Action item (POST-LAUNCH):** lift to `--border-hud: color-mix(in oklch, var(--primary) 20%, transparent)` and ban the `/20` raw modifier.

### Anti-pattern (in the repo — the audit's drift list)

The landing uses **eight** distinct alpha values on tokens: `/5, /10, /20, /30, /70, /80, /15, /25`. Of these, `/5, /10, /15, /25` overlap exactly with the `--overlay-primary-*` token range. The others are uncategorized.

The worst case is **`placeholder:text-muted-foreground/30`** at [wasteland-landing.tsx:117](../../packages/ui/src/components/composed/wasteland-landing.tsx) — a 30% alpha on an already-muted token, which computes to roughly 1.4:1 contrast on the modern-ivory background. **This is a WCAG AA failure dressed as a design choice.** Fix: drop the `/30` modifier (use full `text-muted-foreground`), or use `text-muted-foreground/60` minimum and verify with axe-core.

### The bespoke-alpha audit

Before any PR that introduces a new `text-X/N` or `bg-X/N` or `border-X/N`:

```bash
# Find every alpha modifier in changed files; flag any /N where N < 60 for review:
git diff --name-only main...HEAD -- 'packages/ui/**/*.tsx' 'apps/web/**/*.tsx' \
  | xargs grep -nE '(text|bg|border|fill|stroke|ring)-[a-z-]+\/[0-9]+' \
  | awk -F'/' '$NF < 60 { print "  CHECK CONTRAST:", $0 }'
```

A `/N < 60` value on a foreground-class color is presumptively a contrast risk. The author proves otherwise (axe-core, manual contrast verify) OR refactors to a darker base + higher alpha OR uses a named overlay token.

---

## 6. STATE CHOREOGRAPHY — "every interactive surface needs loaded / loading / empty / error"

### The rule (the 10/10 contract, criterion 7 of `tac-ui-rubric`)

Every interactive surface — every form, every async query, every list, every input that can fail — ships with FOUR states designed:

1. **LOADED** — the happy path. The data is there. The form submitted successfully. The list has rows. Required.
2. **LOADING** — what the surface looks like between the user's click and the result. Required for any surface where the LOADED state takes > 100ms to appear.
3. **EMPTY** — what the surface looks like when the query returns nothing valid. Required for any list, search result, dialog content, dropdown options.
4. **ERROR** — what the surface looks like when the query fails. Required for every form, every async query, every external-service call.

The four states are NOT "we'll add them later." They are designed at the same time as the LOADED state, in the same PR. Shipping a feature with only LOADED is non-conforming.

### Concrete loading-state patterns

| Surface | Loading pattern |
|---|---|
| Form submit (e.g. LOCATE button) | Button enters `disabled` + spinner icon + `aria-busy="true"`. Use `<Button disabled>{loading ? <Spinner /> : children}</Button>`. The spinner is `<Icon name="loader" className="animate-spin">` from `@workspace/ui/icons` — never inline `<svg>`. |
| List query | Skeleton rows matching the final shape. Use `animate-skeleton-pulse` from globals.css. Number of skeleton rows = expected page size (typically 5-10). |
| Dialog opening | The dialog opens immediately (no spinner pre-open); the dialog's BODY shows the skeleton/empty/error state. Modal-with-spinner is a bad pattern — it traps focus on nothing. |
| Inline search (e.g. AWB lookup) | Input is NOT disabled (so the user can correct typos). A small spinner appears in the input's right-aligned slot. Results below pulse-fade. |

### Concrete empty-state patterns

Every empty state has THREE parts, in order:

1. **An icon** (from `@workspace/ui/icons`) at `w-12 h-12 text-muted-foreground` — sets the visual register.
2. **A 1-line message** (`.t-h4`) — what isn't here and why.
3. **A primary action** (a `<Button variant="outline">`) that lets the user DO something.

Bad empty state: `"No shipments found."` (full stop, no action).
Good empty state: `<EmptyIcon /> + <p className="t-h4">No shipments match this AWB.</p> + <Button asChild><Link href="/quote">Get a quote</Link></Button>`.

### Concrete error-state patterns

Every error has THREE parts:

1. **What broke** (one sentence, in plain English — never "Error 500" or stack trace).
2. **Why** (if knowable — "your session expired" / "the AWB format is invalid" / "this shipment is more than 90 days old and is archived").
3. **What to do next** (retry button / a deep link to support / a path forward).

Errors go to Sentry via the `RBAC-EMISSION` and `SENTRY-SILENT-BY-DESIGN` patterns where appropriate. The customer never sees a raw stack trace. Per `tac-debug` — root cause is identified, not papered over.

### Anti-pattern (in the repo — flagged by the audit)

The LOCATE form at [wasteland-landing.tsx:97-141](../../packages/ui/src/components/composed/wasteland-landing.tsx) handles the empty-AWB case (sets `trackError`) — that's the EMPTY state and it's well done. But:

- **LOADING state:** missing. After the user types an AWB and clicks LOCATE, the form does `router.push('/track/' + awb)` immediately. There's no in-between feedback — the button doesn't show a spinner, the input doesn't pulse. If the route is slow to resolve, the user clicks LOCATE three more times.
- **ERROR state on the destination page:** the `/track/[awb]` page handles "shipment not found" gracefully via `TrackingResultView` — that's wired. ✅
- **Network-error state:** what happens when the user is offline and clicks LOCATE? Currently the router silently fails. Should surface `"You appear to be offline. Try again when reconnected."`

### The state choreography audit

Before any PR that adds an interactive surface:

```bash
# For each new component, check that all four states are referenced in code OR test:
grep -E "loading|empty|error|skeleton|Spinner|EmptyState|ErrorState" \
  $(git diff --name-only main...HEAD -- '*.tsx' '*.ts')
# Expected: matches on the new surface's files. Zero matches = no state design = block PR.
```

---

## 7. THE PRE-MERGE GATE — "rubric ≥ 75 floor, ≥ 90 premium, zero LAW violations"

### The contract

Every customer-facing UI PR runs the [`tac-ui-rubric`](../../.claude/skills/tac-ui-rubric/SKILL.md) skill against the changed surface before opening the PR. The score is recorded in the PR description.

| Score | Verdict | Action |
|---|---|---|
| **90–100** | ✅ Premium | Ship. Document as a reference pattern in `tac-premium-patterns`. |
| **75–89** | Strong | Ship after closing the 1-2 lowest-scoring criteria. |
| **60–74** | Acceptable | Fix every criterion < 7 before shipping. |
| **40–59** | Below standard | Block merge. Schedule a redesign pass with `tac-premium-patterns` + `tac-design-tokens`. |
| **0–39** | Reject | The surface is not Violet Grid. Start over with `tac-brainstorming`. |

The **merge floor is 75**. The **premium target is 90**. Hitting 75 ships the surface; hitting 90 marks it as a reference.

### The Fourteen Laws — zero hard violations

Independent of rubric score, every PR must have ZERO hard violations of the [Fourteen Laws](../../AGENTS.md#4-the-fourteen-laws). LAW 1, 2, 3, 5, 8, 9, 10, 11 are ESLint-enforced; LAW 4, 6, 7, 13, 14 are code-review checks. The audit table from `tac-fourteen-laws` is part of the PR template (see § 8 below).

### Quality-gate commands (the five must-pass)

Per [`.claude/skills/conventions/quality-gates.md`](../../.claude/skills/conventions/quality-gates.md):

```bash
pnpm lint --max-warnings 0     # Zero lint warnings — LAW enforcers fire here
pnpm typecheck                 # Zero TS errors
pnpm build                     # Both apps build
pnpm test                      # All vitest unit + Playwright E2E pass
pnpm audit:all                 # governance + auth-boundary + skills + design-spec
```

Plus, for any PR that touches `packages/ui/`:

```bash
pnpm --filter @workspace/ui registry:check  # No drift between source and @tac registry
pnpm --filter dashboard exec playwright test e2e/visual/baseline.spec.ts  # VRT
```

Any red gate stops the PR. No `--max-warnings 1`. No `--no-verify`. No "we'll fix it in the follow-up."

### The accessibility floor

Every customer-facing PR is verified by the apps/web e2e workflow (`.github/workflows/e2e-web.yml`, shipped in PR #177). The axe-core scan runs across **9 carve pages × 3 viewports = 27 scan points**. `AXE_FAIL_ON_VIOLATIONS=1` is gated on by PR #179 (LB-3 closure, 2026-05-19) — zero serious axe violations on every PR going forward.

A PR that adds a new contrast site fails CI. Don't introduce one. If a legitimate design decision requires it, file an issue + open a separate small PR with the matching fix.

---

## 8. THE PRE-PR UI CHECKLIST — copy-pasteable

Run this checklist before opening any customer-facing UI PR. Paste the filled checklist into the PR body.

```markdown
## UI Playbook Compliance

**Surface(s) touched:**
- [list each route / component file]

**tac-ui-rubric score:** ___ / 100 (record per-criterion breakdown below)

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Token Discipline | __ / 10 | |
| 2 | Hierarchy by Scale | __ / 10 | |
| 3 | Rhythm & Whitespace | __ / 10 | |
| 4 | Surface Depth | __ / 10 | |
| 5 | Motion Choreography | __ / 10 | |
| 6 | Mono Discipline | __ / 10 | |
| 7 | State Choreography | __ / 10 | |
| 8 | Focus & Hover Polish | __ / 10 | |
| 9 | Content Voice | __ / 10 | |
| 10 | Anti-AI-Slop | __ / 10 | |

**Fourteen Laws — hard-violation check (✓ = pass, ✗ = fail with line ref):**

- [ ] LAW 1 — No color value outside `globals.css`
- [ ] LAW 2 — Icons only via `@workspace/ui/icons`
- [ ] LAW 3 — Animation via `motion/react` or `tw-animate-css` (no `framer-motion`, `gsap`, `@motionone/react`)
- [ ] LAW 4 — Fonts declared only in `apps/*/app/layout.tsx`
- [ ] LAW 5 — UI components only in `packages/ui/src/components/`
- [ ] LAW 6 — No DB calls in components (services only)
- [ ] LAW 7 — No business logic in components
- [ ] LAW 8 — `@supabase/*` only in `packages/database/`
- [ ] LAW 9 — No hardcoded spacing / radius / shadow
- [ ] LAW 10 — No Tailwind color classes (`bg-blue-500`)
- [ ] LAW 11 — No arbitrary Tailwind values (`w-[347px]`)
- [ ] LAW 12 — `pnpm` only
- [ ] LAW 13 — Straight lines only — no curves, no `rounded-full`, no wavy SVGs
- [ ] LAW 14 — shadcn primitives wrapped, never rebuilt

**Section-by-section checklist:**

- [ ] **§ 1 Token Discipline** — No arbitrary `[Npx]`, `[N.Nrem]`, `[#hex]`, `[rgb()]`, `[oklch()]` outside aspect-ratios. Every color, spacing, radius, shadow routes through `globals.css`. Any new token has a globals.css entry + one-line comment. Disable comments removed.
- [ ] **§ 2 Type Scale** — Every text element uses a `.t-*` class OR composes one with a one-word modifier. No raw `text-lg`, `text-xl` outside the `.t-*` system.
- [ ] **§ 3 Spacing & Rhythm** — Every card on the same surface with the same content shape uses the same padding. Section padding follows the ladder. No off-multiple `p-5` or `p-7`.
- [ ] **§ 4 Component Location & Reuse** — Every new UI lives in `packages/ui/src/components/`. Patterns duplicated on a SECOND consumer are extracted. shadcn primitives wrapped.
- [ ] **§ 5 Opacity-Modifier Rule** — No new bespoke `/N` < 60 alpha on a foreground class without an axe-core contrast verification. Named overlay tokens preferred for tints.
- [ ] **§ 6 State Choreography** — Every interactive surface has LOADED + LOADING + EMPTY + ERROR designed and visible in the PR.
- [ ] **§ 7 Pre-Merge Gate** — Rubric score ≥ 75. Five quality gates green. Zero new axe-core serious violations.

**Anti-AI-slop check:** name the ONE detail on this surface that couldn't be on any other dashboard. If nothing comes to mind → criterion 10 < 5 → not premium.

**Verification:**

- [ ] Tested at 375px (mobile), 768px (tablet), 1280px (desktop) viewports.
- [ ] Dark mode AND light mode visually verified (the landing forces dark, but the toggler works post-hydration — both must render).
- [ ] Keyboard-only navigation reaches every interactive element with visible focus ring (`tac-focus-premium`).
- [ ] `prefers-reduced-motion` honored — no entrance animation that runs anyway when reduced motion is on.
```

---

## 9. When the playbook is wrong

The playbook is not scripture. It reflects what we know on 2026-05-19. When it is wrong:

1. **Find the section it's wrong in.**
2. **Update it.** Add an entry under the relevant § with a one-paragraph justification.
3. **Bump the version** at the top of this file.
4. **Reference the trigger** — what session, what PR, what surface taught us the new thing.
5. **Add a routing-eval entry** if the new pattern gains a meaningful trigger phrase (see `.claude/skills/evals/routing.jsonl`).

The playbook gets MORE concrete, not less, over time. Vague rules drift; concrete rules survive review. When in doubt, prefer the example-backed version of the rule over the abstract one.

---

## 10. Cross-references

- [`AGENTS.md` § 0](../../AGENTS.md) — authority chain, GBrain enforcement gate.
- [`CLAUDE.md` § 1](../../CLAUDE.md) — Claude-specific task-classification table (UI rows reference this playbook).
- [`.claude/skills/RESOLVER.md`](../../.claude/skills/RESOLVER.md) — intent → skill dispatcher (UI rows now also reference this playbook).
- [`.claude/skills/tac-ui-rubric/SKILL.md`](../../.claude/skills/tac-ui-rubric/SKILL.md) — the 10-criterion scoring system, with 0/5/10 anchors.
- [`.claude/skills/tac-design-tokens/SKILL.md`](../../.claude/skills/tac-design-tokens/SKILL.md) — full token reference.
- [`.claude/skills/tac-premium-patterns/SKILL.md`](../../.claude/skills/tac-premium-patterns/SKILL.md) — paste-ready compositions for premium surfaces.
- [`.claude/skills/tac-micro-interactions/SKILL.md`](../../.claude/skills/tac-micro-interactions/SKILL.md) — v6 motion vocabulary.
- [`.claude/skills/tac-fourteen-laws/SKILL.md`](../../.claude/skills/tac-fourteen-laws/SKILL.md) — full law text + violation-fix snippets.
- [`docs/VIOLET-GRID-QUALITY.md`](../VIOLET-GRID-QUALITY.md) — anti-template / anti-AI-slop rule sheet.
- [`docs/patterns/coderabbit-catalog.md`](../patterns/coderabbit-catalog.md) — 9 review-pattern entries that apply universally.
- [`packages/ui/src/styles/globals.css`](../../packages/ui/src/styles/globals.css) — the underlying token truth.

When this playbook and a referenced file disagree, the file wins and this playbook updates. The CSS is the truth.
