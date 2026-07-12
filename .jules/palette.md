## 2024-07-12 - Focus-visible styles on interactive trigger elements
**Learning:** Native interactive elements like `<button>` used as Radix Popover trigger via `asChild` must explicitly implement focus styling for keyboard accessibility.
**Action:** Always add explicit focus classes like `focus-visible:outline-none focus-visible:tac-focus-premium` to `asChild` triggers to ensure clear keyboard navigability.
