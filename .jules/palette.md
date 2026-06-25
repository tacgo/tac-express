## 2024-06-25 - Native interactive elements missing focus ring and aria-label
**Learning:** Native interactive elements (`<button>`) without `aria-label` or focus-visible styling can compromise accessibility.
**Action:** Always ensure `<button>` elements have an appropriate `aria-label` when the text content does not sufficiently explain the action, and use `focus-visible:outline-none focus-visible:tac-focus-premium` for focus rings.
