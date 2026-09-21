## 2025-03-09 - Avoid spread operator with Math.max/Math.min on dynamic arrays
**Learning:** Using `Math.max(...array)` or `Math.min(...array)` with the spread operator on large or dynamically sized arrays can cause "Maximum call stack size exceeded" errors in Node.js/V8 (due to argument limits ~120k) and incurs high memory/GC overhead, especially when combined with intermediate arrays from `.map()`.
**Action:** Replace `Math.max(...array.map())` and `Math.min(...array.map())` with a single-pass iterative `for` loop to avoid call stack limits and prevent unnecessary memory allocations.
