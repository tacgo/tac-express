## 2026-07-27 - React.useMemo with Unstable Default Parameters
**Learning:** Destructuring API responses with default array values (e.g., `const { data = [] } = useQuery()`) causes unstable references during loading states, which breaks downstream `useMemo` hooks or `React.memo` components that depend on it.
**Action:** Always destructure the raw value and apply the fallback inline inside the `useMemo` dependency array or transformation logic (e.g., `React.useMemo(() => (data ?? []).map(...), [data])`).
