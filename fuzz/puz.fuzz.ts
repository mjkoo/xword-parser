import '@jazzer.js/jest-runner';
import { parsePuz, convertPuzToUnified, type PuzPuzzle } from '../src/puz';
import type { Puzzle } from '../src/types';
import { PuzParseError, InvalidFileError, ParseError } from '../src/errors';

describe('PUZ Fuzzer', () => {
  it.fuzz('validates error handling and data integrity', (data: Buffer) => {
    let parsed: PuzPuzzle | undefined;
    let parseError: unknown = null;

    try {
      parsed = parsePuz(data);
    } catch (error) {
      parseError = error;
    }

    if (parseError) {
      expect(parseError).toBeInstanceOf(ParseError);
      expect(parseError instanceof PuzParseError || parseError instanceof InvalidFileError).toBe(
        true,
      );

      if (parseError instanceof ParseError) {
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

    expect(typeof parsed.width).toBe('number');
    expect(typeof parsed.height).toBe('number');
    expect(parsed.width).toBeGreaterThan(0);
    expect(parsed.height).toBeGreaterThan(0);
    expect(parsed.width).toBeLessThanOrEqual(255);
    expect(parsed.height).toBeLessThanOrEqual(255);

    expect(parsed.grid).toBeDefined();
    expect(Array.isArray(parsed.grid)).toBe(true);
    expect(parsed.grid.length).toBe(parsed.height);

    for (let row = 0; row < parsed.height; row++) {
      const gridRow = parsed.grid[row]!; // Parser guarantees grid dimensions
      expect(gridRow.length).toBe(parsed.width);
      for (let col = 0; col < parsed.width; col++) {
        const cell = gridRow[col]!; // Parser guarantees all cells exist
        expect(typeof cell.isBlack).toBe('boolean');
        if (cell.solution !== undefined) {
          expect(typeof cell.solution).toBe('string');
        }
        if (cell.playerState !== undefined) {
          expect(typeof cell.playerState).toBe('string');
        }
      }
    }

    expect(parsed.across).toBeDefined();
    expect(Array.isArray(parsed.across)).toBe(true);
    expect(parsed.down).toBeDefined();
    expect(Array.isArray(parsed.down)).toBe(true);

    // metadata is always defined in PuzPuzzle
    if (parsed.metadata.title !== undefined) {
      expect(typeof parsed.metadata.title).toBe('string');
    }
    if (parsed.metadata.author !== undefined) {
      expect(typeof parsed.metadata.author).toBe('string');
    }
    if (parsed.metadata.copyright !== undefined) {
      expect(typeof parsed.metadata.copyright).toBe('string');
    }
    if (parsed.metadata.notes !== undefined) {
      expect(typeof parsed.metadata.notes).toBe('string');
    }

    if (parsed.isScrambled !== undefined) {
      expect(typeof parsed.isScrambled).toBe('boolean');
    }

    if (parsed.rebusTable) {
      expect(parsed.rebusTable instanceof Map).toBe(true);
      for (const [key, value] of parsed.rebusTable.entries()) {
        expect(typeof key).toBe('number');
        expect(typeof value).toBe('string');
      }
    }

    let unified: Puzzle | undefined;
    let conversionError: unknown = null;

    try {
      unified = convertPuzToUnified(parsed);
    } catch (error) {
      conversionError = error;
    }

    if (conversionError) {
      expect(conversionError).toBeInstanceOf(ParseError);
      expect(
        conversionError instanceof PuzParseError || conversionError instanceof InvalidFileError,
      ).toBe(true);

      if (conversionError instanceof ParseError) {
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

    if (unified.rebusTable) {
      expect(unified.rebusTable instanceof Map).toBe(true);
      for (const [key, value] of unified.rebusTable.entries()) {
        expect(typeof key).toBe('number');
        expect(typeof value).toBe('string');
      }
    }
  });
});
