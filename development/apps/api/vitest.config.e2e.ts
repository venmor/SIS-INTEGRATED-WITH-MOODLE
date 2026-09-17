import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Live-DB suite with argon2id hashing (deliberately slow) plus Nest boot
    // per file: 5s starves under parallel workers. 30s fails only real hangs.
    testTimeout: 30000,
  },
});
