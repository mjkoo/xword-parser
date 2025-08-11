# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript library for parsing crossword puzzle file formats (PUZ, iPUZ, JPZ, XD) into a unified data structure. The library is designed to be:
- Pure functions with no file I/O (callers handle file reading)
- Type-safe with comprehensive TypeScript types
- Minimal runtime dependencies (only fast-xml-parser)
- Format-agnostic unified output
- Bundle-size conscious with lazy loading support

## Recent Improvements (Latest)

- **Removed low-value comments**: Cleaned up redundant inline comments for better code readability
- **Enhanced error handling**: Added `isFormatMismatch()` method to distinguish format mismatches from parse errors
- **Improved format detection**: Better error propagation in auto-detection logic
- **Code formatting**: Applied consistent formatting across all files
- **Documentation updates**: Comprehensive README with all current features

## Commands

```bash
# Development
npm run dev          # Build with watch mode
npm test            # Run all tests once
npm run test:watch  # Run tests in watch mode
npm run typecheck   # Type-check without building
npm run lint        # Check linting errors
npm run lint:fix    # Fix linting errors

# Build
npm run build       # Build for production

# Run a specific test file
npx vitest run src/ipuz.test.ts
```

## Architecture & Conventions

### File Structure
- **Flat src/ directory**: All parser modules live directly in `src/`, not in subdirectories
- **Colocated tests**: Test files (`*.test.ts`) live next to their source files
- **Test data**: All test data files are in `testdata/` at the project root, organized by format

### Parser Implementation Pattern

Each parser module (e.g., `ipuz.ts`) includes:
1. Parse function: `parseFormatName(content: string | Buffer): FormatPuzzle`
2. Convert function: `convertFormatNameToUnified(puzzle: FormatPuzzle): Puzzle`
3. Format-specific types that capture ALL data from the source format
4. Custom error class extending `ParseError` (e.g., `IpuzParseError`)
5. Never performs file I/O - accepts only string/buffer input
6. Rejects non-crossword puzzle types with clear error messages

Example exports from each parser:
- `parseIpuz(content: string): IpuzPuzzle` - parse to format-specific type
- `convertIpuzToUnified(puzzle: IpuzPuzzle): Puzzle` - convert to unified type
- `IpuzPuzzle`, `Cell`, `Clue` etc. - format-specific types
- `IpuzParseError` - format-specific error class

### Design Decisions

1. **No file operations**: Library only parses data, callers handle file/network I/O
2. **Comprehensive parsing first**: Each parser captures ALL possible fields from its format before any conversion
3. **Type safety with unknowns**: Use `unknown` types with proper type guards rather than `any`
4. **Test coverage**: Every parser needs tests against all available test files
5. **Crosswords only**: Explicitly reject other puzzle types (sudoku, word search, etc.)
6. **Smart error propagation**: Distinguish between format mismatches and real parse errors
7. **Minimal dependencies**: Only fast-xml-parser for JPZ support, no other runtime dependencies

### TypeScript Configuration

- Tests are included in type checking and linting
- Strict mode enabled with all safety checks
- Tests use optional chaining for safety: `puzzle.puzzle[0]?.[0]`

### Testing Approach

Tests should:
- Read test files using `readFileSync` in the test code
- Test against all files in `testdata/format/`
- Verify both successful parsing and error cases
- Use optional chaining when accessing nested properties

## Current Implementation Status

- ✅ **iPUZ parser** - Fully implemented with all features and unified conversion
- ✅ **PUZ parser** - Fully implemented with binary parsing and section support
- ✅ **JPZ parser** - Fully implemented with XML parsing using fast-xml-parser
- ✅ **XD parser** - Fully implemented with text-based parsing
- ✅ **Unified converter** - All parsers include conversion to common `Puzzle` type
- ✅ **Main parse() function** - Auto-detection with format hints fully functional
- ✅ **Lazy loading** - Available via `xword-parser/lazy` entry point
- ✅ **Error handling** - Comprehensive error hierarchy with format mismatch detection
- ✅ **Encoding support** - Configurable character encoding for text formats
- ✅ **Property testing** - Fast-check based property tests for robustness

## Main API

### Basic Usage
```typescript
import { parse } from 'xword-parser';

// Auto-detect format from content
const puzzle = parse(fileContent);

// With format hint for better detection
const puzzle = parse(fileContent, { filename: 'puzzle.puz' });

// With custom encoding for text formats
const puzzle = parse(fileContent, { 
  filename: 'puzzle.ipuz',
  encoding: 'latin1' // default is 'utf-8'
});
```

### Lazy Loading (smaller bundle size)
```typescript
import { parseLazy } from 'xword-parser/lazy';

// Parsers loaded only when needed
const puzzle = await parseLazy(fileContent);

// Also supports options
const puzzle = await parseLazy(fileContent, { filename: 'puzzle.puz' });
```

### Format-Specific Parsers
```typescript
import { parseIpuz, parsePuz, parseJpz, parseXd } from 'xword-parser';

// Use specific parser when format is known
const ipuzPuzzle = parseIpuz(jsonString);
const puzPuzzle = parsePuz(buffer);
const jpzPuzzle = parseJpz(xmlString);
const xdPuzzle = parseXd(textString);

// Each has a corresponding converter
import { 
  convertIpuzToUnified,
  convertPuzToUnified,
  convertJpzToUnified,
  convertXdToUnified
} from 'xword-parser';

const unified = convertIpuzToUnified(ipuzPuzzle);
```

## Library Features

- **Auto-detection**: The main `parse()` function automatically detects format from content
- **Format hints**: Optional filename parameter improves detection accuracy
- **Encoding support**: Configurable character encoding via `ParseOptions.encoding`
- **Unified output**: All parsers convert to common `Puzzle` type for consistency
- **Comprehensive parsing**: Each parser captures ALL fields from source format before conversion
- **Error handling**: Custom error classes (`ParseError` hierarchy) with error codes
- **Format mismatch detection**: `ParseError.isFormatMismatch()` distinguishes between wrong format vs corrupted files
- **Lazy loading**: Use `parseLazy()` from `xword-parser/lazy` for dynamic imports
- **Type safety**: Full TypeScript support with zero errors
- **Pure functions**: All parsers are pure functions with no side effects

## Error Handling Strategy

The library uses a hierarchical error system:
- `ParseError` - Base class with `code` and `context` properties
- `FormatDetectionError` - When format cannot be detected
- `IpuzParseError`, `PuzParseError`, `JpzParseError`, `XdParseError` - Format-specific errors
- `UnsupportedPuzzleTypeError` - When file contains non-crossword puzzle
- `InvalidFileError` - General file format issues

The `isFormatMismatch()` method helps the auto-detection logic:
- Returns `true` for format mismatches (continue trying other formats)
- Returns `false` for real parsing errors (stop and throw immediately)

## Code Style Guidelines

- You must not disable eslint or typescript checks via comments unless completely necessary for proper function
- Do not commit CLAUDE.md, although it isn't in the .gitignore
- Keep comments minimal - code should be self-documenting
- Prefer explicit types over inference for public APIs
- Use `unknown` instead of `any` with proper type guards

## Testing Guidelines

- When writing property tests, using filter() on fc.string() can cause timeouts, avoid this pattern
- If a property test uses only fc.oneof(fc.constant()...) to select from constant values, it is a unit test in disguise and should be moved to a regular test
- Parsers should only throw errors as represented in our error hierarchy, they should not throw lower level errors such as array index out of bounds or null dereference errors
- Always test edge cases: empty grids, invalid dimensions, malformed data
- Property tests should focus on invariants, not specific values

## Unified Data Model

The `Puzzle` interface is the common output format for all parsers:

```typescript
interface Puzzle {
  title?: string;
  author?: string;
  copyright?: string;
  notes?: string;
  date?: string;
  grid: Grid;
  clues: Clues;
  rebusTable?: Map<number, string>;
  additionalProperties?: Record<string, unknown>;
}
```

Key design principles:
- **Required fields**: Only `grid` and `clues` are required (minimum for a playable puzzle)
- **Optional metadata**: Title, author, etc. are optional since not all formats provide them
- **Extensibility**: `additionalProperties` preserves format-specific data
- **Rebus support**: Unified handling of multi-letter cells via `rebusTable`
- **Cell properties**: Each cell has `isBlack`, `isCircled`, `hasRebus` flags