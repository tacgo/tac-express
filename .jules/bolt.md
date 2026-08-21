## 2024-05-18 - Memoize query mappings for Table components

**Learning:** When memoizing array mappings from query hooks, destructuring with a default empty array (e.g., `const { data = [] } = useQuery()`) creates a new array reference on every render when undefined, breaking memoization.

**Action:** Retain the query object and use nullish coalescing inside `React.useMemo` (e.g., `const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])`) to prevent deep re-renders of `DataTable` components.
