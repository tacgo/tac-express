# TAC Express — Design System

> Logistics operations console for **TAC Express**, an Indian logistics company operating shipment, manifest, scanning, and finance workflows for 15+ years. The product is an internal hub-operations web app (one screenshot set, "Imphal // Prod" environment).

## Sources

- 13 product screenshots provided by the user (`uploads/Screenshot 2026-05-09 *.png`).
  Pages captured: Dashboard, Analytics, Shipments, Manifests, Scanning, Inventory, Exceptions, Finance, Rate Cards, Customers, Management, Notifications, Settings.
- Brand description: "TAC Express is a logistics company web app, operated for more than 15 years."
- No codebase or Figma was provided. **All visual recreations in this system are derived from screenshot evidence.** Where details (icons, spinner, exact font) are uncertain, the closest CDN/Google Fonts substitute is used and flagged in `CAVEATS`.

## Index

| File | What's in it |
| --- | --- |
| `README.md` | This document — context, content + visual fundamentals, iconography. |
| `colors_and_type.css` | All design tokens — color, type, spacing, radii, shadow. Import once. |
| `assets/` | Logo, favicon, hero illustration, decorative motifs (hatch border, corner ticks). |
| `preview/*.html` | Small specimen cards that populate the Design System tab. |
| `ui_kits/web_app/` | High-fidelity React/JSX recreation of the TAC Express ops console. |
| `SKILL.md` | Agent-Skill compatible front-matter for use as a Claude Code skill. |

---

## Product Context

TAC Express runs **multi-hub logistics** (parcel + freight) inside India. The console serves a hub operator ("Super Admin" role) and is split into three sidebar groups, each prefixed with a `//` comment marker:

- **// PLATFORM** — Dashboard, Analytics
- **// OPERATIONS** — Shipments, Manifests, Scanning, Inventory, Exceptions
- **// BUSINESS** — Finance, Rate Cards, Customers, Management

Plus footer items: Notifications, Settings. Currency is **₹ (INR)**. Hub codes (IMPHAL, GUWAHATI, NEW_DELHI) appear inline as monospace identifiers. Shipment numbers follow the pattern `TAC<YY><MMDD><NN>`; manifests `MAN…`; invoices `INV-2026-NNNNN`.

The vibe is **"a serious operator's terminal, dressed in warm paper"** — engineering-tool density paired with a calm, low-saturation print aesthetic. Not a SaaS marketing site; a tool you live in.

---

## Content Fundamentals

**Voice.** Direct, operational, slightly playful with monospace flourishes. Page bodies use second person sparingly — most copy is short imperative or descriptive ("Real-time operations overview across the network", "Scan AWBs and manifests — works offline with auto-sync").

**Casing.**
- Page titles: **Title Case**, sans-serif ("Dashboard", "Rate Cards", "Operations & Access").
- Eyebrows / section kickers: **ALL CAPS, MONO, TRACKED** ("PLATFORM", "BUSINESS", "ADMINISTRATION").
- Sidebar nav items: **ALL CAPS, MONO** ("DASHBOARD", "SHIPMENTS").
- Table column headers: **ALL CAPS, MONO** ("CN NUMBER", "ROUTE", "SERVICE").
- Identifiers (CN numbers, hub codes, AWBs): **MONO, often uppercase**.
- Body / captions / breadcrumbs: sentence case.

**Punctuation & symbols.** Heavy use of:
- `→` for routing, brand wordmark ("EXPRESS →"), and route columns ("IMPHAL → DEL")
- `↗` for "open in detail" and outbound chips
- `//` as section markers in sidebar headers and prefixes ("IMPHAL // PROD")
- `·` (middle dot) as separator ("Receive · INBOUND AT HUB", "0 TOTAL · 0 UNREAD")
- em dashes for explanatory subtitles ("Transit manifests — create, build, depart and receive")
- `..` (two dots) inside placeholders ("SEARCH AWB, SENDER, RECEIVER..")

**Tone examples.**
- Welcome line: "Welcome back, Operator" — brief, role-flavored, no exclamation.
- Empty states: "Awaiting scans…", "No notifications yet — We'll surface alerts and shipment events here as they arrive.", "No exceptions — all clear", "AWAITING SIGNAL · 2 · RESUMES AT N ≥ 3".
- Status badges: single uppercase mono words — `CREATED`, `DRAFT`, `ISSUED`, `PAID`, `CANCELLED`, `STD`, `PRIORITY`.

**No emoji.** None observed in product copy. Do not introduce them. Unicode arrows and bullets stand in for warmth.

**I vs You.** Prefer the impersonal/imperative ("Manage your profile…") over either. The operator is addressed once on the dashboard hero ("Welcome back, Operator") and otherwise the system speaks about itself.

---

## Visual Foundations

**Surface palette.** Warm cream paper, never plain white. Page background `#FAF8F2`, sidebar a touch warmer `#F1ECE0`, hover `#E7E1D2`. White appears only inside tabular cells and form inputs. This is intentional — the cream gives the screen a printed-document feeling that matches the manifest/waybill metaphor.

**Accent.** A single saturated **violet** `#6E40FF`, used for:
- Active sidebar item (light violet pill `#EFEAFF` background + violet text)
- Primary buttons (`+ NEW SHIPMENT`, `+ ADD RATE CARD`, `+ NEW INVOICE`)
- Identifiers and links (CN numbers in the shipments table)
- Chart fills (light lavender area + violet stroke)
- Bottom-right "A" avatar chip and chart axis colors
A complementary warm **orange `#F59E0B`** is reserved for the **EXPRESS →** half of the wordmark and nothing else.

**Type.** Two-font system: **Inter** for headings/body, **JetBrains Mono** for every label, identifier, status, nav item, kbd, and form placeholder. The mono presence is the system's most distinguishing feature — never replace it with body sans for labels.

**Spacing.** 4px base. Card padding 24–32px. Sidebar items 12px vertical / 16px horizontal. Tight in tables (10–12px row vertical), generous in headers.

**Backgrounds & motifs.**
- A signature **diagonal hatch stripe** runs along the top edge of every primary content frame (`repeating-linear-gradient(135deg, line 0 6px, transparent 6px 12px)`). It also runs along the bottom edge of the same frame, giving the page a "ticket / waybill" feeling.
- **Corner brackets**: short L-shaped tick marks appear at the top-left and bottom-right of inner cards (e.g. the empty-state Inbox card on Notifications, the Hub Inventory card). Drawn as 1–2px black `border-top` + `border-left` (or right/bottom) on a small absolutely-positioned span.
- **No gradients** other than the protection gradient on the dashboard hero illustration.
- **No drop shadows** except the very flat `0 1px 0 rgba(0,0,0,.04)` under primary buttons. Cards rely on a single `1px` line, not elevation.
- Dashboard hero uses a **wide cinematic illustration** (winding mountain road, anime-leaning, painterly). It's full-bleed within the rounded-rectangle hero card. This is the only big imagery in the product — keep it precious.

**Animation.** Minimal. Hover transitions 120ms ease-out on background-color and border-color only; no transform bounces. Focus rings use a 2px violet outline with 2px offset. No skeletons observed; loading states use copy ("AWAITING SIGNAL · 2 · RESUMES AT N ≥ 3"). Charts presumably animate on mount.

**Hover & press states.**
- Sidebar non-active row: hover swaps bg from `paper-2` to `paper-3`, text from `fg-3` → `fg-1`.
- Tab pills (filter buttons "ALL / DRAFT / BUILDING / OPEN…"): inactive = transparent + 1px line; hover = `paper-3`; active = solid violet fill + white text.
- Primary button: hover deepens to `--tac-violet-2`; press shrinks 1px translate-y or simply darkens.
- Table rows: hover row gets `paper-3` bg and the right-edge "VIEW" link reveals.
- Links: violet, no underline default; on hover underline 1px.

**Borders.** A 1px hairline `--line` `#D9D2C2` everywhere. **Sharp corners are the default** (radius 2–4px). The pill-shaped active sidebar selection and the small kbd chip are the only fully rounded surfaces.

**Inner / outer shadow systems.** The system uses **inset 1px** rather than drop-shadow elevation. Cards: `box-shadow: inset 0 0 0 1px var(--line)`. Stat cards (Total Shipments, Total Revenue) carry a 2-px **violet bottom underline** that doubles as a progress meter.

**Protection gradients vs capsules.** Where text overlays imagery (dashboard hero), a **solid white capsule** ("DISPATCH · LIVE") sits in the corner instead of a gradient — pill, white fill, 1px line. Capsules win.

**Layout rules.**
- Fixed left sidebar 240px wide, full-height, sticky.
- Content frame inside a 24px outer gutter; the hatch border lives flush with the frame's top and bottom edges.
- Top breadcrumb is a single line of small mono text + the right-side global toolbar (search `⌘K`, theme toggle indicator `C / M / S`, bell, sun/moon, avatar).
- Cards do **not** stretch the full content width; they sit in a 12-column grid at densities 4/4/4 or 3/3/3/3, with a max content width of ~1400px.

**Transparency & blur.** None. The visual language is matte and printed; no glassmorphism. The only translucency is the 50%-opacity violet of `--tac-violet-50` and the 6%-black under buttons.

**Imagery.** Warm-toned, painterly. Slight grain. No B&W. No stock photography. The dashboard hero is the only photo-style asset.

**Cards.**
- 1px line border on all four sides, radius 4px.
- White or `paper` background.
- Optional 1px violet underline (stat cards) or hatch-stripe top edge (full content frame).
- Padding 24px.
- Title set in `.label` (mono, uppercase, tracked); large value below in 32–40px sans.

---

## Iconography

**System.** TAC Express ships its own inline icons drawn at 16×16 with a 1.5px stroke, square caps, no fills. The set is small and operational: box (Shipments), document-stack (Manifests), scan-circle (Scanning), clipboard (Inventory), warning-triangle (Exceptions), wallet (Finance), grid (Dashboard), bar-chart (Analytics), people (Customers), shield (Management), bell (Notifications), gear (Settings), arrow up-right (link out), refresh, search, sun, moon, plus.

**No emoji** anywhere in the product. Unicode arrows (`→ ↗`) carry the load wherever a directional glyph is needed.

**Brand mark.** "TAC EXPRESS →" set in **JetBrains Mono Bold**:
- "TAC" in `--tac-ink` (near-black)
- "EXPRESS →" in `--tac-orange`
- A subtitle line below — mono, uppercase, tracked, very small — `IMPHAL // PROD`.
The `→` is part of the wordmark and must travel with it.

**Substitution policy.** Since no icon font was provided, this kit uses **Lucide via CDN** as the closest match (1.5px stroke, square caps, identical glyph set). The Lucide names mapped to the product are documented in `assets/iconography.md`. **FLAG TO USER:** if you have the original icon SVGs, drop them into `assets/icons/` and we'll switch the kit to use them directly.

---

## CAVEATS / Open questions for the user

1. **Fonts.** No font files were provided. The system uses **Inter** + **JetBrains Mono** + **Instrument Serif** from Google Fonts as the closest match to the screenshots. If TAC Express has licensed display fonts, send the `.woff2` files and I'll swap them in.
2. **Icons.** Substituted with Lucide CDN. Replace with your real set when available.
3. **Hero illustration.** A placeholder painterly mountain-road image is included as `assets/dashboard-hero.png` — please supply the actual production asset.
4. **Dark mode.** The header indicator suggests three themes (`C / M / S` — possibly Cream / Midnight / System). Only the cream/light theme is documented here; supply dark-mode hexes if you want full coverage.
5. **Logo file.** The TAC Express wordmark is reconstructed from the screenshot. A vector original would let us render it crisply at any size.

---

## Bold ask

Send the **icon SVGs**, the **logo SVG**, the **hero illustration**, and any **dark-mode token values** so we can swap the placeholders out and lock the system in.
