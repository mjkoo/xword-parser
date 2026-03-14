import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parseIpuz, convertIpuzToUnified, type IpuzPuzzle } from "../src/ipuz";
import type { Puzzle } from "../src/types";
import {
  IpuzParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
  ParseError,
} from "../src/errors";

fuzz("validates error handling and data integrity", (data: Buffer) => {
  const input = data.toString("utf-8");

  let parsed: IpuzPuzzle | undefined;
  let parseError: unknown = null;

  try {
    parsed = parseIpuz(input);
  } catch (error) {
    parseError = error;
  }

  if (parseError) {
    if (!(parseError instanceof ParseError)) throw parseError as Error;
    if (
      !(
        parseError instanceof IpuzParseError ||
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

  expect(parsed.kind).toBeDefined();
  expect(Array.isArray(parsed.kind)).toBe(true);
  const hasCrossword = parsed.kind.some(
    (k) => typeof k === "string" && k.includes("crossword"),
  );
  expect(hasCrossword).toBe(true);

  if (parsed.dimensions) {
    if (parsed.dimensions.width !== undefined) {
      expect(parsed.dimensions.width).toBeTypeOf("number");
      expect(parsed.dimensions.width).toBeGreaterThan(0);
    }
    if (parsed.dimensions.height !== undefined) {
      expect(parsed.dimensions.height).toBeTypeOf("number");
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
    if (!(conversionError instanceof ParseError))
      throw conversionError as Error;
    if (
      !(
        conversionError instanceof IpuzParseError ||
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

  expect(unified.grid.width).toBeTypeOf("number");
  expect(unified.grid.height).toBeTypeOf("number");
  expect(unified.grid.width).toBeGreaterThan(0);
  expect(unified.grid.height).toBeGreaterThan(0);

  expect(Array.isArray(unified.grid.cells)).toBe(true);

  const gridHeight = unified.grid.height;
  const gridWidth = unified.grid.width;

  expect(unified.grid.cells).toHaveLength(gridHeight);

  for (let row = 0; row < gridHeight; row++) {
    const cellRow = unified.grid.cells[row]!;
    expect(cellRow).toHaveLength(gridWidth);
    for (let col = 0; col < gridWidth; col++) {
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
