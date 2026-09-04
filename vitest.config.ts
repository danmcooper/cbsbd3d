import { defineConfig } from 'vitest/config';

// One suite, node environment. The site's own tests join `include` when the app
// arrives; until then this repo is a generator and nothing here touches a DOM.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['shared/**/*.test.ts', 'scripts/**/*.test.mts'],
  },
});
