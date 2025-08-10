import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['fuzz/**', 'node_modules/**', 'dist/**', '**/*.bench.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '*.config.ts', 'fuzz/', '**/*.bench.ts'],
    },
  },
  bench: {
    include: ['src/**/*.bench.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    outputFile: 'bench-results.json',
    reporters: process.env.CI ? ['json'] : ['default'],
  },
});