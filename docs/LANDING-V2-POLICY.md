# Public Landing — Isolated Design-System Policy

> **Version 2.0 — 2026-05-23.** Defines the boundary for the **canonical public
> landing (`/`)**, which is a deliberately isolated, **editorial-minimal** design
> system that does NOT use the operational (Violet-Grid → zinc/indigo) system.
> Promoted from the former `/v2` route on 2026-05-23; replaced and retired the
> Violet Grid V1 landing (archived at
> `packages/ui/src/components/composed/_archive/2026-05-23-v1-landing/`).
> Mirrors the precedent of the Paper Ops Console (`docs/OPS-CONSOLE-POLICY.md`):
> a sanctioned, scope-gated parallel visual mode.

---

## 0. Design intent — two deliberate contexts

This is **not** debt to be converged. It is an explicit product decision:

| Surface | System |
|---|---|
| **Public landing (`/`)** | Cinematic / editorial marketing — Fraunces + Manrope, warm palette, soft depth, motion-driven |
| **Dashboard + all product/operational surfaces** | Clean operational logistics UI — native shadcn zinc/indigo, soft elevation |

The two must stay isolated. The landing's look must never bleed into the
operational surfaces, and the operational system must never be "editorialized."

## 1. What it is

The canonical landing at **`apps/web/app/(marketing)`** (route group → serves
`/`), with its own visual identity: editorial-minimal, motion-driven, premium
serif/sans typography, soft depth, asymmetrical composition. Other public pages
(`/about`, `/pricing`, `/track`, …) remain on the operational system with the
shared `PublicNav`/`Footer`.

## 2. The isolation contract (hard boundaries)

The landing **MUST**:
- Live entirely under `apps/web/app/(marketing)/` — components are local,
  co-located in `apps/web/app/(marketing)/_components/` (NOT `packages/ui`, NOT
  `apps/web/components/`).
- Define its own tokens in `apps/web/app/(marketing)/v2.css`, scoped under
  `.landing-v2`.
- Load its own fonts in `apps/web/app/(marketing)/layout.tsx` (Fraunces +
  Manrope).
- Use `motion/react` for motion (the only shared sanctioned dep).

The landing **MUST NOT**:
- Import from `@workspace/ui` (no operational primitives or tokens).
- Modify `packages/ui/src/styles/globals.css`, `components.json`, or anything the
  dashboard / other public pages depend on.
- Affect the dashboard or any operational/authenticated surface in any way.
- Leak its `--v2-*` tokens / fonts / motion outside the `.landing-v2` scope.
- Use a forbidden package (e.g. `lucide-react`) — icons are inline SVG.

## 3. Audit posture (the sanctioned carve-out)

Because the landing is NOT the operational system, the operational design checks
would false-fail on its own (rounded corners, soft shadows, its own palette). So:

- **`audit:design-spec`** — `apps/web/app/(marketing)` is in the `allowed` set (skipped).
- **`audit:governance`** — the design-token checks (`backdrop-blur`, orange
  utilities) skip `apps/web/app/(marketing)/`. **Still applied:** LAW 8 (no
  direct `@supabase/supabase-js`), the LAW-2 `apps/*/components/` location regex,
  and the orphan gate. Structure stays governed; only the *look* is exempt.

`pnpm lint`, `pnpm typecheck`, and `pnpm build` apply normally.

## 4. Keep it contained

The landing is one self-contained surface. If a landing pattern is ever needed
on an operational surface (or vice-versa), that is a `tac-brainstorming` event —
do not widen the exception or cross the isolation boundary ad hoc.
