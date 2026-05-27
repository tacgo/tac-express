import { config } from "@workspace/eslint-config/react-internal"
import {
  designSystemSyntaxSelectors,
  rawInteractiveSelectors,
} from "@workspace/eslint-config/design-system"

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores: ["src/components/composed/_archive/**"] },
  ...config,
  // Scoped gate: forbid raw interactive HTML elements in composed components.
  // The global designSystemConfig applies its no-restricted-syntax selectors
  // monorepo-wide; this block adds the raw-element selectors only for the
  // composed layer where the shadcn primitive equivalents are always available.
  {
    files: ["src/components/composed/**/*.{ts,tsx}"],
    ignores: ["src/components/composed/_archive/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...designSystemSyntaxSelectors,
        ...rawInteractiveSelectors,
      ],
    },
  },
]
