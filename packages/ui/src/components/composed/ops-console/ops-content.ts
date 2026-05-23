import { cva, type VariantProps } from "class-variance-authority"

/**
 * opsContentVariants — the ops-console shell's content-width contract.
 *
 * Two-tier layout model (the fix for unbounded ultrawide stretch):
 *
 *   - **Shell tier (this)** — `OpsShell` wraps every route's content in a
 *     centered container capped at the hardware-frame ceiling
 *     (`max-w-control` / 1600px). This is the global safety net: no route,
 *     even one that never reaches for `PageShell`, can sprawl edge-to-edge on
 *     a 2560px operations monitor.
 *   - **Page tier (`PageShell`)** — narrows further per route to the
 *     operational content measure (`max-w-page-wide` 1536 / `max-w-page-content`
 *     1280) or a form measure. PageShell nests inside this container and always
 *     wins downward, since a child `max-w` can only narrow its parent's box.
 *
 * `frame="full"` is the deliberate escape for a surface that must reach the
 * full hardware frame edge-to-edge (none today — reserved for print-in-console
 * style routes). The default is `bounded`.
 */
export const opsContentVariants = cva("mx-auto w-full px-6 py-6 lg:px-8 lg:py-8", {
  variants: {
    frame: {
      bounded: "max-w-control",
      full: "",
    },
  },
  defaultVariants: {
    frame: "bounded",
  },
})

export type OpsContentVariants = VariantProps<typeof opsContentVariants>
