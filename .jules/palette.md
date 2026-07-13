## 2024-05-24 - Explicit Focus Styles on asChild Native Elements
**Learning:** Native interactive elements used as Radix UI triggers via `asChild` lack default focus styles and must explicitly include `focus-visible:tac-focus-premium` and `focus-visible:outline-none` for consistent keyboard accessibility.
**Action:** Always add explicit focus-visible classes to native interactive elements (`<button>`, `<a>`, etc.) when they are wrapped inside an `asChild` component.
