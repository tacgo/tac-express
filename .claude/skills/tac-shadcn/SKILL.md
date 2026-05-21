---
name: tac-shadcn
description: MANDATORY whenever a UI primitive is needed, added, or modified in tac-express — buttons, inputs, dialogs, selects, tables, any base component. Enforces the single foundation rule — every primitive is SOURCED through the shadcn CLI / @tac registry / shadcn MCP into packages/ui ONLY, then themed with Violet Grid tokens. Nothing hand-rolled, nothing from another component library. Trigger on "add a component", "install button/dialog/select", "shadcn add", "use shadcn", "switch preset", "components.json", "registry", or any request to introduce a base UI element.
---

# TAC Express — shadcn Foundation (single-system sourcing law)

> **The foundation preset is `b5Fxrc2eNU` (`shadcn init --template next --monorepo`).**
> shadcn is not a dependency we import from — it is *how this project's component
> library is built and distributed*. Every base UI element enters the codebase
> through shadcn (CLI / `@tac` registry / MCP) and lands in `packages/ui` ONLY.
>
> Read with: `tac-ui-authoring` (how to write the component), `tac-design-tokens`
> (how to theme it), `tac-fourteen-laws` (what's forbidden). Full reference:
> [`docs/SHADCN-FOUNDATION.md`](../../../docs/SHADCN-FOUNDATION.md).

---

## 0. The recorded foundation (do not silently change)

Decoded from preset `b5Fxrc2eNU`:

| Preset field | Preset value | This project | Status |
|---|---|---|---|
| `radius` | `none` | `--radius: 0rem` | ✅ matches (LAW 13) |
| `style` | `maia` | `radix-lyra` | 🔒 locked post-init |
| `baseColor` | `zinc` | `zinc` | ✅ aligned (Phase 1) |
| `iconLibrary` | `tabler` | `remixicon` | ⚠️ kept — Phase 2 not adopted (LAW: `@remixicon/react`) |
| `font` / `fontHeading` | `outfit` / `noto-serif` | Outfit / IBM Plex Mono / Noto Serif | ✅ aligned (Phase 1) |
| `theme` / `chartColor` | `indigo` / `yellow` | indigo (preset) / Orbital | ✅ theme aligned; charts kept |

Theme + fonts are **preset-aligned** (Phase 1: `shadcn apply --only theme` +
Outfit/Noto Serif). `style` (`maia`) and `iconLibrary` (`tabler`) are
intentionally **not** adopted — keeping `radix-lyra` + `@remixicon` preserves the
custom Violet Grid component code. Switching style/icons reinstalls ~40
components / migrates icons repo-wide, so it's a `tac-brainstorming` event.

> Switching preset, baseColor, style, or icon library is a `tac-brainstorming`
> design-approval event, never an inline change.

---

## 1. The Iron Rule

```
Every base UI element is SOURCED through shadcn into packages/ui — then themed.
  • Source:  shadcn CLI  |  @tac registry  |  shadcn MCP
  • Land:    packages/ui/src/components/  (LAW 5 — never apps/*)
  • Theme:   Violet Grid tokens only      (tac-design-tokens, LAW 9/10/13)
  • Never:   hand-roll a primitive, import another component library, or paste
             a primitive from a blog / the source template.
```

If a primitive does not exist yet: **bring it in via shadcn, make it composable,
re-theme to Violet Grid** — that is the shadcn way. You never write a `<Dialog>`
from scratch; you `add` it and then own the code.

---

## 2. Decision tree — "I need a component"

```
Need a base UI element (button, input, dialog, select, table, tabs, …)?
│
├─ Already in packages/ui/src/components?  → import it, extend if needed. STOP.
│
├─ In the @tac registry? (button, input, label, textarea, badge, separator,
│   card, select, dialog, sheet, popover, tabs, table, calendar)
│      → from packages/ui:  pnpm dlx shadcn@4.7.0 add @tac/<name>
│
├─ A standard shadcn primitive not yet vendored?
│      → from packages/ui:  pnpm dlx shadcn@4.7.0 add <name>
│        then RE-THEME to Violet Grid (tac-ui-authoring) and, if it will be
│        reused, author a @tac registry item for it (§4).
│
└─ A multi-file block / app page (login-01, dashboard-01, a @tailark hero)?
       → from the app:  cd apps/web && pnpm dlx shadcn@4.7.0 add <block>
         primitives route to packages/ui, the page lands in apps/web/components.
         Then re-theme every surface to Violet Grid before shipping.
```

**Where to run `add`:**
- **Shared primitives / `@tac` items → run from `packages/ui`** (matches the MCP
  `cwd` and the `file:./registry/{name}.json` path).
- **App-level blocks/pages → run from `apps/web` or `apps/dashboard`.** Their
  `components.json` routes `ui` → `@workspace/ui/components` automatically.

---

## 3. CLI reference (pinned to `shadcn@4.7.0`)

Always pin the version — it matches `.mcp.json` and the `@tac` registry docs.

```bash
# Inspect project config (framework, base, aliases, resolved paths)
pnpm dlx shadcn@4.7.0 info -c apps/web

# Discover before adding — read the docs/API first (brain-first)
pnpm dlx shadcn@4.7.0 search @shadcn -q "combobox"
pnpm dlx shadcn@4.7.0 view @shadcn/combobox
pnpm dlx shadcn@4.7.0 docs combobox

# Add (run from the correct workspace per §2)
pnpm dlx shadcn@4.7.0 add @tac/button        # TAC-compliant primitive
pnpm dlx shadcn@4.7.0 add combobox           # standard primitive → re-theme
pnpm dlx shadcn@4.7.0 add @tac/button --dry-run   # preview, write nothing

# Rebuild the @tac registry JSON after editing registry items
cd packages/ui && pnpm dlx shadcn@4.7.0 build
```

`--dry-run` before any bulk `add` (test-before-bulk). Never blind-overwrite an
existing TAC primitive with `--overwrite`; diff first.

> **Never** run `init` / `apply` / `migrate icons` / `--no-css-variables` against
> this repo. `init --template next --monorepo` re-scaffolds and clobbers the tree;
> `migrate icons` would rip out `@remixicon/react` repo-wide. All four are
> friction-protocol refusals — they reset the locked foundation.

---

## 4. The `@tac` private registry

The project ships its own registry — `packages/ui/registry/` — so every
TAC-compliant primitive installs in one command with zero post-processing.
`registry.json` lists 14 vendored primitives (button, input, label, textarea,
badge, separator, card, select, dialog, sheet, popover, tabs, table, calendar).

**Authoring a new `@tac` item** (after you've re-themed a primitive):

1. Place the source at `packages/ui/src/components/**` (LAW 5).
2. Add an item to `packages/ui/registry/registry.json`:
   ```json
   {
     "name": "combobox",
     "type": "registry:ui",
     "title": "TAC Combobox",
     "description": "Combobox at TAC rhythm + tac-focus-premium ring.",
     "registryDependencies": ["@radix-ui/react-popover", "@tac/command"],
     "files": [{ "path": "src/components/primitives/combobox.tsx", "type": "registry:ui" }]
   }
   ```
3. Create `packages/ui/registry/combobox.json` (the item file) mirroring the entry.
4. `cd packages/ui && pnpm dlx shadcn@4.7.0 build`.
5. Verify: `pnpm dlx shadcn@4.7.0 view @tac/combobox`.

Every `@tac` item MUST already pass the Fourteen Laws (zero-radius, semantic
tokens, the three fonts, brutalist offset shadows, `@remixicon/react`). The
registry is the gate — non-compliant items never get an entry.

---

## 5. shadcn MCP

Configured in `.mcp.json` (server `shadcn`, runs the pinned `shadcn@4.7.0 mcp`, `cwd: packages/ui`).
Because the cwd is `packages/ui`, MCP-driven `@tac` resolution and installs are
correct by default. Use natural-language prompts to browse/search/install:

- "Show me the items in the `@tac` registry."
- "Add `@tac/dialog` and `@tac/sheet`."
- "Find a combobox in the shadcn registry and show its docs."

MCP installs still obey §1–§4: primitives land in `packages/ui`, then you
re-theme. MCP is a faster front-end to the same CLI — not an exception to the law.

---

## 6. Theming a freshly-added primitive (the re-theme pass)

A raw `shadcn add <name>` lands a `neutral`/`radix-lyra` component. Before it
ships it MUST be re-themed (see `tac-design-tokens` + `tac-ui-authoring`):

```
[ ] radius → none (rounded-none / var(--radius)=0)            LAW 13
[ ] shadows → brutalist offset (shadow-sm = 3px), no blur     LAW 9
[ ] colors → semantic tokens only (bg-card, border-border…)   LAW 10
[ ] focus → focus-visible:tac-focus-premium                   (project ring)
[ ] icons → @remixicon/react via @workspace/ui/icons          LAW (icons)
[ ] fonts → font-sans / font-mono / font-serif only           LAW 4
[ ] data-slot set, named export, CVA variants, no raw [px]
[ ] if reusable → author a @tac registry item (§4)
```

---

## 7. Forbidden (friction-protocol refusals)

```
❌ Hand-rolling a primitive shadcn provides            → add it, then own the code
❌ Importing another UI lib (MUI, Chakra, Mantine,
   Headless UI, daisyUI, Ant, Flowbite, NextUI…)       → shadcn is the only source
❌ Pasting a primitive from a blog / the source
   template's components/ui                            → add via shadcn + re-theme
❌ Putting a primitive in apps/*/components             → LAW 5 → packages/ui
❌ `init` / `apply` / `migrate icons` on this repo      → resets locked foundation
❌ `--no-css-variables`                                 → breaks the token theme
❌ Changing style / baseColor / icon library inline     → tac-brainstorming event
❌ Shipping a raw neutral/radix-lyra component           → re-theme first (§6)
```

Refusal format (friction-protocol): *"I can't do that — it violates the shadcn
foundation rule / LAW X. The compliant path is `shadcn add @tac/<name>` into
packages/ui, then re-theme."*

---

## 8. Pre-flight before shipping any added component

```
[ ] Sourced via shadcn (CLI / @tac / MCP), not hand-rolled or copied
[ ] Lives in packages/ui/src/components (LAW 5)
[ ] Re-themed to Violet Grid — §6 checklist all green
[ ] Imported via @workspace/ui/components/<name> at call sites
[ ] If reusable: @tac registry item authored + `build` run + `view` verified
[ ] pnpm typecheck && pnpm lint && pnpm test pass (quality-gates)
```
