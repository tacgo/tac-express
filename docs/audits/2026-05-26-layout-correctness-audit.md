# Layout Correctness Audit — 2026-05-26

> **Session type:** Read-only audit. No code was changed.
> **Scope:** Every route under `apps/dashboard/app/ops-console/`
> **Auditor:** Claude Sonnet 4.6 via static code read — no browser run.
> **Deliverable:** Findings per route + synthesis section for Phase B planning.

---

## Audit Methodology

Each route is evaluated against three primary categories:

| Code | Category | Pass condition |
|------|----------|---------------|
| **A** | Empty-state centering | Empty/error state is visually centered within the full table width |
| **B** | Table right-edge treatment | Table columns fill the available container width; no dead space at the right edge |
| **C** | Content centering / max-width | Page content is centred with an appropriate max-width; not sprawling to the shell edge |

A fourth observation column captures other layout concerns (LAW violations, pattern inconsistencies, missing shells).

Rating scale: **PASS** / **FAIL** / **N/A** (no table) / **MINOR** (technically passes but inconsistent with the system pattern).

---

## Shell-tier context (reference)

```
OpsShell
  └── <main>
        └── opsContentVariants()   ← max-w-control (1600px), mx-auto, px-6 py-6
              └── [page content]   ← every route renders inside this wrapper
```

The page tier (`PageShell`) further constrains:
- Default (`content`) → `max-w-page-content` (1280px), `mx-auto w-full`
- `wide` → `max-w-page-wide` (1536px), `mx-auto w-full`

Routes without a `PageShell` are bounded only by the shell-tier 1600px cap.

---

## Route Group 1 — Dashboard

### `/ops-console` (index)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsDashboard` |

**Other observations:** Correct. KPI grid, chart cards, activity feed all within `PageShell`. No issues.

---

## Route Group 2 — Shipments

### `/ops-console/shipments` (list)

| Cat | Result | Notes |
|-----|--------|-------|
| A | **FAIL** | `DataTable` empty-state `<tr>` uses `col-span-full grid` (not `grid-cols-subgrid`). Column tracks are `minmax(min-content, auto)` — they don't fill to `w-full`. Empty-state cell doesn't reach the visual right edge. |
| B | **FAIL** | Last column (`age`) renders narrower than the right chrome edge. No `1fr` column to absorb the residual space. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsShipments` |

**Source:** `packages/ui/src/components/composed/shipments/v7-ops-shipments.tsx`

---

### `/ops-console/shipments/[id]` (detail)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `DetailShell` wraps in `PageShell width="wide"` |

---

### `/ops-console/shipments/create`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | **FAIL** | No `PageShell`. `OpsCreateShipmentLive` renders `<V7CreateShipmentWizard />` directly. Wizard root is `<div className="flex flex-col gap-8">`. Inner `FormCard maxWidth="md"` has no `mx-auto` — renders left-aligned at `max-w-field-md` from the left edge. |

**Source:** `apps/dashboard/app/ops-console/shipments/create/ops-create-shipment-live.tsx`, `packages/ui/src/components/composed/shipments/v7-create-shipment-wizard.tsx:215`

---

### `/ops-console/shipments/import`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable (custom preview table) |
| B | MINOR | Custom row preview table uses `grid-cols-[60px_120px_1fr]` — LAW 11 violation (arbitrary pixel values) |
| C | **FAIL** | `BulkImportClient` root is `<div className="space-y-6">`. No `PageShell`. Content bounded only by shell-tier 1600px. |

**Source:** `apps/dashboard/app/ops-console/shipments/import/bulk-import-client.tsx`

---

## Route Group 3 — Manifests

### `/ops-console/manifests` (list)

| Cat | Result | Notes |
|-----|--------|-------|
| A | **FAIL** | Same `DataTable` empty-state `<tr>` defect as shipments list. |
| B | **FAIL** | Manifest ID column narrow; right dead space visible when list is short. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsManifests` |

**Source:** `packages/ui/src/components/composed/manifests/v7-ops-manifests.tsx`

---

### `/ops-console/manifests/[id]` (detail)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `DetailShell` wraps in `PageShell width="wide"` via `ops-manifest-detail-live.tsx` |

---

### `/ops-console/manifests/create`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | **FAIL** | `OpsCreateManifestLive` renders `<ManifestBuilderWizard />` directly (no `PageShell`). Wizard root is `<div className="flex flex-col gap-8">`. No max-width narrowing beyond shell-tier 1600px. The 3-step form (Setup → Add Shipments → Review) sprawls full shell width on large screens. |

**Source:** `apps/dashboard/app/ops-console/manifests/create/ops-create-manifest-live.tsx:131-132`, `packages/ui/src/components/composed/manifests/manifest-builder/manifest-builder-wizard.tsx:174-177`

---

## Route Group 4 — Customers

### `/ops-console/customers` (list)

| Cat | Result | Notes |
|-----|--------|-------|
| A | **FAIL** | Same `DataTable` empty-state `<tr>` defect. |
| B | **FAIL** | Numeric columns (`shipments`, `revenue`, `outstanding`) render narrow. Right edge gap visible. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsCustomers` |

**Source:** `packages/ui/src/components/composed/customers/v7-ops-customers.tsx`

---

### `/ops-console/customers/[id]` (detail)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | MINOR | `CustomerDetailClient` root is `<div className="max-w-5xl mx-auto space-y-5">`. Has centering (`mx-auto`) so content doesn't sprawl, but uses an ad-hoc `max-w-5xl` rather than `DetailShell` (the canonical pattern used by shipments/[id], manifests/[id], finance/[id]). |

**Source:** `apps/dashboard/app/ops-console/customers/[id]/customer-detail-client.tsx:157`

---

### `/ops-console/customers/create`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | **FAIL** | `OpsCreateCustomerLive` renders `<V7CustomerForm />` directly. `V7CustomerForm` uses `FormCard maxWidth="md"` — no `mx-auto` in `FormCard`. Renders left-aligned. No `PageShell`. |

**Source:** `apps/dashboard/app/ops-console/customers/create/ops-create-customer-live.tsx:43-44`, `packages/ui/src/components/composed/customers/v7-customer-form.tsx`

---

## Route Group 5 — Rate Cards

### `/ops-console/rates` (list)

| Cat | Result | Notes |
|-----|--------|-------|
| A | **FAIL** | Same `DataTable` empty-state `<tr>` defect. |
| B | **FAIL** | All rate-card columns are numeric/short (route codes, ₹ values, percentages). Sum of `min-content` tracks is well short of the container width on any screen > ~900px. Right dead space pronounced. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsRateCards` |

**Source:** `packages/ui/src/components/composed/rates/v7-ops-rate-cards.tsx`

---

### `/ops-console/rates/create`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | **FAIL** | `OpsCreateRateCardLive` renders `<V7RateCardForm />` directly. `FormCard maxWidth="lg"` has no `mx-auto`. Left-aligned on wide screens. No `PageShell`. |

**Source:** `apps/dashboard/app/ops-console/rates/create/ops-create-rate-card-live.tsx:42`, `packages/ui/src/components/composed/rates/v7-rate-card-form.tsx:70-75`

---

## Route Group 6 — Analytics

### `/ops-console/analytics`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsAnalytics` |

**Other observations:** No issues. Chart grid + KPI cards all within `PageShell`.

---

## Route Group 7 — Exceptions

### `/ops-console/exceptions` (list)

| Cat | Result | Notes |
|-----|--------|-------|
| A | PASS | `V7OpsExceptions` uses a raw `<table>` (not `DataTable`). Empty state is a `<div className="flex flex-col items-center text-center gap-2 max-w-sm mx-auto py-12">` — has `mx-auto`, centers correctly within the table's normal table-layout rendering. |
| B | PASS | Raw `<table>` with `w-full` on the `<table>` element — normal table layout stretches columns to fill width natively. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsExceptions` |

---

### `/ops-console/exceptions/[id]` (detail)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | MINOR | `ExceptionDetailClient` root is `<div className="max-w-4xl mx-auto space-y-5">`. Has `mx-auto` centering — does not sprawl. Same pattern deviation as `customers/[id]`: ad-hoc max-width instead of `DetailShell`. |

**Source:** `apps/dashboard/app/ops-console/exceptions/[id]/exception-detail-client.tsx:44`

---

## Route Group 8 — Finance

### `/ops-console/finance` (list)

| Cat | Result | Notes |
|-----|--------|-------|
| A | MINOR | No `DataTable`. Uses a `div`-based list of invoice cards. Empty finance state renders `<p className="t-caption text-muted-foreground">No invoices to display.</p>` inline — not visually centred. Not the DataTable subgrid bug, but still an empty-state centering gap. |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsFinance` |

---

### `/ops-console/finance/[id]` (detail)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | PASS | `DetailShell` via `ops-invoice-detail-live.tsx` → `PageShell width="wide"` |

---

### `/ops-console/finance/create`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No table |
| B | N/A | No table |
| C | **FAIL** | `OpsCreateInvoiceLive` renders `<PageHeader>` + `<InvoiceWizard>` directly. No `PageShell` anywhere in the tree. `InvoiceWizard` root is `<div className="space-y-8">` — no `max-w-*`, no `mx-auto`. The 4-step wizard (Basics → Parties → Cargo → Charges) stretches to the full 1600px shell-tier cap on wide screens. This is the most severe layout failure among create pages. |

**Source:** `apps/dashboard/app/ops-console/finance/create/ops-create-invoice-live.tsx:291`, `packages/ui/src/components/composed/finance/invoice-wizard.tsx:1088`

---

## Route Group 9 — Inventory

### `/ops-console/inventory`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable (uses hub-card grid layout) |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsInventory` |

---

## Route Group 10 — Scanning

### `/ops-console/scanning`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsScanning` |

**Other observations:** Scan feed empty state uses a `<div className="flex-1 grid place-items-center text-center">` inside a `SurfaceCard` — correctly centered within its card container.

---

## Route Group 11 — Management

### `/ops-console/management`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | Staff table uses `StaffTable` component (separate primitive, not audited for subgrid defect here) |
| B | N/A | Same — not a DataTable |
| C | MINOR | `ManagementClient` uses `<PageShell>` with no `width` prop. Default resolves to `content` = `max-w-page-content` (1280px). Every other v7 list/console page uses `width="wide"` (1536px). The route renders narrower than its siblings — content is centred but the cap is 256px tighter than expected. |

**Source:** `apps/dashboard/app/ops-console/management/management-client.tsx:172`

---

## Route Group 12 — Notifications

### `/ops-console/notifications`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable (SurfaceCard inbox with custom empty state) |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsNotifications` |

**Other observations:** `NotificationsEmpty` component uses `<div className="min-h-[length:var(--spacing-chart-md)] grid place-items-center text-center">` — correctly centered within the card.

---

## Route Group 13 — Settings

### `/ops-console/settings` (main)

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsSettings` |

---

### `/ops-console/settings/api-keys`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | **FAIL** | `ApiKeysClient` root is `<div className="space-y-6">`. No `PageShell`. Content bounded by shell-tier 1600px only. |

**Source:** `apps/dashboard/app/ops-console/settings/api-keys/api-keys-client.tsx`

---

### `/ops-console/settings/webhooks`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | **FAIL** | `WebhooksClient` root is `<div className="space-y-6">`. No `PageShell`. Content bounded by shell-tier 1600px only. |

**Source:** `apps/dashboard/app/ops-console/settings/webhooks/webhooks-client.tsx`

---

## Route Group 14 — Support

### `/ops-console/support` (contact inbox)

| Cat | Result | Notes |
|-----|--------|-------|
| A | PASS | `V7ContactLeads` uses a raw `<table>` (not `DataTable`). Empty state uses `EmptyState` primitive within a `<td colSpan={6}>` — centres via the `EmptyState` component's own flex centering. |
| B | PASS | Raw `<table className="w-full border-collapse">` — normal table-layout fills to container width. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7ContactLeads` |

---

## Route Group 15 — Audit Log

### `/ops-console/audit`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | Custom CSS subgrid table, not `DataTable` |
| B | **FAIL** | Custom grid `grid-cols-[150px_110px_140px_1fr_140px_140px_32px]` — LAW 11 violation (arbitrary pixel values in Tailwind class). |
| C | **FAIL** | `AuditClient` root is `<div className="space-y-6">`. No `PageShell`. Bounded by shell-tier 1600px. |

**Other observations:** Also has `style={{ minWidth: "260px" }}` on the search wrapper — another LAW 11 violation (inline arbitrary px value). Two separate violations.

**Source:** `apps/dashboard/app/ops-console/audit/audit-client.tsx`

---

## Route Group 16 — Arrival Audit

### `/ops-console/arrival-audit`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | **FAIL** | `ArrivalAuditClient` root is `<div className="space-y-6">`. No `PageShell`. Bounded by shell-tier 1600px. |

**Source:** `apps/dashboard/app/ops-console/arrival-audit/arrival-audit-client.tsx`

---

## Route Group 17 — Bookings

### `/ops-console/bookings`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | **FAIL** | `BookingsClient` root is `<div className="space-y-6">`. No `PageShell`. Bounded by shell-tier 1600px. |

**Source:** `apps/dashboard/app/ops-console/bookings/bookings-client.tsx`

---

## Route Group 18 — Shift Report

### `/ops-console/shift-report`

| Cat | Result | Notes |
|-----|--------|-------|
| A | N/A | No DataTable |
| B | N/A | No table |
| C | PASS | `PageShell width="wide"` (1536px) via `ShiftReportClient` |

---

## Route Group 19 — WhatsApp Failed Sends

### `/ops-console/whatsapp/failed-sends`

| Cat | Result | Notes |
|-----|--------|-------|
| A | PASS | `V7OpsWhatsAppFailedSends` uses `EmptyState` primitive within a `SurfaceCard` when `rows.length === 0` — correctly centered within the card. |
| B | N/A | `FailedSendsTable` uses a raw `<table>` (not `DataTable` subgrid). Fills width natively. |
| C | PASS | `PageShell width="wide"` (1536px) via `V7OpsWhatsAppFailedSends` |

---

## Finding Summary Table

| Route | Cat A (empty-state) | Cat B (right-edge) | Cat C (centering) |
|-------|--------------------|--------------------|-------------------|
| `/ops-console` | N/A | N/A | PASS |
| `/ops-console/shipments` | **FAIL** | **FAIL** | PASS |
| `/ops-console/shipments/[id]` | N/A | N/A | PASS |
| `/ops-console/shipments/create` | N/A | N/A | **FAIL** |
| `/ops-console/shipments/import` | N/A | MINOR (LAW 11) | **FAIL** |
| `/ops-console/manifests` | **FAIL** | **FAIL** | PASS |
| `/ops-console/manifests/[id]` | N/A | N/A | PASS |
| `/ops-console/manifests/create` | N/A | N/A | **FAIL** |
| `/ops-console/customers` | **FAIL** | **FAIL** | PASS |
| `/ops-console/customers/[id]` | N/A | N/A | MINOR |
| `/ops-console/customers/create` | N/A | N/A | **FAIL** |
| `/ops-console/rates` | **FAIL** | **FAIL** | PASS |
| `/ops-console/rates/create` | N/A | N/A | **FAIL** |
| `/ops-console/analytics` | N/A | N/A | PASS |
| `/ops-console/exceptions` | PASS | PASS | PASS |
| `/ops-console/exceptions/[id]` | N/A | N/A | MINOR |
| `/ops-console/finance` | MINOR | N/A | PASS |
| `/ops-console/finance/[id]` | N/A | N/A | PASS |
| `/ops-console/finance/create` | N/A | N/A | **FAIL** |
| `/ops-console/inventory` | N/A | N/A | PASS |
| `/ops-console/scanning` | N/A | N/A | PASS |
| `/ops-console/management` | N/A | N/A | MINOR |
| `/ops-console/notifications` | N/A | N/A | PASS |
| `/ops-console/settings` | N/A | N/A | PASS |
| `/ops-console/settings/api-keys` | N/A | N/A | **FAIL** |
| `/ops-console/settings/webhooks` | N/A | N/A | **FAIL** |
| `/ops-console/support` | PASS | PASS | PASS |
| `/ops-console/audit` | N/A | **FAIL** (LAW 11) | **FAIL** |
| `/ops-console/arrival-audit` | N/A | N/A | **FAIL** |
| `/ops-console/bookings` | N/A | N/A | **FAIL** |
| `/ops-console/shift-report` | N/A | N/A | PASS |
| `/ops-console/whatsapp/failed-sends` | PASS | N/A | PASS |

**Counts:**
- **Cat A FAIL:** 4 routes (shipments, manifests, customers, rates)
- **Cat B FAIL:** 4 routes (shipments, manifests, customers, rates) — same 4 as Cat A
- **Cat C FAIL:** 11 routes
- **MINOR:** 4 routes (customers/[id], exceptions/[id], finance list empty state, management width)
- **Clean PASS (all applicable categories):** 17 routes

---

## SYNTHESIS

### Root Cause RC-1 — DataTable subgrid empty-state span bug

**Affects:** 4 routes (shipments, manifests, customers, rates)
**File:** `packages/ui/src/components/composed/data-table.tsx`

The `DataTable` renders its table as a CSS Grid (`<table className="grid w-full">`). Column tracks are built from `column.columnDef.size ? "${size}px" : "minmax(min-content, auto)"`. When no column has a fixed size, every column uses `minmax(min-content, auto)`, which sizes to content width only.

The empty-state row is:
```tsx
<tr role="row" className="col-span-full grid">
```
This does **not** specify `grid-cols-subgrid`. It creates a new 1-column implicit grid. `col-span-full` inside that implicit grid spans only the sum of `min-content` column widths — which is narrower than the visual `w-full` table boundary. The inner `flex items-center justify-center` then centres within this narrower span, not within the table chrome.

**Cascade:** All four DataTable routes exhibit identical Cat A + Cat B failures simultaneously, because both symptoms share the same root: `minmax(min-content, auto)` tracks that don't fill available width.

**Fix shape (Phase B — 1 file, cascades to 4 routes):** In `data-table.tsx`:
1. Change empty-state `<tr>` to `className="col-span-full grid grid-cols-subgrid"` so the empty-state row inherits the parent subgrid columns.
2. Change the `<td>` inside to `col-span-full` (it already has this).
3. For the right-edge issue, add a `flex-1` / `1fr` sentinel column (a zero-width spacer column at the end) or change the last real column's size formula to use `minmax(min-content, 1fr)`.

**Risk:** Low — single primitive. Change cannot break consumers that populate the table (those rows use `grid-cols-subgrid` already on `<tr>`).

---

### Root Cause RC-2 — FormCard missing `mx-auto`

**Affects:** 5 create routes (shipments/create, customers/create, rates/create + any other `FormCard` consumer)
**File:** `packages/ui/src/components/composed/forms/form-primitives.tsx`

`FormCard` CVA definition applies `max-w-*` via the `maxWidth` variant but never includes `mx-auto`. A block element with only `max-w-*` renders left-aligned; `mx-auto` is required for centering.

```tsx
// Current — width cap but no centering:
"flex flex-col gap-8 border border-border bg-card ... max-w-{sm|md|lg}"

// Required:
"flex flex-col gap-8 border border-border bg-card ... mx-auto max-w-{sm|md|lg}"
```

**Cascade:** Every `FormCard` consumer is affected. `V7CustomerForm`, `V7RateCardForm`, and `V7CreateShipmentWizard` all exhibit the left-alignment symptom.

**Fix shape (Phase B — 1 file, cascades to ≥3 create routes):** Add `mx-auto` to the base classes in `FormCard`'s CVA definition.

**Risk:** Low — `mx-auto` on a `max-w-*` block element only affects alignment when the element is narrower than its container. Any existing consumer that explicitly provides centering will be unaffected. Any consumer in a full-width context (no max-w) will also be unaffected (auto margins collapse to 0 on a full-width block).

---

### Root Cause RC-3 — Create pages missing PageShell

**Affects:** 6 create/wizard routes + 5 sub-routes lacking a shell
**Files:** Multiple `*-live.tsx` wrappers in `apps/dashboard/`

The pattern for list pages is `PageShell width="wide"` wrapping the v7 view component. The pattern for detail pages is `DetailShell`. But 11 routes — almost all create pages and several operational sub-routes — render their content directly without any `PageShell` wrapper:

| Route | Missing shell type |
|-------|--------------------|
| `/ops-console/shipments/create` | `PageShell` (create pattern) |
| `/ops-console/shipments/import` | `PageShell` (create pattern) |
| `/ops-console/manifests/create` | `PageShell` (create pattern) |
| `/ops-console/customers/create` | `PageShell` (create pattern) |
| `/ops-console/rates/create` | `PageShell` (create pattern) |
| `/ops-console/finance/create` | `PageShell` (create/wizard — most severe; full 1600px sprawl) |
| `/ops-console/audit` | `PageShell` |
| `/ops-console/arrival-audit` | `PageShell` |
| `/ops-console/bookings` | `PageShell` |
| `/ops-console/settings/api-keys` | `PageShell` |
| `/ops-console/settings/webhooks` | `PageShell` |

**Fix shape (Phase C — surgical, per-route):** Wrap each live wrapper's return in `<PageShell width="wide">...</PageShell>`. For create pages with a `PageHeader` inside the wizard/form component, the `PageHeader` should remain inside `PageShell` (it already is, for the routes that use `V7CreateShipmentWizard` — the wizard renders `PageHeader` via the `FormCard` pattern's implied context). For `OpsCreateInvoiceLive`, move the `PageHeader` render inside a new `PageShell` wrapper at the live wrapper level.

**Risk:** Low for simple `space-y-6` wrappers (pure wrapper addition). Medium for `finance/create` (the invoice wizard is wide by design — assess whether a `width="wide"` or narrower `width="content"` shell is more appropriate for a 4-step financial wizard).

---

### Root Cause RC-4 — Detail page pattern inconsistency (minor)

**Affects:** 2 detail routes
**Files:** `customers/[id]/customer-detail-client.tsx`, `exceptions/[id]/exception-detail-client.tsx`

Both routes use ad-hoc `max-w-{4xl|5xl} mx-auto` instead of `DetailShell`. They do centre content correctly (technically PASS for Cat C) but deviate from the canonical detail pattern used by shipments/[id], manifests/[id], and finance/[id].

**Fix shape (Phase C, optional):** Migrate both clients to use `DetailShell`. Low priority — no visible defect, only pattern consistency.

---

### Root Cause RC-5 — Management route width mismatch (minor)

**Affects:** 1 route
**File:** `apps/dashboard/app/ops-console/management/management-client.tsx:172`

`ManagementClient` uses `<PageShell>` (default = `content` = 1280px). All sibling v7 console pages use `width="wide"` (1536px). The content centres correctly but is 256px narrower than every adjacent route.

**Fix shape (Phase B or C):** Change to `<PageShell width="wide">`.

---

### Fix Order Recommendation

**Phase B — Primitive fixes (1–2 files, high cascade value):**

1. **`data-table.tsx` empty-state row** — fix `grid-cols-subgrid` on empty `<tr>` and introduce a flex-fill mechanism for the last column. Eliminates all 4 Cat A + 4 Cat B failures in a single commit.

2. **`form-primitives.tsx` FormCard `mx-auto`** — add `mx-auto` to base CVA classes. Eliminates Cat C failures on all create pages that use `FormCard`.

3. **`management/management-client.tsx` width** — change `<PageShell>` to `<PageShell width="wide">`. Single-line fix.

**Phase C — Surgical per-route fixes (11 files, wrapper additions):**

4. Wrap `OpsCreateShipmentLive`, `OpsCreateManifestLive`, `OpsCreateCustomerLive`, `OpsCreateRateCardLive` returns in `<PageShell width="wide">`.
5. Wrap `OpsCreateInvoiceLive` return in `<PageShell width="wide">` (also evaluate whether `width="content"` is more appropriate for the financial wizard).
6. Wrap `BulkImportClient`, `AuditClient`, `ArrivalAuditClient`, `BookingsClient`, `ApiKeysClient`, `WebhooksClient` returns in `<PageShell width="wide">`.
7. Additionally fix LAW 11 violations in `AuditClient` (`grid-cols-[150px_110px_140px_1fr_140px_140px_32px]`, `style={{ minWidth: "260px" }}`).

**Phase C (optional):** Migrate `CustomerDetailClient` and `ExceptionDetailClient` from ad-hoc `max-w-*xl mx-auto` to `DetailShell`.

---

### Issues Requiring Per-Page Treatment

The following cannot be fixed by the Phase B primitive changes alone and need individual attention:

| Route | Why |
|-------|-----|
| `/ops-console/finance/create` | `InvoiceWizard` itself has no max-width; wrapping in `PageShell` alone may not be enough — the wizard's per-step `<div className="space-y-6 grid ...">` grids are already full-width responsive but the overall wizard container may benefit from `max-w-3xl` treatment. |
| `/ops-console/audit` | LAW 11 violations are independent of the layout wrapper issue — they require grid refactor to semantic spacing tokens. |
| `/ops-console/shipments/import` | The custom preview row grid (`grid-cols-[60px_120px_1fr]`) is a LAW 11 violation independent of the PageShell gap. |
| `/ops-console/manifests/create` | `ManifestBuilderWizard`'s step 2 (Add Shipments) contains a scan AWB input + running table — needs a scan-focused layout assessment, not just a shell wrap. |
