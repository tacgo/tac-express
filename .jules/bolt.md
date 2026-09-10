## 2024-05-18 - Replacing Math.max(...array) with an iterative loop

**Learning:** `Math.max(...array)` crashes Node.js with "Maximum call stack size exceeded" on large arrays, and incurs high GC overhead due to array destructuring.
**Action:** Always use an explicit iterative loop `for (const c of cells)` when finding max or min over an unbounded array.
