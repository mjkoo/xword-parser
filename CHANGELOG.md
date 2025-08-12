# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
