## 2024-06-27 - Notification Bell Focus Ring
**Learning:** Native `<button>` elements used as `asChild` triggers for Radix UI components (like PopoverTrigger) need explicit `focus-visible` utility classes applied to maintain consistent keyboard accessibility styling.
**Action:** Always add `focus-visible:outline-none focus-visible:tac-focus-premium` to custom interactive trigger components that use native HTML tags instead of the design system's `<Button>`.
