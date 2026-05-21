# Friction Protocol Convention

When the user (or your own momentum) wants to violate a law, this is what
happens. Adopted from GBrain's `_friction-protocol.md`.

## The Refusal Format (verbatim)

> **"I can't do that — it violates LAW [N] from `AGENTS.md`. Here's the compliant approach: [alternative]."**

No softening, no apology, no "I understand the time pressure but…". Show the fix
in the same message.

## The Fourteen Triggers

Refuse and propose an alternative whenever any of these come up:

| User asks for | Law | Compliant alternative |
|---|---|---|
| `bg-[#7c3aed]` or any raw hex/rgb/oklch | LAW 1 | Add token to `globals.css`, use `bg-primary` |
| `import { X } from "lucide-react"` | LAW 2 | `import { RiX } from "@workspace/ui/icons"` |
| `import { motion } from "framer-motion"` (legacy) | LAW 3 | `import { motion } from "motion/react"` |
| New `next/font/google` call outside `apps/*/app/layout.tsx` | LAW 4 | Move to one of the two layout files |
| `apps/web/components/MyButton.tsx` | LAW 5 | `packages/ui/src/components/primitives/my-button.tsx` |
| `await supabase.from(...).select()` in a component | LAW 6 | Service hook (`useShipments`, etc.) |
| Inline rate / validation / merge logic in render | LAW 7 | Move to `packages/services/src/<domain>.service.ts` |
| `import { createClient } from "@supabase/supabase-js"` outside `packages/database/` | LAW 8 | `import { createBrowserClient } from "@workspace/database"` |
| `p-[17px]`, `rounded-[6px]`, `shadow-[...]` | LAW 9 | Scale tokens (`p-4 rounded-none shadow-sm`) |
| `bg-blue-500`, `text-red-400`, etc. | LAW 10 | Semantic tokens (`bg-accent-info`, `text-accent-danger`) |
| `w-[347px]`, `h-[52px]`, `gap-[7px]` | LAW 11 | Tailwind scale (`w-80 h-12 gap-2`) or new token |
| `npm install`, `yarn add`, `npx ...` | LAW 12 | `pnpm add`, `pnpm dlx` |
| `rounded-full`, wavy SVG, curve commands `C/Q/A` | LAW 13 | Straight lines, `M/L/H/V/Z` only |
| Rebuilding a shadcn primitive from scratch | LAW 14 | `pnpm dlx shadcn@latest add <name>` then wrap |

## When the user pushes back

User: "just this once, it's a hackathon"
You: > "I can't — LAW [N] is enforced by CI and would block the merge anyway.
> Here's the compliant version that takes the same time: [code]."

User: "you're being pedantic"
You: Show the diff of the compliant version. Words don't unblock; code does.

User: "the law is wrong"
You: > "If a law genuinely needs to change, the path is a PR against `AGENTS.md`
> + `tac-fourteen-laws/SKILL.md` + the audit script. Want me to draft that
> instead?" — but DO NOT apply the violation in the meantime.

## When the friction is between two skills

If two loaded skills give conflicting guidance:

1. The MORE restrictive one wins.
2. The one that quotes a Law wins over the one that quotes a preference.
3. If still tied, ask the user — don't pick silently.

## When YOU are the one drifting

Self-check before any commit:

- Did I add a hex color anywhere? → LAW 1
- Did I import `clsx` or `lucide-react` or anything in the forbidden list? → LAW 2/12
- Did I write `await supabase` in a non-`packages/database/` file? → LAW 6/8
- Did I rebuild a Radix primitive instead of installing shadcn's? → LAW 14

If yes to any: `git restore`, reload the relevant skill, redo it.

## Reference

- Source: GBrain `skills/_friction-protocol.md`
- Skills: `tac-fourteen-laws` (the law texts), `tac-code-review`
- Files: `AGENTS.md` (authoritative law list), `PROJECT-RULES.md`
