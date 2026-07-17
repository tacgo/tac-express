## 2024-07-17 - V7Ops TanStack Table Referential Stability
**Learning:** Destructuring default array values (e.g., `const { data = [] } = useQuery()`) creates an unstable reference on every render during loading states, which causes unnecessary re-renders and internal state resets in TanStack table and `V7Ops*` components.
**Action:** Always destructure the raw value without a default, and apply the fallback inline within `React.useMemo` (e.g., `React.useMemo(() => (data ?? []).map(toRow), [data])`).
