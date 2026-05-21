# Iconography

TAC Express does not ship a public icon font. This kit uses **[Lucide](https://lucide.dev)** via CDN as the closest visual match (1.5px stroke, square caps, no fill).

Load via:
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>lucide.createIcons();</script>
```

## Mapping

| TAC concept   | Lucide name        |
| ------------- | ------------------ |
| Dashboard     | `layout-dashboard` |
| Analytics     | `bar-chart-3`      |
| Shipments     | `package`          |
| Manifests     | `clipboard-list`   |
| Scanning      | `scan-line`        |
| Inventory     | `boxes`            |
| Exceptions    | `triangle-alert`   |
| Finance       | `wallet`           |
| Rate Cards    | `calculator`       |
| Customers     | `users`            |
| Management    | `shield`           |
| Notifications | `bell`             |
| Settings      | `settings`         |
| Search        | `search`           |
| Open / link   | `arrow-up-right`   |
| Refresh       | `refresh-cw`       |
| Plus          | `plus`             |
| Theme (sun)   | `sun`              |
| Theme (moon)  | `moon`             |
| Truck         | `truck`            |
| Plane         | `plane`            |
| Check         | `check-circle-2`   |
| Clock         | `clock`            |
| Wifi off      | `wifi-off`         |

**Stroke width:** always `1.5`. Set globally via `[stroke-width]` attribute on the `<svg>` Lucide produces, or pre-config the CDN call.

**Sizes:** 14 (inline label icon), 16 (default), 18 (sidebar), 20 (button-leading).

**Color:** `currentColor` — inherit from text. The active sidebar item uses `--tac-violet`.

## Unicode glyphs in active use

These are part of the brand language and should NOT be replaced with Lucide icons:

| Glyph | Use |
| ----- | --- |
| `→`   | Routing arrow ("IMPHAL → DEL"); part of wordmark. |
| `↗`   | Open / view detail. |
| `·`   | Inline separator ("Receive · INBOUND AT HUB"). |
| `//`  | Section marker ("// PLATFORM"). |
| `..`  | Trailing ellipsis in search placeholders. |
