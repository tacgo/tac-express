## 2024-05-15 - Array Spread Math Operations Risk Stack Overflow
**Learning:** Using `Math.max(...array)` or `Math.min(...array)` on dynamically sized arrays can cause "Maximum call stack size exceeded" errors in V8.
**Action:** Use a single-pass iterative loop with `let min = Infinity; let max = -Infinity;` instead of spreading into Math functions for large arrays, which is also faster due to single-pass and less GC overhead.
