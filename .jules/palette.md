## 2024-05-13 - Radix Primitives aria-labels
**Learning:** Radix UI primitives using `asChild` with icon-only buttons need an explicit `aria-label` even if they contain a visually hidden `sr-only` span, ensuring robust screen reader support.
**Action:** Always add an explicit `aria-label` to icon-only buttons (`size="icon"`), particularly for components using Radix primitives via `asChild`.
