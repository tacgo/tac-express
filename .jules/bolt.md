## 2024-05-18 - Avoid destructuring default arrays from query hooks
**Learning:** Destructuring an undefined query result into an empty array (e.g. `const { data = [] } = useQuery()`) creates a new array reference on every render. When passed to unmemoized `.map()` calls, this breaks memoization and triggers deep re-renders of expensive components like `DataTable` in live views.
**Action:** Retain the query object and use nullish coalescing inside a `React.useMemo` wrapper (e.g. `const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])`) to provide a stable reference.
