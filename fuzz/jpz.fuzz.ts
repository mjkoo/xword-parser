import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parseJpz, convertJpzToUnified, type JpzPuzzle } from "../src/jpz";
import type { Puzzle } from "../src/types";
import {
  JpzParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
  ParseError,
} from "../src/errors";

fuzz("validates error handling and data integrity", (data: Buffer) => {
  const input = data.toString("utf-8");

  let parsed: JpzPuzzle | undefined;
  let parseError: unknown = null;

  try {
    parsed = parseJpz(input);
  } catch (error) {
    parseError = error;
  }

  if (parseError) {
    if (!(parseError instanceof ParseError)) throw parseError as Error;
    if (
      !(
        parseError instanceof JpzParseError ||
        parseError instanceof UnsupportedPuzzleTypeError ||
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

  expect(parsed.metadata).toBeDefined();
  expect(parsed.metadata).toBeTypeOf("object");

  expect(parsed.width).toBeGreaterThan(0);
  expect(parsed.height).toBeGreaterThan(0);

  expect(parsed.grid).toBeDefined();
  expect(Array.isArray(parsed.grid)).toBe(true);
  expect(parsed.grid).toHaveLength(parsed.height);

  for (let row = 0; row < parsed.height; row++) {
    const gridRow = parsed.grid[row]!;
    expect(gridRow).toHaveLength(parsed.width);
    for (let col = 0; col < parsed.width; col++) {
      const cell = gridRow[col]!;
      if (cell.solution !== undefined) {
        expect(cell.solution).toBeTypeOf("string");
      }
      if (cell.number !== undefined) {
        expect(cell.number).toBeTypeOf("number");
      }
      if (cell.type !== undefined) {
        expect(["block", "cell"]).toContain(cell.type);
      }
      if (cell.isCircled !== undefined) {
        expect(cell.isCircled).toBeTypeOf("boolean");
      }
    }
  }

  expect(parsed.across).toBeDefined();
  expect(Array.isArray(parsed.across)).toBe(true);
  for (const clue of parsed.across) {
    expect(
      typeof clue.number === "string" || typeof clue.number === "number",
    ).toBe(true);
    expect(clue.text).toBeTypeOf("string");
  }

  expect(parsed.down).toBeDefined();
  expect(Array.isArray(parsed.down)).toBe(true);
  for (const clue of parsed.down) {
    expect(
      typeof clue.number === "string" || typeof clue.number === "number",
    ).toBe(true);
    expect(clue.text).toBeTypeOf("string");
  }

  let unified: Puzzle | undefined;
  let conversionError: unknown = null;

  try {
    unified = convertJpzToUnified(parsed);
  } catch (error) {
    conversionError = error;
  }

  if (conversionError) {
    if (!(conversionError instanceof ParseError))
      throw conversionError as Error;
    if (
      !(
        conversionError instanceof JpzParseError ||
        conversionError instanceof UnsupportedPuzzleTypeError ||
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
});
