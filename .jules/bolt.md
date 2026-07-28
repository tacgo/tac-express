## 2024-07-28 - Unstable default array references in destructuring
**Learning:** In React components using React Query (`useQuery`), destructuring with default array values (e.g. `const { data = [] } = useQuery()`) causes unstable references during loading states where `data` is undefined. This forces dependent hooks (like `React.useMemo` depending on `data`) to recalculate on every render.
**Action:** Destructure without a default value, then apply the fallback inline or inside a memoized block (e.g., `const rows = React.useMemo(() => (data ?? []).map(toRow), [data])`).
