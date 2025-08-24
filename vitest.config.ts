import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["fuzz/**", "node_modules/**", "dist/**", "**/*.bench.ts"],
    reporters: process.env.CI ? ["default"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["**/*.bench.ts", "**/*.test.ts", "**/*.d.ts"],
    },
  },
  bench: {
    include: ["src/**/*.bench.ts"],
    exclude: ["node_modules/**", "dist/**"],
    outputFile: "bench-results.json",
    reporters: process.env.CI ? ["json"] : ["default"],
  },
});
