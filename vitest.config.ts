import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// One suite. Generation tests are slow here in a way they are not in the 2D
// repo — 3x3x3 is the only board this generator builds, so there is no smaller
// board to test on — and they still run with everything else rather than
// hiding in a second config nobody remembers to run.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true, // lets @testing-library/react auto-cleanup between tests
    environment: 'node',
    include: [
      'shared/**/*.test.ts',
      'scripts/**/*.test.mts',
      'site/src/**/*.test.{ts,tsx}',
    ],
  },
});
