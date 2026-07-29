## 2024-07-29 - Destructuring array defaults causes unstable references
**Learning:** Using `const { data = [] } = useQuery()` creates a new array reference on every render during loading states, triggering unnecessary re-renders in downstream components.
**Action:** Always destructure the raw value `const { data } = useQuery()` and apply the fallback inline inside a memoized transformation, e.g., `React.useMemo(() => (data ?? []).map(...), [data])`.
