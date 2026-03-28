import { defineConfig } from "tsdown";

export default defineConfig([
  // Main build configuration for Node.js and modern bundlers
  {
    entry: {
      index: "src/index.ts",
      lazy: "src/lazy.ts",
    },
    format: ["cjs", "esm"],
    dts: {
      sourcemap: true,
    },
    sourcemap: true,
    minify: false,
    target: "node18",
    platform: "neutral",
    deps: {
      neverBundle: ["fast-xml-parser"],
    },
    outExtensions: ({ format }) => ({
      js: format === "cjs" ? ".js" : ".mjs",
    }),
    inputOptions: {
      resolve: {
        mainFields: ["module", "main"],
      },
    },
  },
  // Browser build (ESM for modern bundlers)
  {
    entry: {
      "xword-parser.browser": "src/browser.ts",
    },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    minify: true,
    platform: "browser",
    target: ["es2020", "chrome91", "firefox90", "safari14"],
    deps: {
      alwaysBundle: ["fast-xml-parser", "buffer"],
    },
    define: {
      global: "globalThis",
    },
    outExtensions: () => ({
      js: ".min.js",
    }),
  },
]);
