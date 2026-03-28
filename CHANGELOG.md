# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/mjkoo/xword-parser/compare/v1.1.0...v1.1.0) (2026-03-28)


### Features

* add configurable grid size limits and improve type safety ([2c523b2](https://github.com/mjkoo/xword-parser/commit/2c523b2aa97f5eae4bae49256eb1213e3a85444e))
* add custom error classes and improve type safety ([b4ee1f4](https://github.com/mjkoo/xword-parser/commit/b4ee1f41fbb55a6769aeb61712f55f59c56c683e))
* add encoding option and improve format detection ([d188d95](https://github.com/mjkoo/xword-parser/commit/d188d9596e2d9a71fee8719657af9fce16b1dfb4))
* add integration tests and maxGridSize support to PUZ parser ([14f1cd0](https://github.com/mjkoo/xword-parser/commit/14f1cd0d03b94429b0632da0fa01adeb1fd8231b))
* add lazy loading support and improve library architecture ([14084f0](https://github.com/mjkoo/xword-parser/commit/14084f0d81e731fcd5651b94615df97b59fd8752))
* add XD format parser with TypeScript naming conventions ([d9fb12a](https://github.com/mjkoo/xword-parser/commit/d9fb12a048bca95a258579b5dba1865965cf01b6))
* implement comprehensive ipuz crossword parser ([7d2930b](https://github.com/mjkoo/xword-parser/commit/7d2930b80bb0c38246baa048ca16a0534739c96a))
* implement main parse() function with auto-detection and format converters ([097742b](https://github.com/mjkoo/xword-parser/commit/097742b8f5cdfb5682d8ab1c5aa93dba05d4dc44))
* initialize crossword parser library ([524c70a](https://github.com/mjkoo/xword-parser/commit/524c70ac80cff09a2794ce59264c233716fbd275))
* migrate to pnpm ([41ddc04](https://github.com/mjkoo/xword-parser/commit/41ddc047b7d2f79eff826b19678306303887a37d))
* promote common fields from additionalProperties to typed fields ([28daede](https://github.com/mjkoo/xword-parser/commit/28daedebb10c5d5c4e9d7d29158806232fe97655))


### Bug Fixes

* add Buffer polyfill for browser environments ([add4a5d](https://github.com/mjkoo/xword-parser/commit/add4a5dcd84609756dad9b8f7e62b54c327e9eec))
* add path fixes to codecov.yml for proper source file resolution ([c5a4b99](https://github.com/mjkoo/xword-parser/commit/c5a4b9907669d79193a212a073d440ffa679f876))
* add skip-labeling to release-please workflow ([b30bc70](https://github.com/mjkoo/xword-parser/commit/b30bc706eaadbf749f0d2a4bb117e3d5f7171519))
* change browser build from IIFE to ESM format ([9e59549](https://github.com/mjkoo/xword-parser/commit/9e595496d187bc2d258a7956b13f9283bdc80862))
* **ci:** add repository checkout before release-please action ([f551732](https://github.com/mjkoo/xword-parser/commit/f55173261f6f4597eed68f93bc3c7d8cf1d65ec9))
* **ci:** resolve coverage reporting and fuzz initialization issues ([ffae695](https://github.com/mjkoo/xword-parser/commit/ffae695f4b76565b74a8125813fe46bee60da7f5))
* correct npm commands in release-please workflow ([5a1ec54](https://github.com/mjkoo/xword-parser/commit/5a1ec54134f554091f267d3bab4a5210f7eae96f))
* fix git link which broke provenance ([e5298ad](https://github.com/mjkoo/xword-parser/commit/e5298ad7e9738f5389eb2d601d47f8be95a38981))
* fix new found crashes in the ipuz parsaer ([4dcad5d](https://github.com/mjkoo/xword-parser/commit/4dcad5d7cf21aab266e4a95528f5d28be0251a10))
* handle Buffer input and malformed clues in iPUZ parser ([a8a05af](https://github.com/mjkoo/xword-parser/commit/a8a05af481bccf207dd3ade6ed5637680f3590b0))
* handle invalid dimensions and malformed style fields in parsers ([71d3930](https://github.com/mjkoo/xword-parser/commit/71d3930828e3bf0cda58a933ffc1dda865e39621))
* improve codecov integration ([35ae3a6](https://github.com/mjkoo/xword-parser/commit/35ae3a63ba55280e362800ec536ba8e21a6108c2))
* improve error handling for malformed input in parsers ([69d3ec5](https://github.com/mjkoo/xword-parser/commit/69d3ec51f166ed20b4ab169cdc825551bca31731))
* **ipuz:** validate grid dimensions are integers ([2650f23](https://github.com/mjkoo/xword-parser/commit/2650f2385fead08d0f0cb3701653ee6bdc75e00a))
* **jpz:** require grid dimensions and improve validation ([3d7d4b9](https://github.com/mjkoo/xword-parser/commit/3d7d4b9e476cc47e20b81cbdcaae8a45e4161966))
* prevent fuzzer process leaks and enforce timeouts correctly ([a3a7bb6](https://github.com/mjkoo/xword-parser/commit/a3a7bb63ff8b1f6acf24e3cc430d9d93a8ca667d))
* **puz:** add boundary checks to prevent buffer overrun errors ([c13a335](https://github.com/mjkoo/xword-parser/commit/c13a33572017a4642b9480c937c56a0badf91aa1))
* resolve all TypeScript errors ([204be1b](https://github.com/mjkoo/xword-parser/commit/204be1b376eafc38eaf0f87e4b26fefa9a77a3ae))
* resolve benchmark JSON format and fuzzer detection issues ([6158ea6](https://github.com/mjkoo/xword-parser/commit/6158ea6b244f3c1feacbaac782a8138372a528f2))
* resolve dependency conflict with @types/jest ([f4f1e60](https://github.com/mjkoo/xword-parser/commit/f4f1e602a418e38357cd26e973ec3c0ac5e81994))
* switch codecov coverage format from lcov to cobertura ([130be2a](https://github.com/mjkoo/xword-parser/commit/130be2abb7eca7aaf973aa7f0754b06e2918e10c))
* use published vitiate ([d7a8388](https://github.com/mjkoo/xword-parser/commit/d7a83889a998e3d711c77668d227a86c4163a17f))


### Performance Improvements

* add grid size limits and optimize fuzzer performance ([6b0e5de](https://github.com/mjkoo/xword-parser/commit/6b0e5de8fffa440e845b9db4a534d35bd8fc236c))
* replace custom benchmark tests with Vitest Bench ([cadcc5f](https://github.com/mjkoo/xword-parser/commit/cadcc5f393a3ff9c31a869be91ea0c2814e2ccfe))


### Miscellaneous Chores

* migrate to tsdown ([0385e09](https://github.com/mjkoo/xword-parser/commit/0385e096d91d68e91484c0ef3dc5eb8360a5fab2))


### Continuous Integration

* fix release pipeline ([71dfc40](https://github.com/mjkoo/xword-parser/commit/71dfc400bea58c88223d0db677bd32f34b77bc9b))

## [1.1.0](https://github.com/mjkoo/xword-parser/compare/v1.1.0...v1.1.0) (2026-03-28)


### Miscellaneous Chores

* migrate to tsdown ([0385e09](https://github.com/mjkoo/xword-parser/commit/0385e096d91d68e91484c0ef3dc5eb8360a5fab2))

## [1.1.0](https://github.com/mjkoo/xword-parser/compare/v1.0.5...v1.1.0) (2026-03-28)


### Features

* migrate to pnpm ([41ddc04](https://github.com/mjkoo/xword-parser/commit/41ddc047b7d2f79eff826b19678306303887a37d))


### Bug Fixes

* fix new found crashes in the ipuz parsaer ([4dcad5d](https://github.com/mjkoo/xword-parser/commit/4dcad5d7cf21aab266e4a95528f5d28be0251a10))
* use published vitiate ([d7a8388](https://github.com/mjkoo/xword-parser/commit/d7a83889a998e3d711c77668d227a86c4163a17f))

## [1.0.5](https://github.com/mjkoo/xword-parser/compare/v1.0.4...v1.0.5) (2025-08-12)


### Bug Fixes

* add Buffer polyfill for browser environments ([add4a5d](https://github.com/mjkoo/xword-parser/commit/add4a5dcd84609756dad9b8f7e62b54c327e9eec))

## [1.0.4](https://github.com/mjkoo/xword-parser/compare/v1.0.3...v1.0.4) (2025-08-12)


### Bug Fixes

* change browser build from IIFE to ESM format ([9e59549](https://github.com/mjkoo/xword-parser/commit/9e595496d187bc2d258a7956b13f9283bdc80862))

## [1.0.3](https://github.com/mjkoo/xword-parser/compare/v1.0.2...v1.0.3) (2025-08-12)


### Bug Fixes

* **ci:** add repository checkout before release-please action ([f551732](https://github.com/mjkoo/xword-parser/commit/f55173261f6f4597eed68f93bc3c7d8cf1d65ec9))

## [1.0.2](https://github.com/mjkoo/xword-parser/compare/v1.0.1...v1.0.2) (2025-08-12)


### Bug Fixes

* add path fixes to codecov.yml for proper source file resolution ([75a72bd](https://github.com/mjkoo/xword-parser/commit/75a72bd62f5f3d36f7e66129a606e6f91bb5a301))
* improve codecov integration ([8e158be](https://github.com/mjkoo/xword-parser/commit/8e158be1f7ed99f9ffcc719a8242fb22f671e506))
* switch codecov coverage format from lcov to cobertura ([3e6c6ba](https://github.com/mjkoo/xword-parser/commit/3e6c6ba61ae78efc1215650003289d5cc3a3b006))

## [1.0.1](https://github.com/mjkoo/xword-parser/compare/v1.0.0...v1.0.1) (2025-08-11)


### Bug Fixes

* fix git link which broke provenance ([1abdb6f](https://github.com/mjkoo/xword-parser/commit/1abdb6f9d032b5d762faecab58279ded68ae8018))

## 1.0.0 (2025-08-11)


### Features

* add configurable grid size limits and improve type safety ([c1a523e](https://github.com/mjkoo/xword-parser/commit/c1a523ef801e6f1ae3af361346803bd10f536033))
* add custom error classes and improve type safety ([b4ee1f4](https://github.com/mjkoo/xword-parser/commit/b4ee1f41fbb55a6769aeb61712f55f59c56c683e))
* add encoding option and improve format detection ([d188d95](https://github.com/mjkoo/xword-parser/commit/d188d9596e2d9a71fee8719657af9fce16b1dfb4))
* add integration tests and maxGridSize support to PUZ parser ([2f59bfb](https://github.com/mjkoo/xword-parser/commit/2f59bfb9c9b7a1e8a19670be98265b61408fbca7))
* add lazy loading support and improve library architecture ([14084f0](https://github.com/mjkoo/xword-parser/commit/14084f0d81e731fcd5651b94615df97b59fd8752))
* add XD format parser with TypeScript naming conventions ([d9fb12a](https://github.com/mjkoo/xword-parser/commit/d9fb12a048bca95a258579b5dba1865965cf01b6))
* implement comprehensive ipuz crossword parser ([7d2930b](https://github.com/mjkoo/xword-parser/commit/7d2930b80bb0c38246baa048ca16a0534739c96a))
* implement main parse() function with auto-detection and format converters ([097742b](https://github.com/mjkoo/xword-parser/commit/097742b8f5cdfb5682d8ab1c5aa93dba05d4dc44))
* initialize crossword parser library ([524c70a](https://github.com/mjkoo/xword-parser/commit/524c70ac80cff09a2794ce59264c233716fbd275))
* promote common fields from additionalProperties to typed fields ([28daede](https://github.com/mjkoo/xword-parser/commit/28daedebb10c5d5c4e9d7d29158806232fe97655))


### Bug Fixes

* add skip-labeling to release-please workflow ([5ff6672](https://github.com/mjkoo/xword-parser/commit/5ff66727dfe9995a56a7127e06a02887b7c60633))
* **ci:** resolve coverage reporting and fuzz initialization issues ([b157263](https://github.com/mjkoo/xword-parser/commit/b15726393df288e693377881b19986ec0cbb782e))
* correct npm commands in release-please workflow ([491a7e2](https://github.com/mjkoo/xword-parser/commit/491a7e27f8d0aa27517bdb25241850bf511c91a6))
* handle Buffer input and malformed clues in iPUZ parser ([3e3887c](https://github.com/mjkoo/xword-parser/commit/3e3887c59c342fe324ce0f8c4004c7a5b1fed4cc))
* handle invalid dimensions and malformed style fields in parsers ([64604d4](https://github.com/mjkoo/xword-parser/commit/64604d41639b1353d8dd371fb860dd9f71e87cd6))
* improve error handling for malformed input in parsers ([61fe367](https://github.com/mjkoo/xword-parser/commit/61fe367804fed6b047085ab4eb628158e5e0f627))
* **ipuz:** validate grid dimensions are integers ([b7c9f35](https://github.com/mjkoo/xword-parser/commit/b7c9f35cbd5d43d3e18c6b008573369389ac4d52))
* **jpz:** require grid dimensions and improve validation ([317f37b](https://github.com/mjkoo/xword-parser/commit/317f37b47fc8be5b39fd6a4a668c44353de6222b))
* prevent fuzzer process leaks and enforce timeouts correctly ([4768bf6](https://github.com/mjkoo/xword-parser/commit/4768bf682c510ca6342256f8f3d59aaf8fa489b4))
* **puz:** add boundary checks to prevent buffer overrun errors ([d561a6e](https://github.com/mjkoo/xword-parser/commit/d561a6eb5ba3827f6734e52d74727feb95c3dae0))
* resolve all TypeScript errors ([204be1b](https://github.com/mjkoo/xword-parser/commit/204be1b376eafc38eaf0f87e4b26fefa9a77a3ae))
* resolve benchmark JSON format and fuzzer detection issues ([6158ea6](https://github.com/mjkoo/xword-parser/commit/6158ea6b244f3c1feacbaac782a8138372a528f2))
* resolve dependency conflict with @types/jest ([f4f1e60](https://github.com/mjkoo/xword-parser/commit/f4f1e602a418e38357cd26e973ec3c0ac5e81994))


### Performance Improvements

* add grid size limits and optimize fuzzer performance ([bd4625b](https://github.com/mjkoo/xword-parser/commit/bd4625b969c84f203f4aee5545aa7ab3be5aa5c5))
* replace custom benchmark tests with Vitest Bench ([cadcc5f](https://github.com/mjkoo/xword-parser/commit/cadcc5f393a3ff9c31a869be91ea0c2814e2ccfe))

## [Unreleased]

### Features
- Initial release of xword-parser
- Support for multiple crossword formats (iPUZ, PUZ, JPZ, XD)
- Unified data model for all formats
- Automatic format detection
- Lazy loading support for smaller bundle sizes
- Full TypeScript support with comprehensive type definitions
- Robust error handling with format-specific error classes
- Configurable character encoding for text-based formats

### Code Refactoring
- Modernized codebase to ES2022 standards
- Renamed XwordParseError to ParseError for consistency
- Removed ES5 compatibility workarounds
- Added comprehensive JSDoc documentation to all exported functions

### Breaking Changes
- XwordParseError has been renamed to ParseError
