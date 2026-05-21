# @workspace/eslint-config

Shared ESLint configurations for the TAC Express monorepo. Three exports, four config files:

| Export | File | Use case |
|---|---|---|
| `@workspace/eslint-config/base` | `base.js` | Library packages that don't render JSX |
| `@workspace/eslint-config/react-internal` | `react-internal.js` | Library packages that render JSX (i.e. `packages/ui`) |
| `@workspace/eslint-config/next-js` | `next.js` | Next.js apps (`apps/dashboard`, `apps/web`) |
| (internal) | `design-system.js` | TAC LAW gates — composed into `react-internal.js` and `next.js` |

## Consumer map

Every workspace's `eslint.config.js` and the config it extends:

| Workspace | Config | Includes `designSystemConfig`? |
|---|---|:---:|
| `apps/dashboard` | `next-js` | ✓ |
| `apps/web` | `next-js` | ✓ |
| `packages/ui` | `react-internal` | ✓ (Sprint 0 / S0.7) |
| `packages/services` | `base` | — (no JSX) |
| `packages/auth` | `base` | — (no JSX) |
| `packages/database` | `base` | — (no JSX) |
| `packages/types` | `base` | — (no JSX) |
| `packages/eslint-config` | n/a (this package) | — |
| `packages/typescript-config` | n/a (no source) | — |

**Coverage rule**: every workspace that renders JSX extends a config that composes `designSystemConfig`. The non-JSX library packages (`services`, `auth`, `database`, `types`) intentionally stay on the lighter `base` config — the design-system rules are JSX-selector-based and would be no-ops there.

## TAC LAW gates enforced via `designSystemConfig`

| Rule | Mechanism | Scope |
|---|---|---|
| No `lucide-react` (LAW 5) | `no-restricted-imports` | All extending workspaces |
| No `framer-motion` (LAW 5) | `no-restricted-imports` | All |
| No `axios`, `moment`, `lodash`, `react-icons`, `@mui/*`, `@chakra-ui/*`, `antd`, `gsap`, `styled-components` | `no-restricted-imports` | All |
| No raw `@supabase/supabase-js` outside `packages/database` (LAW 8) | `no-restricted-imports` | All |
| No raw Tailwind color utilities (`bg-red-500`, etc.) (LAW 10) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |
| No arbitrary color values in className (`bg-[#…]`) (LAW 1) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |
| No arbitrary spacing values (`p-[13px]`) (LAW 9) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |
| No arbitrary duration values outside motion vocabulary (v6) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |
| No `rounded-(xs/md/lg/xl/2xl/3xl/full)` (LAW 13) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |
| No raw `text-[Npx]` / `text-[Nrem]` (LAW 3) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |
| No raw `tracking-[Xem]` (LAW 3) | `no-restricted-syntax` JSX-selector | JSX-rendering workspaces |

## Adding a new workspace

If the new workspace renders JSX:

```js
// new-workspace/eslint.config.js
import { config } from "@workspace/eslint-config/react-internal"
export default config
```

If it's a Next.js app, use `next-js` instead. If it's a pure library with no JSX, use `base`.

**Do not write workspace-local rules that bypass `designSystemConfig`**. The TAC LAW gates are global policy enforced via this package; per-workspace overrides defeat the purpose. If a rule needs to be loosened for a legitimate case, the change goes in `design-system.js` so every workspace inherits it.
