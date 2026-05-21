# Invoice data model

Decision record for issue #10 — billing-address sources of truth.

## Status

**Active. Decided 2026-05-08.** Captures the current state + the path
to the canonical state.

## Background

PR #8 introduced structured billing fields
(`billingLine1/Line2/City/State/Zip`) alongside the legacy joined
`billingAddress` string. Both are persisted in the invoice's `notes`
JSON. Reconciliation logic spans three layers:

- `joinBillingAddress()` in `packages/ui/src/components/composed/finance/invoice-wizard.tsx`
- `normalizeBillingDraft()` in `@workspace/services/invoice-draft.service`
  (extracted in PR #25's reference migration)
- The wizard's `SmartAddressFields` `onChange` handler

Issue #10 framed this as "two sources of truth". The actual current
state is narrower than that label suggests:

- **Writes** persist BOTH `notes.billingAddress` (joined string) AND
  `notes.billing` (structured object) on every invoice save.
- **Reads** use ONLY `notes.billingAddress`. The structured fields
  are write-only — persisted but unused at read time. (Three read
  sites confirm: `apps/dashboard/app/(dashboard)/finance/[id]/invoice-detail-client.tsx`,
  `apps/dashboard/app/api/whatsapp/send-invoice/route.ts`,
  `apps/dashboard/app/print/invoice/[id]/page.tsx`.)
- **Drift risk** is currently nil: both writes flow from the same
  wizard state, so they can't disagree.

## Decision

**Structured fields become canonical** (Option A from #10). Phased so
existing data stays readable throughout.

### Phase 1 — already done (this doc)

- Document the decision (this file).
- Codebase continues to dual-write. Read paths continue to consume
  the joined string. Status quo, just understood.

### Phase 2 — read-side migration (follow-up PR, not yet landed)

- Update each of the three read sites to prefer structured
  `notes.billing.*` over legacy `notes.billingAddress`. When the
  structured object is present, join inline at render time. When
  only the legacy string is present, use it.
- Deletes the implicit dependency on the wizard's `joinBillingAddress`
  for round-tripping write-then-read; the joiner becomes a
  display-time utility called only by render code.
- Risk is small: new code path is gated by `notes.billing != null`,
  legacy path stays intact.

### Phase 3 — write-side migration + cleanup (depends on Phase 2)

- Stop persisting `notes.billingAddress` to new invoices. Wizard
  writes only `notes.billing` (structured).
- One-shot SQL migration that walks existing rows: parse
  `notes.billingAddress` strings into structured
  `{line1, line2, city, state, zip}` (best-effort:
  comma-separated, last token = PIN, second-last = state, etc.)
  and write `notes.billing`. Leave `notes.billingAddress` in place
  for any consumers we missed in Phase 2.
- After ≥7 days of clean reads, a follow-up SQL migration drops
  `notes.billingAddress` from all rows.

### Why phase rather than big-bang

The naive "delete all the legacy code" PR would (a) require the SQL
migration to land first, (b) risk breaking an unmigrated test
environment, (c) make rollback harder. The phased path lets each
step land + soak independently.

## Why not Option B (joined string canonical)

Option B (legacy string is canonical, parse-on-edit lazily) is
cheaper short-term but loses queryable structure. The roadmap has
city/state breakdowns (analytics dashboard), GST jurisdiction
inference (auto-IGST detection per state), and customer-portal
self-service (where a structured edit form is the right shape).
Option A pays its complexity tax once; Option B would pay it per
feature.

## Related

- Issue #10 — original framing
- Issue #25 — RHF+zod migration (introduced `normalizeBillingDraft`
  utility that handles legacy-only drafts at read time)
- Issue #9 — payment migration (similar dual-write pattern, fix
  pattern: typed-error + Sentry capture for the write surface)
- Files: `packages/ui/src/components/composed/finance/invoice-wizard.tsx`,
  `apps/dashboard/app/(dashboard)/finance/create/create-invoice-client.tsx`,
  `packages/services/src/invoice-draft.service.ts`

## Open questions

None blocking Phase 1. Phase 2 + Phase 3 each warrant their own
issue when prioritised.
