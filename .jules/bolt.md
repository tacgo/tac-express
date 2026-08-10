## 2024-08-10 - Query Map Memoization
**Learning:** Destructuring query results with a default empty array (e.g., const { data = [] } = useQuery()) creates a new array reference on every render when undefined. This breaks memoization for downstream components like DataTable, causing expensive deep re-renders in Ops Console live views.
**Action:** Retain the query object and use nullish coalescing inside React.useMemo (e.g., const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])) to provide a stable reference.
