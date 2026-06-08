## 2025-02-28 - Add React.useMemo to mapped data arrays before passing to table components
**Learning:** Passing mapped data arrays without memoizing them causes V7Ops* composed components or TanStack tables to break referential equality, leading to unnecessary table re-renders and internal state resets.
**Action:** When passing mapped API data to TanStack table or composed list components, always wrap the `.map()` transformation in `React.useMemo`.
