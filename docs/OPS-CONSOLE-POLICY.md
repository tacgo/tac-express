# Ops Console — Production Policy

> **Status:** PROMOTED — `/ops-console` is the default dashboard surface as of May 11 2026.
> **Date established:** 2026-05-11 (PREVIEW) · **Promoted:** 2026-05-11
> **Authority:** PM decision · `AGENTS.md` v8 · `docs/VIOLET-GRID-QUALITY.md`

---

## What this document decides

The Paper Ops Console (warm cream / midnight ink, Inter + JetBrains Mono + Instrument Serif, hatch stripes, corner brackets — imported from the Anthropic Design handoff, May 2026) was implemented as a **complete, live-data alternate visual mode** for the dashboard app.

**Promotion (May 11 2026, same day as PREVIEW landing):** The user explicitly invoked PM-decide authority and signaled they couldn't find the new design at the dashboard root. The PREVIEW criteria below were aspirational; the actual signal was the user importing the design handoff and asking for it to be the dashboard. The two-stack policy was retired in favor of a single promoted surface — with a clean rollback path preserved.

Both stacks still share the data layer (`useShipments`, `useManifests`, `useDashboardKPIs`, etc.) — only the routing layer flipped.

---

## The current state (PROMOTED)

1. **`/ops-console/*` is the default dashboard.** `proxy.ts` (the Next.js 16 middleware) intercepts the 13 legacy top-level list paths and redirects them to their `/ops-console/*` equivalents. `/` → `/ops-console` is the root behavior.
2. **Detail / create / wizard / print routes still render v6.** `proxy.ts` redirects EXACT pathname matches only — `/shipments/abc123`, `/shipments/create`, `/manifests/[id]`, `/print/label/*`, `/settings/api-keys`, `/sign-in`, `/track/*`, etc. continue to serve the existing Violet Grid v6 surfaces. The paper console doesn't have paper equivalents for those flows yet.
3. **Same data layer.** Both stacks consume `@workspace/services` hooks identically. Breaking a hook signature breaks both surfaces.
4. **The C/M/S theme toggle on the paper topbar drives `next-themes`.** Cream (`C`) = light, Midnight (`M`) = dark, System (`S`) = follow OS. Tokens for both modes live in `packages/ui/src/styles/globals.css` under the `--paper-*` namespace.
5. **Violet Grid v6 surfaces never import paper-* tokens.** The `.ops-console` class on `OpsShell` scopes paper tokens — they cannot bleed into the v6 detail/create surfaces that remain in service.
6. **Rollback in two changes.** Delete the `LEGACY_TO_OPS_CONSOLE` map + redirect block at the top of `proxy.ts`, and change `apps/dashboard/app/(dashboard)/page.tsx` back to `redirect("/home")`. Done. v6 routes were never removed; they're just unreachable via their public URLs.

## When to promote the Ops Console to default

Promote `/ops-console` to the default dashboard surface (replacing or aliasing the existing v6 routes) **only when ALL of the following hold**:

| Criterion | Why |
|---|---|
| ≥ 2 operators have logged ≥ 1 full shift on the paper console | Hub operators are the actual users — opinions from non-operators don't count |
| The Midnight palette has been validated in a low-light hub (warehouse / late dispatch) | The whole reason Midnight exists; cream UIs are hard to read at 2 AM in a dim room |
| All 13 routes pass `tac-ui-rubric` ≥ 90 | Same quality bar as v6 surfaces |
| `docs/UI-AUDIT-BASELINE.md` has a paper-console baseline section | We track the score over time, same as v6 |
| `docs/VIOLET-GRID-QUALITY.md` has a paper companion (banned patterns adapted) | Anti-template enforcement is mode-specific |
| Print routes (`/print/label`, `/print/invoice`, `/print/manifest`) remain on the v6 print tokens | Paper labels print physically — they ignore screen themes |

## What's explicitly NOT allowed

- **Mixing tokens.** No `bg-paper-bg` in `apps/dashboard/app/(dashboard)/*` routes. No `bg-card` in `apps/dashboard/app/ops-console/*` routes.
- **Forking domain types.** Both stacks consume `@workspace/types` directly. Don't introduce a `PaperShipmentRow` that diverges from `ShipmentSummary` — keep the mapping in the Live wrapper.
- **Two parallel sets of business logic.** Hooks and services stay in `packages/services`. Both visual stacks call them the same way.
- **Hero images in Violet Grid.** The paper console has a single permitted hero illustration slot (the dashboard banner). v6 surfaces don't get one.

---

## Migration path if the paper console wins

If the criteria above are met and the team decides to promote paper to default:

1. **Add an `OPS_CONSOLE_DEFAULT` flag** (env var or runtime) to the dashboard middleware.
2. **Middleware rewrites** unflagged users from `/home` → `/ops-console`, `/shipments` → `/ops-console/shipments`, etc.
3. **Feature flag rollout**: 10% → 50% → 100% over 2-week windows. Monitor error rates + session-length per cohort.
4. **At 100% on the flag for 4 weeks**, retire the v6 routes (or alias them to redirects).
5. **Archive `apps/dashboard/app/(dashboard)/` route group + the Violet Grid v6 surface tokens to `.archive/`** (mirroring how `.agents/` and `.agent/` were retired in the May 2026 consolidation).

If the criteria are *not* met after a reasonable validation window (target: 60 days from this doc's date), the paper console is **retired**:

1. Archive `apps/dashboard/app/ops-console/`, `packages/ui/src/components/composed/ops-console/`, and the `--paper-*` tokens from `globals.css` to `.archive/design-bundle-paper-ops-console/`.
2. Document the decision in this file's history section.
3. Remove the Inter + JetBrains Mono + Instrument Serif font loads from `apps/dashboard/app/layout.tsx`.

---

## Implementation notes (for future maintainers)

### Tokens

- `--paper-*` light values declared in `:root` (`globals.css` § "PAPER OPS CONSOLE — additive design mode").
- `--paper-*` dark values declared in `.dark` (same file, "Midnight palette" block). Switches via `next-themes`.
- `--paper-card` is the only token that legitimately holds a literal hex (white in light, ink in dark) — every other surface, text, and border references the named OKLCH tokens.

### Components

All paper primitives live in `packages/ui/src/components/composed/ops-console/`:

```
ops-shell.tsx        OpsShell           App shell — sidebar + topbar + content
ops-sidebar.tsx      OpsSidebar         3 nav groups + footer + user
ops-topbar.tsx       OpsTopbar          Breadcrumbs + C/M/S + bell + avatar
ops-frame.tsx        OpsFrame           Bordered frame with hatch + ticks
ops-page-head.tsx    OpsPageHead        Eyebrow + h1 + sub + actions
ops-button.tsx       OpsButton          CVA: default/primary/ghost/tab/danger/dark
ops-badge.tsx        OpsBadge           CVA: neutral/ok/warn/err/violet/info
ops-card.tsx         OpsCard            1px border + optional violet underline + ticks
ops-stat-card.tsx    OpsStatCard        Violet-underline KPI tile
ops-tabs.tsx         OpsTabs            Mono uppercase tab pills
ops-table.tsx        OpsTable + parts   Paper table with mono headers
ops-field.tsx        OpsFieldInput/...  Form inputs + select + label
ops-kbd.tsx          OpsKbd             Keyboard shortcut chip
ops-dashboard.tsx    OpsDashboard       Dashboard composition (hero + KPIs + detail)
pages/*.tsx          Ops<Page>View      11 page view components (props-only, no hooks)
```

### Live wrappers (`apps/dashboard/app/ops-console/<route>/ops-<route>-live.tsx`)

Each live wrapper imports the appropriate `@workspace/services/hooks/use-*` hook, maps the domain types (e.g. `ShipmentSummary`) to the view-component row types (e.g. `ShipmentRow`), and renders the view. The page.tsx file is a thin server component that delegates to the live wrapper.

Pattern:

```tsx
// page.tsx
import { OpsXxxLive } from "./ops-xxx-live"
export const dynamic = "force-dynamic"
export default function Page() { return <OpsXxxLive /> }

// ops-xxx-live.tsx
"use client"
export function OpsXxxLive() {
  const { data = [] } = useXxx(filters)
  return <OpsXxxView rows={data.map(toRow)} />
}
```

### What's NOT yet live

- The hero illustration on `/ops-console` is a placeholder painterly SVG. Replace with the real `dashboard-hero.png` asset when available.
- The shipment service column in the table currently fixes to `"STD"` — wire `shipment.serviceLevel` through `ShipmentSummary` to drive STD/PRIORITY/EXPRESS dynamically.
- Exceptions view repurposes `sender`/`receiver` columns to surface `severity`/`type` — by design (the underlying summary doesn't carry sender/receiver). Consider renaming the columns once UX confirms.
- Customer "outstanding" is computed as `revenue - revenue = 0` since `outstandingAmount` isn't on the `Customer` type yet. Add the field server-side when needed.

---

## History

- **2026-05-11 (initial)**: Paper Ops Console implementation. 13 routes, all wired to live data via `*-live.tsx` wrappers. Midnight dark palette added. Theme toggle wired to `next-themes`. Decision: parallel route, PREVIEW status.
- **2026-05-11 (same day promotion)**: User signaled they couldn't find the new UI at the dashboard root. PM decision: promote `/ops-console` to default via `proxy.ts` redirect map. 13 legacy top-level list paths now redirect to their paper equivalents; detail/create/print/auth routes preserved on v6 for deep-link compatibility. Rollback = remove the map.
