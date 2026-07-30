## 2024-07-30 - Unstable Array References in useQuery Destructuring
**Learning:** Destructuring with default array values (`const { data = [] } = useQuery()`) creates unstable references during loading/polling states. This causes components to unnecessarily re-render on every poll or background refetch when the data mapping is not memoized properly.
**Action:** Always destructure the raw value and apply the fallback inline inside `React.useMemo` (e.g., `React.useMemo(() => (data ?? []).map(...), [data])`) to ensure stability across re-renders.
