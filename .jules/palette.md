
## 2026-06-24 - Consistent Focus Rings on Native Radix Triggers
**Learning:** Native interactive elements (like `<button>`) used as Radix UI triggers via `asChild` do not automatically inherit the project's standard focus styles, leading to inconsistent or missing focus rings during keyboard navigation.
**Action:** Always explicitly add `focus-visible:outline-none focus-visible:tac-focus-premium` to native elements used as Radix `asChild` triggers to ensure consistent keyboard accessibility.
