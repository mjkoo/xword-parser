import { defineConfig } from "vitest/config";
import { vitiatePlugin } from "@vitiate/core/plugin";

export default defineConfig({
  plugins: [
    vitiatePlugin({
      instrument: {
        include: ["src/**/*.ts"],
        exclude: ["**/node_modules/**", "**/*.test.ts", "**/*.bench.ts"],
      },
      fuzz: {
        maxLen: 8192,
        timeoutMs: 30000,
      },
      dataDir: ".vitiate",
    }),
  ],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          globals: true,
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["**/*.bench.ts"],
          reporters: process.env.CI ? ["default"] : ["default"],
          coverage: {
            provider: "v8",
            reporter: ["text", "lcov"],
            include: ["src/**/*.ts"],
            exclude: ["**/*.bench.ts", "**/*.test.ts", "**/*.d.ts"],
          },
        },
      },
      {
        extends: true,
        test: {
          name: "fuzz",
          include: ["fuzz/**/*.fuzz.ts"],
        },
      },
    ],
  },
  bench: {
    include: ["src/**/*.bench.ts"],
    exclude: ["node_modules/**", "dist/**"],
    outputFile: "bench-results.json",
    reporters: process.env.CI ? ["json"] : ["default"],
  },
});
