## 2025-01-01 - Avoid Math.max/min spread on large arrays
**Learning:** Using `Math.max(...array)` on dynamically sized arrays can cause Node/V8 "Maximum call stack size exceeded" limits (~120k items).
**Action:** Use a single-pass iterative `for` loop to compute min/max for unbounded arrays to avoid crashes and lower GC overhead.
