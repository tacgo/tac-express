# WS-2B — Landing-Page Premium Polish (Plan)

> **Authority:** this is the section-by-section plan for taking the landing page from rubric **80/100** (post-PR #181) to the **90+ premium tier**. It defers to [`docs/launch/CUSTOMER-FACING-PLAN.md`](CUSTOMER-FACING-PLAN.md) for workstream bucketing and [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](../playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md) for token + rhythm + state-choreography rules.
>
> **This document is PHASE-1 deliverable only.** No code changes ship in the PR that lands this document. PHASE 2 is the 2-3 batched polish PRs sequenced below. The owner authorizes each PHASE-2 PR independently via the merge phrase.
>
> **Version:** 1.0 — 2026-05-19, against main `772f2c9`.
> **Source audits:** the 2026-05-19 landing audit (72/100 baseline), the WS-1+WS-2 retro at [`docs/retros/2026-05-19-landing-ws1-ws2.md`](../retros/2026-05-19-landing-ws1-ws2.md), and the owner-provided screenshots of the post-PR-#181 state.
> **Bind:** the [UI/UX Consistency Playbook](../playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md). § 8 pre-PR checklist runs against every PHASE-2 PR.

---

## 0. Scope discipline — REFINEMENT, not redesign

The landing page has a working identity: HUD/mission-control register, brutalist offset shadows, hand-rolled straight-segment chart, mono-stamped section eyebrows. The rubric agrees — 80/100 is "Strong," within 5 points of premium. **WS-2B does not redesign.** It applies a polish pass to six named, specific defect groups.

If any fix would require restructuring a section's intent or layout (not just its tokens, spacing, copy, or motion), STOP and surface as an owner decision. See § 7 bailout.

---

## 1. Skill inventory (the toolbox)

`.claude/skills/` contents (27 skills). Skills used by WS-2B are marked `★`:

| Skill | Role in WS-2B |
|---|---|
| `tac-express-onboarding` | ★ Session start (every PHASE-2 PR) |
| `tac-karpathy-discipline` | ★ Think → simplify → surgical → goal (every PHASE-2 PR) |
| `tac-fourteen-laws` | ★ Hard-violation check (every PHASE-2 PR) |
| `tac-design-tokens` | ★ Token reference (every PHASE-2 PR) |
| `tac-ui-rubric` | ★ Re-score per PR; gate the cumulative ≥90 |
| `tac-ui-authoring` | ★ Component authoring rules (extracting any new primitives) |
| `tac-premium-patterns` | ★ Paste-ready compositions for premium surfaces (input shell, case-study panel) |
| `tac-micro-interactions` | ★ Motion vocabulary (Group 3 motion-overlap fix) |
| `tac-accessibility` | ★ a11y verification (every PHASE-2 PR; axe-clean required) |
| `tac-code-review` | ★ Pre-merge review (every PHASE-2 PR) |
| `tac-uipro-bridge` + `ui-ux-pro-max` | NOT used — uipro is off-limits for picking colors/fonts/styles per `CLAUDE.md § 4`. WS-2B uses Violet Grid tokens only. |
| `tac-tdd` | Used when a fix adds non-trivial logic (Group 1 input focus-within state) |
| `tac-debug` / `tac-skillify` | Loaded only if the work surfaces a bug or recurring pattern |
| `tac-data-layer` / `tac-supabase-schema` / `tac-domain-logistics` / `tac-auth` / `tac-forms` / `tac-api-surface` / `tac-brainstorming` / `tac-uipro-bridge` | NOT used — WS-2B is presentational + token-discipline only; no data, no business logic, no API surface, no schema, no auth, no forms (the hero form is structural-only refinement). |
| `shadcn` | Used if any shadcn primitive is added (none expected; the existing `<Input>` is already in place). |

**Cross-cutting conventions** (always apply):
- [`conventions/quality-gates.md`](../../.claude/skills/conventions/quality-gates.md) — the 5 must-pass commands
- [`conventions/premium-ui-quality.md`](../../.claude/skills/conventions/premium-ui-quality.md) — 10/10 rubric contract
- [`conventions/brain-first.md`](../../.claude/skills/conventions/brain-first.md) — check codebase before external lookups

---

## 2. Audit method

For each section of [`wasteland-landing.tsx`](../../packages/ui/src/components/composed/wasteland-landing.tsx) + [`footer.tsx`](../../packages/ui/src/components/composed/footer.tsx):

1. Identify the named defect (from the owner brief or surfaced this audit).
2. Cite the file + symbolic location (no hardcoded line numbers per CodeRabbit catalog #5).
3. Specify the fix in tokens / classes that exist today.
4. Name the rubric criterion the fix lifts (1-10).
5. Define a testable done-criterion.

**Rubric criteria reference** (from `tac-ui-rubric/SKILL.md`):
1. Token Discipline · 2. Hierarchy by Scale · 3. Rhythm & Whitespace · 4. Surface Depth · 5. Motion Choreography · 6. Mono Discipline · 7. State Choreography · 8. Focus & Hover Polish · 9. Content Voice · 10. Anti-AI-Slop

**Current state (PR #181):**
```
1. Token Discipline       9/10
2. Hierarchy by Scale    10/10
3. Rhythm & Whitespace    9/10
4. Surface Depth          8/10
5. Motion Choreography    9/10
6. Mono Discipline        9/10
7. State Choreography     5/10  ← biggest gap (LOCATE has no loading state; that's WS-3)
8. Focus & Hover Polish   8/10
9. Content Voice          8/10
10. Anti-AI-Slop          5/10  ← second-biggest gap
TOTAL                    80/100
```

**WS-2B target deltas (per group):** see § 5. WS-2B lifts criteria 4 / 7 / 8 / 9 / 10 specifically. Criterion 7 is partly WS-3's territory (LOCATE loading state); WS-2B improves the chart-panel / case-study state choreography without overstepping.

---

## 3. Section-by-section audit (current state vs. defects)

| Section | Symbol in code | Current rubric impression | Defect groups |
|---|---|---|---|
| Hero — top of `LogisticsHero` | `HudOverlay` + headline + AWB form + secondary CTAs + video frame | The HUD, headline, video frame all read premium. The AWB form is the weak point. | **Group 1** — input visibility + CTA proportions |
| Metrics — `BusinessUtility` | three `<MetricCard>` in `md:grid-cols-3` | Reads correctly post-#181; equal columns + same padding. | **Group 2** — vertical-rhythm content/void balance |
| Results — `ResultsChart` | testimonial paragraph + avatar + line chart | The chart is premium. The testimonial is a credibility anti-pattern (founder quoting himself). The "REDUCED COSTS BY 27%" inline `bg-foreground text-background` highlight is a harsh raw box. | **Group 4** — testimonial → case study; **Group 3** — heading + eyebrow motion-overlap |
| Integration — `SystemCompatibility` | left feature column + right dock-image card | The four `<FeatureItem>` icons are tight; the right `aspect-[3/4]` card has `shadow-md` not `shadow-brutal`. Left column has dead whitespace below the last item at lg+. | **Group 5** — card-shadow consistency + left-column whitespace |
| Footer — `<Footer>` | 4-column link grid + brand block + bottom strip | Column headings use raw `text-sm font-bold ... font-mono` instead of `.t-overline`. The single GitHub icon stands alone, no balancing companion. | **Group 6** — type-scale headings + lone GitHub icon |
| Page-level — section padding | `py-24` × 3 sections | Section padding is identical (good) but content within each section often takes < 50 % of vertical space, creating "floating in voids." | **Group 2** — content/padding ratio rebalance |

---

## 4. Additional defects surfaced this audit (beyond the owner's 6 groups)

Honest scope-bucketing — these are real but **NOT in WS-2B** unless explicitly noted:

| Finding | Severity | Bucket |
|---|---|---|
| Hero form wrapper uses bespoke `bg-secondary/5 border border-secondary/20` opacity modifiers — `secondary-*` overlay tokens don't exist. | LOW | **Bundled into Group 1** (the input shell gets restyled; bespoke alphas disappear as a side-effect). |
| HUD overlay text uses `text-primary/80` on `<HudOverlay>` — the playbook permits `/80` for hover-de-emphasis only; HUD is decorative-de-emphasis. | LOW | **POST-LAUNCH-POLISH** — file as follow-up: lift to a `--hud-text-primary` token. (Same finding the WS-1+WS-2 retro § 9 already lists.) |
| `tracking-[0.3em]` design-locked exemption on LOCATE button — issue #169 already tracks this. | LOW | **POST-LAUNCH** — issue #169 (already filed). |
| TAC Express wordmark duplicated in `public-nav.tsx` and `footer.tsx`. | MED | **WS-2C (NOT WS-2B)** — primitive-extraction session per the original customer-facing plan; out of scope here. |
| Hero secondary-CTA wrapper at very narrow viewports (~320w) may touch screen edges. | LOW | **WS-2A bundling** — recorded but not blocking WS-2B; will reverify post-Group-1 fix. |

**No defects surfaced this audit are escalated to WS-2B beyond the 6 groups.**

---

## 5. The six defect groups — fix specs

For each group: **defect → fix → rubric criterion lifted → testable done-criterion → PR**.

### GROUP 1 — Hero: AWB input visibility + CTA proportions ✅ DONE 2026-05-19 (PR-2B-1)

**Status:** ✅ CLOSED. Shipped in PR-2B-1.
- AWB form wrapper restyled: `p-1 bg-card border-2 border-border focus-within:border-primary focus-within:shadow-brutal-sm tac-fui-hover mb-16 transition-colors` (replaces the earlier `bg-secondary/5 border border-secondary/20`).
- Input child kept its existing `placeholder:text-muted-foreground` (already WCAG-AA against `bg-card`); the wrapper now carries the field shell, so no additional placeholder change was needed. The "faint placeholder" perception was a function of the missing shell, not the placeholder color itself.
- Secondary CTAs (`GET A QUOTE` / `CONTACT SALES`): `h-14 → h-11`, `px-10 → px-6`, `text-sm → text-xs`, icon `mr-3 w-5 h-5 → mr-2 w-4 h-4`, wrapper `gap-3 → gap-2`. `size="lg"` dropped.
- axe verified at desktop / tablet / mobile — 0 serious/critical violations including the focus-within state.
- Rubric per criterion: Surface Depth 8 → 9 (+1), Focus & Hover Polish 8 → 9 (+1). Cumulative landing rubric 80 → 82.

**Original defect (preserved for history).** The AWB tracking form (`<motion.form>` in `LogisticsHero`) renders as a faint outlined rectangle: wrapper `bg-secondary/5 border border-secondary/20`, child input `border-none bg-transparent`. Despite being the page's primary interaction, it lacks visual weight. The secondary CTAs (GET A QUOTE / CONTACT SALES) sit below at `h-14 px-10` — visually heavier than the primary tracking field. The hierarchy is inverted.

**Fix.**
- **AWB form wrapper:** replace `bg-secondary/5 border border-secondary/20` with a real input-shell treatment. Recommended: `bg-card border-2 border-border focus-within:border-primary focus-within:shadow-brutal-sm transition-colors`. The form reads as a definite field; on focus the border lights up and the brutalist offset shadow lifts the shell.
- **AWB input child:** keep `border-none bg-transparent` (the wrapper provides the shell). Lift placeholder weight from `placeholder:text-muted-foreground` to `placeholder:text-foreground/50` so it reads as visible-but-clearly-placeholder.
- **LOCATE button:** unchanged (h-14 stays; it's part of the form shell).
- **Secondary CTAs:** drop from `h-14 px-10` to `h-11 px-6` with `text-xs` not `text-sm`; tighten `gap-3` between the pair to `gap-2`; keep both as `w-full sm:w-auto`. Drops the visual weight by ~25 %.

**Rubric criteria lifted.**
- Criterion 4 (Surface Depth) — input shell now reads as elevated against page bg. **+1 (8 → 9).**
- Criterion 8 (Focus & Hover Polish) — focus-within shell + offset shadow on focus is the playbook's premium pattern. **+1 (8 → 9).**

**Testable done-criterion.**
- Visual: AWB input is the most visually weighted interactive element above the fold; secondary CTAs are clearly subordinate.
- a11y: focus-within state has visible border change AND `tac-focus-premium` on the input itself; verified by tabbing through the hero.
- Playwright `landing.smoke.spec.ts` already asserts the form + LOCATE + GET A QUOTE + CONTACT SALES are reachable — should keep passing.
- Rubric re-score: criterion 4 + 8 each +1.

**Ships in PR-1.**

---

### GROUP 2 — Section spacing / floating-in-void ✅ DONE 2026-05-19 (PR-2B-2)

**Status:** ✅ CLOSED. Shipped in PR-2B-2.
- `BusinessUtility` / `ResultsChart` / `SystemCompatibility` section padding `py-24 → py-20`.
- Centered headers in `BusinessUtility` / `ResultsChart`: `mb-16 → mb-12`.
- `SystemCompatibility` two-col `gap-16 → gap-12`; left-col heading `mb-12 → mb-8`.
- Hero `pt-32 pb-16` and footer `pt-24 pb-12` intentionally untouched (ladder edges).
- Two surviving hero-internal `mb-16` (form bottom margin + CTA-row bottom margin) intentionally untouched — they're LogisticsHero internal rhythm, not section-level.

**Defect (preserved for history).** Every section uses `py-24`, but content within each section is often < 50 % of the section's vertical extent. Result: each section reads as a card floating in a gray sea, with the next section a half-screen-scroll away. Inconsistent perceived rhythm despite consistent padding.

**Fix.**
- **Section vertical padding:** drop `py-24` → `py-20` on `BusinessUtility`, `ResultsChart`, `SystemCompatibility`. Section padding ladder becomes: hero `pt-32 pb-16` → content `py-20` × 3 → footer `pt-24 pb-12`. Consistent and tighter.
- **Section header → content gap:** tighten `mb-16` on the centered headers in `BusinessUtility` / `ResultsChart` to `mb-12`. Less heading-then-empty-space drift.
- **`SystemCompatibility` two-col grid:** tighten outer `gap-16` to `gap-12`. Keeps the two columns close enough to read as a pair, not as two separate cards.
- **`SystemCompatibility` left column heading:** tighten `mb-12` to `mb-8` so the feature list starts higher and the left column's vertical fill matches the right `aspect-[3/4]` better.

**Rubric criteria lifted.**
- Criterion 3 (Rhythm & Whitespace) — already at 9; tightens to 10. **+1.**

**Testable done-criterion.**
- Visual: scrolling from hero → footer reads as a continuous flow with sections breathing the same rhythm. No section is preceded or followed by an obvious gray void.
- Each section's content occupies ≥ 65 % of its vertical padding box.

**Ships in PR-2.**

---

### GROUP 3 — Motion-overlap defect ✅ DONE 2026-05-19 (PR-2B-2)

**Status:** ✅ CLOSED. Shipped in PR-2B-2.
- All `whileInView` containers in `BusinessUtility` / `ResultsChart` / `SystemCompatibility` updated: `viewport.margin "-100px" → "-50px"` (4 sites: BusinessUtility header + grid stagger, ResultsChart header, SystemCompatibility heading + feature stagger + dock card).
- Per-section internal staggers (chart's `delay: 0.2` polyline + `delay: 1.2` fill) intentionally untouched — that's the chart's draw-in choreography, not section-level animation.
- Verified visually via slow-scroll: no two sections' entrance animations are visible simultaneously. Boundary snapshots in retro § 2.

**Defect (preserved for history).** The four sections use `whileInView={{ ... }}` with `viewport={{ once: true, margin: "-100px" }}`. The `-100px` trigger margin means an animation fires when an element is still 100px outside the viewport. On a long page with adjacent stagger animations, the entering animation of section N can be visible while section N-1 is still partially on screen — the audit's "COST DELTA heading overlaps the adjacent section mid-animation."

**Fix.**
- Change `margin: "-100px"` → `margin: "-50px"` (or `0`) on all `whileInView` containers in `BusinessUtility`, `ResultsChart`, `SystemCompatibility`. Animation fires when the element is 50px inside the viewport (or right at the edge), not before. Two animations no longer overlap because section N's animation can't start until N-1 is already scrolled out.
- Audit any per-section `delay` values — the chart's `delay: 0.2` on the entrance polyline and `delay: 1.2` on the fill are intentional draw-in choreography, **keep these**. The fix is to the section-level viewport margin, not the staggered children.

**Rubric criteria lifted.**
- Criterion 5 (Motion Choreography) — 9 → 10. **+1.**

**Testable done-criterion.**
- Visual: slow-scroll the page; no two sections' entrance animations are visible simultaneously.
- `prefers-reduced-motion` still honored (motion/react suppresses transforms automatically).
- Rubric re-score: criterion 5 → 10.

**Ships in PR-2** (bundled with Group 2 — both are page-level rhythm fixes).

---

### GROUP 4 — Testimonial → un-attributed case study ✅ DONE 2026-05-19 (PR-2B-3)

**Status:** ✅ CLOSED. Shipped in PR-2B-3.
- Section eyebrow: `Telemetry · case study · north-east corridor fleet` → `CASE STUDY · NORTH-EAST CORRIDOR FLEET`.
- Overline above body: `RESULT · 6-MONTH PILOT` (`tac-mono-label text-muted-foreground`).
- Body paragraph: factual case-study statement using ONLY pre-existing data. No invented customer name, no invented quote, no quotation marks.
- Founder block removed (avatar + "Tapan Hidangmayum" + "Founder TAC Express" + separator).
- `bg-foreground text-background` highlight removed. **"27%" emphasis: `font-bold` only** — initial plan called for `text-primary font-bold` but axe flagged the WCAG AA failure (primary on bg-surface-elevated at 18px bold = 3.8:1, same LB-3 defect class). Weight-only emphasis matches the page's restraint pattern.
- Chart container preserved.
- axe verified 3/3 viewports — 0 serious/critical.

**Defect (preserved for history).**

**Defect.** The current `ResultsChart` panel is structured as a personal testimonial: the founder (Tapan Hidangmayum) quoting himself about his own company. This is a credibility anti-pattern in B2B sales-led marketing — the audit flagged it, and the screenshots confirm it reads as such. Additionally, the inline `<span className="bg-foreground text-background px-2 py-1 font-bold">reduced costs by 27%</span>` highlight is a raw black-on-white box that breaks the page's restraint.

**Fix (per owner decision in the prompt).** Reframe as an un-attributed case-study panel. Specifically:
- **Section eyebrow:** `Telemetry · case study · north-east corridor fleet` → `CASE STUDY · NORTH-EAST CORRIDOR FLEET` (uppercase, `.tac-mono-label text-primary` — consistent with other section eyebrows).
- **Body:** replace the quote-form paragraph with a factual case-study statement. **No invented customer name, no quote marks.** Proposed copy:
  > Across a six-month telematics pilot, the North-East Corridor Fleet reduced operating costs by **27 %** through route optimization, behavior monitoring, and centralized telemetry.
  
  Marked with a `tac-mono-label text-muted-foreground` overline: `RESULT · 6-MONTH PILOT`.
- **Highlight treatment:** replace `<span className="bg-foreground text-background px-2 py-1 font-bold">reduced costs by 27%</span>` with a `text-primary font-bold` emphasis (no box, no inversion). The "27 %" sits on the page's existing color register.
- **Founder block:** **remove entirely** — the avatar `<div className="w-12 h-12 bg-primary ...TH...">`, the name "Tapan Hidangmayum", the "Founder TAC Express" line, and the `border-b border-border pb-8` separator above the chart. The chart now sits directly below the case-study paragraph.
- **PR-body note:** swapping in a real customer quote (a tea-grower, a handicraft cooperative, a defense contractor — the three named segments) is a future enhancement, not part of WS-2B.

**Rubric criteria lifted.**
- Criterion 9 (Content Voice) — removes the credibility anti-pattern. **+1 (8 → 9).**
- Criterion 10 (Anti-AI-Slop) — removes the generic "founder testimonial card" template and the raw inverted-highlight box, both of which read as default-SaaS. **+2 (5 → 7).**

**Testable done-criterion.**
- No avatar element, no founder name, no "Founder TAC Express" string anywhere in `ResultsChart`.
- No quotation marks (`&quot;`, `"`, `"`) inside the case-study paragraph.
- No `bg-foreground text-background` inline highlight.
- The "27 %" remains visible + emphasized via `text-primary font-bold` only.
- Section eyebrow reads `CASE STUDY · NORTH-EAST CORRIDOR FLEET`.

**Ships in PR-3.**

---

### GROUP 5 — Integration section: card-shadow consistency + left-column whitespace ✅ DONE 2026-05-19 (PR-2B-3)

**Status:** ✅ CLOSED. Shipped in PR-2B-3.
- Dock card shadow: `shadow-md → shadow-brutal`.
- Left-col feature list: `gap-8 → gap-10`. (`lg:justify-between` not needed — the gap-10 + heading `mb-8` from PR-2B-2 was sufficient.)

**Defect (preserved for history).**

**Defect.**
- **Card shadow inconsistency:** the dock-image card uses `shadow-md` while every other card on the page uses `shadow-brutal` (or `shadow-md` resolving to brutalist offset via globals). Inspecting `globals.css`: `--shadow-md: 6px 6px 0 0 var(--border)` AND `--shadow-brutal: var(--shadow-md)` — these are the **same value** today; the inconsistency is naming, not pixels. But the naming inconsistency means a future shadow-system change could split them apart.
- **Left-column whitespace:** the right column is `aspect-[3/4]` (portrait) and at lg+ taller than the left feature-list column. Left column ends ~30 % above the right column's bottom edge, leaving a dead patch.

**Fix.**
- **Dock card shadow:** rename `shadow-md` → `shadow-brutal` on the dock card. Identical visual; consistent semantic naming.
- **Left-column vertical fill:**
  - Tighten the heading `mb-12` to `mb-8` (already in Group 2).
  - Increase `<FeatureItem>` gap from `gap-8` to `gap-10` so the four items spread further down.
  - Add `lg:justify-between` to the left column's outer container so the heading sits at top, the feature list spreads, and the bottom of the left column reaches the right column's bottom edge.

**Rubric criteria lifted.**
- Criterion 1 (Token Discipline) — naming consistency. **+0.5 (rounds to part of the cumulative).**
- Criterion 3 (Rhythm & Whitespace) — eliminates the dead left-column whitespace. **+0.5** (compounds with Group 2's full +1).

**Testable done-criterion.**
- Visual at lg+ viewport: left feature-list column bottom-edge aligns within 16px of the right dock-card bottom-edge.
- `grep "shadow-md" wasteland-landing.tsx` → returns nothing (the only `shadow-md` was on the dock card).

**Ships in PR-3.**

---

### GROUP 6 — Footer: type-scale headings + lone GitHub icon ✅ DONE 2026-05-19 (PR-2B-3)

**Status:** ✅ CLOSED. Shipped in PR-2B-3.
- Three column headings: raw class string → `t-overline text-foreground mb-6`.
- **Owner decision: (A) drop the row entirely.** Lone-GitHub `<div className="flex gap-4">` removed. `Icon` import removed from footer.tsx. Brand-block paragraph `mb-8` dropped.

**Defect (preserved for history).**

**Defect.**
- Three column headings ("Services", "Company", "Legal") use the raw class string `text-sm font-bold mb-6 text-foreground tracking-paper-20 uppercase font-mono`. Per the playbook § 2, this is exactly what `.t-overline` exists for: `0.6875rem / weight 500 / 0.1em tracking / uppercase`. Three places, one fix.
- The brand block has a single GitHub icon as the only social link. The `flex gap-4` wrapper is built to hold multiple icons; with one, it reads as a forgotten-to-finish element. Either add a second link (Twitter/X, LinkedIn, etc.) or drop the row.

**Fix.**
- **Column headings:** replace each `h4` class string with `t-overline text-foreground mb-6`. Mono-stamp + 0.1em tracking + uppercase all come from the `.t-overline` token. Three sites: `footer.tsx` symbols `Services`, `Company`, `Legal`.
- **Lone GitHub icon:** **owner decision needed.** Options (PR body must state which):
  - (A) **Drop the row entirely.** Cleanest; the brand block becomes wordmark + address + nothing-else. Reads as restrained, deliberate.
  - (B) **Add a second link** — Twitter/X or LinkedIn. Requires the owner to provide the URL. Reads as standard SaaS footer.
  - (C) **Keep as-is.** The "off-balance" reading is acceptable.

  **Recommendation: (A) drop the row.** The page already does not present itself as social-first; removing the lone icon is consistent with the rest of the page's restraint. PR-3 ships (A) by default; owner can flip to (B) at merge review.

**Rubric criteria lifted.**
- Criterion 1 (Token Discipline) — the type-scale headings move on-system. **+0.5.**
- Criterion 10 (Anti-AI-Slop) — the lone GitHub icon was a "almost a SaaS footer" tell. Removing it (A) sharpens the page's deliberate aesthetic. **+1 (compounds with Group 4's +2 → cumulative 5 → 8).**

**Testable done-criterion.**
- `grep -E "text-sm font-bold.*tracking-paper-20" footer.tsx` → returns nothing.
- `<h4 class="t-overline text-foreground mb-6">` appears 3 times.
- If (A): the `<div className="flex gap-4">` social-links container is removed entirely. If (B): a second link present with valid `href` and `aria-label`.

**Ships in PR-3.**

---

## 6. PHASE-2 PR batching

Three coherent PRs, sequenced. Each independently merges; the next opens against the previous one's merged main.

### PR-2B-1 — Hero refinement (Group 1)

- **Scope:** AWB input visibility + secondary-CTA proportions.
- **Files:** `packages/ui/src/components/composed/wasteland-landing.tsx` (LogisticsHero only).
- **Estimated LoC:** ~40 lines changed, in one function.
- **Verification:** axe-clean (focus-within state must pass keyboard a11y); Playwright `landing.smoke.spec.ts` continues to pass (the form + 3 CTA buttons still reachable, same selectors).
- **Rubric target:** criterion 4 + 8 each +1.
- **Independently mergeable:** yes — every other section is untouched.

### PR-2B-2 — Page rhythm + motion-overlap (Groups 2 + 3)

- **Scope:** section padding ladder + viewport-margin fix + per-section content gaps.
- **Files:** `wasteland-landing.tsx` (`BusinessUtility`, `ResultsChart`, `SystemCompatibility` section containers + `whileInView` viewport configs).
- **Estimated LoC:** ~12 lines changed, surgical.
- **Verification:** axe-clean; Playwright continues to pass; a manual scroll-through verifies no animation overlap.
- **Rubric target:** criterion 3 → 10 (from 9); criterion 5 → 10 (from 9).
- **Independently mergeable:** yes — depends on PR-2B-1 only to avoid lock conflicts on the same file.

### PR-2B-3 — Content sections (Groups 4 + 5 + 6)

- **Scope:** testimonial reframe + integration section consistency + footer type-scale + footer social-icon decision.
- **Files:** `wasteland-landing.tsx` (`ResultsChart` testimonial block; `SystemCompatibility` dock card) + `footer.tsx`.
- **Estimated LoC:** ~30 lines changed across two files.
- **Verification:** axe-clean; Playwright continues to pass; visual diff confirms the testimonial avatar is gone, the case-study eyebrow is present, the inverted-highlight box is gone, the footer headings use `.t-overline`.
- **Rubric target:** criterion 9 +1, criterion 10 +3 cumulative across G4/G6.
- **Independently mergeable:** yes — depends on PR-2B-2 only for the same file-lock reason.
- **PR-body must state:** owner Group-6 decision (A drop / B add link / C keep).

---

## 7. Cumulative rubric target — premium-tier boundary (WS-2B CLOSED 2026-05-19)

```
                              Before   PR-2B-1 ✅   PR-2B-2 ✅   PR-2B-3 ✅   Target
1.  Token Discipline             9         9              9          9.5 ✅      10
2.  Hierarchy by Scale          10        10             10           10         10
3.  Rhythm & Whitespace          9         9             10 ✅        10         10
4.  Surface Depth                8         9 ✅           9            9          9
5.  Motion Choreography          9         9             10 ✅        10         10
6.  Mono Discipline              9         9              9            9          9
7.  State Choreography           5         5              5            5          5   (WS-3 territory)
8.  Focus & Hover Polish         8         9 ✅           9            9          9
9.  Content Voice                8         8              8            9 ✅       9
10. Anti-AI-Slop                 5         5              5            8 ✅       8

TOTAL                           80        82             84          88.5      89-92
                                                                       ↑
                                                                   WS-2B CLOSED
```

**PR-2B-1 closed 2026-05-19.** Lifted criteria 4 + 8 each +1. Cumulative 80 → 82.
**PR-2B-2 closed 2026-05-19.** Lifted criteria 3 + 5 each +1. Cumulative 82 → 84.
**PR-2B-3 closed 2026-05-19.** Lifted criterion 9 +1; criterion 10 +3 cumulative (G4 testimonial -2; G6 lone-icon drop -1); criterion 1 +0.5 (footer type-scale on-system + G5 shadow naming consistent). Cumulative 84 → 88.5.

**Result: WS-2B CLOSED. Landing rubric 80 → 88.5 — at the premium-tier boundary.** The remaining gap to a clean 90+ lives in:
- Criterion 7 (State Choreography, 5/10) — WS-3 territory.
- The half-point on criterion 1 — HUD `text-primary/80` POST-LAUNCH-POLISH; LOCATE `tracking-[0.3em]` issue #169.
- A future content pass (real customer testimonial when captured).

**Result:** WS-2B lifts the landing from **80 → 89-92** — into the PREMIUM tier (≥ 90 with the tighter rounding) or right at the boundary (88-89). The remaining ~5 points to a perfect 95+ live in WS-3 (state choreography on LOCATE submit) and a future content pass (real customer testimonial when one is captured).

---

## 8. Per-PR done-criteria contract (the playbook gate)

Every PHASE-2 PR ships with:

- [ ] **Rubric re-score** in the PR body: per-criterion before/after for the criteria the PR was supposed to lift.
- [ ] **axe a11y:** 0 serious/critical violations, landing page, at desktop + mobile + tablet, with the relevant interactive state engaged (hero PR must axe-test focus-within state).
- [ ] **Fourteen Laws table** in the PR body: zero hard violations.
- [ ] **Playbook § 8 pre-PR checklist** filled in the PR body.
- [ ] **Five quality gates green:** `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm test`, `pnpm build`, `pnpm audit:all`.
- [ ] **9 CodeRabbit catalog entries preempted** in the PR body.
- [ ] **No new dependencies.** No new packages, no new fonts, no new icons outside the existing `@remixicon` set.

---

## 9. Out-of-scope (carry-forward)

These were identified during the audit but are **NOT** WS-2B:

- HUD overlay `text-primary/80` bulk tokenization (lift to `--hud-text-primary`). POST-LAUNCH-POLISH. Filed as carry-forward in WS-1+WS-2 retro § 9.
- `tracking-[0.3em]` LOCATE button → `--tracking-paper-30` token. Already tracked as issue #169.
- TAC Express wordmark deduplication (`public-nav.tsx` ↔ `footer.tsx`). WS-2C territory.
- Hero secondary-CTA wrapper edge-touch at 320w viewports. Reverify post-Group-1 fix.
- **WS-3 (LOCATE → tracking dialog).** Separate workstream; spec at [`CUSTOMER-FACING-PLAN.md § 4`](CUSTOMER-FACING-PLAN.md).
- **WS-4 (Contact TAC rename + dashboard support inbox).** Separate workstream; PI-1-blocked for production functionality.

---

## 10. Bailout conditions

If during PHASE 2 any of the following fires, STOP and surface as owner decision rather than redesigning on a guess:

- **A section's polish requires a structural change** — restructuring intent, layout, or component hierarchy. That counts as redesign; bail.
- **A batched PR grows beyond ~80 LoC of changes** — split along the next named seam and file a follow-up.
- **A defect surfaces outside the 6 groups** — fix only what's in scope, axe-verify, file POST-LAUNCH per Convention A.
- **CodeRabbit flags a new pattern not in the 9-entry catalog** — STOP after that PR; update `docs/patterns/coderabbit-catalog.md` as commit 0 of the next session.

---

## 11. Cross-references

- [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](../playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md) — binding standard; § 8 pre-PR checklist runs every PHASE-2 PR.
- [`docs/launch/CUSTOMER-FACING-PLAN.md`](CUSTOMER-FACING-PLAN.md) — updated by this PR to note WS-2B is re-scoped from the original "closing CTA section" to this 6-group polish workstream.
- [`docs/launch/MASTER-LAUNCH-PLAN.md`](MASTER-LAUNCH-PLAN.md) — unchanged; WS-2B is POST-LAUNCH so the launch surface count does not move.
- [`docs/retros/2026-05-19-landing-ws1-ws2.md`](../retros/2026-05-19-landing-ws1-ws2.md) — the prior session that lifted the rubric to 80.
- [`.claude/skills/tac-ui-rubric/SKILL.md`](../../.claude/skills/tac-ui-rubric/SKILL.md) — the scoring system this plan targets.
- [`packages/ui/src/styles/globals.css`](../../packages/ui/src/styles/globals.css) — the token reference; every fix routes through it.

---

## 12. Maintenance contract

When a PHASE-2 PR closes:
1. Mark the group(s) DONE in this file's § 5.
2. Update `CUSTOMER-FACING-PLAN.md` § 3 to reflect the closure.
3. Record the rubric delta in the PR's retro and in § 7's cumulative table here.

When all three PHASE-2 PRs have merged:
1. Mark this entire plan DONE in § 0.
2. The next session is WS-3 (the AWB-tracking-dialog spec).

End of plan.
