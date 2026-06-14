## 2024-05-13 - [Table Mapping Re-renders]
**Learning:** When passing mapped API data to TanStack table or composed list components (like V7Ops* components), failing to wrap the `.map()` transformation in `React.useMemo` breaks referential equality and triggers unnecessary table re-renders and internal state resets. This is because `.map()` returns a new array reference on every render, and the V7Ops components expect stable references for their rows props to optimize rendering.
**Action:** Always wrap the `.map()` transformation in `React.useMemo` when passing data to V7Ops* components.
