## 2024-08-18 - Memoize DataTable Array Mappings
**Learning:** Destructuring with a default empty array in query hooks (e.g. `const { data = [] } = useQuery()`) and directly passing `.map(toRow)` to DataTable components creates a new array reference on every render, breaking memoization and causing deep re-renders.
**Action:** When mapping query data to rows, preserve the array reference by not destructuring with a default empty array, and memoize the row mapping using `React.useMemo(() => (query.data ?? []).map(toRow), [query.data])`.
