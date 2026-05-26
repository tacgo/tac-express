import { nextJsConfig } from "@workspace/eslint-config/next-js"
import {
  designSystemSyntaxSelectors,
  rawInteractiveSelectors,
} from "@workspace/eslint-config/design-system"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  // Scoped gate: forbid raw interactive HTML elements in dashboard app code.
  // route.ts and layout.tsx are excluded — they contain no JSX rendering.
  {
    files: ["app/**/*.{ts,tsx}"],
    ignores: ["**/route.ts", "**/layout.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...designSystemSyntaxSelectors,
        ...rawInteractiveSelectors,
      ],
    },
  },
]
