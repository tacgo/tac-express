## 2025-02-12 - Prevent V8 Maximum Call Stack Size Exceeded using spread operator with large arrays in UI components
**Learning:** `Math.max(...array)` and `Math.min(...array)` using the spread operator can cause 'Maximum call stack size exceeded' errors in Node.js/V8 when dealing with large or dynamically sized arrays (limit ~120k items). This also incurs high memory/GC overhead in frontend UI component rendering, especially charts rendering thousands of points.
**Action:** Use a single-pass iterative `for` loop or `reduce` instead of the spread operator when dealing with large arrays.
