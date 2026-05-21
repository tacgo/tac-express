---
name: tac-skillify
description: >-
  The meta skill. Turn any recurring fix, repeated workflow, or new capability
  into a properly-skilled, tested, resolvable unit. Use when the user says
  "skillify this", "is this a skill?", "make this proper", "we keep doing X
  manually", or after fixing the same class of bug twice. Adopted from
  GBrain's skillify skill (https://github.com/garrytan/gbrain/blob/master/skills/skillify/SKILL.md),
  adapted to TAC Express's 14-laws + Vitest stack.
---

# TAC Skillify — The Meta Skill

> **Source pattern:** GBrain `skillify` skill.
> **Why:** if a fix recurs, the right response is not "fix it again" but
> "make the fix permanent and testable." Otherwise the same bug is rediscovered
> every quarter.

## Contract

A capability is "properly skilled" when all 10 checklist items pass. The
skill is the durable artifact; everything else (PR descriptions, ad-hoc
scripts, Slack messages) is ephemeral.

## The 10-Item Conformance Checklist

```
[ ]  1. SKILL.md            — frontmatter + contract + phases section
[ ]  2. Trigger phrases     — real user language, NOT internal jargon
[ ]  3. Resolver entry      — appears in .claude/skills/RESOLVER.md
[ ]  4. Routing eval        — JSONL line in evals/routing.jsonl asserts dispatch
[ ]  5. Conventions cited   — explicit links to applicable conventions/*.md
[ ]  6. Anti-patterns       — what NOT to do, with concrete examples
[ ]  7. Tests               — Vitest unit test if it touches UI
[ ]  8. Quality gates       — references conventions/quality-gates.md
[ ]  9. Reachability check  — pnpm audit:skills passes
[ ] 10. Memory linkage      — if codifies a feedback memory, links back to it
```

Items 1, 2, 3, 4 are **gating**. Items 5–10 are **strongly recommended** and
audited by `pnpm audit:skills`.

## Phase 0 — Should this be a skill?

Refuse to skillify if any answer is no:

- Will it be invoked 2+ times? (one-off ≠ skill)
- Is there >20 lines of repeatable logic or guidance?
- Does it have a clear trigger phrase the user would actually say?
- Does it overlap < 80% with an existing skill? (otherwise EXTEND that skill)

If any answer is no, file the work as a comment in the relevant existing
skill instead of creating a new one. **MECE matters** — two skills doing the
same thing rot the resolver.

## Phase 1 — Audit

```
Capability: <name>
Recurring evidence: <links to PRs / commits / bug reports>
Existing skill that almost covers this: <slug or "none">
Missing checklist items: <list from the 10>
Initial score: <X/10>
```

If the existing-skill cell is non-empty, EXTEND that skill rather than
creating a new one.

## Phase 2 — Author SKILL.md (item 1)

Frontmatter template (copy-paste, edit):

```yaml
---
name: tac-<slug>                    # kebab-case, prefix with `tac-`
description: >-
  One paragraph. What it does, when to use it, and the trigger phrases the
  user would actually type.
---
```

Body sections (in this order, all required):

1. `## Contract` — what the skill guarantees
2. `## When to load` — bullet list of trigger phrases (item 2)
3. `## Phases` — step-by-step procedure
4. `## Anti-patterns` — what NOT to do (item 6)
5. `## Reference` — chain links to conventions/, other skills, files

## Phase 3 — Trigger phrases (item 2)

Trigger phrases must mirror REAL user language. Pull them from:

- Recent Slack / chat messages where the topic came up
- PR descriptions and commit messages
- The user's exact verbatim phrasing in the conversation that prompted the skill

❌ "WCAG 2.1 AA conformance audit"
✅ "is this accessible", "check a11y", "screen reader test"

## Phase 4 — Resolver entry (item 3)

Open `.claude/skills/RESOLVER.md`. Add a row in the most-specific table:

```md
| "trigger phrase user types" | `tac-<slug>` |
```

Verify with the eyeball test: if a fresh agent reads the resolver and the
user says the trigger, does the right skill load? If two skills could match,
update the **Disambiguation rules** section.

## Phase 5 — Routing eval (item 4)

Append a line to `.claude/skills/evals/routing.jsonl`:

```json
{"intent":"the trigger the user typed","expected":"tac-<slug>","tags":["<area>"]}
```

Multiple intents per skill are fine — one line each. The eval ensures future
resolver edits don't regress this dispatch. Run with:

```bash
pnpm test:routing-eval
```

## Phase 6 — Cite conventions (item 5)

Every TAC Express skill links to the conventions it depends on:

```md
## Reference
- `conventions/quality-gates.md` — the 5 must-pass commands
- `conventions/architecture-flow.md` — UI → services → database
- `conventions/brain-first.md` — check existing surfaces before external lookup
- `conventions/test-before-bulk.md` — test on 1 before bulk
- `conventions/subagent-routing.md` — inline vs Agent
- `conventions/friction-protocol.md` — refusal format
```

Drop the lines that don't apply, but cite at least `quality-gates.md`.

## Phase 7 — Tests (item 7)

| Skill type | Required tests |
|---|---|
| UI authoring | Vitest component test |
| Service / data | Vitest unit test + integration test against Supabase branch |
| Schema / RLS | Migration applies on Supabase branch + `tac-supabase-schema` policy test |
| Audit / lint rule | Snapshot test of the audit output |
| Documentation-only skill | Routing eval is the test |

## Phase 8 — Quality gates (item 8)

The skill must finish with a "Verify" step that references the gates:

```md
## Verify
Run the gates from `conventions/quality-gates.md`:
pnpm lint --max-warnings 0 && pnpm typecheck && pnpm test && pnpm build && pnpm audit:all
```

## Phase 9 — Reachability + MECE (item 9)

Run:

```bash
pnpm audit:skills
```

This script (extended for the skillpack) checks:

- Every skill in `.claude/skills/<slug>/SKILL.md` is reachable from `RESOLVER.md`.
- No two skills share > 80% of trigger phrases (MECE).
- No DRY violations: shared guidance lives in `conventions/`, not duplicated.
- Frontmatter is valid (`name`, `description` present).

Failures are blocking — fix before the skill is "shipped."

## Phase 10 — Memory linkage (item 10)

If the skill codifies a lesson learned (a feedback memory in
`C:\Users\stack\.claude\projects\C--tac-tac-express\memory\`), the skill body
must link back to that memory file. Conversely, the memory entry should
reference the skill that now enforces it.

This closes the "loop" — feedback becomes a permanent enforced behavior, and
the memory lives forever as the *why*.

## The Skillify Loop (the recurring-fix workflow)

```
SAW THE BUG TWICE → audit step
  │
  ▼
PHASE 0 — Is this a skill? (or extend existing?)
  │ no  ─→ comment on existing skill, done
  │ yes
  ▼
PHASE 1 — Audit existing surface
  │
  ▼
PHASE 2 — Author SKILL.md
  │
  ▼
PHASE 3 — Real trigger phrases
  │
  ▼
PHASE 4 — Add to RESOLVER.md
  │
  ▼
PHASE 5 — Add routing eval line
  │
  ▼
PHASE 6 — Cite conventions
  │
  ▼
PHASE 7 — Write tests
  │
  ▼
PHASE 8 — Reference quality gates
  │
  ▼
PHASE 9 — pnpm audit:skills passes
  │
  ▼
PHASE 10 — Memory linkage
  │
  ▼
COMMIT — atomic: skill + resolver entry + routing eval + tests
```

## Worked Example: skillifying "we keep forgetting RLS on new tables"

```
Phase 0: Yes — happened on PRs #29, #34, #41. Three times.
Phase 1: tac-supabase-schema covers RLS but doesn't enforce it on every new table
Phase 2: Author tac-rls-on-create-table SKILL.md
Phase 3: Triggers: "new table", "create table", "supabase migration with table"
Phase 4: Add row to RESOLVER.md under "Data, services, API"
Phase 5: routing.jsonl line: {"intent":"new table for...","expected":"tac-rls-on-create-table"}
Phase 6: Cite quality-gates.md, architecture-flow.md
Phase 7: Vitest test that fails when a migration introduces a table without RLS
Phase 8: Reference pnpm audit:rls in quality gates
Phase 9: pnpm audit:skills passes
Phase 10: Link to memory file documenting the three incidents
```

## Output Format

Skillify produces three durable artifacts per skill:

1. **The skill on disk** — `.claude/skills/<slug>/SKILL.md`
2. **A resolver entry** — line in `.claude/skills/RESOLVER.md`
3. **A routing eval line** — JSONL entry in `.claude/skills/evals/routing.jsonl`
4. **Tests** — co-located with the surface the skill governs

## Anti-patterns

- ❌ Creating a new skill that duplicates an existing one (merge or extend)
- ❌ Trigger phrases written in internal jargon ("a11y conformance audit")
  instead of real user language ("is this accessible")
- ❌ Adding a SKILL.md without a RESOLVER.md entry — the skill is invisible
- ❌ Adding a SKILL.md without a routing eval — future edits silently break it
- ❌ Skills that don't cite the conventions — they will drift
- ❌ Skipping Phase 0 because "it might be useful someday"
- ❌ Authoring skills that aren't backed by recurring evidence

## Reference

- Source: GBrain `skills/skillify/SKILL.md` (https://github.com/garrytan/gbrain)
- Conventions: `conventions/quality-gates.md`, `conventions/brain-first.md`
- Skills: `tac-fourteen-laws`, `tac-express-onboarding`
- Audit: `pnpm audit:skills`
- Memory: link any new skill back to the memory file it codifies
