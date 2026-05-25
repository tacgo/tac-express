# Next-Session Handoff — Start Here

> **The launch authority is [`docs/launch/MASTER-LAUNCH-PLAN.md`](launch/MASTER-LAUNCH-PLAN.md).** Customer-facing detail: [`docs/launch/CUSTOMER-FACING-PLAN.md`](launch/CUSTOMER-FACING-PLAN.md). UI/UX standard: [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md).

**Branch:** `feat/ops-shell-rebuild` — the full WS-4B ops-shell-rebuild arc (Phase 4→10d). Ready for PR review / merge per standard process.
**This handoff covers:** the ops-shell-rebuild arc completion (2026-05-26). Full retro: [`docs/retros/2026-05-26-ops-shell-rebuild-arc-complete.md`](retros/2026-05-26-ops-shell-rebuild-arc-complete.md).
**Author:** Claude Code, design-system lens.

---

## 1. WHERE THINGS STAND

| Workstream | Status |
|---|---|
| **Body 1 — v6→v7 dashboard migration** | ✅ **COMPLETE** — every ops-console route (overview, workhorse, detail, create) renders Violet Grid v7. All v6 Paper view + detail primitives retired. |
| **Body 2 — dashboard-wide token fixes** | ✅ **COMPLETE** — PageHeader t-h1, `--font-heading`, dead-font removal, violet wordmark, and the `.ops-console` scope retirement (violet sidebar chrome promoted to `:root`/`.dark` canonical). |
| **Body 3 — premium polish** | ⏳ **OPTIONAL, NOT STARTED** — the rubric 85→90+ session. Owner-judgment-heavy; post-launch-safe. |
| **Launch readiness (LB-1 / LB-2)** | 🚀 **OWNER-SIDE, OUTSTANDING** — the actual path to launching. Unchanged by the design arc. |

> The design arc never gated launch. The launch-ready critical path is still **LB-2a → Meta approval → LB-2b** (see the launch plan).

---

## 2. NEXT SESSION — candidates in recommended priority order

### (a) Launch-readiness items — LB-1 / LB-2 (OWNER-SIDE) — highest leverage
These pre-date the WS-4B design work and are the path to actually launching. **Not agent-actionable** (owner credentials / external services), but they are the real priority.
- **LB-2a** — submit the Meta WhatsApp template. **External clock (24–48h approval); run this FIRST** — every hour it waits shifts the launch date.
- **LB-2b** — WPBOX env vars + production e2e, after LB-2a approval.
- **LB-1** — SB-2 Sentry alert provisioning (~20 min). Independent; run anytime.
- **LB-4** — RESOLVED (Free-tier launch stance); 30-day review tracked in issue #192.

### (b) Body 3 — premium polish (AGENT session; owner picks the direction)
The rubric **85→90+** session. Requires owner judgment for the display-moment direction. Scope:
- **Display moments** on overview routes — **dashboard** is the strongest candidate (still standard PageHeader, unlike analytics' Phase-7 `t-display`+gradient treatment).
- **State-router pattern** + **micro-interaction sweep** (tac-blink/scanline/hover-lift) where it earns its place.
- **`text-ui-*` residue sweep** (paper-era sizing tokens still used by a few reused components, e.g. `payment-timeline.tsx`).
- **The 4 `OpsPageHead` create-page headers** (`customers`/`manifests`/`rates`/`shipments` `create/page.tsx`) — optional "Phase 11" for full v7 purity. They use `:root` paper aliases so they're cosmetic-only, **block nothing**. Retiring them unlocks deleting the `--paper-*` aliases + `OpsPageHead`/`OpsFrame`.

### (c) Trivial-debt batches (interleave with either above)
- 8 stale `useDesignVersion` docstrings (mechanism deleted in `ea96da5`).
- `finance/create/page.tsx` stale comment (references an OpsPageHead removed in Phase 10a).
- `payment-timeline.tsx` `text-ui-*` residue (also in (b)).
- Orphan baseline shrink via `pnpm audit:orphans:refresh-baseline` (3 grandfathered entries — `ops-list-state`, `tracking-timeline`, `shipment-detail-tabs` — are now wired). **Cosmetic only**; governance is green either way.

---

## 3. Branch state (for PR/merge)

`feat/ops-shell-rebuild` — 40+ commits, full Phase 4→10d arc. **All gates green**: `pnpm test` 588/588 · typecheck clean *except* 2 pre-existing errors (`globe.tsx` three.js deps, `v7-ops-shipments` `"CREATED"` status) that **predate this arc and are unrelated** · `pnpm lint` clean on touched files · `pnpm audit:governance` fully green (LAW 2 passes, wasteland-landing baselined with a 2026-06-24 review guard).

---

## 4. Operating principles (carry forward)

**Production-affecting work** (unchanged):
- **Pipeline-only deploys** — migrations via `migration-deploy.yml` only. No MCP `apply_migration`, no manual prod SQL.
- **Two-signal verification** — pair every action with a state-layer read.
- **`pg_dump` before any destructive prod op** on the Free tier (no PITR).

**Design-system arcs** (new, from this arc — see the retro):
- **Bounded-autonomy with mandatory checkpoints** is the working pattern for multi-phase design migrations on this project.
- **The agent's read of the actual code beats pre-investigation plans** — every phase opened with read-only STEP 0; it caught a stale flag-promotion premise and a mis-scoped create/detail plan.
- **LAW 2 firing on a UI composition is a signal to promote it to `packages/ui`, not to allowlist** — the audit pointing somewhere is usually right about direction.

---

🤖 Handoff written by Claude, 2026-05-26, on ops-shell-rebuild arc completion.
