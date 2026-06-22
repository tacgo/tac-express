## 2024-06-22 - EmptyState Contextual Eyebrow Labels
**Learning:** Hardcoding technical terms like "No data" for positive or neutral conditions (e.g., an empty inbox means "Queue clear", not "No data") creates a disconnected emotional valence. Users need context-aware feedback.
**Action:** The `EmptyState` primitive now accepts an optional `label` prop. When implementing empty states, match the eyebrow label to the emotional valence of the condition (e.g. use "Queue clear" for an empty inbox, "Setup" for coming-soon tabs).
