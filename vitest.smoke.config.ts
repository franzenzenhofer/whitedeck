import { defineConfig } from 'vitest/config';

/* `npm run smoke`: the real CLI builds the shipped examples with -f all on this OS. */
export default defineConfig({
  test: {
    include: ['src/**/*.smoke.test.ts'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    fileParallelism: false,
  },
});
