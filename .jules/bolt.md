## 2026-06-30 - Prevent API Array Destructuring from Breaking Referential Equality

**Learning:** Destructuring API responses with default empty arrays (e.g. `const { data = [] } = useQuery()`) causes new array references on every render during loading states, which breaks memoization in downstream components (like tables) and triggers unnecessary full re-renders and local state resets.
**Action:** Destructure the raw value without default arrays (`const { data } = useQuery()`) and instead fall back inline within `React.useMemo` (e.g. `React.useMemo(() => (data ?? []).map(toRow), [data])`).
