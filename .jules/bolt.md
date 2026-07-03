## 2024-07-03 - [Stable References in React Render]
 **Learning:** [When passing mapped API data to TanStack table or composed list components, doing `.map()` directly in the render body or setting default array values during destructuring (e.g., `const { data = [] } = useQuery()`) creates unstable references on every render, triggering unnecessary table re-renders and internal state resets.]
 **Action:** [Always destructure the raw value and apply the fallback inline inside `React.useMemo` (e.g., `React.useMemo(() => (data ?? []).map(...), [data])`) to ensure referential equality.]
