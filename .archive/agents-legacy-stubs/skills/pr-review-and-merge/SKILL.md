---
name: pr-review-and-merge
description: Drive a GitHub PR end-to-end from open to merged with the rigour of the May-2026 four-round review baseline. Use when invoked on any PR for this repo — especially PRs >1500 LoC, PRs touching `packages/services/`, `packages/ui/`, or `apps/*/api/*`, or PRs with bot reviews (CodeRabbit, Macroscope) or prior multi-agent self-review. Covers seven phases (inventory → analysis → triage → fix → verify → decide → follow-up), the project's non-negotiable laws, the antipatterns to refuse, and output templates for status comments. The load-bearing principle: every finding gets an actual code change, not a comment around the bug.
---

# PR Review & Merge Workflow

> **⚠ DRAFT — DO NOT BANK.** This skill is unvalidated as of 2026-05-08. Phase 0a's closed-loop check is broken on squash-merged PRs (Co-Authored-By trailers erased; `git log` sees a clean human author and the gate doesn't fire). Tracked: issue #20. Until Phase 0a is rewritten to use `mcp__github__list_commits` and the operator-assertion is promoted to required, treat this file as reference material, not an authoritative review process.

> **Purpose.** Take a PR from "open" to "merged" with the rigour of the
> May-2026 four-round baseline (PR #8): every finding gets an actual code
> change, every deferral gets a tracked issue, and the merge button is
> only pushed when typecheck is green AND no blocking findings remain
> AND the test plan has been honestly accounted for.
>
> **When to use.** Any PR review on this repo. Especially:
> PRs >1500 LoC, PRs touching `packages/services/`, `packages/ui/`, or
> any `apps/*/api/*` routes, and any PR with bot reviews (CodeRabbit,
> Macroscope) or prior multi-agent self-review.

## Inputs

```
PR_NUMBER     — e.g. 8
REPO_OWNER    — e.g. <YOUR_GITHUB_ORG>
REPO_NAME     — e.g. tac-express
BASE_BRANCH   — defaults to main; confirm against PR metadata
```

## Project laws (non-negotiable)

These come from `AGENTS.md` and the sibling skills under `.agents/skills/`.
Any code that violates them is a **blocking** finding regardless of who
wrote it.

1. **pnpm only.** Never `npm`, never `yarn`. Lockfile must be in sync.
2. **Monorepo placement.** All UI components live in `packages/ui/src/components/`. Never in `apps/`.
3. **Tailwind v4 + semantic tokens only.** No `bg-blue-500`, no `w-[347px]`. Use the CSS variables in `packages/ui/src/styles/globals.css`.
4. **TAC Orbital design system.** Brutalist, dark-first, straight lines. Radius `0.125rem` only.
5. **Allowed libraries.** `@remixicon/react` for icons (via `@workspace/ui/icons` barrel — never direct). `motion/react` for animation. shadcn primitives reused, never rebuilt.
6. **Data-flow law.** Zero business logic or DB calls inside UI components. Route through `packages/services/`.
7. **Edge-function exemption.** `supabase/functions/` may use `SUPABASE_SERVICE_ROLE_KEY`. Service-role usage outside that directory is auto-block.

Before any non-trivial work, refresh project context by reading `AGENTS.md`
and the matching files under `.agents/skills/`.

---

## Phase 0 — Preconditions (refuse if not met)

Before reading the PR at all, validate two preconditions. Each refusal is
hard — abort the workflow and report which precondition failed.

### 0a. Closed-loop AI review check

The May-2026 baseline named "AI agent generates code → AI agent reviews
code → AI agent fixes findings" as the antipattern that justifies four
review rounds in the first place. The skill must enforce, not just
describe.

**Concrete check:** before Phase 1, run

```bash
# Inspect commit authorship on the PR's diff range. If any commit was
# authored by the same agent identity now invoking this skill, refuse.
git log --pretty='%an <%ae>' "${BASE_BRANCH}..${HEAD_BRANCH}"
```

If any author email matches the agent's own identity (typical patterns:
`*@anthropic.com`, `noreply@anthropic.com`, or a `Co-Authored-By:
Claude` trailer in commit messages), **abort** with:

> Refusing to run pr-review-and-merge against a PR I authored. Closed-loop
> review is the antipattern this skill exists to prevent. Hand this PR
> to a human reviewer or to a different agent identity.

**Operator assertion fallback:** if the author check is ambiguous (e.g.,
mixed-authorship PRs, commits made by humans applying agent-suggested
patches), require the invoking operator to include this exact string in
the initial prompt:

> I assert that the agent invoked here did not generate the code under
> review. — <operator name>

If the assertion is missing, refuse and ask for it. **Do not proceed
without one of the two checks passing.**

### 0b. Tooling-environment check

Verify the runtime has what the skill needs:

```bash
which gh         # GitHub CLI for the comments fallback
which pnpm       # canonical package manager
gh auth status   # GH must be authenticated
```

If `gh` is missing or unauthenticated, the PR-level conversation read
path is broken — note this in Phase 1's inventory and proceed with only
the MCP-tool reads. Don't fail silently.

---

## The seven phases

### Phase 1 — Inventory

Pull complete PR state from the GitHub MCP. Don't trust the PR
description; trust the API.

```
mcp__github__get_pull_request           # mergeable, base/head, status checks
mcp__github__get_pull_request_reviews   # all reviews (bot + human), with state
mcp__github__get_pull_request_comments  # line / review-thread comments
mcp__github__get_pull_request_files     # changed files + LoC
mcp__github__get_pull_request_status    # combined status of required checks
mcp__github__list_commits               # commit-by-commit walk
```

PR-level conversation comments (the `/issues/{n}/comments` endpoint) are
**not** exposed by this MCP server. To read them:

```bash
gh api "repos/$OWNER/$REPO/issues/$PR_NUMBER/comments"
```

…or scan the rendered PR via `gh pr view $PR_NUMBER --comments`.

Compute and record:

- **Size.** Total `+/-`, file count. If `>1500` LoC or `>20` files, flag
  in the final comment but proceed.
- **Mergeability state.** `mergeable`, `mergeable_state`,
  `merge_commit_sha`. Be aware: `mergeable=true` is API-gated, not
  socially-gated. The merge button works even with unaddressed
  `COMMENTED` reviews. **That is not permission to merge.**
- **Status checks.** All required checks must be `success` or `neutral`.
  `skipped` is acceptable only if documented (e.g., CodeRabbit gated to
  the default branch when the PR uses a non-default base).

### Phase 2 — Analysis

Gather every finding from every source into a single ledger.

Sources to harvest:

- CodeRabbit reviews (line comments + summary)
- Macroscope reviews (review comments by `macroscopeapp[bot]`)
- Any prior multi-agent self-review posted as a PR-level comment
- Human reviewer comments
- Failing or warning CI checks

For each finding capture: `{source, severity, file:line, claim, status}`.

Severity bands:

| Band | Examples | Behaviour |
|---|---|---|
| **CRITICAL** | Data integrity (race conditions, money bugs), security (auth bypass, IDOR, RLS gaps), build-breakers, secrets exposure | **Block merge.** Fix in this PR. |
| **HIGH** | Significant UX regression, type-system circumvention via `as unknown as`, dead code paths, perf cliff, copyright/IP issues | **Block merge** unless materially out of scope; if so, file as P1 follow-up with explicit reviewer ack. |
| **MEDIUM** | Code-quality issues with concrete runtime impact (silent truncation, edge-case nulls), test gaps on critical paths, missing telemetry | Fix in PR if <30 min. Otherwise P2 follow-up. |
| **LOW** | Style, naming, polish, doc improvements | P3 follow-up. |

Cross-reference each finding against later commits — if the bug is
fixed in a later commit on the same branch, mark `closed-in:<sha>`.
**Do not** mark closed based on a comment alone; **read the diff**.

### Phase 3 — Triage

Output a markdown ledger like:

```markdown
## Findings ledger

### CRITICAL (blocks merge)
- [ ] [Macroscope:5268f4b] payment.service.ts:150 — RPC null-data falls through to fallback
- [x] [Multi-agent CRITICAL #2] /api/whatsapp/send-invoice — IDOR (closed-in 6dd26e5)

### HIGH
- [ ] [Macroscope:bfb1d5a] payment.service.ts:212 — fallback runs on any RPC error, not just relation-missing

…
```

Post this ledger as a comment on the PR before starting fixes
(`mcp__github__add_issue_comment`). It becomes the contract for the rest
of the work.

### Phase 4 — Fix (load-bearing)

The principle that defines the difference between a good review session
and theatre: **every finding gets an actual code change, not a comment
around the code that has the bug.**

Rules:

1. **Read the actual code before writing the fix.** Trust nothing from
   PR descriptions, agent summaries, or even your own prior analysis.
   Open the file. Read the function.
2. **A comment is not a fix.** "⚠ NOT atomic" comments, runbook entries
   that don't change behaviour, env vars that don't reference any code
   path — none of these resolve a CRITICAL finding.
3. **Throw on data-integrity ambiguity.** When the system can't tell
   whether a mutation succeeded, raise a typed error with
   operator-readable copy ("refresh, do NOT retry") rather than fall
   through to a softer path. Pair with `Sentry.captureException` and
   proper tags.
4. **Permissive catch is an antipattern.**
   `try { primary() } catch (err) { fallback() }` without inspecting
   `err` is wrong by default. The correct shape:
   `if (isExpectedRecoverable(err)) fallback(); else throw err`.
5. **Single source of truth.** Refuse dual-write reconciliation
   patterns. If a field exists in two places, one of them is the source
   and the other is derived.
6. **One commit per logical fix** with conventional commit format.
   `fix(payment): narrow fallback to missing-relation only` not
   `address PR review`.

For findings that are too large for this PR (architectural,
cross-cutting, separate feature scope):

- File a GitHub issue (`mcp__github__create_issue`) with full context,
  severity label, suggested approach.
- Tier with a `[P0]`/`[P1]`/`[P2]`/`[P3]` title prefix.
- Reference the originating PR.
- **Do not bundle unrelated concerns into one issue.** RLS audit +
  bundle-size measurement + visual-regression baseline + rollback plan
  = four separate issues.

### Phase 5 — Verify

Necessary conditions, in order:

```bash
pnpm install                                  # lockfile sync
pnpm -F <pkg> exec tsc --noEmit               # for each affected package
pnpm -F <pkg> exec test                       # if tests exist
pnpm -F <pkg> exec lint                       # if configured
pnpm -F <pkg> build                           # for prod-build-only failures
```

Sufficient conditions:

- **Manual test plan walked.** The PR description's checklist must be
  honestly executed or honestly deferred. "Typecheck passes" is not
  equivalent to "the WhatsApp send button works." If runtime
  verification didn't happen, **say so explicitly** in the PR comment
  with a list of unverified items and the highest-risk one called out
  (typically: anything with paid upstream calls, schema-cache-sensitive
  operations, or new third-party integrations).
- **Sentry/observability check.** New error paths should fire a
  structured `captureException` with tags. Verify by reading the
  source, not by trusting the description.

#### Test-plan walkability decision rule

For each item in the PR's test plan, classify before claiming any
verification:

| Walkable by agent? | Examples | Action |
|---|---|---|
| **Yes — agent walks it** | Static-route renders, client-side form validation, sort/filter/pagination on local data, theme toggle, hydration warnings in console, `pnpm dev` build passes | Walk it via browser tool against the local dev server. Capture console output; flag any errors. |
| **Hybrid — agent walks a stubbed/mocked version** | Email send (mock recipient inbox), payment flow (test-mode Stripe key), webhook delivery (local ngrok-style tunnel) | Walk against the stub. Note explicitly that the real upstream was not exercised; flag for human walk-through before deploy. |
| **No — human-only** | Paid upstream calls (production WhatsApp/SMS that costs money per send), real-money payment authorization, printer/scanner I/O, multi-user concurrency tests, anything requiring production-only data shapes (e.g., "verify against real customer GSTIN") | **Do not claim verified.** Defer to human, surface as the highest-risk item in the pre-merge comment. |

When in doubt, classify as "no" and defer. **Over-claiming closure on a
test-plan item the agent couldn't actually verify is the same anti-pattern
as a comment-instead-of-fix.** A human reviewer reading "✅ WhatsApp send
verified" assumes a real WAMID came back from a real WPBox call; if the
agent only verified the dialog opens, that's lying.

The output template's "Manual test plan" row should look like:

```
| Manual test plan | <agent-walked>/<total> walkable items verified;
                     <human-only> items deferred (highest risk: <item>) |
```

Not just "✅" or "⚠" without the breakdown.

### Phase 6 — Decide

Decision tree:

```
status checks green
  └─ yes
      └─ no blocking findings open
          └─ yes
              └─ typecheck/lint/build all pass on affected packages
                  └─ yes
                      └─ test plan executed OR honestly deferred with reviewer ack
                          ├─ executed → MERGE (squash; PR description as commit body)
                          └─ deferred → post status comment, request reviewer
                                        go-ahead, do not merge
                  └─ no → fix or revert
          └─ no → finish fixes
      └─ no → fix or revert
  └─ no → investigate failing/skipped checks; do not merge
```

Merge command:

```
mcp__github__merge_pull_request --merge_method squash
```

PR description goes into the commit body. Do not strip the test plan —
it becomes the post-deploy verification checklist.

### Phase 7 — Follow-up

Within the same session as the merge:

- File every deferred issue with proper tier label, full context, and
  suggested approach.
- Cross-link issues that are sequenced dependencies (e.g., "#15 RLS
  audit blocks #N feature work").
- If the PR was >1500 LoC, surface that in the closing comment as a
  structural note pointing at the slicing-rule issue (see
  `tac-express` issue #14 for the canonical reference).
- Update any runbook docs that reflect new operational state.
  Especially: any feature shipping in a known-broken state (e.g.,
  dependent migrations not yet deployed).

---

## Anti-patterns to refuse

These all came up in the May-2026 baseline. Each is auto-block.

1. **Self-graded close-out.** Marking a finding closed without reading
   the diff that supposedly closes it. Always re-read.
2. **Mitigation theatre.** Comments, runbook entries, env vars that
   don't reference real code paths, "documented as known issue" — none
   of these are fixes.
3. **Closed-loop AI review.** AI agent generates code, AI agent reviews
   it, same AI agent fixes it. There is no human-in-the-loop. Either
   insert a human or run reviews against agents that did not generate
   the code.
4. **Bundled follow-up issues.** "RLS audit + bundle size + visual
   regression + rollback plan" in one issue means three of those get
   deprioritised. **Split.**
5. **Permissive catch.** `catch (err) { fallback() }` without
   inspecting `err`. After upstream tightens its rules, the fallback
   bypasses every new policy.
6. **Dual-write reconciliation.** Persisting the same data in two
   shapes (e.g., `billingAddress` string + `billing.{line1,city,…}`
   object) with merge logic spread across files. Pick one canonical,
   derive the other, write a one-shot migration.
7. **Direct library imports bypassing barrels.**
   `import { RiX } from "@remixicon/react"` instead of `from
   "@workspace/ui/icons"`. LAW 5 violation.
8. **Arbitrary Tailwind values.** `text-[10px]`, `w-[260px]`,
   `min-h-[360px]`. Either a token exists (use it) or one needs to be
   added to `globals.css`.
9. **Server-side `service_role` outside `packages/database/` or
   `supabase/functions/`.** RLS bypass. Always blocking.
10. **Missing pnpm-lock sync.** PR adds a dep but doesn't update the
    lockfile → CI breaks on `--frozen-lockfile`. Always run
    `pnpm install` and commit.

---

## Output templates

### Status comment after Phase 2 (analysis posted)

```markdown
## Review ledger — analysis complete

Pulled from GitHub API at `<sha>`. Sources: <list>.

### CRITICAL (blocks merge)
- [ ] …

### HIGH
- [ ] …

### MEDIUM (fix or follow-up)
- [ ] …

### LOW (follow-up)
- [ ] …

Starting fixes on CRITICAL/HIGH. Will post per-fix commits and a final
closure summary.
```

### Status comment before merge

```markdown
## Pre-merge state

| Gate | Status |
|---|---|
| Status checks                  | ✅ |
| Blocking findings              | ✅ all closed (commits `<sha>`..`<sha>`) |
| typecheck (dashboard)          | ✅ |
| typecheck (@workspace/ui)      | ✅ |
| typecheck (@workspace/services)| ✅ |
| Manual test plan               | ⚠ <N> of <M> items unverified — highest risk: <item> |
| Follow-up issues               | ✅ filed (#<n>–#<m>) |

Mergeable. Recommend squash with PR description as commit body.

@<reviewer> — confirm test plan deferral acceptable, or request
walk-through before merge.
```

---

## Lessons load-bearing for next time

1. **Code changes > documentation.** The May-2026 baseline worked
   because every escalation got real code. The first round had
   documentation-as-fixes; that's why it took four rounds.
2. **Honest deferral > false closure.** Saying "this is mitigated, not
   fixed" is worth more than claiming closure. The reviewer can tier
   honestly-flagged work; falsely-closed work surfaces as the next
   incident.
3. **Severity ≠ social weight.** A `Macroscope: Medium` that's a money
   bug is more important than a `Multi-agent: CRITICAL` that's a LAW 11
   token violation. Read the *content*, not the label.
4. **`mergeable=true` is mechanical, not editorial.** Branch protection
   or explicit `Request changes` reviews are the only mechanical merge
   gates. "Blocker" labels in comments are social.
5. **Receipt size = scope discipline.** N follow-up issues filed = N
   concerns the PR couldn't hold. >5 follow-ups for a single PR is a
   sign that the PR was actually multiple PRs in a trench coat.
6. **Self-test in migrations.** When deploying schema changes
   (`CREATE FUNCTION`, `CREATE TABLE`), the migration itself should run
   a transaction that exercises the new object and rolls back. Catches
   RPC body bugs before any real call.
7. **`NOTIFY pgrst, 'reload schema';`** at the tail of any
   PostgREST-relevant migration. Closes the schema-cache window from
   tens of seconds to milliseconds.

---

## Failure modes specific to this repo

- **PR base-branch confusion.** This repo uses non-default base branches
  for review-style PRs (`baseline/pre-session-*`). CodeRabbit may be
  gated to `main` only — check `.coderabbit.yaml`
  `auto_review.base_branches` and trigger manual review with
  `@coderabbitai review` if needed.
- **Macroscope cost cap.** Workspace-level billing setting can silently
  kill auto-review. If Macroscope shows "Review skipped" or "cost cap,"
  the human (or another reviewer) needs to fill the gap.
- **Closed-loop self-review.** Solo-owner repo. The author may be
  running their own AI review against their own AI-generated code. The
  next reviewer should explicitly note this and bias toward stricter
  manual reading on critical paths.
- **Edge-function service-role exemption.** `supabase/functions/`
  legitimately uses `SUPABASE_SERVICE_ROLE_KEY` (per `.coderabbit.yaml`
  LAW-8 exemption). Service-role usage *outside* that directory is
  auto-block.

---

## Final rule

If at any point during this workflow you find yourself writing a comment
that explains why a finding is *acceptable as-is*, stop and ask whether
you've slipped into mitigation theatre. The correct outcome is almost
always either (a) a code change in this PR or (b) a tracked issue with
an owner. **"Acknowledged in the runbook" is rarely the right third
option.**

---

## Reference

This skill was distilled from PR #8 (May-2026 session): four review
rounds, eleven commits, five real bugs caught, ten follow-up issues
filed, one antipattern sweep filed. The four-round process worked
because every escalation was met with actual code changes rather than
mitigation theatre — that's the load-bearing piece worth keeping.
