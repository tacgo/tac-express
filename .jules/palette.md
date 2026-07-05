## 2024-07-05 - Add explicit aria-labels to Radix close buttons
**Learning:** Screen readers might not consistently announce visually hidden content (`sr-only`) inside Radix primitive triggers (like `DialogPrimitive.Close`) when using `asChild` with icon-only buttons.
**Action:** Always add an explicit `aria-label` to icon-only buttons (`size="icon"`), even if they already contain a visually hidden `sr-only` span, to ensure robust screen reader support.
