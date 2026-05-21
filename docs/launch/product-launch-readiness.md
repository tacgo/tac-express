# TAC Express — Product-Launch Readiness (customer-facing surface)

> **Read [`MASTER-LAUNCH-PLAN.md`](MASTER-LAUNCH-PLAN.md) FIRST.** That file is the reconciled rollup across all workstreams. This file remains authoritative for the PRODUCT-LAUNCH-BLOCKER (PL-N) nomenclature, OWNER DECISIONS (OD-P-N), and per-item testable-done criteria for the customer-facing surface. Master plan supersedes the *scope*; this file supersedes the *detail*.
>
> **Authoritative for product-launch scope of the customer-facing surface.** Sibling to [`docs/launch/definition-of-done.md`](definition-of-done.md), which is authoritative for the **engineering** ship-blocker list. The two are DISTINCT bars. Both must pass for a credible production launch.

**Version:** 1.0 — initial scoping, 2026-05-17.
**Authority chain:** AGENTS.md § 0 → this file (customer-facing surface) → `definition-of-done.md` (engineering).
**Not modified by this scoping session:** `definition-of-done.md` engineering DoD; SB-2 closeout; OD-1 / OD-2; SB-3 prerequisites.
**Section scheme:** `0` = preamble; `A`–`E` = PHASE-0 methodology (mirrors the scoping-brief's PHASE-0 (A)–(E)); `F`–`I` = closing sections. Single consistent letter-based scheme below the preamble.

---

## 0. Why this file exists — two distinct readiness bars

`definition-of-done.md` measured ENGINEERING readiness: audit trail, restore playbook, payment E2E, error alerting. That bar is essentially met (3 of 4 SBs done; SB-2 is a ~20-min owner task).

**Engineering-ready ≠ Product-ready.** A project can have green CI, alerts armed, and a documented restore playbook AND still have a customer-facing surface that is not credible to a real visitor. Engineering readiness is about *running* the product; product readiness is about *meeting* the customer. They are independent dimensions; both must pass.

This document does for the customer-facing surface what PR #155 did for the engineering backlog: it scopes the work into a FINITE, ordered, triaged checklist BEFORE any building. **No UI is built here.** Construction happens in later PRs, each against this list.

---

## A. Surface inventory (audit performed 2026-05-17 against main `f53cab4f`)

### A.1 `apps/web` — the public marketing host (port 3000)

| Route | File | State today |
|---|---|---|
| `/` (landing) | [`apps/web/app/(public)/page.tsx`](../../apps/web/app/(public)/page.tsx) → `WastelandLanding` (481 LoC) | Exists; substantial implementation; uses Violet Grid tokens (`tac-mono-label`, `text-primary`) AND motion/react entrances; **no `metadata` export** (no SEO title/description/OG/Twitter cards on the most important route) |
| `/about` | exists | Has Metadata, uses Violet Grid tokens, real copy |
| `/careers` | exists | Has Metadata (assumed; sample of 6 of 7 marketing routes all had Metadata) |
| `/case-studies` | exists | same |
| `/contact` + `/contact/contact-form.tsx` | exists | Has Metadata |
| `/developers` | exists | same |
| `/legal/cookies`, `/legal/privacy`, `/legal/terms` | exist | Has Metadata (privacy verified) |
| `/pricing` | exists | Has Metadata |
| `/quote` + `/quote/rate-calculator.tsx` | exists | Has Metadata |
| `/services` + `/services/[slug]` | exist | Has Metadata |
| `/status` | exists | (not sampled) |
| `/track/[awb]` | exists | Has 3 Playwright specs (a11y / smoke / visual) — the ONLY public route with automated visual+a11y coverage |
| `/not-found.tsx` | exists | (not sampled for brand consistency) |
| `/sign-in/[[...sign-in]]` | exists | Operator-facing sign-in (heading: "Operator sign in"); uses `SignInSplitLayout` + `SignInPageClient` from packages/ui; redirects to `/dashboard` on success; **no `metadata` export** |
| `/dashboard` | redirect to `NEXT_PUBLIC_DASHBOARD_URL` (port 3001) | Bridge to the operator console |
| `(public)/layout.tsx` | uses `PublicNav` + `Footer` from packages/ui | Shared chrome — both well-developed |

Root `apps/web/app/layout.tsx` is locked to `className="dark"` (no theme toggling) and declares the canonical Plus Jakarta Sans + IBM Plex Mono + Lora fonts. No `metadata` export at the root layout.

### A.2 `apps/dashboard` — the operator console host (port 3001)

| Route | File | State today |
|---|---|---|
| `/(public)/sign-in/[[...sign-in]]` | exists | Operator sign-in (heading: "Mission control access"); same `SignInSplitLayout` + `SignInPageClient`; redirects to `/home` on success; **has** `metadata` export with `robots: { index: false, follow: false }` |
| `/(public)/sign-up/[[...sign-up]]` | exists | Stub: `redirect("/sign-in")` — sign-up is intentionally DISABLED |

### A.3 Shared auth components (`packages/ui/src/components/composed/auth/`)

| Component | Lines | Purpose |
|---|---|---|
| `sign-in-form.tsx` | (small) | `react-hook-form` + `zod` form; email + password fields; submit button |
| `sign-in-page-client.tsx` | 37 | Wraps `SignInForm`; calls `createBrowserClient().auth.signInWithPassword({ email, password })` — Supabase email+password auth ONLY (no OAuth, no magic link, no password-reset link visible) |
| `sign-in-split-layout.tsx` | 135 | Layout chrome with eyebrow, heading, description, image caption, and a `topRightSlot` |
| `login.lottie.json` | (asset) | Lottie animation file |

### A.4 Auth mechanism (verified)

**Email + password only via Supabase.** No third-party OAuth (Google / GitHub / etc.); no magic link; no password-reset flow surfaced. New operators are added by Supabase admins (the `sign-up` route redirects to `sign-in`).

---

## B. Gap analysis

Per page/surface, the gap between today and a credible customer-launch bar:

### B.1 Landing page (`/`)

| Gap | Severity | Type |
|---|---|---|
| No `metadata` export — no title / description / Open Graph / Twitter Card | **HIGH** | SEO + social-sharing |
| Component name `WastelandLanding` uses legacy design-system label (per AGENTS.md § 9, current is "TAC Express v5.0 Violet Grid") — IMPLEMENTATION uses current tokens; only the NAME is stale | LOW | hygiene |
| Desktop-first treatment: `hidden md:block` chunks in the HUD overlay imply some HUD elements only render on `md+` viewports | MEDIUM | UX (mobile) |
| Zero automated visual / a11y coverage (only `/track` has Playwright specs in `e2e/`) | MEDIUM | testing |
| Brand/visual-design subjective verdict against a customer-launch bar — agent cannot assess | OWNER DECISION | design |

### B.2 Marketing pages (`/about`, `/pricing`, `/contact`, `/quote`, `/services`, `/services/[slug]`, `/legal/*`, `/careers`, `/case-studies`, `/developers`, `/status`)

| Gap | Severity | Type |
|---|---|---|
| All sampled (6 of 7) have `metadata` exports + use Violet Grid tokens + real copy | — | already-OK on the dimensions checked |
| Zero automated visual / a11y coverage | LOW | testing — most likely POST-LAUNCH; manual smoke is sufficient at launch volume |
| Mobile-responsive treatment per page unverified at scale | LOW | UX |
| Copy quality / brand voice consistency — subjective | OWNER DECISION | content |

### B.3 Auth surface (operator sign-in on both hosts; sign-up disabled)

| Gap | Severity | Type |
|---|---|---|
| `apps/web/sign-in` has no `metadata` export (the operator sign-in on the marketing host) | LOW | SEO/title |
| Auth flow correctness — `signInWithPassword` round-trips through Supabase; no automated E2E covers this end-to-end | MEDIUM | auth-correctness |
| No password-reset flow surfaced — if an operator forgets their password, the recovery path is admin-side via Supabase | OWNER DECISION (acceptable at launch?) | auth-completeness |
| No OAuth / magic link options | OWNER DECISION | auth-completeness |
| No customer sign-up flow exists — TAC Express today is operator-only; customer journey is "landing → contact / quote / track" | OWNER DECISION | product model |
| **Stale Clerk-shaped routing** — `[[...sign-in]]` / `[[...sign-up]]` optional-catch-all folders are Clerk's canonical mounting convention but no Clerk dep exists (verified 2026-05-18 — see § J). The catch-all has no functional effect with Supabase password auth (a single `page.tsx` would behave identically) but actively misleads future readers ("is Clerk involved here?"). | LOW | hygiene / readability |

### B.4 Customer journey (the gating question)

The current customer journey on the public site is: **landing → (about / pricing / services / quote / contact) → human follow-up (sales / quote / contact form) → operator-side onboarding by an admin.** There is no self-serve "customer sign-up → customer dashboard" flow. Whether THAT is the intended launch model is an owner decision (OD-P1 below). The answer governs everything else about the auth surface and the landing's primary CTA.

---

## C. Triage — PRODUCT-LAUNCH-BLOCKER / POST-LAUNCH-POLISH / WONTFIX-WATCH

The hard test: **can a real customer credibly land on the site, understand the product, and complete the intended journey** (today: reach a contact / quote form to start a sales conversation)?

### C.1 PRODUCT-LAUNCH-BLOCKERS — the finite list (4 items)

| ID | Item | Why it gates launch | Testable DONE |
|---|---|---|---|
| **PL-1** | **Landing page `metadata` export** (title, description, Open Graph image + tags, Twitter Card) | The landing is the most-shared, most-search-indexed URL. Without metadata, every social share and search result is "Home" with no preview — actively undermines credibility | `metadata` export present at `apps/web/app/(public)/page.tsx` covering title / description / `openGraph` / `twitter` fields; a Playwright assertion (or static check) confirms each is non-empty |
| **PL-2** | **Customer-journey decision + landing CTA finalized (OWNER DECISION OD-P1 first)** | The landing's primary CTA today must EITHER point at the contact/quote sales path (sales-led B2B) OR at a customer-sign-up flow (self-serve). Today's surface has only operator sign-in. The CTA must match the chosen journey, or the visitor click goes nowhere coherent | OD-P1 answered; landing's primary CTA points at the appropriate path AND that path completes (sales-led: visitor reaches a working contact form; self-serve: customer-sign-up flow exists and accepts a real signup — that would itself be a NEW workstream beyond this scope) |
| **PL-2a** | **Primary sales CTA added to the landing** (OD-P1 = sales-led B2B) | Without a primary sales CTA, the journey to a sales conversation depended on the top-nav only — failing the hard test | DONE — PR #166 added the `NOT TRACKING A SHIPMENT?` row with GET A QUOTE → `/quote` and CONTACT SALES → `/contact` buttons in the hero |
| **PL-2b** | **`/contact` form actually captures + notifies — no fake success** (OD-P8 = WhatsApp) | The form was stubbed (`contact-form.tsx:31` had `setSubmitted(true)` + TODO; no `/api/contact` route existed). For sales-led B2B the customer-journey terminator MUST durably capture and notify the team or shipping is deceptive UX | `contact_leads` table + `/api/contact` route + `createContactLeadService` (DB-first, WhatsApp-notify second; a failed notification does NOT lose the lead). WhatsApp template `lead_notification` pending Meta approval; the LEAD IS CAPTURED regardless. See § J.6. |
| **PL-3** | **Mobile responsiveness on the critical customer paths** (landing, contact, quote, track) | A modern customer who lands on a broken mobile page closes the tab. Today's landing has desktop-only HUD elements (`hidden md:block`); the rest of the breakpoints are unverified | Each of the 4 critical paths renders correctly at 375×667 (small mobile) and 390×844 (mid mobile) without horizontal scroll, broken layout, or unclickable CTAs. Verifiable via a Playwright mobile-viewport project (cheap to add to existing config) |
| **PL-4** | **Visual + a11y baseline coverage for landing + the 4 critical paths** | The existing `e2e/` directory has visual+a11y specs only for `/track/[awb]`. Extending the same pattern to landing + contact + quote (and any other critical customer path per OD-P5) is the mechanical guarantee against silent regressions at launch | New specs in `e2e/` matching the `public-tracking.{a11y,smoke,visual}.spec.ts` shape for landing + contact + quote; CI gate green |

**Estimate:** PL-1 ≈ 1 hour. PL-3 + PL-4 ≈ 1-2 sessions combined (overlap heavily — the e2e harness covers both). PL-2 is the OWNER-decision unblock; agent-side work after that depends on the answer.

### C.2 POST-LAUNCH-POLISH — real, NOT gating

- Rename `WastelandLanding` → `LandingPage` (cosmetic; current tokens already on the current design system)
- Visual + a11y e2e coverage for the other 11 public routes (about, pricing, services, services/[slug], legal × 3, careers, case-studies, developers, status)
- `apps/web/sign-in` metadata export (parallel to `apps/dashboard` sign-in which already has it)
- Password-reset flow (if OD-P4 says it's needed at launch, this becomes PL-5 — currently parked POST-LAUNCH)
- OAuth / magic link sign-in (if OD-P4 says it's needed)
- Polish loading + error states on each marketing page (4 states discipline applied broadly)
- `not-found.tsx` brand consistency audit
- Performance / Lighthouse audit on landing (`#33` in the existing OUT-OF-SCOPE backlog)
- i18n infrastructure (`#35` — explicitly out-of-scope per re-validation)
- Mobile-responsive treatment for the other 11 marketing routes (extends PL-3)
- **Rename the Clerk-shaped catch-all folders** to plain `app/sign-in/page.tsx` (and remove the `sign-up` stub if OD-P1 resolves sales-led — no customer sign-up exists). Pure routing-shape cleanup. See § J.
- **Fix 3 stale "TAC Orbital" comment headers** in `packages/ui/src/components/composed/auth/sign-in-split-layout.tsx`, `…/maps/maplibre-map.tsx`, `…/shipments/shipping-label.tsx` — they refer to the *design system* and should read "TAC Express v5.0 Violet Grid". (The `orbital.service.ts` / `orbital.types.ts` / `charts/` references are the legitimate **telemetry subsystem** name — KEEP.) See § J.

### C.3 WONTFIX-WATCH

- A self-serve customer sign-up flow IF OD-P1 resolves as "sales-led B2B" — building it would be answer-the-wrong-question work. Re-evaluates if the business model shifts to self-serve.

---

## D. OWNER DECISIONS REQUIRED (the gating questions)

The agent cannot answer any of these. They must come from the owner before the PL-2 / PL-3 / PL-4 work is built (PL-1 can ship without any of them, as the landing's CTA target doesn't constrain its metadata).

| # | Question | Lean (not a decision; surfaces the path of least resistance) | Gates |
|---|---|---|---|
| **OD-P1** | **Customer-journey model** — sales-led B2B (landing → contact/quote → human onboarding by admin) OR self-serve (landing → customer sign-up → customer dashboard)? | The current surface state IS sales-led B2B (no customer sign-up exists; operator-only auth). Switching to self-serve is a NEW workstream beyond product-launch scope | PL-2 + every auth-surface decision |
| **OD-P2** | **Brand reference / mockup** — does a Figma / design reference exist that the landing + marketing pages must hit? Or is the current Violet Grid implementation considered the brand? | Current implementation appears to use Violet Grid tokens correctly; if no external mockup exists, the bar IS the current visual — PL-3 + PL-4 then focus on responsiveness + a11y, not redesign | PL-3, PL-4 |
| **OD-P3** | **Target audience** — North-East India focus per the about page (tea growers, handicraft cooperatives, defense contractors, e-commerce sellers)? Confirms copy register, language (English only or multilingual?), tone | If confirmed English-only, no i18n work; if regional languages are required, that becomes a NEW workstream | All copy/UX |
| **OD-P4** | **Auth methods at launch** — email+password only (current), OR add OAuth (which provider — Google? GitHub?), OR magic link, OR password-reset flow? | Current = email+password only; password reset is admin-side via Supabase | Auth surface scope |
| **OD-P5** | **Public marketing scope at launch** — all 15 pages live, or carve a smaller MVP set (e.g., landing + about + pricing + contact + quote + track + legal × 3 = 9 pages)? | Carving lets the launch ship a tighter, more-tested surface | PL-3, PL-4 scope |
| **OD-P6** | **Mobile breakpoint priorities** — which device class is launch-critical (small phone 375w, mid phone 390w, tablet 768w)? | 375w + 768w is the typical credible coverage | PL-3 spec range |
| **OD-P7** | **SEO/discoverability goal at launch** — is the landing meant to organically rank, or be linked from outreach, or both? | "Both" is most common; informs the depth of PL-1's metadata work (basic Title + OG vs Title + OG + Twitter + JSON-LD + sitemap) | PL-1 depth |

---

## E. Sequence (recommended build order; assumes owner answers OD-P1 + OD-P2 + OD-P5 before PL-2/3/4 start)

| Order | Item | Risk | Touches auth-correctness? | Pre-reqs |
|---|---|---|---|---|
| 1 | **PL-1** — landing `metadata` export | LOW | NO (pure UI/metadata) | None |
| 2 | **PL-3** — mobile responsiveness on critical paths | MEDIUM | NO (pure UI) | OD-P2 (brand reference), OD-P5 (which paths), OD-P6 (breakpoints) |
| 3 | **PL-4** — visual+a11y e2e for landing + critical paths | MEDIUM | NO (pure UI; extends existing harness) | OD-P5; benefits from PL-3 having already settled the breakpoints |
| 4 | **PL-2** — customer-journey resolution (the CTA + the journey-completion check) | **HIGH** if OD-P1 resolves as self-serve (would mean building a new customer-sign-up auth flow — its own ship-blocker scope); LOW if sales-led B2B (CTA points at existing contact/quote, verify the journey completes) | YES if self-serve | OD-P1 (load-bearing) |

**Risk distinction:** PL-1 / PL-3 / PL-4 are pure-UI work — no auth-correctness exposure. PL-2 is the one that MAY touch auth (only if OD-P1 resolves as self-serve). If PL-2 expands into a customer-sign-up flow, that flow needs its OWN PHASE-0 scoping (auth + RLS + customer-side data model + new packages/services surface) — not part of this scope.

---

## F. Current standing

| PRODUCT-LAUNCH-BLOCKER | Status | Owner-decision dependency |
|---|---|---|
| PL-1 — Landing metadata | OPEN | — |
| PL-2 — Customer-journey + CTA | OPEN | OD-P1 (gating) |
| PL-3 — Mobile responsiveness on critical paths | OPEN | OD-P2 + OD-P5 + OD-P6 |
| PL-4 — Visual+a11y e2e for landing + critical paths | OPEN | OD-P5 |

**Open PRODUCT-LAUNCH-BLOCKERS:** 4 of 4.
**Realistic burn-down:** 2-3 agent sessions IF the owner answers OD-P1 + OD-P2 + OD-P5 + OD-P6 promptly. If OD-P1 resolves as self-serve and a customer-sign-up flow is built, that's a separate, larger workstream (likely 2-3 additional sessions).

---

## G. Bailout-clause findings (PHASE-0 honest read)

The audit did NOT reveal a fundamentally broken auth flow or a missing page. The customer-facing surface is materially built — 15 marketing pages, working operator sign-in via Supabase, comprehensive footer/nav, shared layout, Violet Grid tokens. The product-launch bar is real but not catastrophic — bailout does NOT fire.

The single most surprising finding: the **landing page has no `metadata` export**, which means social-shared and search-indexed previews are empty/default. The PR closing PL-1 fixes this.

---

## H. Relationship to the engineering DoD

- **Engineering DoD ([`definition-of-done.md`](definition-of-done.md))** — concerns *running* the product safely. Status: 3 of 4 done; SB-2 (Sentry alerting) is the last engineering gate, an owner-runnable ~20-min task.
- **This file** — concerns *meeting* the customer. Status: 4 PRODUCT-LAUNCH-BLOCKERS identified; PL-2 is the load-bearing owner-decision dependency.
- **Both bars must pass for a credible launch.** They are independent — engineering can be 4/4 done with this file 0/4 done, or vice versa. The launch verdict is `engineering_ready AND product_ready`.

---

## I. Maintenance

This file follows the same maintenance pattern as `definition-of-done.md`:

- A PRODUCT-LAUNCH-BLOCKER goes DONE → strike its row in § C.1 + update § F's current standing.
- The owner promotes a POST-LAUNCH-POLISH item to PRODUCT-LAUNCH-BLOCKER → add as new PL-N with justification matching the hard test.
- Launch happens (both bars passed) → both DoD files move to `docs/_archive/` with the final footer.

The list IS finite. The product launch IS reachable.

---

## J. Post-#162 follow-up audit (2026-05-18) — closing five open threads

The audit-debrief session that produced this file (PR #162) left five open threads. The 2026-05-18 follow-up resolves them. Each row below is the verdict + the evidence trail, copy-paste-stable.

### J.1 Auth provider — verdict: **Supabase email+password only; Clerk-shaped routing is dead scaffolding**

The #162 audit noticed `apps/web/app/sign-in/[[...sign-in]]/page.tsx` and `apps/dashboard/app/(public)/sign-in/[[...sign-in]]/page.tsx` use Clerk's canonical optional-catch-all routing convention, and reframed the thread as "operator-facing only" without resolving the source question. This session resolves it.

| Check | Result |
|---|---|
| `apps/web/package.json` dependencies | No `@clerk/*` package; auth surface uses `@workspace/database` + `@workspace/services` |
| Repo-wide `grep -ri clerk` | Zero hits in tracked source (`git ls-files \| grep -i clerk` = empty) |
| Sign-in form implementation (`packages/ui/src/components/composed/auth/sign-in-page-client.tsx`) | Calls `createBrowserClient().auth.signInWithPassword({ email, password })` — pure Supabase |
| Sign-up route (`apps/dashboard/app/(public)/sign-up/[[...sign-up]]/page.tsx`) | `redirect("/sign-in")` — sign-up intentionally disabled, operator accounts admin-side |

**Classification:** (b) Supabase with dead Clerk-shaped routing — **NOT a violation; NOT a PL-blocker**. The catch-all has no functional effect with Supabase password auth (a single `page.tsx` would behave identically) but actively misleads future readers. Filed as POST-LAUNCH-POLISH in § C.2. Do **NOT** rewire auth.

### J.2 Design-system naming — verdict: **"TAC Express v5.0 Violet Grid" is canonical; "TAC Orbital" is a scoped subsystem name**

The follow-up brief stated "standing project conventions name it 'TAC Orbital'". That premise is incorrect on current main:

| Authoritative source | Names the design system as |
|---|---|
| [`AGENTS.md`](../../AGENTS.md) § 3 + § 9 | "TAC Express v5.0 — Violet Grid" |
| [`DESIGN_SYSTEM.md`](../../DESIGN_SYSTEM.md) | "TAC Express v5.0 — Violet Grid" |
| [`CLAUDE.md`](../../CLAUDE.md) | "TAC Express v5.0 — Violet Grid" |
| [`README.md`](../../README.md) | Violet Grid |
| Every `.claude/skills/**/SKILL.md` that names the system | "Violet Grid v5.0" / "TAC Express v5.0 Violet Grid" |

**"TAC Express v5.0 Violet Grid" wins** — it is the canonical name in **every** authoritative rule file. AGENTS.md § 9's corrections table explicitly retires "TAC Orbital" as a legacy design-system label.

**"TAC Orbital" survives legitimately as the name of the telemetry/charts subsystem**, NOT the design system as a whole:
- `packages/services/src/orbital.service.ts` — service adapter for chart aggregation
- `packages/types/src/orbital.types.ts` — chart contracts
- `packages/ui/src/components/charts/index.ts` — chart-system index
- `packages/ui/src/styles/globals.css` — telemetry-token blocks (`--telemetry-*`)
- `docs/CHARTS-ORBITAL.md` — subsystem spec

That subsystem uses Violet Grid tokens; the name is scoped to that adapter, not the visual identity. KEEP these references.

**Three stale design-system-name comment headers were identified** (these refer to the *design system*, not the telemetry subsystem) and filed as POST-LAUNCH-POLISH in § C.2:
- `packages/ui/src/components/composed/auth/sign-in-split-layout.tsx:26`
- `packages/ui/src/components/composed/maps/maplibre-map.tsx:47`
- `packages/ui/src/components/composed/shipments/shipping-label.tsx:71`

The fixes are sub-mechanical (comment-header text only). They're scoped out of PR A (docs/scope only) and are folded into the source PR (PR B / PL-1).

### J.3 Worktree cleanup + process fix — verdict: **DONE**

- The untracked `tac-whatsapp-sends-102/` directory at the repo root (an old clone that was never tracked or registered as a worktree) has been removed.
- A new **"Worktree & artifact hygiene"** section was added to [`.claude/skills/tac-karpathy-discipline/SKILL.md`](../../.claude/skills/tac-karpathy-discipline/SKILL.md) — codifies the end-of-session teardown checklist + the convention that worktrees live OUTSIDE the repo root (`C:/tac/tw-<task-name>`).

### J.4 #162 self-report verification — verdict: **all claims hold**

| Claim | Verification |
|---|---|
| #162 merged to main | ✅ Merge SHA `5755520bf1f142e8e4874d92734153c0254fb7ac` on main (`git log 5755520 -1`); GH state `MERGED` at `2026-05-18T00:22:20Z` |
| `backlog-refs-drift` sentinel passes | ✅ `Backlog references drift check` CI run on merge commit: `success` (via `gh api .../commits/5755520.../check-runs`) |
| CI state on merge commit | ✅ All 9 jobs `success`: Bundle size · Unit tests · @tac registry sync + smoke · Migrations apply on fresh DB · Backlog references drift check · Sentry alert-rule structure lint · LAW gates · npm audit (production deps) · visual + a11y |
| PR #162 file scope | ✅ 4 files (`AGENTS.md`, `docs/NEXT-SESSION-HANDOFF.md`, `docs/launch/product-launch-readiness.md` ADD, `docs/retros/2026-05-17-product-launch-scope.md` ADD); zero application source touched |

No discrepancies. The #162 self-report is accurate.

### J.5 PL-1 — opened as the only unblocked task

Implemented in a separate source PR (PR B). Adds the `metadata` export at `apps/web/app/(public)/page.tsx` with title / description / `openGraph` / `twitter` fields per `docs/launch/product-launch-readiness.md` § C.1's testable-done criterion. No OD-P gating; ~1 hour.

### J.6 PL-2b — `/contact` form is durably wired (autonomous run 2026-05-18)

Audit found `apps/web/app/(public)/contact/contact-form.tsx:31` was stubbed
(`setSubmitted(true)` + TODO; no `/api/contact` route existed). For OD-P1 =
sales-led B2B, the customer journey terminator MUST durably capture and
notify the team. This run ships the full code path:

| Layer | File(s) | What |
|---|---|---|
| Migration | [`supabase/migrations/20260518000001_contact_leads.sql`](../../supabase/migrations/20260518000001_contact_leads.sql) | `contact_leads` table with form columns + CRM `status` + `notification_status` + `whatsapp_send_id` FK to `whatsapp_sends`; RLS `SELECT/UPDATE` scoped to MANAGER+; NO insert/delete policies (route uses service-role) |
| Types | [`packages/types/src/contact-lead.types.ts`](../../packages/types/src/contact-lead.types.ts) | Reason/status enums + form input + submission-result types |
| Service-role client | [`packages/database/src/client.ts`](../../packages/database/src/client.ts) | New `createServiceRoleClient()` for server-only RLS-bypass writes from public surfaces |
| Service | [`packages/services/src/contact-lead.service.ts`](../../packages/services/src/contact-lead.service.ts) | `submitContactLead`: INSERT lead row FIRST → call `whatsapp.sendTemplate` SECOND. Best-effort notification: a send failure transitions the row to `notification_status='failed'` and STILL returns `{ ok: true }` — the lead is captured |
| Server factory | [`packages/services/src/server.ts`](../../packages/services/src/server.ts) | `createContactLeadServerService()` (service-role-bound + env-derived template config) |
| Route | [`apps/web/app/api/contact/route.ts`](../../apps/web/app/api/contact/route.ts) | POST handler with rate limit (5 / 10 min / IP) → zod validation → honeypot check → service call |
| Rate limiter | [`apps/web/lib/rate-limit.ts`](../../apps/web/lib/rate-limit.ts) | New `contactFormRateLimit` (5 req / 10 min / IP) |
| Form rewire | [`apps/web/app/(public)/contact/contact-form.tsx`](../../apps/web/app/(public)/contact/contact-form.tsx) | Real `fetch("/api/contact", …)`. Idle / submitting / success / error states. Hidden honeypot input. `noValidate` so server errors surface |
| Env example | [`apps/web/.env.example`](../../apps/web/.env.example) | New vars: `SUPABASE_SERVICE_ROLE_KEY`, `WPBOX_LEAD_NOTIFICATION_PHONE`, `WPBOX_LEAD_TEMPLATE_NAME`, `WPBOX_LEAD_TEMPLATE_LANGUAGE`, `UPSTASH_REDIS_REST_*` |

**WhatsApp template `lead_notification`** — pending Meta-side approval.
Until approved, `sendTemplate` returns `{ ok: false, error: … }` and the
lead transitions to `notification_status='failed'`. **The lead IS still
captured.** Manual follow-up via the `contact_leads` table (MANAGER+ SELECT)
works immediately.

Template specification (for owner to submit in WhatsApp Business Manager):
- **Name:** `lead_notification`
- **Category:** `UTILITY` (or `MARKETING` if Meta requires)
- **Language:** `en`
- **Body** (4 positional parameters):
  ```
  New {{1}} lead — {{2}} ({{3}}).

  Message: {{4}}
  ```
- **Parameter mapping** (the service passes these on every send):
  - `{{1}}` reason label (e.g. "Sales")
  - `{{2}}` contact name
  - `{{3}}` contact email
  - `{{4}}` first 200 chars of the message body (truncated with "…")

**Owner env-var setup** (required for live notifications):
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase project's service-role key. WITHOUT THIS, `/api/contact` returns 500 on every submission (the service-role client throws at construction).
- `WPBOX_LEAD_NOTIFICATION_PHONE` — the team's WhatsApp inbox phone in E.164-digits form (e.g. `"918765432100"`). If unset, leads still capture but every notification fails.
- `WPBOX_LEAD_TEMPLATE_NAME` — optional; defaults to `lead_notification`.
- `WPBOX_LEAD_TEMPLATE_LANGUAGE` — optional; defaults to `en`.

**/quote audit (PL-2b sibling check):** `apps/web/app/(public)/quote/rate-calculator.tsx` is a CLIENT-SIDE COMPUTE (stub rate formula). It claims no POST and does not deceive the visitor. Different shape from the /contact stub; nothing to fix. Documented here so future audits don't re-investigate.

### J.7 PL-3 — mobile-responsiveness static audit (autonomous run 2026-05-18)

Per OD-P5 (9-page MVP carve) + OD-P6 (375w + 768w breakpoints), audited each page for mobile-breaking patterns. The codebase is **mobile-first by Tailwind default** — `md:` (768w+) prefixes layer in desktop variants, so the base classes describe the mobile view. That's the same pattern PR #166's sales CTA row already followed (`flex flex-col sm:flex-row`).

| Page | Risk patterns scanned | Result |
|---|---|---|
| `/` (landing) | `hidden md:block` HUD decoration · AWB form `flex flex-col sm:flex-row` · hero image `aspect-[16/9] md:aspect-[21/9]` · BusinessUtility/ResultsChart/SystemCompatibility sections | Designed mobile-first; HUD decoration correctly hidden on mobile. The one finding: PL-2a's sales CTA buttons (GET A QUOTE / CONTACT SALES) were content-width on mobile, breaking the visual rhythm with the LOCATE button's `w-full sm:w-auto`. **Fixed in this PR** — same pattern now applied + a `max-w-xs` constraint so the buttons feel grouped at mobile widths instead of edge-to-edge. |
| `/about` | 2× `md:grid-cols-N` blocks | Defaults to single-column at mobile (Tailwind default). No fix needed. |
| `/pricing` | `md:grid-cols-3` plan tiles | Same — defaults to single-column at mobile. No fix needed. |
| `/contact` | `md:grid-cols-[1fr_2fr]` for sidebar + form, contact-form.tsx itself with `md:grid-cols-2` field pairs | Mobile collapses to single column. The form's honeypot block is `sr-only` post-PR #168 (no arbitrary offscreen positioning). No fix needed. |
| `/quote` | RateCalculator's `md:grid-cols-2` field grid | Single-column mobile. No fix needed. |
| `/track/[awb]` | dynamic-only route; existing Playwright a11y/smoke/visual specs cover an analogous `/track` index in apps/dashboard | Out of static-audit scope; structural form is mobile-first by the same convention. |
| `/legal/cookies`, `/legal/privacy`, `/legal/terms` | mostly text + `prose` containers | No grid/breakpoint complexity; mobile-safe by construction. |

**The audit's surprising finding:** the landing's mobile readiness is essentially "as designed." The single concrete issue (CTA button widths) ships in this PR. Everything else is structurally correct because the codebase has been written mobile-first throughout.

**Touch-target compliance:** all interactive CTAs use `h-12` (48px) or `h-14` (56px), exceeding both Apple HIG (44px) and Material (48px) minimums.

**What this PR does NOT do:** verify the static audit against actual mobile viewport rendering. The Next.js dev server can't run from a worktree, and the existing Playwright config doesn't cover apps/web. That validation is **PL-4** — extending Playwright to test apps/web at 375w + 768w viewports. Begun in a sibling PR.

**Burn-down impact:** PL-3 was the longest-looking blocker on paper; in practice the mobile-first Tailwind discipline already in the codebase means the work was ~85% audit, ~15% targeted fix.

### J.8 PL-4 — apps/web Playwright foundation (autonomous run 2026-05-18)

The root [`playwright.config.ts`](../../playwright.config.ts) targets `apps/dashboard` on port 3001. Per the PL-4 testable-done criterion ("new specs in `e2e/` … for landing + contact + quote"), the apps/web public surface needed its own Playwright config — same toolchain, different baseURL + webServer + test dir.

| Artifact | Purpose |
|---|---|
| [`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts) | Six projects: `smoke-{desktop,mobile}` · `a11y-{desktop,mobile}` · `visual-{light,dark}`. The mobile projects pin viewport to **375×812** (the OD-P6 mobile-critical width) so PL-3 regressions surface immediately. |
| [`apps/web/e2e/landing.smoke.spec.ts`](../../apps/web/e2e/landing.smoke.spec.ts) | AWB tracker reachability + sales-CTA row presence + JSON-LD Organization payload + CTA-link routing. |
| [`apps/web/e2e/contact.smoke.spec.ts`](../../apps/web/e2e/contact.smoke.spec.ts) | Form fields visible + honeypot offscreen-hidden + public contact info on page. |
| [`apps/web/e2e/quote.smoke.spec.ts`](../../apps/web/e2e/quote.smoke.spec.ts) | Rate-calculator form + indicative-rate output. |
| `apps/web/package.json` scripts | `test:e2e`, `test:e2e:ui`, `test:smoke` — runnable locally via `pnpm --filter web test:smoke`. |

**Coverage:** the three critical customer-journey paths (landing + contact + quote) at desktop AND 375×812 mobile.

**What this PR does NOT do (filed for follow-up):**

- **CI workflow integration.** The existing [`e2e.yml`](../../.github/workflows/e2e.yml) targets `apps/dashboard/**` only. Adding apps/web runs needs a sibling workflow (or path-aware steps in the existing one). Doing that without owner verification risks breaking the existing gate — kept out of this PR. The infrastructure is in place; CI wiring is a one-file follow-up.
- **a11y + visual specs for landing/contact/quote.** This PR ships only the **smoke** projects' specs. The a11y + visual specs are mechanical extensions of the existing `apps/dashboard/e2e/*.{a11y,visual}.spec.ts` templates and follow naturally once smoke is green in CI.
- **Specs for the other 6 carve pages** (about / pricing / legal × 3 / track). Per the cadence-discipline rule, smaller follow-up PRs.

**Burn-down impact:** PL-4 as defined ("visual + a11y baseline for landing + critical paths") is partially complete after this PR. Smoke coverage at mobile + desktop on the 3 most-load-bearing pages is the floor; a11y/visual specs ship in the next session once CI integration is signed off.
