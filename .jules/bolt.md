## 2024-05-18 - Debouncing Search Inputs

**Learning:** When client-side filtering logic happens directly inside a `useMemo` that depends on a state variable updated on every keystroke, the main thread can get blocked on large lists. This causes typing lag in search bars.
**Action:** Use `React.useDeferredValue(search)` and have the `useMemo` depend on the deferred value instead of the immediate search state to debounce filtering and keep the UI responsive.
