## 2024-06-25 - Prevent Unnecessary Re-renders from Destructured Data and Mapped Arrays

**Learning:** When using hooks like `useQuery` or custom data hooks, doing `const { data = [] } = useHook()` combined with `const rows = data.map(...)` breaks referential equality on every render while the query is loading or fetching, causing large child components (like TanStack tables or complex lists) to re-render completely and lose internal state. The `?? []` and `.map` generate a fresh array reference each time.

**Action:** Avoid default array values during destructuring. Instead, memoize the mapping using `React.useMemo` and apply the fallback inline: `const rows = React.useMemo(() => (query.data ?? []).map(toRow), [query.data])` or similar. This ensures stable references when the underlying data hasn't actually changed.
