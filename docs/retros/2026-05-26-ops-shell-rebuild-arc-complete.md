# Retro — ops-shell-rebuild arc complete (Phase 4 → 10d)

**Date:** 2026-05-26 · **Branch:** `feat/ops-shell-rebuild` · **Author:** Claude Code (design-system lens)

The dashboard now renders one design voice — Violet Grid v7 — across every ops-console route, by code, not by default. No fallback paths, no dual-render branching, no scope-conditional chrome. This retro covers the full arc and the process lessons worth inheriting.

---

## 1. Diagnosis & framing

A design audit found the dashboard was a **dark-launched parallel system**: v6 "Paper Ops Console" and v7 "Violet Grid" components both shipped in the initial commit, gated by a design flag that defaulted to v6 and was never promoted. The audit scored the worst route (analytics) at 51/100 — "metrics dump," flat depth, no state choreography, identity mismatch.

The work was framed as three bodies:
- **Body 1** — migrate every route v6→v7 (structural).
- **Body 2** — dashboard-wide token fixes deferred during Body 1 (mechanical).
- **Body 3** — premium polish, rubric 85→90+ (judgment-rich; *not yet done*).

Crucially, Body 1 was **not** a stalled migration to resume — it was closer to greenfield activation: promote v7, fill gaps, retire v6.

---

## 2. Phase-by-phase progression

| Phase | Scope | Shape |
|---|---|---|
| **4–5** (prior) | Rate Cards, Customers, shipments/manifests/inventory/finance views; **design-flag system removed** (`ea96da5`) | retire v6, one render path |
| **6** | exceptions / notifications / settings / support → v7 | converge + retire |
| **7** | analytics (overview-class) | rubric 48→88; display moment, asymmetric KPI constellation, state choreography |
| **8** | scanning (workhorse-class) | rubric 58→85; AWB-input hero, live telemetry, no display moment |
| **9** | whatsapp-failed-sends (workhorse) | rubric 60→81; reused FailedSendsTable; caught a backlog-drift test |
| **10a** | finance/create + rates/create (form-class) | header swap + V7RateCardForm mirroring V7CustomerForm |
| **10b** | finance/[id] + manifests/[id] (medium detail) | in-place re-tokenize; OpsDetailFrame→DetailShell |
| **10c** | shipments/[id] (deep detail) + **6 v6 primitive retirements** | wired 3 pre-built v7 components; deleted OpsDetailFrame/Timeline/ShipmentStepper/PanelTabs/EmptyState/Skeleton |
| **10d** | promote violet sidebar chrome to `:root`/`.dark`; retire `.ops-console` scope | Body 2 close-out |

Between phases: **mandatory owner checkpoints** (6 of them, two pre-flight). The arc also baselined `wasteland-landing` with a 30-day review guard, ending a recurring "governance not actually green" footnote.

---

## 3. The four bounded-autonomy catches

These are the case studies for why **a verification harness preserves architectural quality** under autonomy. Each was caught by the agent's own read of the code, not by a reviewer after the fact.

### Catch 1 — 10b finance/[id] re-scope (bailout #2)
STEP 0 had inventoried finance/[id] as "OpsDetailFrame + a few primitives." The actual file was 711 lines of bespoke charge-breakdown presentation with **no reusable v7 detail component** (unlike Phase 9's reusable table). The agent stopped before writing ~1000 lines, surfaced the true shape, and got an explicit architecture decision (in-place re-tokenize, Approach A) rather than guessing.

### Catch 2 — 10c LAW 2 DetailShell location
The shared `DetailShell` was first placed in `apps/dashboard/components/` (owner-approved). Governance **LAW 2** flagged it: that directory is for provider/guard glue, not reusable UI. The honest move was *not* to allowlist it (it didn't qualify — it's real reusable UI), but to recognize the audit was pointing to the correct home. Owner authorized the promotion to `packages/ui`. **LAW 2 firing was a signal, not a nuisance.**

### Catch 3 — 10d pre-flight: the scope was *not* dead code
Body 2 and two checkpoints had framed `.ops-console` retirement as "remove dead scope" blocked by `OpsPageHead`/`OpsFrame` consumers. The pre-flight read proved both framings wrong: `--paper-*` vars are `:root`-level (so paper content primitives don't depend on the scope — the "blockers" didn't block), **and** the scope was doing real visual work (rebinding `--sidebar-*` to violet). "Retire dead code" became "promote violet sidebar chrome to canonical, then delete the now-redundant scope." The pre-flight converted a mechanical cleanup into a correctly-scoped design change.

### Catch 4 — 10d execution: dark-mode handling
The execution plan said "update `:root`." But the `.ops-console` rule applied in **both** light and dark (it wasn't `.dark`-nested), and the dashboard is **dark-first**. Updating only `:root` would have left dark mode regressing to grey accents. The agent extended the promotion to remove the 5 `.dark` `--sidebar-*` overrides (so dark inherits the theme-aware `:root` violet values), preserving parity in both modes — and documented the extension transparently. **Following intent over a literally-incomplete instruction.**

---

## 4. Lessons inherited going forward

1. **Bounded-autonomy with mandatory checkpoints is the working pattern** for design-system arcs on this project. The agent executes a phase end-to-end, then stops at a named checkpoint and waits. Pre-flight checkpoints (before deep/risky phases) earned their keep twice (10c component verification, 10d scope analysis).
2. **The agent's read of the actual code beats pre-investigation plans.** Every phase opened with a read-only STEP 0. It caught a stale flag-promotion premise (the flag was already gone), a mis-scoped create/detail plan (3 of the "to-migrate" routes were already v7), and the scope-is-not-dead-code finding. *Pre-investigation plans are hypotheses; the codebase is authoritative.*
3. **LAW 2 firing on a UI composition is a signal to promote to `packages/ui`, not to allowlist.** The allowlist is for genuine app-glue (providers/guards/router-coupled). A reusable layout primitive belongs in the design package; the audit pointing there is usually right about direction even when wrong about mechanism.
4. **Re-frame, don't rewrite — and name the substitution.** The >50% line-churn guard on shipments/[id] (66%) was a false positive *because* the churn was loud, named component-substitution (three pre-built v7 slot components replacing inline blocks), not quiet logic rewriting. The guard's purpose (catch quiet rewrites) was served by transparency.
5. **Visual claims need visual verification.** The agent could not verify the sidebar (auth-gated, no browser), so it refused to execute the scope retirement "blind" and handed the owner a precise before/after to check. The owner verified violet in both modes — promotion confirmed.

---

## 5. State at close

- **Body 1 + Body 2: COMPLETE.** Every ops-console route on Violet Grid v7; sidebar violet chrome canonical (owner-verified, light + dark).
- **Body 3: optional, not started** — the next *design* session, owner picks the display-moment direction.
- **Launch (LB-1/LB-2): owner-side, outstanding** — never gated by this arc; LB-2a (Meta template) is the external-clock long-pole.
- **Branch:** ready for PR/merge. Gates green; 2 pre-existing typecheck errors (globe.tsx, v7-ops-shipments) predate the arc and are unrelated.
