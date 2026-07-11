## 2024-05-18 - Memoize API data transformations
**Learning:** Destructuring with default array values (`const { data = [] } = useQuery()`) and inline `.map()` transformations break referential equality, causing expensive re-renders in TanStack table composed list components.
**Action:** Always destructure the raw value and wrap the `.map()` transformation in `React.useMemo(() => (data ?? []).map(...), [data])` to preserve referential equality.
