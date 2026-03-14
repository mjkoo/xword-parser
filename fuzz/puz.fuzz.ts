import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parsePuz, convertPuzToUnified, type PuzPuzzle } from "../src/puz";
import type { Puzzle } from "../src/types";
import { PuzParseError, InvalidFileError, ParseError } from "../src/errors";

fuzz("validates error handling and data integrity", (data: Buffer) => {
  let parsed: PuzPuzzle | undefined;
  let parseError: unknown = null;

  try {
    parsed = parsePuz(data);
  } catch (error) {
    parseError = error;
  }

  if (parseError) {
    if (!(parseError instanceof ParseError)) throw parseError as Error;
    if (
      !(
        parseError instanceof PuzParseError ||
        parseError instanceof InvalidFileError
      )
    ) {
      throw new Error(
        `Unexpected error type: ${(parseError as Error).constructor.name}`,
      );
    }

    expect(parseError.code).toBeTypeOf("string");
    expect(parseError.message).toBeTypeOf("string");
    expect(parseError.message.length).toBeGreaterThan(0);
    return;
  }

  expect(parsed).toBeDefined();
  if (!parsed) return;

  expect(parsed.width).toBeTypeOf("number");
  expect(parsed.height).toBeTypeOf("number");
  expect(parsed.width).toBeGreaterThan(0);
  expect(parsed.height).toBeGreaterThan(0);
  expect(parsed.width).toBeLessThanOrEqual(255);
  expect(parsed.height).toBeLessThanOrEqual(255);

  expect(parsed.grid).toBeDefined();
  expect(Array.isArray(parsed.grid)).toBe(true);
  expect(parsed.grid).toHaveLength(parsed.height);

  for (let row = 0; row < parsed.height; row++) {
    const gridRow = parsed.grid[row]!;
    expect(gridRow).toHaveLength(parsed.width);
    for (let col = 0; col < parsed.width; col++) {
      const cell = gridRow[col]!;
      expect(cell.isBlack).toBeTypeOf("boolean");
      if (cell.solution !== undefined) {
        expect(cell.solution).toBeTypeOf("string");
      }
      if (cell.playerState !== undefined) {
        expect(cell.playerState).toBeTypeOf("string");
      }
    }
  }

  expect(parsed.across).toBeDefined();
  expect(Array.isArray(parsed.across)).toBe(true);
  expect(parsed.down).toBeDefined();
  expect(Array.isArray(parsed.down)).toBe(true);

  if (parsed.metadata.title !== undefined) {
    expect(parsed.metadata.title).toBeTypeOf("string");
  }
  if (parsed.metadata.author !== undefined) {
    expect(parsed.metadata.author).toBeTypeOf("string");
  }
  if (parsed.metadata.copyright !== undefined) {
    expect(parsed.metadata.copyright).toBeTypeOf("string");
  }
  if (parsed.metadata.notes !== undefined) {
    expect(parsed.metadata.notes).toBeTypeOf("string");
  }

  if (parsed.isScrambled !== undefined) {
    expect(parsed.isScrambled).toBeTypeOf("boolean");
  }

  if (parsed.rebusTable) {
    expect(parsed.rebusTable).toBeInstanceOf(Map);
    for (const [key, value] of parsed.rebusTable.entries()) {
      expect(key).toBeTypeOf("number");
      expect(value).toBeTypeOf("string");
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
    if (!(conversionError instanceof ParseError))
      throw conversionError as Error;
    if (
      !(
        conversionError instanceof PuzParseError ||
        conversionError instanceof InvalidFileError
      )
    ) {
      throw new Error(
        `Unexpected error type: ${(conversionError as Error).constructor.name}`,
      );
    }

    expect(conversionError.code).toBeTypeOf("string");
    expect(conversionError.message).toBeTypeOf("string");
    expect(conversionError.message.length).toBeGreaterThan(0);
    return;
  }

  expect(unified).toBeDefined();
  if (!unified) return;

  expect(unified.grid).toBeDefined();
  expect(unified.clues).toBeDefined();
  expect(unified.grid).toBeTypeOf("object");
  expect(unified.grid.width).toBe(parsed.width);
  expect(unified.grid.height).toBe(parsed.height);
  expect(Array.isArray(unified.grid.cells)).toBe(true);
  expect(unified.grid.cells).toHaveLength(parsed.height);

  for (let row = 0; row < parsed.height; row++) {
    const cellRow = unified.grid.cells[row]!;
    expect(cellRow).toHaveLength(parsed.width);
    for (let col = 0; col < parsed.width; col++) {
      const cell = cellRow[col]!;
      expect(cell.isBlack).toBeTypeOf("boolean");
      if (cell.number !== undefined) {
        expect(cell.number).toBeTypeOf("number");
      }
      if (cell.solution !== undefined) {
        expect(cell.solution).toBeTypeOf("string");
      }
      if (cell.isCircled !== undefined) {
        expect(cell.isCircled).toBeTypeOf("boolean");
      }
      if (cell.hasRebus !== undefined) {
        expect(cell.hasRebus).toBeTypeOf("boolean");
      }
    }
  }

  if (unified.rebusTable) {
    expect(unified.rebusTable).toBeInstanceOf(Map);
    for (const [key, value] of unified.rebusTable.entries()) {
      expect(key).toBeTypeOf("number");
      expect(value).toBeTypeOf("string");
    }
  }
});
