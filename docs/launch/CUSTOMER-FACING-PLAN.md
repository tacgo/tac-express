# TAC Express — Customer-Facing Workstream Plan

> **Authority:** this file is the sequenced, bucketed plan for the customer-facing surface (landing page, public marketing pages, AWB tracking, contact-to-sales flow, dashboard support inbox). It defers to [`docs/launch/MASTER-LAUNCH-PLAN.md`](MASTER-LAUNCH-PLAN.md) for the unified launch verdict; this file is the per-workstream detail for the customer-facing slice.
>
> **Cross-reference chain:** [`MASTER-LAUNCH-PLAN.md`](MASTER-LAUNCH-PLAN.md) → THIS FILE → [`docs/playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md`](../playbooks/UI-UX-CONSISTENCY-PLAYBOOK.md) → specialist skills.
>
> **Source audit:** the 2026-05-19 landing-page audit (score 72/100 — `ACCEPTABLE`, below the 75 pre-merge gate). The audit's C-1…C-5 critical defects + Fourteen-Laws table + PR-A…PR-D roadmap are the seed inputs. This file reclassifies each item into LAUNCH-BLOCKER vs POST-LAUNCH and sequences the work into PR-scale build sessions.
>
> **Version:** 1.1 — WS-1 + WS-2 closed, 2026-05-19 (build session against the merged playbook).
> **Previous:** 1.0 — established 2026-05-19 (PR #180).

---

## 0. Why this is a workstream, not a PR

The owner described five bodies of work in one prompt: a UI/UX consistency playbook (shipped this session as the standing standard); landing-page design enhancement; landing-page launch-blocker fixes; AWB tracking-to-DB with a result dialog; "Contact Sales" → "Contact TAC" + dashboard support inbox. Three of these are PR-scale build sessions each carrying their own data layer, RLS implications, and UI surface. Bundling them violates the one-PR-per-concern discipline that has held for 18 consecutive PRs since #160.

This file plans them as **WS-1 → WS-4**: four discrete future build sessions with explicit done-criteria, bucket assignments, dependencies, and recommended PR breakdowns. This session ships ONLY the plan.

---

## 1. Bucket totals

| Bucket | WS items | Status |
|---|---|---|
| 🚀 LAUNCH-BLOCKER | WS-1 (LB-5 + LB-6) | ✅ DONE 2026-05-19 — landed in WS-1+WS-2 build PR |
| 📋 POST-LAUNCH (polish — audit consistency pass) | WS-2 (all 6 items) | ✅ DONE 2026-05-19 — bundled with WS-1 in the same build PR |
| 📋 POST-LAUNCH (feature — UX migration) | WS-3 | OPEN — next agent session |
| 📋 POST-LAUNCH (feature — new surface) | WS-4 (A + B) | OPEN — PI-1-blocked for production functionality |

**Post-v1.1 launch surface:** WS-1's two LBs (LB-5 + LB-6) closed. Master plan goes from 1 PI + 5 LBs = 6 closeable → **1 PI + 3 LBs = 4 closeable**.

The third audit-flagged candidate-blocker (the placeholder-contrast WCAG failure at the AWB input) was already covered by LB-3 (issue #173 — "Landing color-contrast WCAG AA"). LB-3 closed 2026-05-19 via PR #179 (Option B class-redirect across 4 contrast sites; `AXE_FAIL_ON_VIOLATIONS=1` gating regressions). Cross-referenced under WS-1 below but not double-counted. Verify in the WS-1 build session that PR #179's class-redirect covers the AWB-input placeholder; if not, file a small follow-up.

---

## 2. WS-1 — Landing launch-blockers ✅ DONE 2026-05-19

**Bucket:** 🚀 LAUNCH-BLOCKER (BOTH items below pass the DoD hard test under "broken-irrecoverable-journey").
**Status:** ✅ CLOSED — landed in the WS-1+WS-2 build PR. axe verified 0 serious/critical at desktop/mobile/tablet.
**Source audit references:** [audit C-1, C-2, R-2, C-4](#9-audit-source-references).
**Estimate:** 1 small agent session (~30 min).
**Dependencies:** none — independent of PI-1, LB-1, LB-2, LB-3, LB-4.
**Recommended PR shape:** ONE PR titled `fix(landing): WS-1 launch-blockers — broken nav + hardcoded dashboard URL`. Three commits if separable, one bundled commit if the diff is < 60 LoC.

### 2.1 LB-X1 — `localhost:3001` hardcoded dashboard link (R-2)

**The defect:** [`packages/ui/src/components/composed/public-nav.tsx:81`](../../packages/ui/src/components/composed/public-nav.tsx) sets the authenticated dashboard link to `http://localhost:3001`. On production deploy, every signed-in visitor who clicks "Dashboard" in the top nav hits a connection-refused page.

**Why it's a launch-blocker:** the DoD hard test — "broken-irrecoverable-journey" — fires. A signed-in customer's primary navigation action is broken in production. Not recoverable without the user typing the production dashboard URL by hand.

**Testable done criterion:**
- The href reads from `process.env.NEXT_PUBLIC_DASHBOARD_URL` with a build-time fallback that fails the build (not silently renders localhost) if the env var is not set on the production deploy.
- Both mobile and desktop nav use the same source.
- A unit test asserts `link.href` is NOT `localhost:3001` in any environment where `process.env.VERCEL_ENV === 'production'`.
- Smoke test added to `apps/web/e2e/landing.spec.ts`: navigate as authenticated user → click Dashboard → expect navigation to a non-localhost URL.

**Implementation notes for the build session:** match the existing pattern used elsewhere (e.g. wherever the cross-app link from dashboard → landing lives). If no precedent exists, add `apps/web/lib/dashboard-url.ts` that exports a resolved `getDashboardUrl()`, gated on `NEXT_PUBLIC_DASHBOARD_URL`. Document the env-var name in `docs/launch/MASTER-LAUNCH-PLAN.md § 4`.

### 2.2 LB-X2 — 11 dead in-page anchors across nav + footer (C-1)

**The defect:** The PublicNav at [`public-nav.tsx`](../../packages/ui/src/components/composed/public-nav.tsx) (lines 54 / 57 / 60 / 117 / 120 / 123) and the Footer at [`footer.tsx`](../../packages/ui/src/components/composed/footer.tsx) (lines 39-43 / 50 / 52) link to `#features`, `#how-it-works`, `#tracking` — but the landing component `WastelandLanding` carries NO section with any of those `id`s. Grep across `packages/ui/src/components/composed/` and `apps/web/` returns zero matches. Every nav and footer in-page link re-renders the page at `scroll-y: 0`.

**Why it's a launch-blocker:** the DoD hard test — "broken-irrecoverable-journey" — fires. Eleven discoverable navigation entry-points all silently fail. Visitors cannot reach the surfaces the nav promises.

**Testable done criterion:**
- Add `id="tracking"` on the hero AWB form wrapper at [`wasteland-landing.tsx:97`](../../packages/ui/src/components/composed/wasteland-landing.tsx) (the LOCATE form is the "tracking" surface).
- Add `id="how-it-works"` on the BusinessUtility section at [`wasteland-landing.tsx:240`](../../packages/ui/src/components/composed/wasteland-landing.tsx) (the metrics + telemetry section).
- Add `id="features"` on the SystemCompatibility section at [`wasteland-landing.tsx:424`](../../packages/ui/src/components/composed/wasteland-landing.tsx) (the integration + capability list).
- Each anchor passes a Playwright assertion: navigate to `/#features` → assert `document.activeElement.id === 'features' || document.scrollingElement.scrollTop > 100`.
- All 11 links resolve. Owner action: re-confirm the label-vs-anchor semantic on each link (e.g. is "Services" really the SystemCompatibility section, or should it route to `/services`?). Default: keep the labels; assign IDs to the closest-matching existing section.

**Alternative resolution (if owner prefers):** rewire the labels to dedicated routes — `/services`, `/about`, `/track`. This trades the in-page-anchor pattern for a multi-page IA. Records owner decision in the PR description; either path closes the launch-blocker.

### 2.3 Cross-reference — the third candidate-blocker is covered by the now-closed LB-3

**Audit C-4** (placeholder contrast `text-muted-foreground/30` at [`wasteland-landing.tsx:117`](../../packages/ui/src/components/composed/wasteland-landing.tsx) — computed to ~1.4:1 contrast, failed WCAG AA) was the same defect class as LB-3 (issue #173). PR #179 (merged 2026-05-19, Option B class-redirect) closed LB-3 across 4 contrast sites with `AXE_FAIL_ON_VIOLATIONS=1` flipped on the e2e workflow.

**Verification in the WS-1 build session:** confirm PR #179's class-redirect covers the AWB-input placeholder specifically. If the placeholder still uses `text-muted-foreground/30` (an opacity-modifier escape, not a class redirect), it survived PR #179. Resolution if surviving: drop the `/30` modifier in the WS-1 PR; this is small enough to bundle into WS-1 without diluting its scope.

---

## 3. WS-2 — Landing design enhancement (post-launch polish bundle)

**Bucket:** 📋 POST-LAUNCH-POLISH for every item below.
**Source audit references:** C-2, C-3, C-5, R-1, R-3, R-4, R-5, R-6, R-7, R-8, R-9, R-10. See [§ 9](#9-audit-source-references).
**Estimate:** 2-3 small agent sessions (~1-2 hours each) split across the four sub-PRs below.
**Dependencies:** WS-1 should land first (so the nav contract is fixed before polish lands on top of it). Independent of PI-1 / LB-1 / LB-2 / LB-3 / LB-4.

The audit's PR-B / PR-C / PR-D roadmap maps onto four coherent sub-PRs:

### 3.1 WS-2A — Consistency pass (the PR-B equivalent) ✅ DONE 2026-05-19

**Bucket:** POST-LAUNCH-POLISH.
**Status:** ✅ CLOSED — bundled with WS-1 in the build PR. Rubric re-scored 72 → 80/100 (clears the ≥75 gate; ≥90 premium target deferred to WS-2B + WS-3).

**Scope (all from audit § 9 remediation):**
- Align hero CTA heights (C-3): pick h-14 or h-12 consistently for LOCATE + GET A QUOTE + CONTACT SALES.
- Replace `p-12` (testimonial card) and `p-2` (dock card) with `p-8` so every content card sits on the same padding rhythm (audit § 4 — "rhythm" criterion).
- Define or remove `shadow-brutal-t` (C-2 dead utility). If kept, add `--shadow-brutal-t: 0 -Npx 0 0 var(--border)` to globals.css; if dropped, remove the class from `footer.tsx:7`.
- Move testimonial quote at [`wasteland-landing.tsx:363-364`](../../packages/ui/src/components/composed/wasteland-landing.tsx) onto the `.t-*` type scale (use `.t-h2 font-mono uppercase` or add `--type-quote` token per playbook § 2).
- Drop the `text-muted-foreground/30` placeholder modifier IF NOT already covered by PR #179's class-redirect (verify per § 2.3).

**Done criterion:** `tac-ui-rubric` re-scores the landing at ≥ 80, with **criteria 2 (Hierarchy) ≥ 9** and **criterion 3 (Rhythm) ≥ 9**.

### 3.2 WS-2B — Landing premium polish (6-group section-by-section)

**Bucket:** POST-LAUNCH-POLISH (premium-tier rubric lift from 80 → 90+).
**Status:** ✅ CLOSED 2026-05-19. PHASE 1 + all 3 PHASE-2 PRs merged. **Landing rubric 80 → 88.5 (premium-tier boundary).**
**Estimate:** N/A — closed. Next workstream: WS-3.

**Re-scoping note (2026-05-19):** the original WS-2B scope was a closing-CTA conversion-funnel section. After review of the post-PR-#181 state, the owner re-scoped WS-2B to a **section-by-section premium polish workstream** targeting six specific defect groups identified in the live screenshots: hero input/CTA proportions, section spacing voids, motion-overlap, testimonial → un-attributed case study, integration-card consistency, footer type-scale + lone social icon. The closing-CTA section is deferred to a future POST-LAUNCH-POLISH session and is no longer WS-2B.

**Full spec:** [`docs/launch/WS-2B-LANDING-POLISH.md`](WS-2B-LANDING-POLISH.md).

**PR batching (PHASE 2) — ALL CLOSED:**
- ~~**PR-2B-1**~~ — ✅ DONE 2026-05-19 (PR #184). Hero refinement (Group 1). Rubric criteria 4 + 8 each +1.
- ~~**PR-2B-2**~~ — ✅ DONE 2026-05-19 (PR #185). Page rhythm + motion-overlap (Groups 2 + 3). Rubric criteria 3 + 5 each +1.
- ~~**PR-2B-3**~~ — ✅ DONE 2026-05-19. Content sections (Groups 4 + 5 + 6). Rubric criterion 9 +1, criterion 10 +3, criterion 1 +0.5. **WS-2B closed.**

**Done criterion:** `tac-ui-rubric` cumulative landing score in the 90+ tier (or 88-89 with the boundary acknowledged), with criteria 3 / 5 / 9 / 10 each lifted at least +1. axe 0 serious/critical across 3 viewports for every PHASE-2 PR.

**Identity discipline:** WS-2B is **refinement, not redesign**. Existing identity (HUD, brutalist offsets, hand-rolled chart, mono eyebrows) is preserved. If a fix requires structural change, bail and surface as owner decision per [`WS-2B-LANDING-POLISH.md § 10`](WS-2B-LANDING-POLISH.md).

### 3.3 WS-2C — Primitive extraction (the DRY pass)

**Bucket:** POST-LAUNCH-POLISH (per playbook § 4 — extract-on-second-consumer is the rule, and these patterns have ≥ 2 consumers).
**Estimate:** ~1 small session, ~150-200 LoC + tests.

**Scope:**
- Extract `<TacWordmark size="sm|md|lg">` into `packages/ui/src/components/primitives/tac-wordmark.tsx`. Consumers: `public-nav.tsx:39-49` + `footer.tsx:13-22` (also expected: future sign-in page header).
- Extract `<AwbInput onSubmit={...} loading={...} error={...} />` into `packages/ui/src/components/composed/awb-input.tsx`. Currently one consumer (`wasteland-landing.tsx:97-141`); a SECOND consumer arrives with WS-3's tracking dialog → extract NOW because WS-3 will be the second use, justifying the abstraction.
- Extract `<NavLink>` (the animated-underline pattern at `public-nav.tsx:54, 57, 60`) into `packages/ui/src/components/primitives/nav-link.tsx`. Three consumers, all identical 120-character class strings.

**Done criterion:** the three primitives exist; all callers refactored; vitest unit tests cover each primitive's variants; the registry-check passes (`pnpm --filter @workspace/ui registry:check`).

### 3.4 WS-2D — Asset + a11y polish (the PR-D equivalent)

**Bucket:** POST-LAUNCH-A11Y + POST-LAUNCH-PERF (not blocker; observable but not broken).
**Estimate:** ~1 small session.

**Scope:**
- Replace raw `<img>` at `wasteland-landing.tsx:482` with `next/image` (R-5 — improves LCP/CLS on the marketing page).
- Add `poster="/images/hero-truck-poster.jpg"` + `aria-label="TAC Express truck crossing the corridor"` to the `<video>` at `wasteland-landing.tsx:211-218` (R-4).
- Render the mobile menu trigger SSR (drop the `mounted` gate on the trigger itself; keep it only on the session-dependent CTA below at `public-nav.tsx:90`) (R-3).
- Move the `dark` class out of `apps/web/app/layout.tsx:21` into `ThemeProvider`-driven assignment (R-10 — prevents first-paint theme-flicker for users with stored light preference).
- Add `noValidate` to the AWB form for explicit intent (R-7).
- Replace the localhost dashboard link... (covered in WS-1, NOT this PR).

**Done criterion:** Playwright a11y axe-core scan on `/` returns 0 serious violations across desktop / tablet / mobile. Lighthouse LCP ≤ 2.5s on the staging deploy.

---

## 4. WS-3 — AWB tracking presentation (UX migration) ✅ CLOSED 2026-05-20

**Bucket:** 📋 POST-LAUNCH (UX migration — pre-existing tracking page works; the dialog is an enhancement).
**Source:** owner request + audit's R-8 (extract `<AwbInput>` to share between hero + tracking dialog).
**Status:** ✅ CLOSED 2026-05-20. Shipped as two PRs (bailout split):
- **PR-WS-3a (#187)** — `GET /api/track/[awb]` route + 8 tests + `checkTrackLookup` rate-limit + `@workspace/services` vitest alias. CodeRabbit-hardened (decode guard → 400; service-error guard → 503).
- **PR-WS-3b** — `<AwbInput>` primitive (hero/default sizes) + `<TrackingResultDialog>` (4 states: loaded/loading/empty/error) + LOCATE wire-up with `?track=AWB` deep-link URL sync. axe-clean closed AND dialog-open (0 violations). 803 unit tests + 3 new Playwright dialog smokes. Rubric criterion 7 (State Choreography) 5 → 9.
**Dependencies:** WS-2C ships `<AwbInput>` first (avoids re-extracting mid-session). Independent of PI-1 / LB-* otherwise.

### 4.1 BAILOUT-grade finding — WS-3 is materially smaller than the prompt assumed

**The owner's brief asked for:** "the AWB lookup must query real shipment data through packages/services (NOT a DB call in the component, per LAW 6), via an API route, with the result presented to the customer as a dialog."

**The current state on main (verified this session):**
- ✅ `packages/services/src/public-tracking.service.ts` EXISTS — `createPublicTrackingService` with `getShipmentByAwb` + `getTrackingEvents`.
- ✅ `apps/web/app/(public)/track/[awb]/page.tsx` EXISTS and is wired — calls the service from a server component, renders `<TrackingResultView>`.
- ✅ The landing's LOCATE button at [`wasteland-landing.tsx:59`](../../packages/ui/src/components/composed/wasteland-landing.tsx) already does `router.push('/track/' + awb)` — already routes to the wired page.
- ✅ Not-found and error states are handled in `<TrackingResultView>`.
- ✅ LAW 6 compliance: the service is called from a server component, not from the LOCATE form's component. Clean.

**What is genuinely new (and is what WS-3 should scope):**
- Migrate the LOCATE experience from page-navigation to **inline dialog** (the owner's stated preference). The page route stays for deep-linking, share-ability, SEO. The dialog is a faster customer experience for the "I just want to see status" case.
- Add a LOADING state to the LOCATE button (per playbook § 6).
- Add an API route at `apps/web/app/api/track/[awb]/route.ts` so the dialog can fetch client-side without a full route navigation. The API route is a thin pass-through to the existing service — no business logic.

**PR shape — split per the bailout clause:**

> Bailout fired 2026-05-20. The original plan was one PR with three commits; the session naturally completed Commit 1 (the API route + tests) and surfaced the appropriate seam to split before adding the UI layer. Concern-count would have exceeded 3 (route + UI primitive + dialog + LogisticsHero refactor + Playwright) if all three commits had landed in one PR.

1. **PR-WS-3a — `feat(api): public /api/track/[awb] route`** — ✅ DONE 2026-05-20. Adds the API route + zod-validates the AWB shape + calls `createPublicTrackingService` server-side + returns JSON. Rate-limited via the new `checkTrackLookup` helper in `apps/web/lib/rate-limit.ts` (30 lookups / minute / IP; more permissive than `/contact` since this is a read). Tests: 6 cases covering 200 / 404 / 400-too-short / 400-illegal-chars / 429 / XFF parsing — all value-capturing per CodeRabbit catalog #1. Also added a workspace-scoped vitest alias for `@workspace/services/<name>` subpath resolution.

2. **PR-WS-3b — `feat(ui): tracking dialog + LOCATE wire-up`** — combines the original commits 2 + 3:
   - **`<AwbInput>`** primitive extracted to `packages/ui/src/components/composed/awb-input.tsx` (size: `hero` | `default`). Refactor the hero LOCATE form to use it.
   - **`<TrackingResultDialog>`** composed component wrapping the shadcn `<Dialog>` primitive. All four states designed (LOADED / LOADING / EMPTY / ERROR) per playbook § 6.
   - **LOCATE wire-up**: form submit opens the dialog + fires fetch against `/api/track/[awb]`. URL `?track=AWB123` deep-link param sync (router.replace + History API). Mount-read reopens dialog on shareable URL.
   - **Playwright** smoke + a11y additions for the dialog flow.

PR-WS-3a is independently mergeable and shipped first; PR-WS-3b opens against the post-WS-3a main.

### 4.2 Testable done criterion

- A visitor on `/` types `AWB123` into LOCATE → presses Enter → sees a loading skeleton in a dialog within 100ms → sees the tracking result within 500ms (or empty/error state).
- The `/track/[awb]` page still works (deep links, social shares unchanged).
- Playwright E2E: `apps/web/e2e/landing.spec.ts` adds a `dialog opens on LOCATE` test.
- A11y: dialog traps focus, returns focus on close, has `aria-labelledby` + `aria-describedby`, the result content is screen-reader-readable.

### 4.3 Pre-build PHASE-0 for this session

When the WS-3 build session opens, the agent does PHASE-0 first:
- Re-confirm public-tracking.service.ts still exists with the same signature on main.
- Re-confirm WS-2C has shipped (so `<AwbInput>` is available for re-use in the dialog).
- Confirm no anti-pattern from CodeRabbit catalog applies to the new API route (likely #6 — anchor-scoped windows for assertions — applies to the route's test file).

---

## 5. WS-4 — "Contact TAC" rename + dashboard support inbox

**Bucket:** 📋 POST-LAUNCH (both halves) — the rename is a 1-line change; the inbox is a new dashboard surface that touches PII.
**Source:** owner request.
**Estimate:** TWO PR-scale build sessions (the two halves are genuinely separate work touching different apps).
**Dependencies:**
- WS-4A (rename) — independent.
- WS-4B (dashboard inbox) — **DEPENDS ON PI-1** (the contact_leads migration deployed to production; see master plan § 4.1). The inbox is reading a table that doesn't yet exist in production.

### 5.1 WS-4A — "Contact Sales" → "Contact TAC" rename — ✅ CLOSED (2026-05-20)

**Bucket:** POST-LAUNCH-POLISH.
**Shipped:** the landing hero secondary CTA in [`wasteland-landing.tsx`](../../packages/ui/src/components/composed/wasteland-landing.tsx) now reads `CONTACT TAC` (still links to `/contact`). The Playwright landing smokes were updated to assert the new label (link text + `/contact` href + click-navigation), verified green against a local env-provisioned server.

**Done criterion met:** `grep 'Contact Sales' / 'CONTACT SALES'` returns 0 matches in source/tests (remaining hits are frozen historical retros + the third-party `ui-ux-pro-max` archetype CSV, neither owned here). The `/contact` page's "sales" topic option is intentionally retained — the page is a general sales/support/ops inbox, which is exactly why "CONTACT TAC" is the more accurate label.

**Note on launch value:** the rename is correct independent of deploy, but the button links to `/api/contact`, which 500s in production until **PI-1** deploys `contact_leads`. The label change ships now; user-facing value lands with PI-1 / LB-2.

### 5.2 WS-4B — Dashboard support inbox (NEW dashboard surface)

**Bucket:** POST-LAUNCH (genuinely new feature, gated by PI-1).
**Estimate:** 1 full PR-scale build session (~half day). Needs its own PHASE-0 design pass.

**Scope (NOT designed here — this section scopes and sequences only; the schema + RLS + UI are PHASE-0 work for the build session):**

The dashboard gains a new section at `apps/dashboard/app/ops-console/support/` (or `leads/` — name decided in PHASE-0). It is a queue-style operator UI for triaging the leads captured by `apps/web/app/api/contact/route.ts`:

- A list view: paginated table of `contact_leads` rows with operator filters (status, reason, date range).
- A detail view: full message body, the visitor's name + email + company, the reason chip, the IP + user-agent metadata, the WhatsApp notification status.
- Operator actions: mark as `read` / `triaged` / `replied` / `archived`. Possibly a "reply via email" deep link (mailto:, with template).
- New columns on `contact_leads` to track operator state — additive migration; will need PHASE-0 schema design.

**PHASE-0 items the build session must produce BEFORE writing code:**

1. **RLS audit.** Currently the `contact_leads` migration creates RLS policies for `service_role` writes (the public API route uses the service role via `createContactLeadServerService`). For operator reads, an RLS policy granting SELECT to `authenticated` users with role `MANAGER`+ must be added. Use the existing role helper pattern from `packages/auth/`. This is PII — RLS is the load-bearing safety, not "we'll do it later."

2. **Schema additive migration.** New columns: `read_at TIMESTAMPTZ`, `triaged_by UUID REFERENCES staff(id)`, `triaged_at TIMESTAMPTZ`, `archived_at TIMESTAMPTZ`. All nullable. No data migration needed — existing rows have all NULL.

3. **Service layer.** Extend `packages/services/src/contact-lead.service.ts` with `listContactLeads({ filters, pagination })`, `getContactLead(id)`, `markContactLeadRead(id, userId)`, `triageContactLead(id, userId, status)`. Each method is RLS-aware; the test floor uses mock-builders (per CodeRabbit catalog #1).

4. **UI surface.** Three composed components in `packages/ui/src/components/composed/support/`:
   - `<ContactLeadsTable>` — paginated; columns mono for IDs / dates per playbook § 6 (mono discipline).
   - `<ContactLeadDetailDrawer>` — slide-from-right shadcn `<Sheet>`; full message body; operator actions.
   - `<ContactLeadStatusBadge>` — chip with violet/amber/green/red signal colors per the design system.

5. **Permissions.** MANAGER+ can see all leads; OPERATOR can see leads only after the manager assigns them (defer that complexity to a follow-up if it expands the session). Owner role can archive. Audit trail: every status change writes an `audit_logs` row.

6. **Notification.** Optional — a dashboard navbar badge that shows unread count. Defer to a follow-up PR if the bell-icon pattern isn't already established.

**Testable done criterion:** a MANAGER signs in, navigates to `/ops-console/support`, sees the list of contact leads, opens one, marks it triaged, the audit log records the action. RLS-blocked for OPERATOR. Playwright E2E coverage for the happy path.

### 5.3 Dependency note (critical)

**Both WS-4A and the customer-facing-side of WS-4B are blocked from FUNCTIONING in production until PI-1 closes** (the `contact_leads` table is created on remote `<YOUR_SUPABASE_PROJECT_ID>` via the migration-deploy pipeline). Until then:
- WS-4A (rename) can ship — it's a label change with no DB dependency.
- WS-4B (inbox) build session can begin once `contact_leads` exists in production (so the operator UI has real data to read).
- The `/api/contact` route returns 500 in production today (master plan § 0 evidence). The button labeled "Contact TAC" will look broken to visitors until PI-1 closes.

This makes WS-4A's value-on-shipping somewhat questionable: renaming a button that links to a broken form has limited customer-value until PI-1 closes. **Recommendation:** ship WS-4A bundled with the LB-2 activation (master plan § 4.3) — same agent session, same PR. The rename is one line + one Playwright assertion.

---

## 6. WS-1..WS-4 recommended build order

```
1. WS-1  (LAUNCH-BLOCKER — independent — ships immediately)
2. WS-2A (consistency pass — clears the rubric to ≥ 80)
3. WS-2C (primitive extraction — produces <AwbInput> needed by WS-3)
4. WS-3  (tracking dialog — depends on <AwbInput>)
5. WS-2B (closing CTA — uses WS-3's <AwbInput> for the bottom-of-page tracking widget if owner wants one there)
6. WS-2D (asset + a11y polish — independent; can run in parallel with any above)
7. WS-4A (rename — bundled with LB-2 activation; depends on PI-1)
8. WS-4B (dashboard inbox — depends on PI-1 + WS-4A; needs its own PHASE-0)
```

**Critical-path observation:** WS-1 is the only LAUNCH-BLOCKER add. Everything else is POST-LAUNCH. The master plan's existing 5-item finite surface grows to **7** when WS-1's two new LBs are merged in — but the items remain owner-actionable on the same critical path (none of the new ones are owner-gated, so the agent can clear both autonomously in one session).

---

## 7. PART 3 — Independent design scan findings (beyond the audit)

The 2026-05-19 audit covered token discipline, hierarchy, rhythm, surface depth, motion, mono, state choreography, focus/hover, content voice, and anti-AI-slop. This section records what the audit DID NOT cover — surfaced this session via fresh reads of the surfaces under the responsive / funnel / shadcn / hierarchy / a11y lenses. Each finding is bucketed and assigned to a WS item. **None are fixed in this session.**

### 7.1 Responsive behavior — additional observations

| Finding | Severity | Bucket | Assigned to |
|---|---|---|---|
| The hero secondary CTA wrapper at [`wasteland-landing.tsx:166`](../../packages/ui/src/components/composed/wasteland-landing.tsx) uses `flex-col sm:flex-row gap-3 w-full max-w-xs sm:w-auto sm:max-w-none` — this works, but the `max-w-xs` cap (20rem / 320px) means on a 360px viewport the buttons span ~89% width with 6% gutters left and right. Tight but ok. **At 320px viewports (the smallest mobile breakpoint Playwright tests on per PR #171), the buttons may touch the screen edges.** Verify or extend the cap to `max-w-[19rem]` (well, that's an arbitrary value — better: add a `--container-narrow` token at 18rem). | MED | POST-LAUNCH-POLISH | **WS-2A** (add to scope) |
| The hero AWB input + LOCATE button at [`wasteland-landing.tsx:104`](../../packages/ui/src/components/composed/wasteland-landing.tsx) uses `flex-col sm:flex-row`. On mobile (stacked), the input + button take 2 × 56px = 112px stacked height — fine. But: the AWB input's mono placeholder "ENTER AWB / CARGO ID..." may overflow at <360px viewports — 23 chars at 14px mono is ~210px, plus 48px horizontal padding = 258px. Verify on the 360px viewport baseline. | LOW | POST-LAUNCH-POLISH | **WS-2A** |
| The brutalist framing corners at [`wasteland-landing.tsx:221-224`](../../packages/ui/src/components/composed/wasteland-landing.tsx) are absolutely positioned with `w-8 h-8 m-4`. On a narrow viewport where the parent video frame is `aspect-[16/9]` and ~360-32=328px wide, the corners are 32px × 32px each, with 16px margin = corners occupy 12% of frame width. This is fine but worth visual verification — at very narrow viewports the corners may dominate. | LOW | POST-LAUNCH-A11Y verify | **WS-2D** |
| The integration list at [`wasteland-landing.tsx:450-469`](../../packages/ui/src/components/composed/wasteland-landing.tsx) places 4 features in a vertical stack `flex flex-col gap-8` — works on every viewport. The paired dock image at [`wasteland-landing.tsx:473-491`](../../packages/ui/src/components/composed/wasteland-landing.tsx) drops below on mobile (`lg:grid-cols-2`). The dock image's `aspect-[3/4]` (portrait) feels awkward on mobile — a portrait image inside a portrait viewport reads as letterboxed. Consider `aspect-video` (16/9) at < lg breakpoint. | LOW | POST-LAUNCH-POLISH | **WS-2A** |

### 7.2 Conversion-funnel logic — gaps the audit named C-5 doesn't fully cover

The audit's C-5 ("missing closing CTA section") is the headline finding. Three additional funnel observations:

| Finding | Severity | Bucket | Assigned to |
|---|---|---|---|
| **The hero has TWO competing primary actions** — the LOCATE form ("track an existing shipment") AND the secondary CTA row ("not tracking? get a quote / contact sales"). The competing-CTA pattern dilutes both. On a B2B sales-led landing, the secondary CTA row should be the visual PRIMARY (it converts to a sale); the LOCATE form should be a secondary "I'm an existing customer" path. Today they're co-equal in visual weight. | HIGH (for conversion; not blocker) | POST-LAUNCH-CONVERSION | **WS-2B** scope expansion — consider visual re-weighting |
| **No clear social-proof anchor above the fold.** The hero shows a HUD + video + form, but no logos of customers, no testimonial preview, no metric. The first scroll-fold should answer "is this legitimate?" — currently it doesn't until BusinessUtility loads. | MED | POST-LAUNCH-CONVERSION | **WS-2B** — add a social-proof strip above the metrics section (e.g. "Trusted by: [Logo1] [Logo2] [Logo3]") |
| **The "Tapan Hidangmayum, Founder" testimonial** at [`wasteland-landing.tsx:367-374`](../../packages/ui/src/components/composed/wasteland-landing.tsx) — the founder testifying about their own company is structurally weaker than a customer testimonial. Future content: replace with a real customer quote once one is captured (a tea grower, a handicraft cooperative, a defense contractor — the three named segments). | OPEN | POST-LAUNCH-CONTENT | Owner content task; not a WS item |

### 7.3 shadcn-primitive opportunities

| Finding | Severity | Bucket | Assigned to |
|---|---|---|---|
| The hero AWB form rolls its own validation error rendering ([`wasteland-landing.tsx:132-140`](../../packages/ui/src/components/composed/wasteland-landing.tsx)). Should use the shadcn `<Form>` primitive (from `react-hook-form` + `@hookform/resolvers/zod`) per the tac-forms skill. | MED | POST-LAUNCH-POLISH | **WS-3** (will switch to `react-hook-form` when extracting `<AwbInput>`) |
| The contact form at [`apps/web/app/(public)/contact/contact-form.tsx`](../../apps/web/app/(public)/contact/contact-form.tsx) should be cross-checked against the tac-forms skill — does it use the standard `useForm` + `zodResolver` + server-action pattern? Likely yes (it was built recently per PL-2b). Audit-out-of-scope. | OPEN | POST-LAUNCH verify | **WS-4A** PHASE-0 (5 min check) |
| The hero secondary CTA row at [`wasteland-landing.tsx:151-190`](../../packages/ui/src/components/composed/wasteland-landing.tsx) is two `<Button>` primitives. shadcn provides a `<ButtonGroup>` pattern that could codify the "linked actions" semantic. Currently just an ad-hoc flex container. Low value to extract — not flagged. | LOW | NOT-A-WS | — |
| The mobile menu at [`public-nav.tsx:93-145`](../../packages/ui/src/components/composed/public-nav.tsx) is a shadcn `<Sheet>` — correct. ✅ |  |  |  |
| The hero video frame at [`wasteland-landing.tsx:198-228`](../../packages/ui/src/components/composed/wasteland-landing.tsx) does its own custom framing. shadcn has no "framed media" primitive — this composition is bespoke and stays bespoke. ✅ |  |  |  |

### 7.4 Visual hierarchy gaps (beyond the audit's criterion 2)

| Finding | Severity | Bucket | Assigned to |
|---|---|---|---|
| **The four sections lack section-numbering eyebrows** — every section header is anonymous ("Operational Telemetry.", "Cost Delta…", "Integration Layer · OPEN.") with no `[01] / [02] / [03] / [04]` index. The HUD overlay at top of hero establishes a mission-control register that the section headers abandon. Adding `<span className="tac-mono-label">[03] · INTEGRATION</span>` above each section header would reinforce the design identity (criterion 10 — anti-AI-slop). | MED | POST-LAUNCH-POLISH (Distinctive Detail) | **WS-2A** scope expansion |
| **The metric cards' `[ID]` badge is great identity work** ([`wasteland-landing.tsx:324`](../../packages/ui/src/components/composed/wasteland-landing.tsx) — `M-01 / M-02 / M-03`). The integration items at [`wasteland-landing.tsx:450-469`](../../packages/ui/src/components/composed/wasteland-landing.tsx) and the testimonial at [`wasteland-landing.tsx:367-374`](../../packages/ui/src/components/composed/wasteland-landing.tsx) don't carry equivalent identifiers. This is an inconsistency — half the page has mission-control IDs; the other half doesn't. | MED | POST-LAUNCH-POLISH | **WS-2A** |
| **No "page progress" indicator** — long-scroll marketing pages benefit from a fixed-side scroll-progress dot column (4 dots, one per section, highlight the current). Currently the visitor has no spatial anchor. | LOW (decorative) | POST-LAUNCH-POLISH | NOT-A-WS (defer to a future polish bundle) |
| **The testimonial section's "Cost Delta" chart** at [`wasteland-landing.tsx:378-411`](../../packages/ui/src/components/composed/wasteland-landing.tsx) is hand-rolled SVG (per audit criterion 10 — premium win ✅). But it has no Y-axis labels, no actual data point values, no time tooltips. Reads as "decorative chart" rather than "evidence chart". Adding small data labels would tip it from decorative → credible. | MED | POST-LAUNCH-POLISH | **WS-2B** consider |

### 7.5 Additional a11y findings (beyond audit C-4 and R-3/R-4)

| Finding | Severity | Bucket | Assigned to |
|---|---|---|---|
| The hero video has `autoPlay loop muted playsInline` ([`wasteland-landing.tsx:212-215`](../../packages/ui/src/components/composed/wasteland-landing.tsx)) — autoplaying video without a play/pause control violates WCAG 2.2.2 (Pause, Stop, Hide). For motion-reduced users, the video continues to play. The grayscale + brightness-75 filter mitigates somewhat but doesn't satisfy the success criterion. | HIGH (WCAG) | POST-LAUNCH-A11Y | **WS-2D** scope expansion |
| The HUD overlay rotates text with `rotate-[-90deg]` and `rotate-[90deg]` ([`wasteland-landing.tsx:28, 36`](../../packages/ui/src/components/composed/wasteland-landing.tsx)) — these are arbitrary Tailwind values (LAW 11 minor drift). The intent is clear and the values are stable; consider extracting as `--rotate-hud-left: -90deg; --rotate-hud-right: 90deg;` for clarity. | LOW | POST-LAUNCH-POLISH | **WS-2A** if trivial to bundle |
| The mobile nav `<Sheet>` content at [`public-nav.tsx:99`](../../packages/ui/src/components/composed/public-nav.tsx) has a visually-hidden `<SheetTitle>` ✅ — but the section header inside the sheet uses raw `<span>` instead of a heading element. Screen readers can't navigate the sheet by heading. Promote to `<h2 className="sr-only">Menu</h2>` and structure the link list as a nav landmark with a `aria-label`. | MED | POST-LAUNCH-A11Y | **WS-2D** |
| Every section uses `whileInView={{ opacity: 1, y: 0 }}` entrance animation — for `prefers-reduced-motion` users, motion/react auto-suppresses transform animations but the opacity transition continues. Acceptable per WCAG. ✅ | — | — | — |
| Decorative SVG elements (the chart polylines, the brutalist corners, the grid pattern) lack `role="presentation"` or `aria-hidden="true"` — most are fine because they have no text content, but the chart polyline's milestone dots are interactive-looking without being interactive. Add `aria-hidden="true"` on the decorative SVG groups. | LOW | POST-LAUNCH-A11Y | **WS-2D** |

### 7.6 Scan summary

**14 new findings** beyond the audit. **13 assigned** to WS-2A (5) / WS-2B (2) / WS-2D (5) / WS-3 (1) / WS-4A PHASE-0 (1). **1 deferred** as NOT-A-WS (scroll-progress dot). **0 escalations** to LAUNCH-BLOCKER — the scan did not surface any item passing the DoD hard test that wasn't already captured by the audit.

---

## 8. Reconciliation into MASTER-LAUNCH-PLAN.md

This file reconciles into [`MASTER-LAUNCH-PLAN.md`](MASTER-LAUNCH-PLAN.md) as follows:

### 8.1 New LAUNCH-BLOCKER rows (additive)

Two rows to be added to MASTER-LAUNCH-PLAN.md § 2.2 "LAUNCH-BLOCKER":

| ID | Item | Done criterion | Owner/Agent | Estimate | Depends on |
|---|---|---|---|---|---|
| **LB-5** | **WS-1.1 — Replace hardcoded `localhost:3001` dashboard link with `NEXT_PUBLIC_DASHBOARD_URL`** | The href reads from env var with build-time fallback that fails the build if unset on production. Unit test asserts the URL is non-localhost in `VERCEL_ENV='production'`. Playwright smoke test confirms navigation works on staging. | **AGENT** (independent; no owner credentials needed beyond setting `NEXT_PUBLIC_DASHBOARD_URL` on Vercel) | ~30 min agent session | Owner sets `NEXT_PUBLIC_DASHBOARD_URL=https://dashboard.tacexpress.com` (or production equivalent) on the apps/web Vercel project |
| **LB-6** | **WS-1.2 — Wire the 11 dead in-page anchors (`#features`, `#how-it-works`, `#tracking`) to real sections** | All 11 anchor links resolve. Playwright assertion: navigate to `/#features` → `scrollTop > 100`. Owner-decided naming/IDs documented in PR. | **AGENT** | ~15 min agent session (bundles with LB-5 in one PR) | Owner confirms anchor-vs-route labels (default: keep labels, assign IDs) |

After this reconciliation, MASTER-LAUNCH-PLAN.md's finite surface grows from **4 (post-LB-3-closure) → 6** closeable items.

### 8.2 New POST-LAUNCH rows (informational; not added to backlog yet)

WS-2A / WS-2B / WS-2C / WS-2D / WS-3 / WS-4A / WS-4B are all POST-LAUNCH; they appear in this file's WS-X numbering. MASTER-LAUNCH-PLAN.md § 2.3 (POST-LAUNCH list) is NOT updated with these — that section tracks GitHub-issue-tracked items, and these are session-scope tracked here instead. A future cleanup might convert each WS-2X / WS-3 / WS-4B into a GitHub issue; today, the cross-reference in MASTER-LAUNCH-PLAN.md to this file is sufficient.

### 8.3 Cross-references updated

- MASTER-LAUNCH-PLAN.md § 0 evidence table — no change (the customer-facing workstream doesn't change the launch verdict; it adds 2 LBs but the verdict was already NOT READY).
- MASTER-LAUNCH-PLAN.md § 1.4 workstream reconciliation — adds "Customer-Facing — `CUSTOMER-FACING-PLAN.md`" as a fourth workstream.
- MASTER-LAUNCH-PLAN.md § 2.2 — adds LB-5 and LB-6 rows.
- MASTER-LAUNCH-PLAN.md § 3 burn-down — adds LB-5/LB-6 as independent (parallel to PI-1, LB-1, LB-4).
- MASTER-LAUNCH-PLAN.md § 4 OWNER tasks — adds § 4.6 for `NEXT_PUBLIC_DASHBOARD_URL` env-var setting (the only owner side of LB-5); the existing Housekeeping section renumbers § 4.6 → § 4.7.

The actual edits to MASTER-LAUNCH-PLAN.md ship in this same PR.

---

## 9. Audit source references

Quick-reference index from the 2026-05-19 landing audit to the WS bucket. Original audit lived in the previous session's response only (not previously persisted as a file); reproduced below for traceability:

| Audit ID | Defect | WS item | Bucket |
|---|---|---|---|
| **C-1** | 11 dead in-page anchors (nav + footer → no `id="features"`, `id="how-it-works"`, `id="tracking"` anywhere) | WS-1.2 (LB-6) | LAUNCH-BLOCKER |
| **C-2** | `shadow-brutal-t` is a dead utility (no `--shadow-brutal-t` token) | WS-2A | POST-LAUNCH-POLISH |
| **C-3** | Hero CTA height inconsistency (h-14 LOCATE vs h-12 secondary CTAs) | WS-2A | POST-LAUNCH-POLISH |
| **C-4** | `placeholder:text-muted-foreground/30` ~1.4:1 contrast (WCAG AA fail) | LB-3 (closed 2026-05-19 via PR #179); verify coverage in WS-1 PR | LAUNCH-BLOCKER (closed) |
| **C-5** | Missing closing CTA section (funnel terminates in dead end) | WS-2B | POST-LAUNCH-CONVERSION |
| **R-1** | TacWordmark duplicated in nav + footer | WS-2C | POST-LAUNCH-POLISH (DRY) |
| **R-2** | `http://localhost:3001` hardcoded in PublicNav | WS-1.1 (LB-5) | LAUNCH-BLOCKER |
| **R-3** | `mounted` gate hides entire mobile-menu trigger pre-hydration | WS-2D | POST-LAUNCH-A11Y |
| **R-4** | Hero `<video>` missing `poster`, `aria-label`, no track | WS-2D | POST-LAUNCH-A11Y |
| **R-5** | Raw `<img>` for dock illustration (vs `next/image`) | WS-2D | POST-LAUNCH-PERF |
| **R-6** | Triple-duplicated nav-link class string | WS-2C | POST-LAUNCH-POLISH (DRY) |
| **R-7** | LOCATE form lacks `noValidate` | WS-2D | POST-LAUNCH-POLISH |
| **R-8** | AWB-input + LOCATE-button compose-ability (extract `<AwbInput>`) | WS-2C + WS-3 | POST-LAUNCH (architectural) |
| **R-9** | 8+ motion.div entrances stagger-by-hand (consider section-level stagger) | WS-2D or NOT-A-WS | POST-LAUNCH-POLISH |
| **R-10** | `dark` class hardcoded in RootLayout — theme-flicker risk | WS-2D | POST-LAUNCH-POLISH |

Rubric scorecard from the audit (current state, pre-WS):
```
1. Token Discipline           ▮▮▮▮▮▮▮▮▯▯   8/10
2. Hierarchy by Scale         ▮▮▮▮▮▮▮▮▯▯   8/10
3. Rhythm & Whitespace        ▮▮▮▮▮▮▮▯▯▯   7/10
4. Surface Depth              ▮▮▮▮▮▮▮▮▯▯   8/10
5. Motion Choreography        ▮▮▮▮▮▮▮▮▮▯   9/10
6. Mono Discipline            ▮▮▮▮▮▮▮▮▮▯   9/10
7. State Choreography         ▮▮▮▮▮▯▯▯▯▯   5/10
8. Focus & Hover Polish       ▮▮▮▮▮▮▮▯▯▯   7/10
9. Content Voice              ▮▮▮▮▮▮▮▮▯▯   8/10
10. Anti-AI-Slop              ▮▮▮▮▮▯▯▯▯▯   5/10
TOTAL                                       72/100  ACCEPTABLE
```

Target after WS-1 + WS-2 ships: **≥ 90/100 (PREMIUM)**. The remediation deltas the audit named — covering criterion 7 (states), 10 (anti-slop closing CTA), 3 (rhythm), and 2 (testimonial off-scale) — are all in WS-2's scope and total an estimated +18-20 pts.

---

## 10. Maintenance contract

This file is updated:
- When a WS item closes → flip its bucket to DONE, link the merged PR, retain the row for audit history.
- When a new customer-facing finding surfaces → assign to an existing WS or open WS-5 etc.
- When the audit re-scores the landing → record the new score in § 9 and update the post-WS target.

The customer-facing workstream remains finite and burn-down-able. If the WS count grows past 6 without items closing, that's the trigger to stop adding scope and ship what's already designed.
