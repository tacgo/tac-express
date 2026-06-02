## BOLT'S JOURNAL
## 2024-06-02 - React useMemo array destructuring trap
**Learning:** Default array destructuring for undefined remote data (`const { data = [] } = useHook()`) will allocate a fresh array in memory on every render. If this `data` variable is passed as a dependency to `React.useMemo`, the memoization breaks during the loading state, executing on every render.
**Action:** Extract the fallback initialization into the useMemo callback instead (`(data ?? []).map(...)`), and keep the destructured hook variable plain (`const { data } = useHook()`) to ensure true referential stability.
