import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import { RiKeyboardLine } from "@workspace/ui/icons"

export interface KeyboardShortcut {
  label: string
  keys: string[]
}

interface ShortcutsCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  /** Override the default shortcuts list. */
  shortcuts?: KeyboardShortcut[]
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  { label: "Open search", keys: ["⌘", "K"] },
  { label: "Toggle theme", keys: ["⌘", "⇧", "L"] },
  { label: "Notifications", keys: ["⌘", "⇧", "N"] },
  { label: "Sign out", keys: ["⌘", "⇧", "Q"] },
]

/**
 * ShortcutsCard — surfaces the dashboard's chord-style keyboard
 * navigation so operators discover them without reading docs. Each
 * shortcut renders with kbd elements for proper semantic markup.
 */
export function ShortcutsCard({
  shortcuts = DEFAULT_SHORTCUTS,
  className,
  ...props
}: ShortcutsCardProps) {
  return (
    <div
      data-slot="shortcuts-card"
      className={cn("tac-fui-panel space-y-3 bg-card p-5", className)}
      {...props}
    >
      <p className="flex items-center gap-2 border-b border-border pb-2 font-mono text-2xs uppercase tracking-widest text-muted-foreground">
        <RiKeyboardLine className="size-3.5" aria-hidden="true" />
        Keyboard shortcuts
      </p>
      <ul className="space-y-1.5">
        {shortcuts.map((s) => (
          <li
            key={s.label}
            className="flex items-center justify-between gap-3 py-0.5"
          >
            <span className="font-mono text-2xs uppercase tracking-widest text-foreground">
              {s.label}
            </span>
            <span className="flex items-center gap-1">
              {s.keys.map((k, i) => (
                <kbd
                  key={i}
                  className="inline-flex h-5 min-w-5 items-center justify-center border border-border bg-background px-1 font-mono text-2xs leading-none text-muted-foreground"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
