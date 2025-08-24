import "@jazzer.js/jest-runner";
import { parseIpuz, convertIpuzToUnified, type IpuzPuzzle } from "../src/ipuz";
import type { Puzzle } from "../src/types";
import {
  IpuzParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
  ParseError,
} from "../src/errors";

describe("iPUZ Fuzzer", () => {
  it.fuzz("validates error handling and data integrity", (data: Buffer) => {
    const input = data.toString("utf-8");

    let parsed: IpuzPuzzle | undefined;
    let parseError: unknown = null;

    try {
      parsed = parseIpuz(input);
    } catch (error) {
      parseError = error;
    }

    if (parseError) {
      expect(parseError).toBeInstanceOf(ParseError);
      expect(
        parseError instanceof IpuzParseError ||
          parseError instanceof UnsupportedPuzzleTypeError ||
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

    expect(parsed.kind).toBeDefined();
    expect(Array.isArray(parsed.kind)).toBe(true);
    // iPUZ uses URIs like "http://ipuz.org/crossword#1"
    const hasCrossword = parsed.kind.some((k) => k.includes("crossword"));
    expect(hasCrossword).toBe(true);

    if (parsed.dimensions) {
      if (parsed.dimensions.width !== undefined) {
        expect(typeof parsed.dimensions.width).toBe("number");
        expect(parsed.dimensions.width).toBeGreaterThan(0);
      }
      if (parsed.dimensions.height !== undefined) {
        expect(typeof parsed.dimensions.height).toBe("number");
        expect(parsed.dimensions.height).toBeGreaterThan(0);
      }
    }

    if (parsed.puzzle) {
      expect(Array.isArray(parsed.puzzle)).toBe(true);
    }

    let unified: Puzzle | undefined;
    let conversionError: unknown = null;

    try {
      unified = convertIpuzToUnified(parsed);
    } catch (error) {
      conversionError = error;
    }

    if (conversionError) {
      expect(conversionError).toBeInstanceOf(ParseError);
      expect(
        conversionError instanceof IpuzParseError ||
          conversionError instanceof UnsupportedPuzzleTypeError ||
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

    // Parser guarantees grid dimensions are valid numbers
    expect(typeof unified.grid.width).toBe("number");
    expect(typeof unified.grid.height).toBe("number");
    expect(unified.grid.width).toBeGreaterThan(0);
    expect(unified.grid.height).toBeGreaterThan(0);

    expect(Array.isArray(unified.grid.cells)).toBe(true);

    const gridHeight = unified.grid.height;
    const gridWidth = unified.grid.width;

    expect(unified.grid.cells.length).toBe(gridHeight);

    for (let row = 0; row < gridHeight; row++) {
      const cellRow = unified.grid.cells[row]!; // Converter guarantees all rows exist
      expect(cellRow.length).toBe(gridWidth);
      for (let col = 0; col < gridWidth; col++) {
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
  });
});
