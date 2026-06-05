## 2024-06-05 - TanStack Table Re-rendering Performance Hit
**Learning:** Passing `query.data.map(...)` directly into a TanStack table or memoized component wrapper recreates the array on every render, triggering unnecessary and expensive DOM/VDOM diffs and resetting table internal state.
**Action:** Always wrap `.map()` calls that transform API data into row definitions for tables in a `React.useMemo` hook with `[data]` as the dependency array.
