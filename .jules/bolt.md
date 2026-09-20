## 2024-05-20 - Math.max / Math.min spread array allocation bottleneck
**Learning:** Using `Math.max(...array)` or `Math.min(...array)` where the array is populated dynamically using `.map()` creates a significant memory/GC bottleneck due to intermediate array allocation and risks "Maximum call stack size exceeded" errors in V8 when the array size exceeds ~120k elements.
**Action:** Always replace spread syntax with a single-pass `for...of` loop when finding the maximum or minimum of a collection to prevent stack overflows and avoid intermediate allocations.
