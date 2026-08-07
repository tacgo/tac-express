## 2025-02-26 - Add React.useMemo to DataTable row generation array mapping
**Learning:** Mapping arrays inline (e.g. `data.map(toRow)`) in components that pass the resulting array to a DataTable creates a new array reference on every render, which breaks the memoization of the underlying DataTable components, leading to unnecessary deep re-renders of the tables.
**Action:** Always wrap array mappings that are passed to DataTable with `React.useMemo` (e.g., `const rows = React.useMemo(() => data.map(toRow), [data])`) to provide a stable reference and avoid breaking table memoization.
