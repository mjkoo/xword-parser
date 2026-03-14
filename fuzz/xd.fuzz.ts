import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parseXd, convertXdToUnified, type XdPuzzle } from "../src/xd";
import type { Puzzle } from "../src/types";
import { XdParseError, InvalidFileError, ParseError } from "../src/errors";

fuzz("validates error handling and data integrity", (data: Buffer) => {
  const input = data.toString("utf-8");

  let parsed: XdPuzzle | undefined;
  let parseError: unknown = null;

  try {
    parsed = parseXd(input);
  } catch (error) {
    parseError = error;
  }

  if (parseError) {
    if (!(parseError instanceof ParseError)) throw parseError as Error;
    if (
      !(
        parseError instanceof XdParseError ||
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

  expect(parsed.grid).toBeDefined();
  expect(Array.isArray(parsed.grid)).toBe(true);
  expect(parsed.grid.length).toBeGreaterThan(0);

  const height = parsed.grid.length;
  const width = parsed.grid[0]?.length || 0;

  for (let row = 0; row < height; row++) {
    const gridRow = parsed.grid[row]!;
    expect(Array.isArray(gridRow)).toBe(true);
    expect(gridRow).toHaveLength(width);
    for (const cell of gridRow) {
      expect(cell).toBeTypeOf("string");
      expect(cell.length).toBeGreaterThanOrEqual(1);
    }
  }

  expect(parsed.across).toBeDefined();
  expect(Array.isArray(parsed.across)).toBe(true);
  for (const clue of parsed.across) {
    expect(clue).toBeDefined();
    expect(clue.number).toBeTypeOf("string");
    expect(clue.clue).toBeTypeOf("string");
    expect(clue.answer).toBeTypeOf("string");
  }

  expect(parsed.down).toBeDefined();
  expect(Array.isArray(parsed.down)).toBe(true);
  for (const clue of parsed.down) {
    expect(clue).toBeDefined();
    expect(clue.number).toBeTypeOf("string");
    expect(clue.clue).toBeTypeOf("string");
    expect(clue.answer).toBeTypeOf("string");
  }

  if (parsed.metadata) {
    expect(parsed.metadata).toBeTypeOf("object");
    for (const [key, value] of Object.entries(parsed.metadata)) {
      expect(key).toBeTypeOf("string");
      expect(value).toBeTypeOf("string");
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
    if (!(conversionError instanceof ParseError))
      throw conversionError as Error;
    if (
      !(
        conversionError instanceof XdParseError ||
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
  expect(unified.grid.width).toBe(width);
  expect(unified.grid.height).toBe(height);
  expect(Array.isArray(unified.grid.cells)).toBe(true);
  expect(unified.grid.cells).toHaveLength(height);

  for (let row = 0; row < height; row++) {
    const cellRow = unified.grid.cells[row]!;
    expect(cellRow).toHaveLength(width);
    for (let col = 0; col < width; col++) {
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

  expect(unified.clues).toBeTypeOf("object");

  if (unified.title !== undefined) {
    expect(unified.title).toBeTypeOf("string");
  }
  if (unified.author !== undefined) {
    expect(unified.author).toBeTypeOf("string");
  }
  if (unified.copyright !== undefined) {
    expect(unified.copyright).toBeTypeOf("string");
  }
  if (unified.notes !== undefined) {
    expect(unified.notes).toBeTypeOf("string");
  }

  if (unified.rebusTable) {
    expect(unified.rebusTable).toBeInstanceOf(Map);
    for (const [key, value] of unified.rebusTable.entries()) {
      expect(key).toBeTypeOf("number");
      expect(value).toBeTypeOf("string");
    }
  }
});
