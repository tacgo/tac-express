# v6 → v7 Migration Intelligence Report

> **Runtime-traced 2026-05-23.** Branch `feat/ops-shell-rebuild` @ `origin/main`.
> Sources: static code analysis, GitHub MCP (archaeology), Supabase MCP (read-only),
> HTTP runtime probe. **Authenticated browser verification: NOT yet performed** — blocked
> on dashboard access (see §6). No production data was mutated.

---

## 0. Verification provenance

| Source | Status | Proved |
|---|---|---|
| Static code analysis | ✅ | Route parity, primitive duplication, shell architecture |
| GitHub MCP (archaeology) | ✅ | Origin of both systems; no migration ever ran |
| Supabase MCP (read-only) | ✅ | Schema + near-empty operational DB |
| HTTP runtime probe | ✅ | Auth gate (307); landing-v2 live on `:3000` |
| **Authenticated browser (designated primary truth source)** | ⛔ blocked | *Not performed* — no connected Chrome, password-login not permitted on user's behalf, `:3001` 307s to `/sign-in` |

This report is runtime-**traced**, not runtime-**visually-verified**. The visual layer is the outstanding gap.

---

## 1. Archaeology — how we got here

- **Both v6 and v7 were born in the initial commit `07b655b`** (1,150 files / 189,444 insertions — a design-bundle import). `design-flag.ts`, every `V7Ops*`, `PageShell`, `DataTable`, and the v6 paper console landed simultaneously.
- **No PR ever migrated v6→v7.** All 13 PRs / 39 commits since were refinements: landing redesigns (#1, #3, #4), shadcn purity + paper-token eradication (#11), paper-palette→Violet-Grid color/font convergence (#12), dead-globe deletion (#13), Sentry, storage buckets.
- **Naming trap:** PRs #11/#12 "Violet Grid" = the *token/color identity* applied to the **v6 paper** console — **not** the v7 component refactor.

**Conclusion:** Not a stalled migration — a **dark-launched parallel system** (`default=v6` from day one), never promoted. Convergence = *promote + validate + fill gaps + retire v6*, closer to greenfield activation than resumption.

---

## 2. Parity map (static-verified)

| State | Routes | On `default=v7` |
|---|---|---|
| **Dual** (flag-gated, v7 ready) | shipments, manifests, inventory, customers, finance, rates | flip → render v7 |
| **v7-native** (no branch) | audit, bookings, management, shift-report, support, whatsapp | already v7 |
| **v6-only** (no v7 variant) | analytics, exceptions, notifications, scanning, settings | stay v6 (safe fallback) |

Fallback proven safe: every dual `*-live.tsx` is `if v7 return V7X; return V6X`. Flipping the default cannot break a gap route.

---

## 3. Data reality (Supabase, read-only) — reshapes verification

```
profiles:  1 (SUPER_ADMIN)
hubs:      8 active  [BLR BOM CCU HYD IMPHAL MAA NEW_DELHI PNQ]
rate_cards: 8
shipments: 0   manifests: 0   invoices: 0   customers: 0   exceptions: 0   tracking_events: 0
```

**Implication:** runtime verification of the 6 dual operational screens exercises **empty states only**. Only **inventory** (hubs) and **rates** (rate cards) have data to render densely; **dashboard KPIs are all zero**. v7's "dense operational" claims cannot be validated against realistic volume until data is seeded — into a **non-production** target.

---

## 4. Runtime probe (HTTP-level, unauthenticated)

- `:3000` (web) → landing **v2 live and correct** (HTTP 200, `.landing-v2`, v2 hero copy). Fix `dab0da5` confirmed serving.
- `:3001/ops-console` → **HTTP 307 → `/sign-in?next=/ops-console`**. Hard server-side gate; no middleware bypass; `SessionGuard` only reacts to `SIGNED_OUT`.

---

## 5. Primitive duplication (migration backlog)

| v6 | v7 replacement | v6 usages | risk |
|---|---|---|---|
| `OpsButton` | `Button` | 16 | high |
| `OpsPageHead` | `PageHeader` | 16 | high |
| `OpsFrame` | *(retire — no v7 equiv)* | 17 | high |
| `OpsCard` | `Card` | 13 | med |
| `OpsTabs` | `Tabs` (Radix) | 7 | med |
| `OpsField` | `Input`/`Label` | 9 | med |
| `OpsEmptyState` | `EmptyState` | 5 | med |
| `OpsTable` | `Table`/`DataTable` | 1+ | low |

`paper-*` class refs: ~542 across 30+ files (defined `globals.css`). One shell (`OpsShell`) — immovable, scopes `.ops-console`; both systems render inside it. Confirmed-dead (zero imports): `OpsKbd`, `OpsAccessFallback`, `OpsDetailFrame`, `OpsErrorState`, `OpsPanelTabs`.

---

## 6. The unblock (so verification can run)

Authenticated browser is the designated primary truth source. To run it within safety rules:

1. **Owner logs into `:3001`** in their Chrome and **connects the Claude browser extension** → I drive the already-authenticated session read-only (navigate, `localStorage['tac-design']='v7'`, screenshot per route). *(Password is never typed by the agent.)*

Dense verification additionally requires a **non-production** data target — a Supabase dev branch or local instance — never the live project.

---

## 7. Risk-assessed plan

1. **P1-a** flip `DEFAULT_VERSION`→v7 — *after* browser-verifying all 6 v7 routes (+ seeded data on a safe target).
2. **P1-b** build v7 for the 5 gap routes.
3. **P2** migrate v6 primitives route-by-route (after flip).
4. **P3** delete 5 dead components; drain `paper-*`.

Do **not** mass-migrate primitives first; the cheapest high-leverage move is the verified flip.

---

## Banked work (this effort)

- Landing-v2 regression fix — `dab0da5` (branch `feat/landing-v2`).
- Shell-tier width contract — `c913a04` (branch `feat/ops-shell-rebuild`).
