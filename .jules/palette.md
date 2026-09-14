## 2024-05-24 - Accessibility: Missing ARIA labels on modal close buttons
**Learning:** Found that `<SheetPrimitive.Close>` and `<DialogPrimitive.Close>` component close buttons (using `size="icon"` and `variant="ghost"`) are missing `aria-label` attributes. Without them, screen readers just read "Close" from the hidden screen reader text or nothing at all if the inner span is not fully reliable, which degrades the UX for accessible users.
**Action:** Always add `aria-label="Close"` to generic dialog/sheet close buttons with only an icon or sr-only text.
