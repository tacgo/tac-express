## 2024-05-18 - Ensure aria-label on primitive close buttons
**Learning:** Even if a `sr-only` span is present inside an icon button, adding an explicit `aria-label` directly on the button component (especially when rendered via Radix `asChild`) provides more robust and native accessibility support for screen readers, and is consistent with the rest of the application's icon buttons.
**Action:** Always add `aria-label` to icon-only buttons (`size="icon"`), including primitive close buttons in `Dialog`, `Sheet`, etc., even if they contain visually hidden text.
