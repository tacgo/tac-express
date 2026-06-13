## 2024-06-13 - Avoid hardcoded "No data" in EmptyState
**Learning:** Hardcoding technical terms like "No data" for positive or neutral conditions (e.g., empty queues, initial setup) creates a robotic and disconnected UX.
**Action:** Use contextual eyebrow labels (e.g., "Queue clear", "Inbox clear") that match the emotional valence of the state, and ensure generic components like `EmptyState` support customizable labels rather than hardcoded fallbacks.
