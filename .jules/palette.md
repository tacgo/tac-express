## 2024-08-21 - Standardize focus visible style in Notification Bell
**Learning:** The legacy `focus-visible:ring-1 focus-visible:ring-ring` styling breaks the app's established design tokens and provides inadequate focus visibility compared to the `tac-focus-premium` class.
**Action:** Used `focus-visible:outline-none focus-visible:tac-focus-premium` for interactive lists in `NotificationBell` to restore high-contrast focus rings and align with the design system.
