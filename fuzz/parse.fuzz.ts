import '@jazzer.js/jest-runner';
import { parse } from '../src/index';
import type { Puzzle } from '../src/types';
import {
  XwordParseError,
  FormatDetectionError,
  IpuzParseError,
  PuzParseError,
  JpzParseError,
  XdParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
} from '../src/errors';

describe('Parse Auto-Detection Fuzzer', () => {
  it.fuzz('validates format detection, encoding options, and error handling', (data: Buffer) => {
    // Test with both string and buffer inputs
    const inputs = [data, data.toString('utf-8')];

    // Test with various filename hints
    const filenames = [undefined, 'puzzle.puz', 'puzzle.ipuz', 'puzzle.jpz', 'puzzle.xd', ''];

    for (const input of inputs) {
      for (const filename of filenames) {
        let parsed: Puzzle | undefined;
        let parseError: unknown = null;

        try {
          parsed = parse(input, filename ? { filename } : undefined);
        } catch (error) {
          parseError = error;
        }

        if (parseError) {
          // Should only throw XwordParseError or its subclasses
          expect(parseError).toBeInstanceOf(XwordParseError);
          expect(
            parseError instanceof FormatDetectionError ||
              parseError instanceof IpuzParseError ||
              parseError instanceof PuzParseError ||
              parseError instanceof JpzParseError ||
              parseError instanceof XdParseError ||
              parseError instanceof UnsupportedPuzzleTypeError ||
              parseError instanceof InvalidFileError,
          ).toBe(true);

          if (parseError instanceof XwordParseError) {
            expect(parseError.code).toBeDefined();
            expect(typeof parseError.code).toBe('string');
            expect(typeof parseError.message).toBe('string');
            expect(parseError.message.length).toBeGreaterThan(0);
          }
          continue;
        }

        // If parsing succeeded, validate the unified puzzle structure
        expect(parsed).toBeDefined();
        if (!parsed) continue;

        expect(parsed.grid).toBeDefined();
        expect(parsed.clues).toBeDefined();

        // Validate grid structure
        expect(typeof parsed.grid).toBe('object');
        expect(typeof parsed.grid.width).toBe('number');
        expect(typeof parsed.grid.height).toBe('number');
        expect(parsed.grid.width).toBeGreaterThan(0);
        expect(parsed.grid.height).toBeGreaterThan(0);
        expect(Array.isArray(parsed.grid.cells)).toBe(true);
        expect(parsed.grid.cells.length).toBe(parsed.grid.height);

        // Validate each cell
        for (let row = 0; row < parsed.grid.height; row++) {
          const cellRow = parsed.grid.cells[row]!; // All parsers guarantee grid dimensions
          expect(Array.isArray(cellRow)).toBe(true);
          // All parsers should produce consistent grid dimensions
          expect(cellRow.length).toBe(parsed.grid.width);

          for (let col = 0; col < cellRow.length; col++) {
            const cell = cellRow[col]!; // All parsers guarantee cells exist
            // Required field
            expect(typeof cell.isBlack).toBe('boolean');

            // Optional fields
            expect(cell.number === undefined || typeof cell.number === 'number').toBe(true);
            expect(cell.solution === undefined || typeof cell.solution === 'string').toBe(true);
            expect(cell.isCircled === undefined || typeof cell.isCircled === 'boolean').toBe(true);
            expect(cell.hasRebus === undefined || typeof cell.hasRebus === 'boolean').toBe(true);
            expect(cell.rebusKey === undefined || typeof cell.rebusKey === 'number').toBe(true);
          }
        }

        // Validate clues
        expect(typeof parsed.clues).toBe('object');

        // Validate optional metadata
        if (parsed.title !== undefined) {
          expect(typeof parsed.title).toBe('string');
        }
        if (parsed.author !== undefined) {
          expect(typeof parsed.author).toBe('string');
        }
        if (parsed.copyright !== undefined) {
          expect(typeof parsed.copyright).toBe('string');
        }
        if (parsed.notes !== undefined) {
          expect(typeof parsed.notes).toBe('string');
        }
        if (parsed.date !== undefined) {
          expect(typeof parsed.date).toBe('string');
        }

        // Validate rebus table if present
        if (parsed.rebusTable !== undefined) {
          expect(parsed.rebusTable instanceof Map).toBe(true);
          for (const [key, value] of parsed.rebusTable.entries()) {
            expect(typeof key).toBe('number');
            expect(typeof value).toBe('string');
          }
        }

        // Validate additionalProperties if present
        if (parsed.additionalProperties !== undefined) {
          expect(typeof parsed.additionalProperties).toBe('object');
        }
      }
    }

    // Also test with various encoding options (reduced set for performance)
    const encodings = ['utf-8', 'latin1'];

    for (const encoding of encodings) {
      let parsed: Puzzle | undefined;
      let parseError: unknown = null;

      try {
        parsed = parse(data, { encoding: encoding as BufferEncoding });
      } catch (error) {
        parseError = error;
      }

      if (parseError) {
        expect(parseError).toBeInstanceOf(XwordParseError);
        if (parseError instanceof XwordParseError) {
          expect(parseError.code).toBeDefined();
          expect(typeof parseError.message).toBe('string');
        }
      } else if (parsed) {
        expect(parsed.grid).toBeDefined();
        expect(parsed.clues).toBeDefined();
        expect(typeof parsed.grid).toBe('object');
        expect(typeof parsed.clues).toBe('object');
      }
    }
  });
});
