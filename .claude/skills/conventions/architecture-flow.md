# Architecture Flow Convention

> Cross-cutting rule. Applies to every task regardless of which specialist skill loaded.
> Authority: `AGENTS.md` § 4 LAW 5 / LAW 6 / LAW 7 / LAW 8.

**Read before writing ANY data-touching code.** This is LAWs 5, 6, 7, 8 in one diagram. Every TAC Express skill that touches data defers to this rule.

## The Flow (inviolable)

```
UI Component (apps/* OR packages/ui/)
   │  props / hooks only — NO business logic, NO DB calls
   ▼
packages/services/   ← business logic per domain
   │  typed function calls only — uses createXxxService(db) factory
   ▼
packages/database/   ← @supabase/* SDK is confined here
   │  factory pattern: createBrowserClient / createServerClient / createAdminClient
   ▼
Supabase (cloud) — Postgres + RLS + Storage + Auth + Edge Functions
```

No skipping. No detours. No shortcuts.

## Hard rules

1. **No `@supabase/*` import outside `packages/database/`** (LAW 8).
   - Enforced by `pnpm audit:auth-boundary` and ESLint `no-restricted-imports`.
2. **No DB call from a component** (LAW 6) — components consume hooks like
   `useShipments()` from `packages/services/hooks/`.
3. **No business logic in a component** (LAW 7) — rate calculations, validations,
   entity merging, status derivation all live in services.
4. **No UI in `apps/*/components/`** (LAW 5) — only providers, app-shell glue,
   and page-level client wrappers belong in apps.
5. **Server components** may call services directly; client components must go through hooks (`use-*`).
6. **Edge functions** (`supabase/functions/*`) are services too — same boundary rules apply.

## Package boundaries (LAW 5)

| Lives in | Examples |
|---|---|
| `packages/ui/` | every UI component, every hook, every icon, every chart primitive, every form field |
| `packages/services/` | all business logic, all data fetching, all RPC wrappers, all derivations |
| `packages/database/` | Supabase client factories (browser, server, middleware, admin), generated types |
| `packages/types/` | branded types, enums, zod schemas |
| `packages/auth/` | signIn / signOut / getSession / role checks |
| `apps/web/` | landing pages, marketing, public surfaces — composed from `@workspace/ui` |
| `apps/dashboard/` | logistics operations — composed from `@workspace/ui` |

`apps/*/components/` is forbidden for UI — that's a LAW 5 violation. Apps consume `@workspace/ui` only.

## Acceptable in `apps/<app>/components/`

Narrow allowlist; everything else is a LAW 5 violation:

- `providers.tsx` (composition of QueryClient + ThemeProvider + Toaster)
- App-shell glue (idle-guard wrapper around a UI component)
- Page-level client wrappers that thread server props into a UI component
- Route-segment `loading.tsx` / `error.tsx` / `not-found.tsx`

## Service factory pattern (memorize)

```ts
// packages/services/src/shipments.service.ts
export function createShipmentsService(db: Database) {
  return {
    list: async (filters: ShipmentFilters) => { /* db.from("shipments")... */ },
    create: async (input: CreateShipmentInput) => { /* validate + insert */ },
    // … all shipment business logic
  }
}

// packages/services/src/hooks/use-shipments.ts
export function useShipments(filters: ShipmentFilters) {
  return useQuery({
    queryKey: ["shipments", filters],
    queryFn: () => createShipmentsService(getBrowserDb()).list(filters),
  })
}
```

Components only ever see the hook.

## Test boundary

Mock at the **services layer**, never inside components. Components get props + mocked service factories.

## Migration / RLS / RPC

Schema changes always include:

1. Migration file in `supabase/migrations/` with timestamp prefix
2. RLS policy (or explicit comment justifying public read)
3. Generated types regen: `pnpm supabase:types`
4. RPC function (if needed) with `SECURITY DEFINER` only when necessary

Never apply a migration to a remote project without local testing first.

## Why this matters

- **RLS by role** — keeping DB access in one place means `packages/database/`
  is the single audit surface for service-role escapes (`tac-supabase-schema`).
- **Type safety** — `pnpm db:generate-types` regenerates `packages/types/database.ts`;
  any service-layer drift is caught at typecheck.
- **Testability** — services accept a `db` argument, so unit tests inject a mock,
  and the same code path runs in browser, server, and edge contexts.
- **No N+1 in components** — when DB is in services, hooks can batch and cache;
  when DB is in components, every render becomes a query.

## Skill chain when touching this flow

| You're changing | Load these skills |
|---|---|
| A component that needs new data | `tac-data-layer` (add hook + service method first) |
| A service method | `tac-data-layer` → `tac-tdd` (test the service in isolation) |
| The DB shape | `tac-supabase-schema` → regenerate types → `tac-data-layer` → `tac-tdd` |
| A new client (browser/server/admin) | `tac-auth` (only place that's allowed to touch this) |

## Anti-patterns

- ❌ `import { createClient } from "@supabase/supabase-js"` in `apps/dashboard/`
- ❌ `await supabase.from("shipments").select()` inside a React component
- ❌ Computing invoice totals inline in `<InvoicePrintView>` — call `invoiceService.compute(input)`
- ❌ A "small one-off" SQL string built in a component "just for this view"

## What to do when in doubt

1. Could a malicious user reach this from the browser without auth? → It needs RLS.
2. Could this hold business rules that may need to change without redeploying? → Move to services.
3. Could a chart in the dashboard share this logic with the marketing page? → Move to `@workspace/ui`.

## Reference

- Skills: `tac-data-layer`, `tac-supabase-schema`, `tac-auth`, `tac-api-surface`
- Memory: `feedback_layer_dependency_direction.md`
- Audits: `pnpm audit:auth-boundary`, `pnpm audit:governance`
