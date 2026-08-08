## 2024-08-08 - Default empty array destructuring breaks React.useMemo
**Learning:** Destructuring query hooks with default empty arrays (e.g., `const { data = [] } = useQuery()`) creates a new array reference on every render when the data is undefined, defeating downstream `React.useMemo` memoization and causing deep re-renders.
**Action:** Retain the query object and use nullish coalescing inside `React.useMemo` (e.g., `const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])`) to ensure a stable reference.
