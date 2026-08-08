## 2024-08-08 - Add aria-label to core primitive close buttons
**Learning:** Even when a Radix primitive like `DialogPrimitive.Close` or `SheetPrimitive.Close` contains a visually hidden `sr-only` span for text, it may not reliably act as the accessible name if the underlying trigger is an icon-only button rendered via `asChild`.
**Action:** Always explicitly add an `aria-label` directly to the `<Button size="icon">` used inside Radix primitives, regardless of nested `sr-only` content, to ensure consistent and robust screen reader support.
