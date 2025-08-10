# xword-parser

A TypeScript library for parsing popular crossword puzzle file formats into a unified, easy-to-use data structure.

## Features

- **Universal Format Support**: Parse PUZ, iPUZ, JPZ, and XD crossword formats
- **Unified Data Model**: All formats are converted to a common representation
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Lightweight**: Zero runtime dependencies
- **Error Handling**: Robust error handling with descriptive error messages
- **Simple API**: Synchronous, pure function API for immediate results

## Installation

```bash
npm install xword-parser
```

or

```bash
yarn add xword-parser
```

or

```bash
pnpm add xword-parser
```

## Usage

### Basic Example

```typescript
import { parse } from 'xword-parser';
import { readFileSync } from 'fs';

// Parse from file contents
const fileContent = readFileSync('puzzle.puz');
const puzzle = parse(fileContent);
```

### Parsing Different Formats

The library automatically detects the format based on the file contents:

```typescript
import { parse } from 'xword-parser';

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

#### `parse(data: string | Buffer | ArrayBuffer): XwordPuzzle`

Parses crossword puzzle data from various formats. This is a pure, synchronous function.

**Parameters:**
- `data`: The puzzle data as a string (for text formats) or binary data (for PUZ format)

**Returns:** An `XwordPuzzle` object

**Throws:** `XwordParseError` if the data cannot be parsed

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

## Data Model Design

The unified `XwordPuzzle` format represents the intersection of critical fields across all supported formats:

- **Metadata**: Common fields like title, author, and copyright that appear in most formats
- **Grid Structure**: A normalized 2D grid representation that can accommodate various puzzle sizes
- **Cell Data**: Essential information including solutions, numbering, and black squares
- **Clues**: Standardized across/down clue structure that works for traditional crosswords

This design prioritizes:
1. **Completeness**: Capturing all essential data needed to play a crossword
2. **Simplicity**: Avoiding format-specific complexity in the common interface
3. **Extensibility**: Easy to extend for additional formats or features
4. **Type Safety**: Leveraging TypeScript for compile-time guarantees

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test                 # Run tests once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Linting & Formatting

```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Fix linting errors
npm run format           # Format code with Prettier
npm run typecheck        # Type-check without building
```