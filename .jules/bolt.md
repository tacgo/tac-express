## 2024-06-12 - Prevent Re-renders on Transformed API Data
**Learning:** Transforming API data directly in component body (e.g., using `.map()`) without memoization creates new object references on every render, which triggers unnecessary re-renders in downstream components.
**Action:** Always wrap API data transformations in `React.useMemo`, specifying the raw query data as the dependency. Avoid setting default array values during destructuring (e.g. `{ data = [] }`) which also breaks reference stability.
