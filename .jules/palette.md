## 2024-05-18 - Improve ARIA labels for icon-only buttons
**Learning:** Found several generic aria labels (like "Save", "Cancel", "Edit hub") in icon-only buttons (often in lists or tables). Screen reader users need more context to understand what they are saving/canceling/editing (e.g., "Save rename for hub XYZ" or "Edit hub XYZ").
**Action:** When adding ARIA labels to icon-only buttons, especially in lists or tables, use descriptive text that includes the specific item being modified (e.g., `Save rename for ${display}`).
