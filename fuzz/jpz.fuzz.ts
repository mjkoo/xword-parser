import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parseJpz, convertJpzToUnified, type JpzPuzzle } from "../src/jpz";
import type { Puzzle, Cell } from "../src/types";
import {
  JpzParseError,
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

function validateJpzParsed(parsed: JpzPuzzle): string | null {
  if (typeof parsed.metadata !== "object" || parsed.metadata === null)
    return "metadata is not an object";
  if (parsed.width <= 0) return "width is not positive";
  if (parsed.height <= 0) return "height is not positive";

  if (!Array.isArray(parsed.grid)) return "grid is not an array";
  if (parsed.grid.length !== parsed.height)
    return `grid.length (${parsed.grid.length}) !== height (${parsed.height})`;

  for (let row = 0; row < parsed.height; row++) {
    const gridRow = parsed.grid[row]!;
    if (gridRow.length !== parsed.width)
      return `row ${row} length (${gridRow.length}) !== width (${parsed.width})`;
    for (let col = 0; col < parsed.width; col++) {
      const cell = gridRow[col]!;
      if (cell.solution !== undefined && typeof cell.solution !== "string")
        return `cell[${row}][${col}].solution is not string`;
      if (cell.number !== undefined && typeof cell.number !== "number")
        return `cell[${row}][${col}].number is not number`;
      if (
        cell.type !== undefined &&
        cell.type !== "block" &&
        cell.type !== "cell"
      )
        return `cell[${row}][${col}].type is invalid: ${String(cell.type)}`;
      if (cell.isCircled !== undefined && typeof cell.isCircled !== "boolean")
        return `cell[${row}][${col}].isCircled is not boolean`;
    }
  }

  if (!Array.isArray(parsed.across)) return "across is not an array";
  for (const clue of parsed.across) {
    if (typeof clue.number !== "string" && typeof clue.number !== "number")
      return "across clue number is not string or number";
    if (typeof clue.text !== "string")
      return "across clue text is not a string";
  }

  if (!Array.isArray(parsed.down)) return "down is not an array";
  for (const clue of parsed.down) {
    if (typeof clue.number !== "string" && typeof clue.number !== "number")
      return "down clue number is not string or number";
    if (typeof clue.text !== "string") return "down clue text is not a string";
  }

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

    expect(validateParseError(parseError)).toBeNull();
    return;
  }

  expect(parsed).toBeDefined();
  if (!parsed) return;

  expect(validateJpzParsed(parsed)).toBeNull();

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

    expect(validateParseError(conversionError)).toBeNull();
    return;
  }

  expect(unified).toBeDefined();
  if (!unified) return;

  expect(validateUnified(unified)).toBeNull();
});
