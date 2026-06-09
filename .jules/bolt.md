## 2024-06-09 - Memoize data passed to V7Ops list components
**Learning:** Passing inline-mapped arrays (like `data.map(toRow)`) to composed list components (such as `V7OpsShipments` wrapping TanStack Table) breaks referential equality on every render. This forces unnecessary downstream component re-renders and causes the table to reset internal state unexpectedly.
**Action:** Always wrap data array transformations like `.map()` in `React.useMemo` when the result is being passed to a table or complex list component.
