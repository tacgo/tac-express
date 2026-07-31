## 2025-07-31 - [Bulk Sync Concurrency Optimization]
**Learning:** Sequential loops awaiting asynchronous functions cause severe performance bottlenecks during bulk operations.
**Action:** Replace `for...of` loops that contain independent `await` calls with `Promise.allSettled()` to process asynchronous tasks concurrently while preserving failure handling logic.
