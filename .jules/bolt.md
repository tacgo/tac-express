## 2025-02-23 - Stable Array References in useMemo
**Learning:** Destructuring with a default array (e.g., `const { data = [] } = useQuery()`) allocates a new array instance on every render during loading/error states. When passed to a `useMemo` dependency array, this breaks referential equality and causes unnecessary recalculations and downstream re-renders (like table state resets).
**Action:** Destructure the raw value and apply the fallback inline within the memoised function: `React.useMemo(() => (data ?? []).map(...), [data])`
