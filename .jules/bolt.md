## 2024-10-25 - Prevent unnecessary table re-renders with React.useMemo
**Learning:** Passing unmemoized mapped API data (e.g., `(data ?? []).map(...)`) to TanStack tables or composed list components (like `V7OpsShipments`) breaks referential equality, triggering expensive internal state resets and re-renders on every parent render.
**Action:** Always wrap `.map()` transformations in `React.useMemo` when passing data to table components, ensuring stable array references.
