# TAC Express — Web App UI Kit

High-fidelity recreation of the TAC Express operator console. Click sidebar items to switch between **Dashboard, Shipments, Manifests, Scanning, Finance** screens.

## Files

- `index.html` — entry; mounts `<App/>` and routes between screens
- `Shell.jsx` — `<Sidebar/>`, `<Topbar/>`, `<Frame/>`, `<PageHead/>`, `<Tabs/>`, `<Badge/>`
- `Pages.jsx` — full screens: `DashboardPage`, `ShipmentsPage`, `ManifestsPage`, `ScanningPage`, `FinancePage`
- `app.css` — kit-local layout + component CSS (imports root `colors_and_type.css`)

## Notes

- Icons are Lucide via CDN (substitute — see `assets/iconography.md`).
- The dashboard hero illustration is a placeholder painterly SVG. Drop your own image in and update the `<svg>` block.
- Currency uses `₹`. Rate cards / customers / management screens are intentionally omitted; the visual vocabulary is fully covered by the 5 screens included.
