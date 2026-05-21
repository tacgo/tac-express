# Test Before Bulk Convention

**Never run a batch operation without testing one first.**

Adopted from GBrain (https://github.com/garrytan/gbrain/blob/master/skills/conventions/test-before-bulk.md).
The principle scales: applies equally to file rewrites, codemods, migrations,
WhatsApp sends, invoice regenerations, and bulk RLS-policy updates.

## The Process

1. **Read the relevant skill first.** Don't write throwaway scripts. If a skill exists, use it.
2. **Hone the prompt / logic.** Get the output format right before touching anything at scale.
3. **Test on 1–5 items.** Use a dry-run flag if available (most pnpm scripts in this repo accept `--dry-run`).
4. **Read the actual output.** Is the diff clean? Does the regenerated PDF render? Did the migration apply on a Supabase branch without breaking existing rows?
5. **Fix what's wrong in the durable artifact** — the skill, the codemod, the migration. Not a one-off shim.
6. **Only then: bulk execute.** With a kill switch and atomic commits per N items.

## Applies to

- **Codemods** (jscodeshift, ts-morph) across `packages/ui/src/components/**`
- **Migration drafts** before `apply_migration` against the live project
- **Bulk WhatsApp sends** (production money/time flow — see `AGENTS.md` §7a)
- **Invoice regenerations** (touches money — confirm one PDF before regenerating 200)
- **Component rename refactors** (test on one consumer first, watch the typecheck)
- **Bulk seed data** for staging environments
- **Token migrations** (color/spacing rename across globals.css)
- **PR-comment-driven cleanup** (apply one CodeRabbit / Macroscope finding by hand
  to verify the bot's pattern before bulk-applying)

## Hard constraints when bulk-touching production data

| Operation | Required dry-run | Required confirmation |
|---|---|---|
| `mcp__supabase__apply_migration` on prod | Run on a Supabase **branch** first (`create_branch` → `apply_migration` → verify → `merge_branch`) | User explicit |
| `pnpm db:seed` against prod | NEVER | N/A |
| Bulk WhatsApp send | Send to ONE test number first | User explicit |
| Bulk invoice regen | Regen ONE invoice + visual diff first | User explicit |
| `git push --force` | NEVER on shared branches | N/A |
| `pnpm dlx codemod` across all packages | Run on `packages/ui/src/components/primitives/button.tsx` first | Diff review |

## Why

One bad bulk run can corrupt 170 rows / send 170 wrong WhatsApp messages /
break the build for everyone. The marginal cost of testing 5 first is near zero.
The cost of cleaning up a bad bulk run is enormous — and on money flows,
sometimes irreversible.

## Anti-patterns

- ❌ Writing a bash one-liner to rename a token across the repo without trying one file
- ❌ "I'll just push the migration; we can roll it back" (rollback is a real
  procedure — see `docs/ROLLBACK-PLAYBOOK.md`)
- ❌ Bulk-fixing CodeRabbit findings without verifying the bot was right on a
  sample (memory: `feedback_coderabbit_false_positives.md`)
- ❌ `pnpm dlx shadcn@latest add accordion alert-dialog avatar badge ...` —
  add ONE primitive at a time so you can review the generated diff per file

## Reference

- Source: GBrain `skills/conventions/test-before-bulk.md`
- Skills: `tac-tdd`, `tac-debug`, `tac-supabase-schema`, `tac-domain-logistics`
- Files: `docs/ROLLBACK-PLAYBOOK.md`
