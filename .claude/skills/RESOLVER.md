# TAC Express — Skill Resolver

> **MANDATORY ENTRY POINT.** Every task begins here. Map the user's intent to the right specialist skill before writing a line of code. Skipping the resolver = non-conforming; restart the loop.
>
> **Version:** 2.1 — consolidated single-system + GBrain enforcement (May 2026)
> **Authority chain:** `CLAUDE.md` → `AGENTS.md` → `DESIGN_SYSTEM.md` → this resolver → `conventions/` (cross-cutting rules)
>
> **Rule of two:** if two skills could match, read both before acting.
> **Chain rule:** the skill's own *Phases* section dictates downstream chaining
> (e.g., `tac-brainstorming → tac-tdd → tac-ui-authoring`).

---

## 0. How to use this file

1. Read the user's request.
2. Match it against the **Intent → Skill** table below.
3. Load the matched skill via the Skill tool.
4. Apply the cross-cutting **conventions** (always, regardless of which skill).
5. Execute. Cite the loaded skill if challenged.

If no row matches, fall through to **§ 99 Defaults** — but flag the gap and consider whether a new skill should be created via `tac-skillify`.

---

## 1. Intent → Skill (the dispatch table)

### Session-level

| Trigger | Load |
|---|---|
| Session start, any new task | [`tac-express-onboarding`](tac-express-onboarding/SKILL.md) **FIRST** |
| "Wait, what's the design system again?" | [`tac-design-tokens`](tac-design-tokens/SKILL.md) |
| Anything non-trivial | [`tac-karpathy-discipline`](tac-karpathy-discipline/SKILL.md) (always — Think → Simplify → Surgical → Goal) |
| Any code change, install, lint deviation | [`tac-fourteen-laws`](tac-fourteen-laws/SKILL.md) |

### UI / UX

| Trigger phrase | Load |
|---|---|
| Any customer-facing surface in `apps/web/` — landing, marketing, public pages | [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](../../docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md) **FIRST**, then the relevant specialist below |
| "Add/install a primitive", "shadcn add", "components.json", "registry", "switch preset", "use shadcn" | [`tac-shadcn`](tac-shadcn/SKILL.md) **FIRST** (source it), then `tac-ui-authoring` (re-theme) |
| "Build a component", "add a [button/card/form/table]" | [`tac-shadcn`](tac-shadcn/SKILL.md) (source via shadcn) → [`tac-ui-authoring`](tac-ui-authoring/SKILL.md) (write/re-theme) |
| "Build a hero", "KPI dashboard", "polish this section" | [`tac-premium-patterns`](tac-premium-patterns/SKILL.md) |
| "Add hover", "animate this", "feels static", "polish the interaction" | [`tac-micro-interactions`](tac-micro-interactions/SKILL.md) |
| "Token reference", "design tokens", "premium feel" | [`tac-design-tokens`](tac-design-tokens/SKILL.md) |
| "Is this 10/10?", "score this", "audit this page" | [`tac-ui-rubric`](tac-ui-rubric/SKILL.md) |
| Anything mentioning **uipro**, "Pro Max", "67 styles", "96 palettes" | [`tac-uipro-bridge`](tac-uipro-bridge/SKILL.md) **FIRST**, then `ui-ux-pro-max` |
| "Audit a11y", "keyboard navigation", "screen reader" | [`tac-accessibility`](tac-accessibility/SKILL.md) |

### Architecture / Domain

| Trigger | Load |
|---|---|
| "Add a service", "fetch from DB", "hook for X" | [`tac-data-layer`](tac-data-layer/SKILL.md) |
| Schema / RLS / migration / RPC / trigger / regenerate types | [`tac-supabase-schema`](tac-supabase-schema/SKILL.md) |
| Shipments / manifests / AWBs / hubs / rate cards / customers / COD | [`tac-domain-logistics`](tac-domain-logistics/SKILL.md) |
| Route handler / public API / webhook / edge function / rate-limit | [`tac-api-surface`](tac-api-surface/SKILL.md) |
| Auth / session / middleware / RBAC / sign-in / sign-out | [`tac-auth`](tac-auth/SKILL.md) |
| Forms / validation / react-hook-form / zod / server actions | [`tac-forms`](tac-forms/SKILL.md) |

### Process / Quality

| Trigger | Load |
|---|---|
| New feature / new component design | [`tac-brainstorming`](tac-brainstorming/SKILL.md) → produce a spec FIRST |
| Test writing (unit, integration, E2E) | [`tac-tdd`](tac-tdd/SKILL.md) (RED → GREEN → REFACTOR) |
| Bug / failure / unexpected behaviour | [`tac-debug`](tac-debug/SKILL.md) — root cause first, never guess |
| Pre-merge, post-feature | [`tac-code-review`](tac-code-review/SKILL.md) + [`tac-ui-rubric`](tac-ui-rubric/SKILL.md) (if UI changed) |
| "Is this allowed?" / forbidden-package question / LAW lookup | [`tac-fourteen-laws`](tac-fourteen-laws/SKILL.md) |

### Meta

| Trigger | Load |
|---|---|
| "Skillify this", "make this proper", "is this a skill?", recurring fix | [`tac-skillify`](tac-skillify/SKILL.md) (conformance audit) |
| "Create a skill", "new skill" | [`tac-skillify`](tac-skillify/SKILL.md) (Phase 2: scaffold) |
| "Routing test", "is this skill reachable?", "MECE check" | [`tac-skillify`](tac-skillify/SKILL.md) (Phase 5: check-resolvable) |

---

## 2. Cross-cutting conventions (ALWAYS apply, regardless of which skill loaded)

Every task — regardless of which specialist skill was loaded — must honor:

| Convention | File |
|---|---|
| **Quality gates** — five must-pass commands before any commit | [`conventions/quality-gates.md`](conventions/quality-gates.md) |
| **Architecture flow** — UI → services → database → Supabase, no skipping | [`conventions/architecture-flow.md`](conventions/architecture-flow.md) |
| **Premium UI quality** — anti-template, anti-AI-slop checklist | [`conventions/premium-ui-quality.md`](conventions/premium-ui-quality.md) |
| **Brain-first** — check skills/code/memory BEFORE external lookups | [`conventions/brain-first.md`](conventions/brain-first.md) |
| **Test-before-bulk** — test on 1 before any batch operation | [`conventions/test-before-bulk.md`](conventions/test-before-bulk.md) |
| **Subagent routing** — native Agent tool vs inline work | [`conventions/subagent-routing.md`](conventions/subagent-routing.md) |
| **Friction protocol** — response when asked to violate a law | [`conventions/friction-protocol.md`](conventions/friction-protocol.md) |

These conventions are short, prescriptive, and never optional. They are the load-bearing constraints that make the specialist skills predictable.

---

## 3. Disambiguation rules

When multiple skills could match:

1. **Most specific wins.** `tac-domain-logistics` over `tac-data-layer` if the task names a shipment/AWB/manifest. `tac-premium-patterns` over `tac-ui-authoring` if the task is a premium hero/KPI surface.
2. **Boundary-crossing wins higher in the stack.** A "form that POSTs to a route handler" loads BOTH `tac-forms` AND `tac-api-surface`. Don't skip the boundary.
3. **Bug + UI → debug first.** If "the dropdown doesn't close" — load `tac-debug` BEFORE `tac-ui-authoring`. Find the cause, then choose the fix surface.
3a. **Sourcing vs authoring.** "Add / install a *primitive*" (button, dialog, select, table) = `tac-shadcn` (source it via CLI/`@tac`/MCP into `packages/ui`). "Write / re-theme / compose a *component*" = `tac-ui-authoring`. A new primitive almost always needs BOTH: `tac-shadcn` to bring it in, then `tac-ui-authoring` to re-theme to Violet Grid. Never hand-roll a primitive shadcn provides.
4. **Schema change cascades.** Any `supabase/migrations/` edit triggers: `tac-supabase-schema` → `tac-tdd` → regenerate types → `tac-code-review`.
5. **When in doubt, ask the user** — don't guess across boundaries.

---

## 4. When a new skill is needed (the skillify trigger)

If during a task you realize:
- The same correction has been needed twice or more across sessions, OR
- The current skills don't cover this intent cleanly, OR
- The user said "we keep doing X" or "we've discussed this before",

**stop** and create a new skill:

1. Choose a `tac-<topic>` name, kebab-case, ≤ 20 chars.
2. Create `.claude/skills/tac-<topic>/SKILL.md` with frontmatter (`name`, `description`).
3. Add a row to § 1 of this resolver.
4. Add an entry to `MANIFEST.json` (`skills` array).
5. Add a routing entry to `evals/routing.jsonl`.
6. Update `CLAUDE.md` § 1 Task Classification table.

Single atomic commit: `chore(skills): add tac-<topic> + resolver + manifest + eval`.

---

## 5. Routing eval

This dispatcher is verified by `evals/routing.jsonl`. Each entry maps a real
user trigger phrase to the expected skill(s). Adding a new skill REQUIRES a
new entry in that file. See `evals/README.md`.

---

## 6. Brain-filing rules (where files go)

| Content | Goes in | NOT in |
|---|---|---|
| UI component | `packages/ui/src/components/{primitives,composed}/` | `apps/*/components/` (LAW 5) |
| Business logic | `packages/services/src/<domain>.service.ts` | components (LAW 7) |
| `@supabase/*` import | `packages/database/src/` only | anywhere else (LAW 8) |
| Auth helpers | `packages/auth/` | components |
| Branded types, zod schemas | `packages/types/` | inline in apps |
| Migrations / RLS / RPC | `supabase/migrations/` (versioned) | edge functions |
| Edge functions | `supabase/functions/<slug>/` | api routes |
| Skill (this layer) | `.claude/skills/<slug>/SKILL.md` | docs/ |
| Routing test | `.claude/skills/evals/routing.jsonl` | scattered test files |

---

## 99. Defaults (when nothing matches)

In order of precedence:

1. Load [`tac-fourteen-laws`](tac-fourteen-laws/SKILL.md) — to know what's allowed.
2. Load [`tac-karpathy-discipline`](tac-karpathy-discipline/SKILL.md) — to keep the change surgical.
3. If the task touches UI, also load [`tac-ui-authoring`](tac-ui-authoring/SKILL.md) + [`tac-design-tokens`](tac-design-tokens/SKILL.md).
4. Proceed — and flag in the response that the resolver had no exact match, so we can add a routing row next.
