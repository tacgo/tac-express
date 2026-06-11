## 2024-06-11 - TanStack Table Re-renders with Unmemoized Arrays
**Learning:** Passing unmemoized mapped arrays (e.g., `data.map(toRow)`) to `V7Ops*` components causes TanStack table and composed list components to break referential equality, triggering unnecessary table re-renders and internal state resets on every parent render.
**Action:** Always wrap the `.map()` transformation in `React.useMemo` when passing mapped API data to TanStack table or composed list components.
