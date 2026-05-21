# Audit-Driven Fixes — Plan & Sequencing

**Date:** 2026-05-14
**Author:** Head of Engineering (PM)
**Source audit:** see chat transcript 2026-05-14 (post-NextAdmin retro)
**Restore point:** git tag `pre-audit-fixes-v1` @ `f0f26fe` (pushed to origin)
**Rollback:** `git checkout pre-audit-fixes-v1` — single command, no destructive state.

---

## 1. Why this work, why now

The NextAdmin retro flagged wizard-verification debt as the next-session blocker. The audit revealed a more dangerous debt sitting *behind* the visible feature work:

1. A migration with a **broken trigger** that will fail every shipment insert.
2. **Stale generated DB types** (10 days behind schema).
3. The **auth / database / types** packages — the security perimeter — have **zero tests**.
4. Six `SECURITY DEFINER` RPCs **bypass RLS without their own auth gate**.
5. **14 MB** of unoptimised public images and an **885 KB** first-route chunk.

Phase 4b–4d wizards depend on a healthy data-layer / security perimeter. Build the rails first, then put the train on them.

---

## 2. Sequencing — one PR per concern

Slicing rule (per `AGENTS.md` § 7a): one feature per PR, ≤ 1,500 LoC additions, opened before merge, run all five quality gates locally. Each PR below names its own restore strategy.

### PHASE A — P0 (must land before any new feature work)

| # | Concern | Branch | LoC est. | Verification |
|---|---|---|---|---|
| A1 | Fix `tracking_events` trigger migration (corrective additive migration) | `fix/tracking-events-trigger-schema` | < 100 | `supabase db reset` applies clean; insert into shipments succeeds + emits one `tracking_events` row |
| A2 | Regenerate `database.types.ts` + add staleness audit script | `chore/regen-db-types-and-staleness-audit` | < 200 | `pnpm audit:db-types-fresh` exits 0 |
| A3 | Optimise `/public/` images (14 MB → ~1 MB) | `perf/public-image-optimisation` | < 50 + binary | LCP image < 200 KB, no visual regression on hero |

### PHASE B — P1 (this sprint, in this order)

| # | Concern | Branch | LoC est. | Verification |
|---|---|---|---|---|
| B1 | Add explicit role gates to 6 `SECURITY DEFINER` RPCs | `security/rpc-explicit-role-gates` | < 150 | New SQL test: caller without role → `raise exception` |
| B2 | Boundary integration tests for `packages/auth`, `packages/database`, `packages/types` | `test/perimeter-package-coverage` | < 600 | New tests pass; coverage ratios go from 0% → ≥ 1 boundary test per package |
| B3 | Dynamic-import wizards + Recharts + react-pdf | `perf/dynamic-import-heavy-libs` | < 200 | `pnpm measure:bundle` reports first-route chunk < 700 KB |
| B4 | Rate-limit edge functions (`dispatch-webhook`, `send-notification`, `scheduled-sla-monitor`) | `security/edge-function-rate-limiting` | < 200 | Edge function returns 429 after N reqs/min in test |
| B5 | CI gate: `supabase db reset` on fresh stack must succeed | `ci/migration-fresh-apply-gate` | < 100 | CI fails if any migration won't apply against an empty DB |

### PHASE C — P2 (next 2 sprints, deferred)

Tracked in audit summary. Will be turned into individual issues after Phase B closes:

- C1: `lookup_rate` RPC auth gate
- C2: `INVOICE_PDF_SIGNING_SECRET` length-validation at boot
- C3: Re-baseline `manifests-list` and `ops-analytics` VRT
- C4: Branch-prune at merge time (git hook)
- C5: One real-stack integration test per critical service
- C6: Fail CI on bundle-size regression ≥ 5%
- C7: Update / archive `REFACTOR-PHASE-1-SPEC.md`
- C8: Strip request body from WhatsApp error logs
- C9: Migrate detail pages to RSC where possible

---

## 3. Per-PR contract (non-negotiable)

Every PR in Phase A and B must:

1. Pass all five quality gates locally before push: `pnpm typecheck && pnpm lint --max-warnings 0 && pnpm test && pnpm build && pnpm audit:all`
2. Have ≤ 1,500 LoC additions (measured via `git diff --stat <base>..HEAD | tail -1`)
3. Be opened as a PR (no direct push to `main`)
4. Include a one-line rollback recipe in the PR body
5. Touch a single concern — not bundle multiple Phase items

Failure of any rule = split the PR.

---

## 4. Restore strategy (5-layer, mirrors `ROLLBACK-PLAYBOOK.md`)

| Layer | Action | When |
|---|---|---|
| 1 — Doomsday | `git checkout pre-audit-fixes-v1` | Any catastrophic regression. Wipes the entire fix series. |
| 2 — Per-PR | `gh pr revert <PR#>` | Single PR caused the problem. |
| 3 — Per-migration | New corrective migration with `drop function` / `drop trigger` | DB-only regression. |
| 4 — Per-asset | Restore single image from git history | Asset broken or wrong. |
| 5 — Per-config | Revert single CI/script change | CI gate too strict / wrong. |

---

## 5. Acceptance criteria for Phase A complete

- [ ] All three Phase A PRs merged.
- [ ] `supabase db reset` applies all migrations clean against an empty DB.
- [ ] `database.types.ts` includes `invoice_payments`, `notes`, `record_invoice_payment`.
- [ ] `/public/` total ≤ 2 MB.
- [ ] No new lint / type / test / audit failure introduced.
- [ ] `pre-audit-fixes-v1` tag still exists and still rolls back cleanly.

## 6. Acceptance criteria for Phase B complete

- [ ] All five Phase B PRs merged.
- [ ] Each of the 6 SECURITY DEFINER RPCs raises `exception` for unauthorized callers.
- [ ] `packages/auth`, `packages/database`, `packages/types` each have ≥ 1 boundary integration test.
- [ ] `pnpm measure:bundle` reports first-route chunk < 700 KB.
- [ ] Edge functions return 429 under burst load (verified by test or local cURL loop).
- [ ] CI's "migrations apply clean" gate is green on `main`.

---

## 7. What is **not** in this plan

- NextAdmin Phase 4b/4c/4d wizards — start after Phase B.
- Phase 6 hybrid search — paused per retro; needs explicit user authorisation for `pgvector` + embedding provider.
- v7 promotion criteria — separate strategic decision; see audit § 7.2.

---

**Sign-off rule:** Phase A blocks all other work. Phase B blocks any new write-path feature. Phase C is fair-game in parallel with new features.
