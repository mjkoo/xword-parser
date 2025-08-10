import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['fuzz/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '*.config.ts', 'fuzz/'],
    },
  },
});