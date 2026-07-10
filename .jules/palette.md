## 2024-03-24 - Radix PopoverTrigger focus-visible
**Learning:** When using Radix `PopoverTrigger` with `asChild`, native elements like `<button>` need explicit `focus-visible` classes (like `focus-visible:outline-none focus-visible:tac-focus-premium`) to show proper focus rings for keyboard navigation. Native `<button>` elements miss out on custom component focus states unless explicitly added.
**Action:** Always add explicit `focus-visible` utility classes to native `<button>` or `<input>` elements when they are used as triggers for Radix UI primitives.
