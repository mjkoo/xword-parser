# xword-parser

A TypeScript library for parsing popular crossword puzzle file formats into a unified, easy-to-use data structure.

![NPM Version](https://img.shields.io/npm/v/%40xwordly%2Fxword-parser)
[![Test](https://github.com/mjkoo/xword-parser/actions/workflows/test.yml/badge.svg)](https://github.com/mjkoo/xword-parser/actions/workflows/test.yml)
[![codecov](https://codecov.io/github/mjkoo/xword-parser/graph/badge.svg?token=ZM495OCGGY)](https://codecov.io/github/mjkoo/xword-parser)

## Features

- **Universal Format Support**: Parse PUZ, iPUZ, JPZ, and XD crossword formats
- **Unified Data Model**: All formats are converted to a common representation
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Lightweight**: Minimal runtime dependencies (only fast-xml-parser for JPZ support)
- **Error Handling**: Robust error handling with format-specific error classes
- **Lazy Loading**: Optional lazy-loading support to reduce bundle size
- **Format Detection**: Automatic format detection with optional filename hints
- **Encoding Support**: Configurable character encoding for text-based formats

## Installation

```bash
npm install @xwordly/xword-parser
```

or

```bash
yarn add @xwordly/xword-parser
```

or

```bash
pnpm add @xwordly/xword-parser
```

## Usage

### Basic Example

```typescript
import { parse } from '@xwordly/xword-parser';
import { readFileSync } from 'fs';

// Parse from file contents (auto-detects format)
const fileContent = readFileSync('puzzle.puz');
const puzzle = parse(fileContent);

console.log(puzzle.title);
console.log(puzzle.author);
console.log(puzzle.grid.width, 'x', puzzle.grid.height);
```

### With Format Hints

Providing a filename helps with faster and more accurate format detection:

```typescript
import { parse } from '@xwordly/xword-parser';

// Provide filename hint for better format detection
const puzzle = parse(fileContent, { 
  filename: 'crossword.puz' 
});

// Specify encoding for text-based formats
const puzzle = parse(fileContent, { 
  filename: 'puzzle.ipuz',
  encoding: 'latin1' // default is 'utf-8'
});

// Limit maximum grid size
const puzzle = parse(fileContent, {
  maxGridSize: { width: 50, height: 50 }
});
```

### Lazy Loading

For smaller bundle sizes in web applications, use the lazy-loading version:

```typescript
import { parseLazy } from '@xwordly/xword-parser/lazy';

// Parsers are loaded dynamically only when needed
const puzzle = await parseLazy(fileContent);
```

### Format-Specific Parsers

If you know the format in advance, you can use format-specific parsers:

```typescript
import { 
  parseIpuz, 
  parsePuz, 
  parseJpz, 
  parseXd 
} from '@xwordly/xword-parser';

// Use specific parser for known format
const ipuzPuzzle = parseIpuz(jsonString);
const puzPuzzle = parsePuz(binaryBuffer);
const jpzPuzzle = parseJpz(xmlString);
const xdPuzzle = parseXd(textString);
```

### Parsing Different Formats

The library automatically detects the format based on the file contents:

```typescript
import { parse } from '@xwordly/xword-parser';

// Parse PUZ format (binary)
const puzData = await fetch('https://example.com/puzzle.puz')
  .then(res => res.arrayBuffer());
const puzPuzzle = parse(puzData);

// Parse iPUZ format (JSON)
const ipuzData = await fetch('https://example.com/puzzle.ipuz')
  .then(res => res.text());
const ipuzPuzzle = parse(ipuzData);

// Parse JPZ format (XML)
const jpzData = await fetch('https://example.com/puzzle.jpz')
  .then(res => res.text());
const jpzPuzzle = parse(jpzData);

// Parse XD format (text)
const xdData = await fetch('https://example.com/puzzle.xd')
  .then(res => res.text());
const xdPuzzle = parse(xdData);
```

## API Reference

### Main Functions

#### `parse(data: string | Buffer | ArrayBuffer, options?: ParseOptions): Puzzle`

Parses crossword puzzle data from various formats. This is a pure, synchronous function.

**Parameters:**
- `data`: The puzzle data as a string (for text formats) or binary data (for PUZ format)
- `options` (optional): 
  - `filename`: Hint for format detection (e.g., "puzzle.puz")
  - `encoding`: Character encoding for text formats (default: "utf-8")
  - `maxGridSize`: Maximum allowed grid dimensions (e.g., `{width: 50, height: 50}`)

**Returns:** A `Puzzle` object

**Throws:** 
- `FormatDetectionError` if the format cannot be detected
- `ParseError` for general parsing errors
- `IpuzParseError`, `PuzParseError`, `JpzParseError`, or `XdParseError` for format-specific errors
- `UnsupportedPuzzleTypeError` if the puzzle type is not a crossword

#### `parseLazy(data: string | Buffer | ArrayBuffer, options?: ParseOptions): Promise<Puzzle>`

Lazy-loading version of `parse()` that loads parsers dynamically.

**Parameters:** Same as `parse()`

**Returns:** A Promise that resolves to a `Puzzle` object

**Throws:** Same errors as `parse()`

### Format-Specific Functions

Each format has its own parse and convert functions:

- `parseIpuz(content: string | Buffer, options?: ParseOptions): IpuzPuzzle`
- `parsePuz(data: Buffer | ArrayBuffer | Uint8Array | string, options?: ParseOptions): PuzPuzzle`
- `parseJpz(content: string, options?: ParseOptions): JpzPuzzle`
- `parseXd(content: string, options?: ParseOptions): XdPuzzle`

And corresponding converters:

- `convertIpuzToUnified(puzzle: IpuzPuzzle): Puzzle`
- `convertPuzToUnified(puzzle: PuzPuzzle): Puzzle`
- `convertJpzToUnified(puzzle: JpzPuzzle): Puzzle`
- `convertXdToUnified(puzzle: XdPuzzle): Puzzle`

## Supported Formats

### PUZ Format
The `.puz` format is a binary format created by Across Lite. It's one of the most common crossword formats and includes:
- Grid layout and solutions
- Across and Down clues
- Metadata (title, author, copyright)
- Optional features like rebuses and circles

### iPUZ Format
The `.ipuz` format is a JSON-based open standard that supports:
- Standard crosswords
- Variety puzzles (cryptics, acrostics, etc.)
- Rich metadata
- Styled cells and advanced features
- Unicode support

### JPZ Format
The `.jpz` format is an XML-based format used by Crossword Compiler. Features include:
- Complete puzzle data
- Timer and solving information
- Publishing metadata
- Support for various puzzle types

### XD Format
The `.xd` format is a simple text-based format that's human-readable and includes:
- Grid representation using text
- Simple clue format
- Basic metadata
- Easy to create and edit manually

## Data Types

### Puzzle Interface

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

### Grid and Cell Types

```typescript
interface Grid {
  width: number;
  height: number;
  cells: Cell[][];
}

interface Cell {
  solution?: string;
  number?: number;
  isBlack: boolean;
  isCircled?: boolean;
  hasRebus?: boolean;
  rebusKey?: number;
}
```

### Clue Types

```typescript
interface Clues {
  across: Clue[];
  down: Clue[];
}

interface Clue {
  number: number;
  text: string;
}
```

## Error Handling

The library provides specific error classes for different scenarios:

- `ParseError`: Base class for all parsing errors
- `FormatDetectionError`: Unable to detect the puzzle format
- `IpuzParseError`: iPUZ-specific parsing errors
- `PuzParseError`: PUZ-specific parsing errors
- `JpzParseError`: JPZ-specific parsing errors
- `XdParseError`: XD-specific parsing errors
- `UnsupportedPuzzleTypeError`: When a file contains a non-crossword puzzle
- `InvalidFileError`: General file format issues

All error classes extend `ParseError` and include error codes for programmatic handling:

```typescript
try {
  const puzzle = parse(data);
} catch (error) {
  if (error instanceof IpuzParseError) {
    console.error('iPUZ parsing failed:', error.message);
    console.error('Error code:', error.code);
  }
}
```

## Library Architecture

The library is designed with the following principles:

1. **Pure Functions**: All parsers are pure functions with no side effects or file I/O
2. **Format-First Parsing**: Each parser first captures all format-specific data, then converts to the unified format
3. **Type Safety**: Comprehensive TypeScript types for both format-specific and unified structures
4. **Error Recovery**: Smart error handling that distinguishes between format mismatches and real parsing errors
5. **Extensibility**: Easy to add new formats by implementing the parser/converter pattern

## Development

### Building

```bash
npm run build            # Build for production
npm run dev              # Build with watch mode
```

### Testing

```bash
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

The test suite includes:
- Unit tests for each format parser
- Property-based testing with fast-check
- Performance benchmarks
- Integration tests with real puzzle files

### Linting & Formatting

```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format code with Prettier
npm run typecheck        # Type-check without building
```

### Project Structure

```
src/
├── index.ts           # Main entry point with auto-detection
├── lazy.ts            # Lazy-loading entry point
├── types.ts           # Shared TypeScript types
├── errors.ts          # Error classes and codes
├── ipuz.ts            # iPUZ parser and types
├── puz.ts             # PUZ parser and types
├── jpz.ts             # JPZ parser and types
├── xd.ts              # XD parser and types
└── *.test.ts          # Test files for each module
```

## Requirements

- Node.js >= 18
- TypeScript >= 5.3 (for development)
