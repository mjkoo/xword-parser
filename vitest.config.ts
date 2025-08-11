import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['fuzz/**', 'node_modules/**', 'dist/**', '**/*.bench.ts'],
    reporters: process.env.CI ? ['junit', 'default'] : ['default'],
    outputFile: {
      junit: 'test-results.xml',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'cobertura', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.bench.ts',
        '**/*.test.ts',
        '**/*.d.ts',
      ],
    },
  },
  bench: {
    include: ['src/**/*.bench.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    outputFile: 'bench-results.json',
    reporters: process.env.CI ? ['json'] : ['default'],
  },
});