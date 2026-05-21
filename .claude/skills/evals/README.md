# Routing Evals

Adopted from GBrain's routing-eval pattern (`evals/*.jsonl` + a check script).
Each line in `routing.jsonl` is a self-contained dispatch test:

```json
{"intent":"<what a real user types>","expected":["<skill-1>","<skill-2>"],"tags":["<area>"]}
```

## Format

| Field | Type | Notes |
|---|---|---|
| `intent` | string | Verbatim user phrasing — short, lowercase, no punctuation flourishes |
| `expected` | string[] | Skills (or convention paths) the resolver SHOULD load. Order matters: most-specific first. |
| `tags` | string[] | Area labels (`ui`, `data`, `auth`, `debug`, `meta`, `conventions`, `domain`) |

Convention paths (e.g., `conventions/brain-first.md`) are valid entries when the
intent is purely about a cross-cutting rule rather than a skill.

## What this protects

- Adding a new skill without a resolver entry → routing eval would FAIL on its
  intended trigger phrase. Forces RESOLVER + SKILL + eval to land in the same PR.
- Renaming a skill folder → eval immediately surfaces the broken dispatch.
- A user phrase someone said "we should handle that" but never wrote into the
  resolver → add the line; the test will fail until the resolver entry exists.

## How to run (TODO — script lives in `scripts/audit-skills.ts`)

```bash
pnpm test:routing-eval
```

Pseudocode:

```ts
for line in routing.jsonl:
  load .claude/skills/RESOLVER.md
  match line.intent against the resolver tables
  assert matched skills are a SUPERSET of line.expected
```

The check is purely textual — it does NOT spin up an LLM. The agent reads the
resolver at runtime; this eval simulates that read.

## Adding a new entry

When you `tac-skillify` a capability, Phase 5 mandates a routing-eval line.
Put it under the most-specific section that matches; sort by `tags` for
readability.

If two existing skills share a trigger phrase, ADD the disambiguation rule to
`RESOLVER.md` first, then write the eval line that proves the rule fires.

## Why JSONL

- Append-only diffs are easy to review.
- One concept per line — no merge conflicts when two PRs add adjacent skills.
- Trivial to grep (`grep skillify routing.jsonl`) when debugging dispatch.

## Reference

- Source: GBrain `evals/` (https://github.com/garrytan/gbrain/tree/master/evals)
- Resolver: `.claude/skills/RESOLVER.md`
- Skillify: `.claude/skills/tac-skillify/SKILL.md` (Phase 5)
