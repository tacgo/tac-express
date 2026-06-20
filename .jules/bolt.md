## 2025-02-14 - Fix array destabilization in TanStack Table mappings
**Learning:** React component optimization where we fix a widespread pattern of TanStack table destructuring `const { data = [] } = useQuery()` that creates unstable array references and causes unnecessary downstream re-renders during loading or missing states.
**Action:** Always wrap default array initialization with `React.useMemo(() => data ?? [], [data])` when passing it into a `.map()` block or derived state dependencies.
