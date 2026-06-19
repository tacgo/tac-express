## 2024-05-18 - Premium Focus Consistency
**Learning:** Native interactive elements (like custom popover triggers acting as buttons) without standard design system component wrappers often miss the premium focus state (`focus-visible:tac-focus-premium`), breaking keyboard accessibility/consistency.
**Action:** Always ensure that interactive elements that are not explicitly using standard ui components, have `focus-visible:outline-none focus-visible:tac-focus-premium` classes applied.
