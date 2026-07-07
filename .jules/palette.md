## 2025-01-20 - Add explicit aria-labels to Dialog and Sheet close buttons
**Learning:** Even if a Radix primitive close button (like Dialog or Sheet) contains a visually hidden `sr-only` span, providing an explicit `aria-label` directly on the button ensures more robust screen reader support.
**Action:** Always add an explicit `aria-label` to icon-only buttons, including those used as Radix UI triggers via `asChild`.
