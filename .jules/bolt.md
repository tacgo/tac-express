## 2025-01-08 - Debounced Table Search
**Learning:** The TanStack React Table implementation (`DataTable`) triggers a re-render of the entire table on every keystroke in the global search input. When a large list (like Shipments or Manifests) is rendered, this causes significant lag during search as the whole table re-evaluates filters and renders.
**Action:** Implemented a `DebouncedSearchInput` wrapper that updates local UI state immediately to ensure the input field is perfectly responsive, but debounces the actual table filter update (and thus the expensive re-render) by 300ms.
