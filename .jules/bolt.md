## 2024-06-12 - Prevent Table State Resets via Memoization
**Learning:** Passing unmemoized mapped API data directly into composed list components (like `V7OpsDashboard`, `V7OpsShipments`, `V7OpsManifests`) breaks referential equality on every poll/update, which triggers unnecessary re-renders in child components and causes TanStack table instances to lose their internal state.
**Action:** Always wrap `.map()` transformations in `React.useMemo` when passing data to TanStack table or composed list components to maintain referential equality across renders.
