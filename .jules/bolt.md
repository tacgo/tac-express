## 2024-10-27 - Memoize DataTable Row Mappings

**Learning:** Array destructuring with a default value (e.g., `const { data = [] } = useQuery()`) combined with array mapping creates a new array reference on *every single render* when the underlying data is undefined, defeating downstream React memoization. This causes deep, unnecessary re-renders in heavy components like the `DataTableCard` which accepts these mapped rows.

**Action:** When memoizing array mappings derived from hook results, destructure without defaults (`const { data } = useQuery()`), and move the fallback into a `React.useMemo` dependency check (`const rows = React.useMemo(() => (data ?? []).map(toRow), [data])`).
