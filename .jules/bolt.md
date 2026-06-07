## 2024-06-07 - Mapped API Data Breaks TanStack Table Performance

**Learning:** When passing mapped API data (e.g. `data.map(toRow)`) to TanStack tables or composed list components, the referential equality of the data array is broken on every render. This forces the table components to re-render completely and resets their internal state unnecessarily, creating massive overhead for frequently-updating realtime data.

**Action:** Always wrap `.map()` transformations for TanStack table components in `React.useMemo` (e.g., `const rows = React.useMemo(() => data.map(toRow), [data])`) to preserve referential equality and optimize rendering performance.
