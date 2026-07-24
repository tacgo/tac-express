## 2024-07-24 - Focus States for Native Elements as Radix Triggers
**Learning:** Native interactive elements (like `<button>`, `<a>`) used as Radix UI triggers via the `asChild` prop do not automatically inherit the design system's focus styles and can lack visible focus rings entirely, harming keyboard accessibility.
**Action:** Always explicitly append `focus-visible:outline-none focus-visible:tac-focus-premium` to the `className` of native elements when they serve as Radix triggers or standalone native interactives to ensure consistent keyboard accessibility across the application.
