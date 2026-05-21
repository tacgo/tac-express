# Decision: Backlog-drift sentinel — repo-mirror + reference-existence CI check (PHASE-0)

**Date:** 2026-05-17
**Author:** Claude Code (Opus 4.7) in PM-mode + Senior FSE + Big-Tech CTO + Designer
**Status:** ACCEPTED — implemented in PR feat/136-backlog-drift-sentinel
**Scope:** convert the "does every code artifact our backlog names actually exist" check from a discipline-dependent manual re-validation into a mechanical CI gate.
**Closes mechanism choice for:** [#136](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/136). The repo-mirror-plus-sentinel mechanism was already chosen in `docs/audits/2026-05-16-102-revalidation.md § 9` over the calendarized-ritual alternative; this PR builds it. Do NOT re-litigate § 9.

---

## 0. TL;DR

| Question | Decision | One-line reason |
|---|---|---|
| **A. Mirror scope + seed-delta reconciliation** | **Mirror the full open-item set + the WONTFIX rows for readability; the sentinel only asserts on items carrying a `refs:` block.** Seed from `docs/audits/2026-05-16-102-revalidation.md` AND apply two known deltas: (i) whatsapp_sends → DONE with real refs (the first dogfood case); (ii) #142/#143/#144/#145 added as new open items. | The seed doc is one day stale — it predates the #141 merge and the four follow-up filings. The fact that the SEED IS ALREADY STALE is the precise drift this sentinel exists to stop. Note the irony in the retro. |
| **B. Source of truth** | **The repo file `docs/backlog/production-readiness.md` IS AUTHORITATIVE for the open-item list.** `#102`-the-GitHub-issue becomes a human-facing pointer that links to the repo file. | If the repo file is merely a mirror of `#102`-the-issue, it drifts too — the original problem unsolved. Owner-action carry-forward: edit `#102`'s body to point at the repo file. |
| **C. Reference format** | A **fenced `refs` block** (```` ```refs ... ``` ````) under each item heading. Each line is `<kind>: <value>` where `<kind>` ∈ {`file`, `symbol`, `table`, `rpc`}. **No bare line numbers anywhere** (catalog #5). | Custom mini-format because YAML would require adding `js-yaml` as a new dependency (forbidden). The parser is ~30 lines of regex; the format is grep-handle stable. |
| **D. Sentinel boundary** | **EXISTENCE only.** For each `file:` → `statSync(...).isFile()` (catalog #11). For each `symbol: <file>::<name>` → file exists AND the file contains `<name>` as a substring. For each `table:` → some migration file in `supabase/migrations/` (excluding `_archive/`) contains `create table … <name>` or `<name>` in a `comment on table`. For each `rpc:` → some file in `packages/` or `supabase/` contains `<name>(`. **Does NOT verify done-ness or correctness.** | The whole point of the forcing function is mechanical and unambiguous. Verifying done-ness requires semantic analysis the catalog explicitly warns against (entry #8 generalization principle — keep the check shape stable). |
| **E. CI wiring** | A **dedicated, narrowly-named GitHub-Actions job `backlog-refs-drift`** in `architecture-gates.yml` that runs ONLY the new sentinel via `pnpm vitest run <path>`. NOT folded into a "run all unit tests" change. | Critical finding: `pnpm test` is **NOT** a load-bearing CI gate today. Neither `architecture-gates.yml` nor `e2e.yml` runs vitest. The four existing sentinels run only locally. The brief assumed `pnpm test` was already a gate; it isn't. Making it one is a policy change outside this PR's scope. A narrow dedicated job is the minimum-blast-radius way to make THIS sentinel load-bearing without quietly converting every unit test in the repo into a merge-blocker. |

The five decisions interlock. Changing A (e.g., shipping a mirror without delta-reconciliation) means the sentinel fires immediately because whatsapp_sends's refs don't match the seed's "still open" status. Changing B (keeping `#102`-the-issue authoritative) re-creates the original drift problem. Changing C (allowing bare line numbers) recreates catalog entry #5's exact rot pattern. Changing D (extending to done-ness checks) makes the sentinel un-maintainable because "done" requires per-item semantic rules. Changing E (folding into a generic `pnpm test` gate) couples this PR's success to a policy decision about CI scope that hasn't been made.

---

## A. MIRROR SCOPE + SEED-DELTA RECONCILIATION

### What goes in the file

- **All 11 GENUINELY-OPEN-AND-REAL items** from `docs/audits/2026-05-16-102-revalidation.md § 6` — verbatim re-ranking carried forward.
- **The 2 WONTFIX-STILL-VALID items** (#24 canonical form variant, #27 on-call schedule) — present, clearly marked, with the trigger conditions preserved for future re-evaluation. Out of sentinel scope (no code refs).
- **The 2 RENOUNCED-and-RE-CONFIRMED items** — present in a short "do not bring back" section for searchability.
- **NEW items not in the seed doc** — #142, #143, #144, #145 (the four whatsapp_sends follow-ups filed alongside PR #141). These postdate the re-validation by ~1 day.
- **NOT INCLUDED:** the 16 DONE-BUT-UNTICKED items. Those are owner-action items on the `#102`-the-issue tick state, not work artifacts to track in the open-backlog file. Including them would conflate "what's left to do" with "what needs owner tick" — two different problems. (The handoff doc in `docs/NEXT-SESSION-HANDOFF.md` already tracks the DONE-BUT-UNTICKED set if needed.)

### Seed-delta reconciliation (the deltas applied vs the seed doc)

The seed doc is dated 2026-05-16. Today is 2026-05-17. In one day:

| Delta | Where the seed says | Where main actually is | How the backlog file reconciles |
|---|---|---|---|
| **whatsapp_sends** | `GENUINELY-OPEN-AND-REAL` rank #2 | DONE in #141 (merged this morning) | Item moved to DONE-WITH-REAL-REFS in the backlog file. This is the first dogfood case — the refs are the new wrapper, the migration, the types. |
| **#142** Operator retry UI | not mentioned | filed yesterday as a follow-up of #141 | NEW item; rank ~5 (medium); refs pending until built |
| **#143** Automated retry job | not mentioned | filed yesterday as a follow-up of #141 | NEW item; rank ~9 (low — only matters at operational pain) |
| **#144** Meta delivery webhook | not mentioned | filed yesterday as a follow-up of #141 | NEW item; rank ~7 (medium-low — extends `whatsapp_sends`'s observability) |
| **#145** Application-layer immutability sentinel for whatsapp_sends | not mentioned | filed yesterday as a follow-up of #141 | NEW item; rank ~10 (low — defense-in-depth; current discipline holds) |

The fact that the SEED itself was stale within 24 hours is the exact failure mode the sentinel attacks. The retro names this irony.

### Risk rankings

Carried verbatim from re-validation § 6. Where new items are inserted, the relative ranking is approximate — owner can re-rank if needed; the sentinel does not care about rank ordering (it cares about reference existence).

---

## B. SOURCE OF TRUTH — repo file is authoritative

### Decision

`docs/backlog/production-readiness.md` IS the source of truth for the open-item list. `#102`-the-GitHub-issue becomes a human-facing pointer that links to the repo file.

### Why this is the load-bearing call

If the repo file is merely a *mirror* of `#102`-the-issue, then:

1. Owners (or agents) edit `#102` (faster — it's a click in the GitHub UI).
2. The repo file doesn't reflect that edit until someone re-mirrors.
3. The repo file drifts → the sentinel either fires falsely (claiming an artifact doesn't exist when the item was renounced in `#102`) OR misses real drift (a new item added to `#102` carrying a phantom ref).
4. The original problem reappears under a new name.

If the repo file is *authoritative*, then:

1. Owners (or agents) edit `docs/backlog/production-readiness.md` via PR (gated by the sentinel).
2. `#102` is for discussion / community visibility — its body either points at the repo file or is allowed to drift without consequence.
3. The sentinel always sees the repo file's current state; drift fires CI.

The second model is the only one where the forcing function works.

### Owner action carry-forward

After this PR merges, the owner edits `#102`'s body to:
- Replace the open-item checklist with a single sentence pointing at `docs/backlog/production-readiness.md` on main.
- Keep the issue OPEN as a permanent home for cross-cutting discussion + the historical context (the original 32-item list, the re-validation, the tick state).

That edit is OUT OF SCOPE for this PR (the brief explicitly forbids touching `#102`'s body — `"DO NOT touch ... #102's body"`). It's documented as a carry-forward in the retro.

---

## C. REFERENCE FORMAT — fenced `refs` blocks

### The format

Each backlog item has a section like:

```markdown
## <ID> — <Title>

**Risk:** rank #<N>
**Status:** OPEN | DONE | WONTFIX | RENOUNCED
**Tracker:** #<github-issue-number> (optional)

<One- or two-sentence description.>

```refs
file: <path/from/repo/root>
file: <another/path>
symbol: <path/from/repo/root>::<exported-symbol-name>
table: <table_name>
rpc: <rpc_name>
```
```

**Item without code refs:**

```markdown
## <ID> — <Title>

**Risk:** rank #<N>
**Status:** OPEN
**Tracker:** #<n>

<Description.>

`refs: none — not-sentinel-checked (<reason>)`
```

The `refs: none` line is parsed by the sentinel — its presence is what marks the item as "intentionally not asserted on" (vs. "forgot the refs block," which the sentinel flags).

### Why a custom mini-format (not YAML / TOML / JSON)

- The brief forbids new dependencies. `js-yaml` would be a new dep.
- The format is grep-handleable: a contributor reads `file:` / `symbol:` / `table:` / `rpc:` lines and immediately understands what each means.
- Parser is ~30 lines of regex — small enough to inline in the sentinel.

### Why grep-handle style (NOT bare line numbers)

Catalog entry #5 — *"No hardcoded line numbers in marker comments"* — applies here too. The exact rot pattern the catalog warns about (e.g., `// see line 189` going stale to line 193+) is what `#102`'s original drift was. The backlog file's `refs:` blocks name files, symbols, table names, and RPC names — all stable across refactors. Line numbers are explicitly disallowed in this file's format.

The sentinel's own code mirrors the same discipline: zero hardcoded line numbers in the test file.

### What each `kind` resolves to

| Kind | Format | What the sentinel verifies |
|---|---|---|
| `file` | repo-root-relative path | `existsSync(resolved) && statSync(resolved).isFile()` (catalog #11) |
| `symbol` | `<file>::<symbol-name>` | the file exists AND its contents contain `<symbol-name>` as a substring |
| `table` | bare table name (e.g. `whatsapp_sends`) | some file in `supabase/migrations/` (excluding `_archive/`) contains `create table … <name>` or a `comment on table public.<name>` |
| `rpc` | bare RPC function name (e.g. `record_invoice_payment`) | some file in `packages/` or `supabase/migrations/` contains `<name>(` (function-call or function-definition shape) |

### Generalization (catalog #8)

The reference parser does NOT hardcode the current set of `kind:` values exhaustively in the parsing logic — it parses ANY `<word>: <value>` line within a `refs` block and dispatches via a small `KIND_HANDLERS` map. Adding a new kind in the future = adding one entry to `KIND_HANDLERS`, not rewriting the parser. Catalog #8 — the "regex generalizes beyond current data shape" rule — applied to the parser's own architecture.

---

## D. WHAT THE SENTINEL VERIFIES — EXISTENCE only, with an explicit boundary statement

### In scope

1. **File existence:** every `file:` resolves to `existsSync(resolved) && statSync(resolved).isFile()`.
2. **Symbol existence within a named file:** every `symbol: <file>::<name>` → file exists AND `readFileSync(file).includes(name)`.
3. **Table existence in migration history:** every `table: <name>` → some `.sql` file under `supabase/migrations/` (excluding `_archive/`) contains the table name in a `create table` or `comment on table` clause.
4. **RPC existence somewhere in the codebase:** every `rpc: <name>` → some file under `packages/` or `supabase/` contains `<name>(`.

### EXPLICITLY OUT OF SCOPE — a future maintainer must not silently extend the sentinel to:

- ❌ Verifying that an item marked `Status: DONE` is actually merged.
- ❌ Verifying that an item's risk rank matches some external metric.
- ❌ Parsing prose to extract additional references.
- ❌ Verifying that a symbol is *exported* (only that it appears in the file).
- ❌ Asserting RPC signatures, table column lists, or symbol types.
- ❌ Cross-checking against the GitHub issue body.

The boundary IS the maintainability contract. Extending the sentinel beyond reference-existence requires per-item semantic rules; that path leads to an un-maintainable forcing function (the four existing sentinels all hold this discipline — each does ONE mechanical check).

### Failure-message contract

Every failure names:
1. The backlog item (by `## <ID> — <Title>` heading).
2. The exact ref line that failed (`file:`, `symbol:`, `table:`, or `rpc:` with its value).
3. The fix shape ("add the file; update the ref; or mark the item refs: pending").

Example failure:

```
[backlog-refs-drift]
  item:  ## W2 — Operator retry UI for failed WhatsApp sends
  ref:   file: apps/dashboard/app/api/whatsapp/retry-send/route.ts
  error: file does not exist
  fix:   either create the file, update the ref to point at the actual artifact,
         or mark the item with `refs: pending — <reason>` if the work is not
         yet started.
```

This level of clarity is why the sentinel exists at all — a generic "expected true, got false" would not save the next agent any time.

### Format pre-check (the sentinel-of-the-sentinel)

Before any existence assertion runs, the sentinel:

1. Asserts the file exists at `docs/backlog/production-readiness.md`.
2. Parses the file and asserts **at least one item with a `refs` block was found**. If zero, fail loudly with `"backlog file format invalid — no parseable items found; check the headings + refs fences"`. Without this guard, a parser bug that finds nothing would falsely pass (just like `LINK_PATHS_UNIQUE.length > 0` in `audit-doc-references.test.ts`).
3. Asserts every `refs` block line matches `<kind>: <value>` OR is exactly the `refs: none — ...` marker. A malformed line fails with the line number IN THE BACKLOG FILE (so the contributor can find it).

The line number of the offending line in the BACKLOG FILE is not a hardcoded-line-numbers violation — it's a runtime-computed reference produced by the parser to help the human reading the error. The sentinel's OWN source code has zero hardcoded line numbers.

---

## E. CI WIRING — dedicated narrow gate

### Critical finding (not in the brief's premise)

The brief states: *"the sentinel runs in pnpm test (already a load-bearing gate)."* That is NOT true today.

`grep -rn "pnpm test\|run: pnpm test" .github/workflows/`:
- `architecture-gates.yml`: runs `pnpm audit:governance`, `pnpm audit --prod`, `pnpm --filter @workspace/ui registry:check`, `pnpm --filter dashboard build`, `pnpm measure:bundle`, `supabase db reset`, `node scripts/sentry/lint-alert-rules.mjs`. **No `pnpm test`.**
- `e2e.yml`: runs `pnpm --filter dashboard exec playwright test`. **No vitest.**
- `shadcn-drift-check.yml`: shadcn-specific drift only.

The four existing sentinel tests (`audit-doc-references.test.ts`, `api-routes-no-console.test.ts`, `rbac-block-adoption.test.ts`, `silent-by-design.test.ts`, `audit-logs-no-update-delete.test.ts` — actually five) run only **locally** today, via the pre-commit-checklist `pnpm typecheck && pnpm lint && pnpm test` discipline. The contributor running locally is the only enforcement.

### The decision

Add a **new, narrowly-named, single-purpose job** to `architecture-gates.yml`:

```yaml
backlog-refs-drift:
  name: Backlog references drift check
  runs-on: ubuntu-latest
  timeout-minutes: 3
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
    - uses: actions/setup-node@v4
      with: { node-version: 22, cache: pnpm }
    - run: pnpm install --frozen-lockfile
    - name: Verify every backlog ref still exists on main
      run: pnpm --filter dashboard exec vitest run apps/dashboard/__tests__/backlog-refs-drift.test.ts
```

The job is narrow on purpose:
- Runs ONLY the new sentinel. The failure message in the GitHub PR check list is unambiguous: `"Backlog references drift check ❌"`.
- Does NOT silently promote `pnpm test` (the whole vitest suite) to a load-bearing gate. That's a separate policy decision; this PR does not make it.
- Bounded: ~3 minutes including install. Acceptable cost for a load-bearing gate.

### What this PR explicitly does NOT do

- **Does NOT add `pnpm test` as a CI gate.** That would CI-gate every existing sentinel, every existing unit test, and every future test in the repo. Whether that's the right policy is its own discussion; this PR is about the backlog sentinel specifically.
- **Does NOT modify the existing four sentinels' CI status.** They continue to run locally-only as they do today. A future PR can decide whether to promote them.

This boundary is documented in the retro carry-forward so a future agent can pick up the broader "promote `pnpm test` to a load-bearing gate" decision separately.

---

## Cross-references

- [`#136`](https://github.com/<YOUR_GITHUB_ORG>/<YOUR_GITHUB_REPO>/issues/136) — the issue this PR closes
- [`docs/audits/2026-05-16-102-revalidation.md § 9`](../audits/2026-05-16-102-revalidation.md) — the mechanism-choice decision (option b: repo-mirror + sentinel; option a calendarized ritual rejected as discipline-dependent)
- [`apps/dashboard/__tests__/audit-doc-references.test.ts`](../../apps/dashboard/__tests__/audit-doc-references.test.ts) — direct structural template (PR #121)
- [`docs/patterns/coderabbit-catalog.md`](../patterns/coderabbit-catalog.md) entries #5, #8, #11 — preempted in the sentinel's own code
- [`docs/decisions/2026-05-17-whatsapp-sends-mechanism.md`](2026-05-17-whatsapp-sends-mechanism.md) — the precedent for "decision doc first, code second" on infrastructure PRs
- [`docs/NEXT-SESSION-HANDOFF.md`](../NEXT-SESSION-HANDOFF.md) — to be replaced by this PR; next-lead pointer now references `docs/backlog/production-readiness.md` instead of `#102`
