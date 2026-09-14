## 2024-09-14 - Spread Operator and Math.max/min
**Learning:** Using the spread operator with Math.max or Math.min (e.g., Math.max(...array)) on large or dynamically sized arrays causes 'Maximum call stack size exceeded' errors in Node.js/V8 (limit ~120k items) and incurs high memory/GC overhead.
**Action:** Use a single-pass iterative for loop instead of Math.max(...array) or Math.min(...array) for arrays that could potentially be large.
