# CLAUDE.md — TAC Express Claude Agent Instructions

> This file is the Claude Code entry point. It defers to `AGENTS.md` for hard rules and `DESIGN_SYSTEM.md` for visual identity.
> **MANDATORY:** Read both `AGENTS.md` AND this file before any task.
> **VERSION:** 6.1 — Consolidated single-system + GBrain enforcement layer (May 2026)

---

## 0. AUTHORITY CHAIN (consolidated — one system)

```
CLAUDE.md (this file — Claude Code entry)
  ↓ defers to
AGENTS.md (master rules — absorbs former PROJECT-RULES.md)
  ↓ defers to
DESIGN_SYSTEM.md (visual spec)
  ↓ dispatches via
.claude/skills/RESOLVER.md (intent → skill dispatcher, GBrain pattern)
  ↓ enforces via
.claude/skills/conventions/ (cross-cutting rules)
  ↓ details in
docs/VIOLET-GRID-QUALITY.md (premium UI quality bar)
```

`PROJECT-RULES.md`, `.agents/skills/`, and `.agent/` are **archived** under `.archive/` and no longer referenced. All skills live in `.claude/skills/` ONLY.

All files are co-equal on hard violations. When in conflict, be MORE restrictive, not less.

---

## 0.5. GBRAIN ENFORCEMENT (MANDATORY ON EVERY TASK)

> Adopted from GBrain (https://github.com/garrytan/gbrain) — **thin harness, fat skills**.
> The skill files are the durable artifacts; this section is the enforcement gate.

**Every task — no exceptions, no "just this once":**

1. **Read [`.claude/skills/RESOLVER.md`](.claude/skills/RESOLVER.md)** to dispatch the
   user's intent to the correct specialist skill. The resolver IS the routing table.
2. **Load the matched skill** via the Skill tool BEFORE writing any code.
3. **Apply the cited conventions** in [`.claude/skills/conventions/`](.claude/skills/conventions/):
   - `quality-gates.md` — the 5 must-pass commands before commit
   - `architecture-flow.md` — UI → services → database (LAW 6/7/8)
   - `brain-first.md` — check codebase + skills + memory BEFORE external lookup
   - `test-before-bulk.md` — test on 1 before bulk
   - `subagent-routing.md` — Agent tool vs inline
   - `friction-protocol.md` — refusal format when asked to violate a law
4. **If you add a new skill or trigger phrase** → add a line to
   [`.claude/skills/evals/routing.jsonl`](.claude/skills/evals/routing.jsonl).
   PRs that add skills without the routing-eval line are non-conforming.
5. **If the user keeps asking for the same fix 2+ times → load `tac-skillify`**
   and turn the recurring pattern into a permanent skill. This is the
   **skillify loop** — feedback becomes enforced behavior, not advice that drifts.

**Authority:** [`.claude/skills/MANIFEST.json`](.claude/skills/MANIFEST.json) is the
versioned skillpack manifest (current version: `1.0.0`).

> If a task starts and you have not consulted RESOLVER.md, the task is non-conforming.
> Restart from step 1.

---

## 1. CLAUDE-SPECIFIC WORKFLOW

### Before ANY Task

1. Claude Code natively reads `.claude/skills/` via progressive disclosure.
2. **Open [`.claude/skills/RESOLVER.md`](.claude/skills/RESOLVER.md)** — it maps the user's intent to the right specialist skill.
3. If session start: load `tac-express-onboarding` first.
4. Load the specialist skill that matches via the Skill tool.
5. Apply the cross-cutting **conventions** from [`.claude/skills/conventions/`](.claude/skills/conventions/):
   - `quality-gates.md` (five must-pass commands)
   - `architecture-flow.md` (UI → services → database → Supabase)
   - `premium-ui-quality.md` (10/10 rubric contract + banned patterns)
   - `brain-first.md` (check codebase + skills + memory before external lookup)
   - `test-before-bulk.md` (test on 1 before bulk)
   - `subagent-routing.md` (Agent tool vs inline)
   - `friction-protocol.md` (refusal format when asked to violate a law)
6. **NEVER write a single line of code without first invoking the relevant skill.**

Skipping the resolver is explicitly non-conforming — restart the loop.

### Task Classification

| Task Type | Required Skill | Gate |
|-----------|---------------|------|
| **Every session** | `tac-express-onboarding` | Load FIRST |
| Any non-trivial task | `tac-karpathy-discipline` | Think → Simplify → Surgical → Goal |
| Law / forbidden-package question | `tac-fourteen-laws` | Authoritative violation patterns + fixes |
| New feature / component | `tac-brainstorming` → `tac-tdd` → `tac-ui-authoring` → `tac-premium-patterns` | Design approval + premium pattern lookup |
| Premium UI surface (hero, KPI, marketing) | `tac-design-tokens` + `tac-premium-patterns` | Token-compliant + paste-ready pattern |
| **"Build a [hero/KPI/dashboard/landing]"** | `tac-premium-patterns` | Catalog of 9-10/10 compositions |
| **"Score this UI" / "Is this 10/10?"** | `tac-ui-rubric` | 10-criterion measurable score |
| **"Add hover/animation/motion"** | `tac-micro-interactions` | v6 motion vocabulary |
| **uipro / "67 styles" / "Pro Max"** | `tac-uipro-bridge` FIRST, then `ui-ux-pro-max` | Filter forbidden styles |
| Auth / session / middleware / RBAC | `tac-auth` | Supabase pattern compliance |
| Forms / validation / server actions | `tac-forms` | react-hook-form + zod resolver pattern |
| Route handlers / public API / webhooks / edge funcs | `tac-api-surface` | Boundary validation + rate-limit + signing |
| Bug fix | `tac-debug` → `tac-tdd` | Root cause identified before fix |
| Refactor | `tac-code-review` → `tac-tdd` | Tests green before and after |
| Add / install a UI primitive (button, dialog, select, table…) | `tac-shadcn` → `tac-ui-authoring` | Sourced via shadcn CLI / @tac registry / MCP into packages/ui, then re-themed to Violet Grid |
| UI component | `tac-ui-authoring` + `tac-premium-patterns` | Token compliance + premium composition |
| **Customer-facing UI (apps/web)** | [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md) FIRST, then `tac-ui-authoring` + `tac-premium-patterns` | 8-area discipline + pre-PR checklist in § 8 |
| Data / service layer | `tac-data-layer` | Architecture flow respected |
| Schema / RLS / migrations / RPC | `tac-supabase-schema` | RLS by role + SECURITY DEFINER patterns |
| Domain (shipments / manifests / AWBs) | `tac-domain-logistics` | Status lifecycles + branded types |
| Accessibility review | `tac-accessibility` | WCAG 2.1 AA |
| Pre-merge (UI) | `tac-code-review` + `tac-ui-rubric` | All quality gates + score ≥ 90 |
| Pre-merge (non-UI) | `tac-code-review` | All quality gates pass |
| Recurring fix / "we keep doing X" / new skill | `tac-skillify` | Conformance audit (RESOLVER + eval + tests) |
| Cross-cutting rule (quality / architecture / brain-first / etc.) | `conventions/*.md` | See `RESOLVER.md` Disambiguation rules |

---

## 2. RESPONSE FORMAT (CLAUDE-SPECIFIC)

### Standard Mode
1. **Rationale** (1 sentence — why this approach)
2. **The code** (with semantic tokens, typed, tested)
3. **Verification** (how to confirm it works)

### ULTRATHINK Mode (triggered by keyword)
1. **Deep Reasoning Chain** — architectural and design decisions
2. **Law Compliance Check** — explicit verification of all 14 laws
3. **Edge Case Analysis** — failure modes and prevention
4. **The Code** — optimized, production-ready
5. **Test Strategy** — TDD steps to verify

---

## 3. FORBIDDEN ACTIONS (HARD STOPS)

Claude MUST refuse or pause and ask when:
- Asked to install a forbidden package
- Asked to put UI components in `apps/web/` directly
- Asked to use raw Tailwind color classes
- Asked to skip tests "just this once"
- Asked to call Supabase directly from a component
- Asked to use `npm install` or `yarn add`
- Asked to commit directly to `main`
- Asked to hardcode any pixel value, color, or font
- Asked to use curved lines, rounded-full, or wavy SVG paths
- Asked to rebuild a shadcn primitive from scratch

**Response when blocked:**
> "I can't do that — it violates [LAW X] from AGENTS.md. Here's the compliant approach: [alternative]"

---

## 4. UI/UX PREMIUM SKILL STACK (v6)

These four skills + one rule doc form the premium UI/UX quality system. Load them in order for any UI task:

1. **`tac-design-tokens`** — token reference (colors, type, motion, FUI)
2. **`tac-premium-patterns`** — paste-ready compositions (hero, KPI, table, drawer, empty/error states)
3. **`tac-micro-interactions`** — motion vocabulary (instant / smooth / expressive)
4. **`tac-ui-rubric`** — 10-criterion measurable score (0-100)
5. **`docs/VIOLET-GRID-QUALITY.md`** — anti-template / anti-AI-slop rule sheet (authoritative quality bar)

Plus one safety adapter:
6. **`tac-uipro-bridge`** — filters `ui-ux-pro-max` recommendations through Violet Grid before surfacing

> **The 10/10 contract:** every premium UI surface ships with `tac-ui-rubric` score ≥ 90, all 4 states designed (loaded/loading/empty/error), no banned patterns from `docs/VIOLET-GRID-QUALITY.md`, and at least one Distinctive Detail (criterion 10).

### When to use the bundled `ui-ux-pro-max` (uipro) skill

uipro ships 67 styles, 96 palettes, 57 font pairings — but **most are FORBIDDEN by the Violet Grid**. **Always load `tac-uipro-bridge` first.** Legitimate uses:

- Accessibility checklist lookup (WCAG references)
- Anti-pattern lookup (then re-state in Violet Grid terms)
- Animation timing / easing reference (then map to our `--duration-*` / `--ease-*` tokens)
- Font-pairing **kerning math** reference (we are locked to Outfit + IBM Plex Mono + Noto Serif)

uipro is **off-limits** for: picking a color, picking a font, picking a chart type, picking a style. Those decisions are owned by `tac-design-tokens` and the Fourteen Laws.

---

## 5. QUICK REFERENCE

```
MONOREPO ROOT:  c:\tac\tac-express
PACKAGE MGR:    pnpm only
UI PACKAGE:     @workspace/ui (packages/ui/src/)
ICONS:          @remixicon/react via @workspace/ui/icons
STYLES:         packages/ui/src/styles/globals.css (tokens only)
SERVICES:       packages/services/
AUTH:           packages/auth/ (@workspace/auth — signIn/signOut/getSession)
DATABASE:       packages/database/ (never direct Supabase in apps/)
TYPES:          packages/types/
APPS:           apps/web/ (landing) | apps/dashboard/ (logistics)
NEXT VERSION:   16.x (Turbopack)
DESIGN:         TAC Express v5.0 — Violet Grid (dark-first, violet signal, brutalist offset shadows)
FONTS:          Outfit (sans/UI) | IBM Plex Mono (data) | Noto Serif (serif/prose)
RADIUS:         0rem — zero radius, sharp corners
SHADOWS:        shadow-2xs..shadow-2xl resolve to brutalist offsets (1px..16px on var(--border))
                aliases: --shadow-brutal-sm = shadow-sm (3px) | --shadow-brutal = shadow-md (6px)
TYPE SCALE:     .t-display / .t-h1..h4 / .t-data / .t-overline / .t-mono — premium scale in globals.css
MOTION:         --duration-fast (80ms) | --duration-base (150ms) | --duration-slow (300ms)
                --ease-smooth | --ease-spring | --ease-linear (mission-control default)
TESTING:        Vitest (unit)
GIT FLOW:       feature branches → PR → CI → merge
```

---

## 6. WONTFIX-UNLESS-TRIGGERED — #102 backlog deferrals

> Codified during the pre-Sprint-2 maximum-sweep session (post-PR #125). Each entry below is a #102 sub-item explicitly DEFERRED — not abandoned. Each names a concrete TRIGGER that re-opens the item. The grep handle is `WONTFIX-UNLESS-TRIGGERED` — `grep -r WONTFIX-UNLESS-TRIGGERED CLAUDE.md docs/` lands the next contributor at every deferral.
>
> Pattern lineage: same shape as `docs/audits/2026-05-15-rbac-denial-audit.md § 6 item 3` (PR #121) and `dashboard.service.ts:getSLABreaches` SENTRY-SILENT-BY-DESIGN marker (PR #120). The discipline: if you can't ship it now AND can't predict when you'll need to ship it, name the conditions that would change the answer.

### 6.1. Pick canonical form variant per domain — STATUS: WONTFIX-UNLESS-TRIGGERED

**Item (from #102 Sprint 2):** Pick canonical form variant per domain (v7 vs original) and archive the loser. Document choice in CLAUDE.md.

**Why deferred:** Locking in a canonical variant is premature while both v6 and v7 are actively iterated. The two variants serve different surfaces (v6 = ops-console legacy depth, v7 = new wizards) and the decision shape depends on whether the design system converges or stays bifurcated.

**Trigger conditions for re-opening:**
- Design freeze announced on EITHER v6 or v7 (one is officially deprecated)
- A new wizard PR sits blocked on "which variant should this use?" for ≥ 1 session
- The next product roadmap names a target form-architecture state
- `tac-brainstorming` skill produces a written spec for the convergence

**Last reviewed: 2026-05-16. If still un-triggered at 2026-08-16, re-evaluate the wontfix call.**

### 6.2. On-call schedule + escalation policy — STATUS: WONTFIX-UNLESS-TRIGGERED

**Item (from #102 Backlog):** On-call schedule + escalation policy.

**Why deferred:** Organizational, not technical. Solo-owner project today; an on-call rotation requires ≥ 2 humans willing to be paged. The policy document without the people is theater.

**Trigger conditions for re-opening:**
- Team size grows to ≥ 2 engineers with shared production responsibility
- First 24/7 incident (a real one, not a synthetic) — even if resolved by the owner alone, the postmortem should name the missing rotation as a contributing factor
- Sentry rule 6 (production-errors owner-targeted) fires more than 3× in a 30-day window — sustained alert volume is the actual signal that a rotation matters

**When triggered:** the policy lives in `docs/runbooks/ON-CALL.md` (to be created) — not in CLAUDE.md.

**Last reviewed: 2026-05-16. If still un-triggered at 2026-08-16, re-evaluate the wontfix call.**
