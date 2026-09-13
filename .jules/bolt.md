## 2024-09-13 - Math.max Spread Operator Call Stack Limits
**Learning:** The codebase relies on V8/Node.js runtimes where using the spread operator with `Math.max(...array)` or `Math.min(...array)` on large dynamically sized datasets (like chart elements) causes "Maximum call stack size exceeded" errors due to V8's argument limits (~120k) and incurs high memory/GC overhead.
**Action:** Always use a single-pass iterative `for` loop to calculate min/max on large or dynamically sized arrays instead of spreading them into variadic functions.
