import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parseIpuz, convertIpuzToUnified, type IpuzPuzzle } from "../src/ipuz";
import type { Puzzle, Cell } from "../src/types";
import {
  IpuzParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
  ParseError,
} from "../src/errors";

function validateParseError(error: ParseError): string | null {
  if (typeof error.code !== "string")
    return `code is not a string: ${typeof error.code}`;
  if (typeof error.message !== "string")
    return `message is not a string: ${typeof error.message}`;
  if (error.message.length === 0) return "message is empty";
  return null;
}

function validateIpuzParsed(parsed: IpuzPuzzle): string | null {
  if (!parsed.kind) return "kind is missing";
  if (!Array.isArray(parsed.kind)) return "kind is not an array";
  const hasCrossword = parsed.kind.some(
    (k) => typeof k === "string" && k.includes("crossword"),
  );
  if (!hasCrossword) return "kind does not include crossword";

  if (parsed.dimensions) {
    if (parsed.dimensions.width !== undefined) {
      if (typeof parsed.dimensions.width !== "number")
        return "dimensions.width is not a number";
      if (parsed.dimensions.width <= 0)
        return "dimensions.width is not positive";
    }
    if (parsed.dimensions.height !== undefined) {
      if (typeof parsed.dimensions.height !== "number")
        return "dimensions.height is not a number";
      if (parsed.dimensions.height <= 0)
        return "dimensions.height is not positive";
    }
  }

  if (parsed.puzzle && !Array.isArray(parsed.puzzle))
    return "puzzle is not an array";

  return null;
}

function validateCell(cell: Cell, row: number, col: number): string | null {
  if (typeof cell.isBlack !== "boolean")
    return `cell[${row}][${col}].isBlack is not boolean`;
  if (cell.number !== undefined && typeof cell.number !== "number")
    return `cell[${row}][${col}].number is not number`;
  if (cell.solution !== undefined && typeof cell.solution !== "string")
    return `cell[${row}][${col}].solution is not string`;
  if (cell.isCircled !== undefined && typeof cell.isCircled !== "boolean")
    return `cell[${row}][${col}].isCircled is not boolean`;
  if (cell.hasRebus !== undefined && typeof cell.hasRebus !== "boolean")
    return `cell[${row}][${col}].hasRebus is not boolean`;
  if (cell.rebusKey !== undefined && typeof cell.rebusKey !== "number")
    return `cell[${row}][${col}].rebusKey is not number`;
  return null;
}

function validateUnified(unified: Puzzle): string | null {
  if (!unified.grid) return "grid is missing";
  if (!unified.clues) return "clues is missing";
  if (typeof unified.grid !== "object") return "grid is not an object";
  if (typeof unified.grid.width !== "number")
    return "grid.width is not a number";
  if (typeof unified.grid.height !== "number")
    return "grid.height is not a number";
  if (unified.grid.width <= 0) return "grid.width is not positive";
  if (unified.grid.height <= 0) return "grid.height is not positive";
  if (!Array.isArray(unified.grid.cells)) return "grid.cells is not an array";
  if (unified.grid.cells.length !== unified.grid.height)
    return `grid.cells.length (${unified.grid.cells.length}) !== height (${unified.grid.height})`;

  for (let row = 0; row < unified.grid.height; row++) {
    const cellRow = unified.grid.cells[row]!;
    if (cellRow.length !== unified.grid.width)
      return `row ${row} length (${cellRow.length}) !== width (${unified.grid.width})`;
    for (let col = 0; col < unified.grid.width; col++) {
      const cellError = validateCell(cellRow[col]!, row, col);
      if (cellError) return cellError;
    }
  }

  if (typeof unified.clues !== "object") return "clues is not an object";
  if (unified.title !== undefined && typeof unified.title !== "string")
    return "title is not a string";
  if (unified.author !== undefined && typeof unified.author !== "string")
    return "author is not a string";
  if (unified.copyright !== undefined && typeof unified.copyright !== "string")
    return "copyright is not a string";
  if (unified.notes !== undefined && typeof unified.notes !== "string")
    return "notes is not a string";
  if (unified.date !== undefined && typeof unified.date !== "string")
    return "date is not a string";

  if (unified.rebusTable !== undefined) {
    if (!(unified.rebusTable instanceof Map)) return "rebusTable is not a Map";
    for (const [key, value] of unified.rebusTable.entries()) {
      if (typeof key !== "number") return "rebusTable key is not a number";
      if (typeof value !== "string") return "rebusTable value is not a string";
    }
  }

  if (
    unified.additionalProperties !== undefined &&
    typeof unified.additionalProperties !== "object"
  )
    return "additionalProperties is not an object";

  return null;
}

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

    expect(validateParseError(parseError)).toBeNull();
    return;
  }

  expect(parsed).toBeDefined();
  if (!parsed) return;

  expect(validateIpuzParsed(parsed)).toBeNull();

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

    expect(validateParseError(conversionError)).toBeNull();
    return;
  }

  expect(unified).toBeDefined();
  if (!unified) return;

  expect(validateUnified(unified)).toBeNull();
});
