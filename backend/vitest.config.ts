import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    testTimeout: 30000,
    // Run only the consolidated suite so the in-memory session store
    // (a Map in auth.service.ts) is shared across all describe blocks.
    include: ['src/tests/all.test.ts'],
  },
});
