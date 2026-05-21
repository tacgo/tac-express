# Archived orphan UI components — 2026-05-16

These four `@workspace/ui` composed components had **zero importers** anywhere
in the monorepo at archive time. Verified via:

```
grep -r 'composed/(dashboard-header|lottie-hero|marquee|text-matrix-rain)' \
  --include='*.ts' --include='*.tsx' apps/ packages/
```

Returned only the components' own self-references. They were authored during
exploratory design rounds, never consumed by a live route, and would
otherwise rot in the `composed/` namespace as live-looking but dead code.

Filed under **#102 Backlog → "Document or archive orphaned UI components"**.

---

## Files

| File | Why it was orphaned |
|---|---|
| `dashboard-header.tsx` | Replaced by `page-header.tsx` + `user-menu.tsx` composition in ops-console layout |
| `lottie-hero.tsx` | Lottie was rejected in Violet Grid v5 (motion vocabulary is CSS-only) |
| `marquee.tsx` | No marketing page ever shipped a ticker; landing page uses `wasteland-landing.tsx` |
| `text-matrix-rain.tsx` | Decorative-only; rejected from the v5 motion vocabulary as off-brand |

---

## Restoring

Don't `git mv` files back out of this archive. If a future surface needs
one of these components:

1. Read the archived implementation for design intent.
2. Re-implement against the **current** token system + Violet Grid v6 / v7
   rules. Several of these files predate the v6 motion vocabulary and
   v7 design-version flag.
3. Land it under `composed/` (or `composed/dashboard/` for v7 surfaces)
   with at least one live consumer in the same PR.

---

## NOT in this archive

The `composed/dashboard/*.tsx` subdirectory (`live-activity-feed`,
`operational-health`, `quick-actions`, `sla-monitor-card`,
`anomaly-detector-widget`, `welcome-hero`, `date-range-selector`,
`status-badge`, `v7-ops-dashboard`) is **not** orphaned — those nine
files are the active v7 ops dashboard, reachable from
`apps/dashboard/app/ops-console/ops-dashboard-live.tsx` when the
`tac-design` flag resolves to `v7`. The #102 backlog entry mentioning
"7 dashboard cards" is **stale**: the cards became live behind the
design-version flag after the entry was filed.
