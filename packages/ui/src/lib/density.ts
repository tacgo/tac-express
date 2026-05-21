/**
 * Density vocabulary — neutral shared type for the v6 density runtime.
 *
 * Lives in `lib/` rather than `components/primitives/` or `components/composed/`
 * because both the `DensityToggle` primitive and the `DensityProvider` composed
 * component need it, and primitives must not depend on composed modules
 * (would invert the layered architecture).
 *
 * Mirrors the three values handled by `[data-density]` cascade selectors in
 * `packages/ui/src/styles/globals.css` and the `tac-density` localStorage key.
 */
export type Density = "compact" | "comfortable" | "spacious"
