# SHADCN FOUNDATION — TAC Express

> **Version 1.0 — 2026-05-21.** The authoritative reference for how shadcn/ui is
> the foundation of TAC Express's component system. Enforced by the
> [`tac-shadcn`](../.claude/skills/tac-shadcn/SKILL.md) skill; governed by the
> Fourteen Laws (`AGENTS.md`) and the Violet Grid design system
> (`DESIGN_SYSTEM.md`, `tac-design-tokens`).

shadcn/ui is **not a dependency we import from**. It is *how this project builds
and distributes its own component library* (open code, composition, distribution,
beautiful defaults, AI-ready). Every base UI element enters the codebase through
shadcn and is then owned and themed by us.

---

## 1. The foundation preset — `b5Fxrc2eNU`

The project's baseline was generated from:

```bash
pnpm dlx shadcn@latest init --preset b5Fxrc2eNU --template next --monorepo
```

Decoded (`shadcn preset decode b5Fxrc2eNU`):

| Field | Preset | This project | Notes |
|---|---|---|---|
| `radius` | `none` | `--radius: 0rem` | ✅ matches — LAW 13 |
| `style` | `maia` | `radix-lyra` | 🔒 **locked** after init |
| `baseColor` | `zinc` | `zinc` | ✅ aligned (Phase 1) |
| `cssVariables` | `true` | `true` | ✅ matches |
| `iconLibrary` | `tabler` | `remixicon` | ⚠️ kept (Violet Grid identity — Phase 2 not adopted) |
| `font` / `fontHeading` | `outfit` / `noto-serif` | Outfit / IBM Plex Mono / Noto Serif | ✅ aligned (Phase 1) |
| `theme` / `chartColor` | `indigo` / `yellow` | indigo (preset) / Orbital charts | ✅ theme aligned; charts kept |

> **Alignment status (Phase 1 done):** the theme (zinc/indigo via `shadcn apply
> --only theme`) and fonts (Outfit + Noto Serif) now match the preset. The
> `style` (`maia`) and `iconLibrary` (`tabler`) are intentionally **not** adopted
> — keeping `radix-lyra`'s re-themed components and `@remixicon` preserves the
> custom Violet Grid component code (brutalist shadows, premium focus,
> zero-radius). Switching style/icons is a `tac-brainstorming` design-approval
> event (it would reinstall ~40 components / migrate icons repo-wide).

> **Do NOT re-run `init` on this repo.** `init --template next --monorepo`
> re-scaffolds a fresh web+ui monorepo and would overwrite `globals.css`,
> `components.json`, `package.json`, and risk the production `apps/dashboard`.

---

## 2. Monorepo wiring — `components.json` per workspace

Each workspace has a `components.json` so the CLI and MCP route `add` correctly.
All three share the same `style` / `baseColor` / `iconLibrary` (a hard
requirement of the shadcn monorepo model). For Tailwind v4 the `tailwind.config`
is intentionally empty (config lives in `globals.css`).

| Workspace | File | `ui` alias → | Local aliases |
|---|---|---|---|
| `packages/ui` | `packages/ui/components.json` | `@workspace/ui/components` (self) | `@workspace/ui/*` |
| `apps/web` | `apps/web/components.json` | `@workspace/ui/components` | `@/components`, `@/lib`, `@/hooks` |
| `apps/dashboard` | `apps/dashboard/components.json` | `@workspace/ui/components` | `@/components`, `@/lib`, `@/hooks` |

The shared theme CSS resolves from every workspace to
`packages/ui/src/styles/globals.css`. Verify any workspace with:

```bash
pnpm dlx shadcn@4.7.0 info -c apps/web      # framework, base, aliases, resolvedPaths
```

**Routing rule (proven by `info`):** a `shadcn add` from `apps/web` writes UI
primitives to `packages/ui/src/components` and app-level blocks to
`apps/web/components` — matching LAW 5.

---

## 3. The single sourcing law

```
Every base UI element is SOURCED through shadcn, lands in packages/ui, then themed.
  Source:  shadcn CLI  |  @tac registry  |  shadcn MCP
  Land:    packages/ui/src/components/        (LAW 5)
  Theme:   Violet Grid tokens only            (tac-design-tokens; LAW 9/10/13)
  Forbidden: hand-rolled primitives · any other UI library · pasted primitives
```

See the [`tac-shadcn`](../.claude/skills/tac-shadcn/SKILL.md) skill for the
decision tree and the per-primitive re-theme checklist.

---

## 4. CLI reference (pin `shadcn@4.7.0`)

Pin the version — it matches `.mcp.json` and the `@tac` registry. Run shared
primitive installs from `packages/ui`; run app blocks/pages from the app.

```bash
pnpm dlx shadcn@4.7.0 info -c apps/web              # project config
pnpm dlx shadcn@4.7.0 search @shadcn -q "combobox"  # discover (brain-first)
pnpm dlx shadcn@4.7.0 view @shadcn/combobox         # inspect before install
pnpm dlx shadcn@4.7.0 docs combobox                 # API reference

pnpm dlx shadcn@4.7.0 add @tac/button               # TAC-compliant primitive
pnpm dlx shadcn@4.7.0 add combobox                  # standard → must re-theme
pnpm dlx shadcn@4.7.0 add combobox --dry-run        # preview only

cd packages/ui && pnpm dlx shadcn@4.7.0 build       # rebuild @tac registry JSON
```

**Never** run on this repo: `init`, `apply`, `migrate icons`, or
`--no-css-variables` — each resets the locked foundation (see `tac-shadcn` §7).

---

## 5. The `@tac` private registry

`packages/ui/registry/` is a `file:` registry that ships the project's
TAC-compliant primitives. `registry.json` lists 14 items: **button, input,
label, textarea, badge, separator, card, select, dialog, sheet, popover, tabs,
table, calendar**. Each has already passed the Fourteen Laws — the registry is
the compliance gate.

Install in one command (from `packages/ui`):

```bash
pnpm dlx shadcn@4.7.0 add @tac/button @tac/dialog @tac/sheet
```

**Authoring a new `@tac` item:** re-theme the primitive → place it under
`packages/ui/src/components/**` → add an entry to `registry.json` → create the
matching `registry/<name>.json` item file → `shadcn build` → `view @tac/<name>`
to verify. (Full example in `tac-shadcn` §4.)

---

## 6. shadcn MCP

Configured in [`.mcp.json`](../.mcp.json): server `shadcn`, command
`npx shadcn@4.7.0 mcp`, `cwd: packages/ui`. Because the cwd is `packages/ui`,
`@tac` resolution and installs are correct by default. Drive it with natural
language:

- "Show me the items in the `@tac` registry."
- "Add `@tac/dialog` and `@tac/sheet`."
- "Find a combobox in the shadcn registry and show its docs."

MCP is a faster front-end to the same CLI — it obeys §3 (primitives land in
`packages/ui`, then re-theme). It is not an exception to the law.

---

## 7. Theming — tokens are the project identity

Components consume **semantic tokens** (`bg-background`, `text-foreground`,
`border-border`, `bg-primary`, `var(--radius)`); the theme lives in CSS
variables under `:root` / `.dark` in `packages/ui/src/styles/globals.css`. This
is exactly shadcn's CSS-variable theming model — the Violet Grid is a custom
shadcn theme. A freshly-added primitive ships `neutral`/`radix-lyra` defaults and
**must** be re-themed before it merges (radius→0, brutalist offset shadows,
semantic tokens, `tac-focus-premium`, `@remixicon/react`, the three fonts). The
full token reference is `tac-design-tokens`; the re-theme checklist is
`tac-shadcn` §6.

---

## 8. Forbidden

```
❌ Hand-rolling a primitive shadcn provides
❌ Importing another component library (MUI, Chakra, Mantine, Headless UI,
   daisyUI, Ant, Flowbite, NextUI, …)
❌ Pasting a primitive from a blog or a source template's components/ui
❌ Placing a primitive in apps/*/components (LAW 5 → packages/ui)
❌ shadcn init / apply / migrate icons on this repo
❌ --no-css-variables (breaks the token theme)
❌ Changing style / baseColor / iconLibrary inline (tac-brainstorming event)
❌ Shipping a raw neutral/radix-lyra component without the re-theme pass
```

---

## 9. References

- Skill: [`.claude/skills/tac-shadcn/SKILL.md`](../.claude/skills/tac-shadcn/SKILL.md)
- Authoring / re-theming: [`tac-ui-authoring`](../.claude/skills/tac-ui-authoring/SKILL.md)
- Tokens: [`tac-design-tokens`](../.claude/skills/tac-design-tokens/SKILL.md)
- Laws & forbidden packages: [`tac-fourteen-laws`](../.claude/skills/tac-fourteen-laws/SKILL.md), `AGENTS.md`
- Registry index: [`packages/ui/registry/registry.json`](../packages/ui/registry/registry.json)
- MCP config: [`.mcp.json`](../.mcp.json)
- Dispatch: [`.claude/skills/RESOLVER.md`](../.claude/skills/RESOLVER.md)
