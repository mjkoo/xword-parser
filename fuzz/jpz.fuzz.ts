import '@jazzer.js/jest-runner';
import { parseJpz, convertJpzToUnified, type JpzPuzzle } from '../src/jpz';
import type { Puzzle } from '../src/types';
import {
  JpzParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
  XwordParseError,
} from '../src/errors';

describe('JPZ Fuzzer', () => {
  it.fuzz('validates error handling and data integrity', (data: Buffer) => {
    const input = data.toString('utf-8');

    let parsed: JpzPuzzle | undefined;
    let parseError: unknown = null;

    try {
      parsed = parseJpz(input);
    } catch (error) {
      parseError = error;
    }

    if (parseError) {
      expect(parseError).toBeInstanceOf(XwordParseError);
      expect(
        parseError instanceof JpzParseError ||
          parseError instanceof UnsupportedPuzzleTypeError ||
          parseError instanceof InvalidFileError,
      ).toBe(true);

      if (parseError instanceof XwordParseError) {
        expect(parseError.code).toBeDefined();
        expect(typeof parseError.code).toBe('string');
        expect(typeof parseError.message).toBe('string');
        expect(parseError.message.length).toBeGreaterThan(0);
      }
      return;
    }

    // If parsing succeeded, validate the parsed data
    expect(parsed).toBeDefined();
    if (!parsed) return;

    expect(parsed.metadata).toBeDefined();
    expect(typeof parsed.metadata).toBe('object');

    expect(parsed.width).toBeGreaterThan(0);
    expect(parsed.height).toBeGreaterThan(0);

    expect(parsed.grid).toBeDefined();
    expect(Array.isArray(parsed.grid)).toBe(true);
    expect(parsed.grid.length).toBe(parsed.height);

    for (let row = 0; row < parsed.height; row++) {
      const gridRow = parsed.grid[row]!; // Parser guarantees grid dimensions
      expect(gridRow.length).toBe(parsed.width);
      for (let col = 0; col < parsed.width; col++) {
        const cell = gridRow[col]!; // Parser guarantees all cells exist
        // JpzCell properties are all optional except x,y which we're not checking here
        if (cell.solution !== undefined) {
          expect(typeof cell.solution).toBe('string');
        }
        if (cell.number !== undefined) {
          expect(typeof cell.number).toBe('number');
        }
        if (cell.type !== undefined) {
          expect(cell.type === 'block' || cell.type === 'cell').toBe(true);
        }
        if (cell.isCircled !== undefined) {
          expect(typeof cell.isCircled).toBe('boolean');
        }
      }
    }

    expect(parsed.across).toBeDefined();
    expect(Array.isArray(parsed.across)).toBe(true);
    for (const clue of parsed.across) {
      expect(typeof clue.number === 'string' || typeof clue.number === 'number').toBe(true);
      expect(typeof clue.text).toBe('string');
    }

    expect(parsed.down).toBeDefined();
    expect(Array.isArray(parsed.down)).toBe(true);
    for (const clue of parsed.down) {
      expect(typeof clue.number === 'string' || typeof clue.number === 'number').toBe(true);
      expect(typeof clue.text).toBe('string');
    }

    let unified: Puzzle | undefined;
    let conversionError: unknown = null;

    try {
      unified = convertJpzToUnified(parsed);
    } catch (error) {
      conversionError = error;
    }

    if (conversionError) {
      expect(conversionError).toBeInstanceOf(XwordParseError);
      expect(
        conversionError instanceof JpzParseError ||
          conversionError instanceof UnsupportedPuzzleTypeError ||
          conversionError instanceof InvalidFileError,
      ).toBe(true);

      if (conversionError instanceof XwordParseError) {
        expect(conversionError.code).toBeDefined();
        expect(typeof conversionError.code).toBe('string');
        expect(typeof conversionError.message).toBe('string');
        expect(conversionError.message.length).toBeGreaterThan(0);
      }
      return;
    }

    expect(unified).toBeDefined();
    if (!unified) return;

    expect(unified.grid).toBeDefined();
    expect(unified.clues).toBeDefined();
    expect(typeof unified.grid).toBe('object');
    expect(unified.grid.width).toBe(parsed.width);
    expect(unified.grid.height).toBe(parsed.height);
    expect(Array.isArray(unified.grid.cells)).toBe(true);
    expect(unified.grid.cells.length).toBe(parsed.height);

    for (let row = 0; row < parsed.height; row++) {
      const cellRow = unified.grid.cells[row]!; // Converter guarantees grid dimensions
      expect(cellRow.length).toBe(parsed.width);
      for (let col = 0; col < parsed.width; col++) {
        const cell = cellRow[col]!; // Converter guarantees all cells exist
        expect(typeof cell.isBlack).toBe('boolean');
        expect(cell.number === undefined || typeof cell.number === 'number').toBe(true);
        expect(cell.solution === undefined || typeof cell.solution === 'string').toBe(true);
        expect(cell.isCircled === undefined || typeof cell.isCircled === 'boolean').toBe(true);
        expect(cell.hasRebus === undefined || typeof cell.hasRebus === 'boolean').toBe(true);
      }
    }

    expect(typeof unified.clues).toBe('object');

    if (unified.title !== undefined) {
      expect(typeof unified.title).toBe('string');
    }
    if (unified.author !== undefined) {
      expect(typeof unified.author).toBe('string');
    }
    if (unified.copyright !== undefined) {
      expect(typeof unified.copyright).toBe('string');
    }
    if (unified.notes !== undefined) {
      expect(typeof unified.notes).toBe('string');
    }
  });
});
