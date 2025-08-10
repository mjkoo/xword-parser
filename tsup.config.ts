import { defineConfig } from 'tsup';

export default defineConfig([
  // Main build configuration for Node.js and modern bundlers
  {
    entry: {
      index: 'src/index.ts',
      lazy: 'src/lazy.ts'
    },
    format: ['cjs', 'esm'],
    dts: {
      resolve: true,
      // Generate declaration maps for better IDE support
      compilerOptions: {
        declarationMap: true,
      },
    },
    sourcemap: true,
    clean: true,
    minify: false,
    splitting: true,
    treeshake: true,
    target: 'node18',
    platform: 'neutral',
    external: ['fast-xml-parser'],
    outExtension({ format }) {
      return {
        js: format === 'cjs' ? '.js' : '.mjs',
      };
    },
    esbuildOptions(options) {
      // Enable tree-shaking optimizations
      options.treeShaking = true;
      options.metafile = true;
      options.mainFields = ['module', 'main'];
    },
  },
  // Browser build (UMD for CDN usage)
  {
    entry: {
      'xword-parser.browser': 'src/index.ts',
    },
    format: ['iife'],
    dts: false,
    sourcemap: true,
    minify: true,
    platform: 'browser',
    globalName: 'XwordParser',
    noExternal: ['fast-xml-parser'],
    outExtension() {
      return {
        js: '.min.js',
      };
    },
    esbuildOptions(options) {
      options.treeShaking = true;
      options.target = ['es2020', 'chrome91', 'firefox90', 'safari14'];
    },
  },
]);