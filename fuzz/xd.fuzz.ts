import "@jazzer.js/jest-runner";
import { parseXd, convertXdToUnified, type XdPuzzle } from "../src/xd";
import type { Puzzle } from "../src/types";
import { XdParseError, InvalidFileError, ParseError } from "../src/errors";

describe("XD Fuzzer", () => {
  it.fuzz("validates error handling and data integrity", (data: Buffer) => {
    const input = data.toString("utf-8");

    let parsed: XdPuzzle | undefined;
    let parseError: unknown = null;

    try {
      parsed = parseXd(input);
    } catch (error) {
      parseError = error;
    }

    if (parseError) {
      expect(parseError).toBeInstanceOf(ParseError);
      expect(
        parseError instanceof XdParseError ||
          parseError instanceof InvalidFileError,
      ).toBe(true);

      if (parseError instanceof ParseError) {
        expect(parseError.code).toBeDefined();
        expect(typeof parseError.code).toBe("string");
        expect(typeof parseError.message).toBe("string");
        expect(parseError.message.length).toBeGreaterThan(0);
      }
      return;
    }

    // If parsing succeeded, validate the parsed data
    expect(parsed).toBeDefined();
    if (!parsed) return;

    expect(parsed.grid).toBeDefined();
    expect(Array.isArray(parsed.grid)).toBe(true);
    expect(parsed.grid.length).toBeGreaterThan(0);

    const height = parsed.grid.length;
    const width = parsed.grid[0]?.length || 0;

    // Parser now guarantees grid has consistent row lengths
    for (let row = 0; row < height; row++) {
      const gridRow = parsed.grid[row]!; // Parser validates all rows exist
      expect(Array.isArray(gridRow)).toBe(true);
      expect(gridRow.length).toBe(width); // Parser validates consistent width
      // Each cell is a string
      for (const cell of gridRow) {
        expect(typeof cell).toBe("string");
        // Most cells should be single character, but allow longer for rebus
        expect(cell.length).toBeGreaterThanOrEqual(1);
      }
    }

    expect(parsed.across).toBeDefined();
    expect(Array.isArray(parsed.across)).toBe(true);
    for (const clue of parsed.across) {
      expect(clue).toBeDefined();
      expect(typeof clue.number).toBe("string");
      expect(typeof clue.clue).toBe("string");
      expect(typeof clue.answer).toBe("string");
    }

    expect(parsed.down).toBeDefined();
    expect(Array.isArray(parsed.down)).toBe(true);
    for (const clue of parsed.down) {
      expect(clue).toBeDefined();
      expect(typeof clue.number).toBe("string");
      expect(typeof clue.clue).toBe("string");
      expect(typeof clue.answer).toBe("string");
    }

    if (parsed.metadata) {
      expect(typeof parsed.metadata).toBe("object");
      for (const [key, value] of Object.entries(parsed.metadata)) {
        expect(typeof key).toBe("string");
        expect(typeof value).toBe("string");
      }
    }

    let unified: Puzzle | undefined;
    let conversionError: unknown = null;

    try {
      unified = convertXdToUnified(parsed);
    } catch (error) {
      conversionError = error;
    }

    if (conversionError) {
      expect(conversionError).toBeInstanceOf(ParseError);
      expect(
        conversionError instanceof XdParseError ||
          conversionError instanceof InvalidFileError,
      ).toBe(true);

      if (conversionError instanceof ParseError) {
        expect(conversionError.code).toBeDefined();
        expect(typeof conversionError.code).toBe("string");
        expect(typeof conversionError.message).toBe("string");
        expect(conversionError.message.length).toBeGreaterThan(0);
      }
      return;
    }
    expect(unified).toBeDefined();
    if (!unified) return;

    expect(unified.grid).toBeDefined();
    expect(unified.clues).toBeDefined();
    expect(typeof unified.grid).toBe("object");
    expect(unified.grid.width).toBe(width);
    expect(unified.grid.height).toBe(height);
    expect(Array.isArray(unified.grid.cells)).toBe(true);
    expect(unified.grid.cells.length).toBe(height);

    for (let row = 0; row < height; row++) {
      const cellRow = unified.grid.cells[row]!; // Converter guarantees all rows exist
      // Parser guarantees consistent width
      expect(cellRow.length).toBe(width);
      for (let col = 0; col < width; col++) {
        const cell = cellRow[col]!; // Converter guarantees all cells exist
        expect(typeof cell.isBlack).toBe("boolean");
        expect(
          cell.number === undefined || typeof cell.number === "number",
        ).toBe(true);
        expect(
          cell.solution === undefined || typeof cell.solution === "string",
        ).toBe(true);
        expect(
          cell.isCircled === undefined || typeof cell.isCircled === "boolean",
        ).toBe(true);
        expect(
          cell.hasRebus === undefined || typeof cell.hasRebus === "boolean",
        ).toBe(true);
      }
    }

    expect(typeof unified.clues).toBe("object");

    if (unified.title !== undefined) {
      expect(typeof unified.title).toBe("string");
    }
    if (unified.author !== undefined) {
      expect(typeof unified.author).toBe("string");
    }
    if (unified.copyright !== undefined) {
      expect(typeof unified.copyright).toBe("string");
    }
    if (unified.notes !== undefined) {
      expect(typeof unified.notes).toBe("string");
    }

    if (unified.rebusTable) {
      expect(unified.rebusTable instanceof Map).toBe(true);
      for (const [key, value] of unified.rebusTable.entries()) {
        expect(typeof key).toBe("number");
        expect(typeof value).toBe("string");
      }
    }
  });
});
