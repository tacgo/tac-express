# Brain-First Convention

**Read this before reaching for any external lookup, library install, or design-from-scratch.**

Adopted from GBrain's `brain-first.md` (https://github.com/garrytan/gbrain/blob/master/skills/conventions/brain-first.md).
The principle is the same — only the "brain" is different. Here the brain is the
**existing TAC Express codebase + skills + memory system + Supabase schema**.

## The Lookup Chain (MANDATORY ORDER)

For any "where does X live" / "do we have a Y" / "how do we do Z" question:

1. **`Glob` / `Grep` the codebase first** — fastest, zero cost, authoritative.
   - "Do we have a date picker?" → `Glob packages/ui/src/components/**/date*.tsx`
   - "How are we doing rate limits?" → `Grep "@upstash/ratelimit"`
2. **Read the matching skill** — the answer to *how* often lives in `.claude/skills/`.
   - "Should I add a form?" → load `tac-forms` BEFORE typing.
3. **Check memory** — `C:\Users\stack\.claude\projects\C--tac-tac-express\memory\MEMORY.md`
   for prior decisions, design rationale, and "why we don't do X."
4. **Check Supabase schema** — `mcp__supabase__list_tables` / `list_migrations`
   before designing a new table. The schema is the truth.
5. **Only after 1–4 return nothing useful** → external lookup (WebSearch, WebFetch, npm registry).

## Hard rules

- **Never install a package that already exists.** `pnpm why <pkg>` first.
  Forbidden-package check (LAW + `audit:governance`) catches the worst, but
  duplicate utility installs (`clsx` when we have `cn`, `dayjs` when we have
  built-in date utilities) waste bundle and review time.
- **Never design a component that already exists.** Search `packages/ui/src/components/`
  before authoring. shadcn primitives + composed components cover ~90% of asks.
- **Never invent a service method that already exists.** Search
  `packages/services/src/` for a similarly-named function.
- **Never write a migration that conflicts with an existing one.**
  `mcp__supabase__list_migrations` shows the chronological list.
- **Never re-derive a token.** `packages/ui/src/styles/globals.css` is canon
  (LAW 1, 9, 10, 11).

## Available "brain" surfaces

| Surface | How to search |
|---|---|
| Codebase | `Glob`, `Grep`, `Read` |
| Skills (this folder) | `Glob .claude/skills/**/SKILL.md`, `Read RESOLVER.md` |
| Auto-memory | Read `MEMORY.md` index, then load specific files |
| DB schema | `mcp__supabase__list_tables`, `list_migrations`, `execute_sql` (read-only) |
| Recent decisions | `git log --oneline -50`, `gh pr list --state merged --limit 20` |
| Open issues | `gh issue list --state open` |
| Design tokens | `Read packages/ui/src/styles/globals.css` |

## When external lookup IS the right call

- The question is about a third-party library's current API and our `package.json`
  shows the version is recent (use WebFetch to read the package's docs).
- The user asks for a "best practices" check on something genuinely new
  (Next 16 Turbopack edge cases, Supabase preview features).
- A bug points to upstream — read the upstream issue tracker.

In every case, use the brain first to *frame the question*, then go external
with that framing in hand.

## When spawning a sub-agent

If you spawn an Agent (Explore / general-purpose / Plan / Claude-code-guide),
include this line in the task prompt:

> Read `.claude/skills/conventions/brain-first.md` and check the existing
> codebase + skills + memory before any external lookup.

This propagates the rule through any sub-agent depth.

## Anti-patterns

- ❌ "Let me search the web for a Tailwind date picker" before checking `packages/ui/`.
- ❌ `pnpm add date-fns` without `pnpm why date-fns` (we may already have it).
- ❌ Writing a `formatCurrency` helper without grepping for one.
- ❌ Designing a fresh schema without `list_tables` first.
- ❌ Proposing a rule that's already in `tac-fourteen-laws`.

## Reference

- Source: GBrain `skills/conventions/brain-first.md`
- TAC Memory: `MEMORY.md` index → specialized files in `memory/`
- Skills: `tac-express-onboarding`, `tac-fourteen-laws`, `tac-data-layer`
