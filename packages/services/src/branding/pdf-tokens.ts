/**
 * PDF design tokens — the parallel JS source of truth for colors used
 * by `@react-pdf/renderer` documents in `packages/services/src/pdf/`.
 *
 * ## Why this module exists
 *
 * The browser-side design system lives in
 * `packages/ui/src/styles/globals.css` as CSS custom properties. PDFs
 * are rendered by `@react-pdf/renderer`, which uses its own
 * `StyleSheet` API and **cannot consume CSS variables** — there's no
 * DOM, no `:root`, no theming context.
 *
 * Hardcoding hex literals throughout the PDF source created drift risk
 * (PDF colors quietly diverging from the site palette) and made
 * brand-color changes a multi-file find/replace. This module gives PDF
 * code a single canonical palette referenced by name.
 *
 * ## Sync contract
 *
 * Values here mirror the corresponding tokens in
 * `packages/ui/src/styles/globals.css`:
 *
 *   - `BRAND_PRIMARY`       ↔ `--primary`       (Violet Grid v6 violet)
 *   - `BRAND_PRIMARY_SOFT`  ↔ `--primary-soft`  (violet/100 tint)
 *   - `FG_PRIMARY`          ↔ `--foreground`    (near-black)
 *   - `FG_MUTED`            ↔ `--muted-foreground`
 *   - `BORDER_DEFAULT`      ↔ `--border`        (light gray hairline)
 *   - `SURFACE_WHITE`       ↔ `--background`    (page background)
 *   - `SURFACE_TINT`        ↔ thin row tint (table headers etc.)
 *
 * When updating Violet Grid, update both. There's no automated check
 * yet — see issue #24 for the lint rule that would catch hex literals
 * leaking back into PDF source files.
 *
 * ## What's NOT here
 *
 * Spacing/sizing values aren't extracted yet — the `StyleSheet.create()`
 * blocks have ~80 unique numeric values, and pulling them into a token
 * map without breaking the printed layout requires a layout review pass.
 * Tracked in issue #24.
 */
export const PDF_TOKENS = {
  // ─── Brand ──────────────────────────────────────────────────────────
  /** Primary brand color — Violet Grid v6 violet. Use for headings,
   *  CTAs, totals emphasis, accent rules. */
  BRAND_PRIMARY: "#6D28D9",
  /** Soft tint of brand primary for callout backgrounds (e.g. the
   *  "Amount in words" band). */
  BRAND_PRIMARY_SOFT: "#EDE9FE",

  // ─── Surfaces ───────────────────────────────────────────────────────
  /** Page background — pure white. */
  SURFACE_WHITE: "#ffffff",
  /** Faint surface tint (table row alt, label-row backdrop). */
  SURFACE_TINT: "#fafafa",
  /** Slightly stronger tint (table header background). */
  SURFACE_MUTED: "#f5f5f5",

  // ─── Foreground (dark-on-light scale) ───────────────────────────────
  /** Body-primary text + section headings. Near-black. */
  FG_PRIMARY: "#111111",
  /** Body-secondary text — table values, less-prominent labels. */
  FG_SECONDARY: "#222222",
  /** Muted text — metadata, subtitles, "Issued at" stamps. */
  FG_MUTED: "#444444",
  /** Faint text — hints, footer fine print. */
  FG_FAINT: "#666666",
  /** Disabled / very-faint annotations. */
  FG_DISABLED: "#777777",

  // ─── Borders ────────────────────────────────────────────────────────
  /** Default hairline border between rows / cards. */
  BORDER_DEFAULT: "#e5e5e5",
  /** Soft accent border — for the notes-block left rule + the
   *  terms/footer top dividers. Slightly darker than `BORDER_DEFAULT`
   *  to read as a deliberate accent rather than a flat divider. */
  BORDER_SOFT: "#bbbbbb",
  /** Strong border — same near-black as FG_PRIMARY. Used for the
   *  hard rule above the totals stack and for the signature underline.
   *  Kept as a separate semantic token so future updates can target
   *  borders without touching text color. */
  BORDER_STRONG: "#111111",
} as const

export type PdfTokenName = keyof typeof PDF_TOKENS

/**
 * PDF font-size scale (closes #24's font half).
 *
 * `@react-pdf/renderer` uses unitless numeric `fontSize` (interpreted
 * as PDF points). Hardcoding 13+ unique numbers across the StyleSheet
 * blocks made size adjustments require multi-line find/replace. This
 * scale gives each semantic role a name; one-off values (singletons
 * not covered here) stay as numeric literals with a comment at the
 * call site.
 *
 * Scale was extracted by running:
 *   grep -oE "fontSize: [0-9.]+" packages/services/src/pdf/invoice-pdf.tsx \
 *     | sort | uniq -c | sort -rn
 *
 * which surfaced the distribution: 9 (11×), 8 (8×), 7 (3×), 6/14/11
 * (2× each), .5-variants + 22/13/12/10 (1× each). The named tokens
 * cover the values used 2+ times; singletons stay numeric.
 *
 * Cross-system note: these are NOT the same scale as the browser-side
 * `--text-*` tokens in `globals.css`. Browser type lives at viewport
 * sizes (display/h1/h2/.../caption); PDF type lives at print-point
 * sizes for an A4 invoice. They serve different surfaces.
 */
export const PDF_FONT_SIZES = {
  /** 22pt — single-line display ("TAX INVOICE" header). One callsite. */
  DISPLAY: 22,
  /** 14pt — primary section heading. Used for the company / invoice-meta strip. */
  H_TITLE: 14,
  /** 13pt — secondary heading. */
  H_SECTION: 13,
  /** 12pt — totals "GRAND TOTAL" / "BALANCE DUE" amount. */
  H_TOTALS: 12,
  /** 11pt — sub-heading inside the bill-to / consignment band. */
  H_LABEL: 11,
  /** 10pt — table-header text. */
  TABLE_HEADER: 10,
  /** 9pt — body text default. Most common size in the document. */
  BODY: 9,
  /** 8.5pt — body slightly tightened. */
  BODY_SM: 8.5,
  /** 8pt — caption / secondary label text. */
  CAPTION: 8,
  /** 7.5pt — caption tightened. */
  CAPTION_SM: 7.5,
  /** 7pt — small label text inside the totals stack. */
  LABEL: 7,
  /** 6.5pt — micro-label (footer page number). */
  MICRO: 6.5,
  /** 6pt — smallest microcopy (footer fine-print, terms one-liner). */
  MICRO_SM: 6,
} as const

export type PdfFontSize = keyof typeof PDF_FONT_SIZES
