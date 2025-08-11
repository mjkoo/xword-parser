# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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