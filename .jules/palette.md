## 2024-07-04 - Explicit ARIA Labels on Radix Primitives
**Learning:** Even when Radix UI primitives like `Dialog.Close` or `Sheet.Close` are provided with a nested `<span className="sr-only">Close</span>`, using `asChild` on a custom `<Button size="icon">` can sometimes result in less robust screen reader support if the button itself lacks an explicit ARIA label.
**Action:** Always add an explicit `aria-label` directly to the custom icon-only button element, especially when used via `asChild` with Radix primitives.
