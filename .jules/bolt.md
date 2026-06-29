## 2024-05-14 - React useMemo Destructuring Anti-pattern
**Learning:** When using React.useMemo to optimize API data transformations, setting default array values during destructuring (e.g., `const { data = [] } = useQuery()`) creates unstable references during loading states on every render.
**Action:** Always destructure the raw value and apply the fallback inline (e.g., `React.useMemo(() => (data ?? []).map(...), [data])`) to preserve referential equality and prevent unnecessary re-renders of downstream components.
