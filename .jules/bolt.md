## 2024-05-18 - Memoize TanStack Table Data Props
**Learning:** In React applications using TanStack Table (or custom composed lists), mapping API data directly in the render body creates a new array reference on every render. This breaks referential equality, causing the table component to unnecessarily re-render and potentially reset its internal state (like sorting or pagination).
**Action:** Always wrap `.map()` transformations of query data in `React.useMemo` when passing the result as a data prop to table or list components.
