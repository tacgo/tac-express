import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.next/**',
      // Stale Claude worktrees mirror packages/* with separate node_modules;
      // including them double-runs the test suite under a divergent React
      // instance and produces phantom "useState is null" failures.
      '**/.claude/worktrees/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/e2e/**',
        '**/*.config.*',
      ],
    },
    alias: [
      // packages/ui exposes its source via `./src/*` in package.json `exports`.
      // Vitest's substring alias can't follow that exports map, so add an
      // explicit rule that includes the `src/` segment for UI subpaths.
      {
        find: /^@workspace\/ui\/(.+)$/,
        replacement: path.resolve(__dirname, './packages/ui/src/$1'),
      },
      // packages/services exposes per-file subpaths via `./X` → `./src/X.ts`
      // in its exports map. Tests in apps/web (and any future cross-app
      // tests) that import from `@workspace/services/<name>` need the same
      // /src/ hop. Added with WS-3 (the /api/track/[awb] route test was the
      // first consumer outside packages/services itself).
      {
        find: /^@workspace\/services\/(.+)$/,
        replacement: path.resolve(__dirname, './packages/services/src/$1.ts'),
      },
      // `@/` maps to apps/web root (the Next.js convention for that app).
      // Required for apps/web test files that import from `@/lib/*`.
      {
        find: /^@\/(.+)$/,
        replacement: path.resolve(__dirname, './apps/web/$1'),
      },
      // Catchall for the remaining workspace packages — relied on by existing
      // services tests; leave behavior unchanged.
      {
        find: '@workspace',
        replacement: path.resolve(__dirname, './packages'),
      },
    ],
  },
});
