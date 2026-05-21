# Archived session scratchpads — 2026-05-14

These two files were single-session working artifacts created during the
2026-05-14 audit-fix push. Their content has been superseded by the
permanent retro corpus and the consolidated two-day arc retro.

Filed under **#102 Backlog → "Archive session-scratchpad files in
`docs/`"**.

---

## Files

| File | Superseded by |
|---|---|
| `AUDIT-FIXES-PLAN-2026-05-14.md` | `docs/retros/2026-05-15-*.md` (per-PR retros for #105–#108) and `docs/retros/2026-05-15-2026-05-16-two-day-arc.md` § 1 ("What survived") |
| `SESSION-RETRO-2026-05-14.md` | `docs/retros/2026-05-15-2026-05-16-two-day-arc.md` |

---

## What is NOT archived

`docs/NEXT-SESSION-HANDOFF.md` is **deliberately kept in place**. It is
load-bearing across sessions — read at session start and updated at
session end. The #102 backlog entry that originally listed it as a
scratchpad to archive is **stale**: the handoff was promoted to a
permanent cross-session protocol artifact during the 2026-05-15 → 16
two-day arc.

---

## Restoring

Don't `git mv` files back. If you need a piece of decision history from
one of these files, link to it from a permanent retro rather than
restoring the file into `docs/` proper. Two reasons:

1. Scratchpad shape (action lists, branch-state dumps, in-flight
   thinking) is the wrong format for a permanent document.
2. The two-day arc retro at
   `docs/retros/2026-05-15-2026-05-16-two-day-arc.md` is the canonical
   source of truth for what shipped and why; restoring a scratchpad
   creates two competing accounts of the same events.
