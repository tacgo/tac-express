# Quality Gates Convention

> Cross-cutting rule. Applies to every task regardless of which specialist skill loaded.
> Authority: `AGENTS.md` § 8.

The "five must-pass commands" are not negotiable, not skippable, not "I'll fix it after merge."

## The Five Gates (in order)

Run these from the workspace root (`c:\tac\tac-express`) before declaring any task done. ALL must pass.

```bash
pnpm lint --max-warnings 0   # 1. Zero lint warnings (LAW 1, 2, 3, 8, 9, 10, 11)
pnpm typecheck               # 2. Zero TS errors across the workspace
pnpm test                    # 3. All Vitest unit tests pass
pnpm build                   # 4. Both apps (web, dashboard) build with Turbopack
pnpm audit:all               # 5. governance + auth-boundary + skills + design-spec
```

Any failure ⇒ **stop**, route to `tac-debug`, find the root cause, fix, re-run.
Do NOT use `--no-verify`, do NOT add `// eslint-disable-next-line`,
do NOT comment out the failing test.

## When to run

| Phase | Gates 1–4 | Gate 5 (audit:all) |
|---|---|---|
| Mid-implementation, fast loop | 1 (lint) + 2 (types) only | skip |
| Pre-commit (per task) | All four | required |
| Pre-PR (before opening) | All four | required + manual checklist below |
| Pre-merge | All four (CI re-runs) | CI runs the audit |

## Why these five

- `lint` enforces LAWs 1, 2, 3, 8, 9, 10, 11 directly via custom ESLint rules.
- `typecheck` catches schema drift after `pnpm db:generate-types` (LAW 6/7/8).
- `test` is the only proof TDD was followed (skill `tac-tdd`).
- `build` is the only proof Turbopack + Next 16 still resolves the import graph.
- `audit:all` runs the four governance scripts:
  - `audit:governance` — package boundary + forbidden-package check
  - `audit:auth-boundary` — `@supabase/*` confined to `packages/database/`
  - `audit:skills` — every skill has valid frontmatter + sections
  - `audit:design-spec` — globals.css ↔ DESIGN_SYSTEM.md drift

## When a gate fails

- **Don't suppress.** No `// eslint-disable` for the offending line, no `// @ts-ignore`, no `--no-verify`, no `skip()` on tests.
- **Diagnose the root cause.** Load `tac-debug` if needed.
- **Fix the cause, not the symptom.** If a test fails because of a real behaviour change, update the test only after confirming the new behaviour is intentional and documented.

## Pre-PR self-check (in addition to the five gates)

- [ ] Diff size ≤ 1,500 LoC additions (or PR description explains why the split would create more risk than the size)
- [ ] If touching `packages/services/src/orbital.service.ts` or any new direct-Supabase read → RLS audit linked
- [ ] If adding charts or large client-side libs → bundle-size delta measured
- [ ] If touching print routes / `<ShippingLabel>` / `<InvoicePrintView>` → visual snapshot run
- [ ] If a new feature could need rollback → entry added to `docs/ROLLBACK-PLAYBOOK.md`
- [ ] PR description names the issue it closes + the manual-verification test plan

## Anti-patterns

- Skipping gate 5 because "it takes too long" — the audit is the only check that
  catches a forbidden-package install or an `@supabase/*` leak into apps.
- Running `pnpm test --run --no-coverage` only — the full `pnpm test` is the gate.
- Treating CI as the first run — by the time CI fails, the diff is in review and
  every reviewer wastes a cycle.
- Bypassing pre-commit hooks with `git commit --no-verify`. NEVER. If the hook
  is wrong, fix the hook (load `update-config` skill).

## What to do when blocked

If a gate fails and you cannot diagnose the cause within a reasonable attempt:

1. Stop. Don't push.
2. Capture the failing command + output verbatim in a conversation note.
3. Load `tac-debug` and walk the root-cause protocol.
4. If still stuck, escalate to the user with what you tried and what you observed.

Never ship around a failing gate.

## Reference

- Skills: `tac-debug`, `tac-tdd`, `tac-code-review`
- Files: `package.json` (scripts), `.husky/`, `pnpm-workspace.yaml`
- Memory: `reference_quality_gates.md`
