## 2025-06-29 - Explicit ARIA Labels on Icon Buttons with sr-only Spans
**Learning:** Even when Radix primitives or buttons include a `<span className="sr-only">Close</span>`, explicitly adding an `aria-label` ensures more robust screen reader support across all contexts, especially when used with `asChild` on triggers.
**Action:** Always add an explicit `aria-label` to `size="icon"` buttons, even if a visually hidden child exists.
