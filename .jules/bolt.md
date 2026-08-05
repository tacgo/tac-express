## 2024-08-05 - DataTable Memoization
**Learning:** Radix/TanStack `DataTable` components in the Ops Console trigger unnecessary deep re-renders if the `rows` array prop changes its reference on every render (e.g., when mapped directly from query data without memoization).
**Action:** Always wrap array mappings for `DataTable` props (like `rows`) with `React.useMemo(() => data.map(toRow), [data])` to provide a stable reference and preserve table memoization.
