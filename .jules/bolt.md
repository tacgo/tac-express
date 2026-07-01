## 2024-05-18 - [Referential Equality Breaks with Destructuring and .map()]
**Learning:** When using `const { data = [] } = useQuery()` and passing it to `.map()`, an empty array fallback is recreated on every render if the query result is undefined. This breaks referential equality and causes unnecessary re-renders in child components that receive the mapped output.
**Action:** Destructure `data` and then use `React.useMemo(() => (data ?? []).map(...), [data])` to ensure referential stability and prevent wasted re-renders.
