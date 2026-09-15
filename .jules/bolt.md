## 2024-05-20 - Math.max/min spread operator limits
**Learning:** Using the spread operator with `Math.max` or `Math.min` (e.g., `Math.max(...array)`) on dynamically sized arrays can cause "Maximum call stack size exceeded" errors in V8 (limit ~120k items). Combined with `.map()`, it also incurs unnecessary memory and GC overhead.
**Action:** Always use a single-pass iterative `for` loop to find min/max values for dynamically sized arrays, avoiding array allocation and stack limit issues.
