## 2024-05-19 - Improved Focus Visibility for Native Elements
**Learning:** Native interactive elements (`<button>`) across the application occasionally lack explicit focus rings when not using `@workspace/ui/components/button`.
**Action:** Consistently added `focus-visible:outline-none focus-visible:tac-focus-premium` classes to raw `<button>` elements to ensure standard project focus rings.
