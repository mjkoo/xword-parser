import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parse } from "../src/index";
import type { Puzzle, Cell } from "../src/types";
import {
  ParseError,
  FormatDetectionError,
  IpuzParseError,
  PuzParseError,
  JpzParseError,
  XdParseError,
  UnsupportedPuzzleTypeError,
  InvalidFileError,
} from "../src/errors";

function validateParseError(error: ParseError): string | null {
  if (typeof error.code !== "string")
    return `code is not a string: ${typeof error.code}`;
  if (typeof error.message !== "string")
    return `message is not a string: ${typeof error.message}`;
  if (error.message.length === 0) return "message is empty";
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

fuzz(
  "validates format detection, encoding options, and error handling",
  (data: Buffer) => {
    const str = data.toString("utf-8");

    const attempts: Array<
      [
        string | Buffer,
        { filename?: string; encoding?: BufferEncoding } | undefined,
      ]
    > = [
      [str, undefined],
      [str, { filename: "puzzle.puz" }],
      [str, { filename: "puzzle.ipuz" }],
      [str, { filename: "puzzle.jpz" }],
      [str, { filename: "puzzle.xd" }],
      [str, { filename: "" }],
      [data, undefined],
      [data, { filename: "puzzle.puz" }],
      [data, { encoding: "utf-8" }],
      [data, { encoding: "latin1" }],
    ];

    for (const [input, opts] of attempts) {
      let parsed: Puzzle | undefined;
      let parseError: unknown = null;

      try {
        parsed = parse(input, opts);
      } catch (error) {
        parseError = error;
      }

      if (parseError) {
        if (!(parseError instanceof ParseError)) throw parseError as Error;
        if (
          !(
            parseError instanceof FormatDetectionError ||
            parseError instanceof IpuzParseError ||
            parseError instanceof PuzParseError ||
            parseError instanceof JpzParseError ||
            parseError instanceof XdParseError ||
            parseError instanceof UnsupportedPuzzleTypeError ||
            parseError instanceof InvalidFileError
          )
        ) {
          throw new Error(
            `Unexpected error type: ${(parseError as Error).constructor.name}`,
          );
        }

        expect(validateParseError(parseError)).toBeNull();
        continue;
      }

      expect(parsed).toBeDefined();
      if (!parsed) continue;

      expect(validateUnified(parsed)).toBeNull();
    }
  },
);
