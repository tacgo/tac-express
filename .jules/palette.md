## 2024-06-25 - Consistent Keyboard Focus Visible Styles
**Learning:** Native interactive elements (`<select>`, `<input>`, `<button>`, `<a>`, `<Link>`) often lack sufficient or consistent focus outlines, which hinders keyboard navigation. Even when used as Radix UI triggers via `asChild`, they need explicit focus states.
**Action:** Always add explicit `focus-visible:outline-none focus-visible:tac-focus-premium` classes to interactive elements to ensure consistent custom focus rings and keyboard accessibility across the application.
