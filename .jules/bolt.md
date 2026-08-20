# Bolt Journal
## 2025-02-28 - Prevent DataTable unmemoization
**Learning:** Using default destructuring parameters (e.g. `const { data = [] }`) to handle undefined query data creates a new array reference on every render when data is not yet loaded or is undefined. When this array is mapped and passed into `DataTable` views in the Ops Console, it prevents the underlying data table components from memoizing correctly, triggering deep re-renders on every update.
**Action:** When memoizing array mappings from query hooks, always retain the full query object and use nullish coalescing within a `React.useMemo` (e.g. `const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])`) to ensure stable references.
