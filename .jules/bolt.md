## 2024-06-24 - Prevent Unnecessary Re-renders with stable references when mapping React Query data

**Learning:** When passing mapped API data to composed list components (e.g. `V7OpsShipments`, `V7OpsCustomers`), dynamically calling `.map()` on the raw array (e.g. `data.map(toRow)`) breaks referential equality on every render. Furthermore, destructuring with a default value (e.g. `const { data = [] } = useQuery()`) creates a new empty array reference on every render during loading states.

**Action:** Use `React.useMemo(() => (query.data ?? []).map(...), [query.data])` for the data transformation, avoiding default destructuring on the query result and ensuring table/list components don't unnecessarily re-render or reset internal state when parent components re-render.
