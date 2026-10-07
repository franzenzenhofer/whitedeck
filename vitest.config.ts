import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    /* The examples smoke build has its own run: npm run smoke. */
    exclude: [...configDefaults.exclude, 'src/**/*.smoke.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    /* Two test files driving Keynote.app at once corrupt each other's documents
       (one deletes/saves while the other still builds). Run files one at a time. */
    fileParallelism: false,
  },
});
