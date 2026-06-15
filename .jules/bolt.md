## 2026-06-15 - Memoize list mapping for composed lists
**Learning:** When passing mapped API data to composed list components (`V7Ops*`), calling `.map()` directly in the render body without `React.useMemo` breaks referential equality and triggers unnecessary table re-renders and internal state resets.
**Action:** Always wrap the `.map()` transformation in `React.useMemo` when preparing data rows for `V7Ops*` components.
