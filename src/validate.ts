import type { Puzzle } from "./types";
import { InvalidFileError } from "./errors";

/**
 * Validate a unified Puzzle structure for type correctness and structural integrity.
 * Throws InvalidFileError if the puzzle is malformed.
 *
 * :param puzzle: The puzzle to validate
 * :returns: The validated puzzle (for chaining)
 * :raises InvalidFileError: When the puzzle structure is invalid
 */
export function validatePuzzle(puzzle: Puzzle): Puzzle {
  if (!puzzle.grid || typeof puzzle.grid !== "object") {
    throw new InvalidFileError("puzzle", "missing or invalid grid");
  }

  if (typeof puzzle.grid.width !== "number" || puzzle.grid.width <= 0) {
    throw new InvalidFileError(
      "puzzle",
      "grid width must be a positive number",
    );
  }

  if (typeof puzzle.grid.height !== "number" || puzzle.grid.height <= 0) {
    throw new InvalidFileError(
      "puzzle",
      "grid height must be a positive number",
    );
  }

  if (!Array.isArray(puzzle.grid.cells)) {
    throw new InvalidFileError("puzzle", "grid cells must be an array");
  }

  if (puzzle.grid.cells.length !== puzzle.grid.height) {
    throw new InvalidFileError(
      "puzzle",
      `grid cells length (${puzzle.grid.cells.length}) does not match height (${puzzle.grid.height})`,
    );
  }

  for (let row = 0; row < puzzle.grid.height; row++) {
    const cellRow = puzzle.grid.cells[row];
    if (!Array.isArray(cellRow)) {
      throw new InvalidFileError("puzzle", `grid row ${row} is not an array`);
    }
    if (cellRow.length !== puzzle.grid.width) {
      throw new InvalidFileError(
        "puzzle",
        `grid row ${row} length (${cellRow.length}) does not match width (${puzzle.grid.width})`,
      );
    }
    for (let col = 0; col < puzzle.grid.width; col++) {
      const cell = cellRow[col];
      if (!cell || typeof cell !== "object") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}] is not an object`,
        );
      }
      if (typeof cell.isBlack !== "boolean") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}].isBlack must be boolean`,
        );
      }
      if (cell.number !== undefined && typeof cell.number !== "number") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}].number must be a number`,
        );
      }
      if (cell.solution !== undefined && typeof cell.solution !== "string") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}].solution must be a string`,
        );
      }
      if (cell.isCircled !== undefined && typeof cell.isCircled !== "boolean") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}].isCircled must be boolean`,
        );
      }
      if (cell.hasRebus !== undefined && typeof cell.hasRebus !== "boolean") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}].hasRebus must be boolean`,
        );
      }
      if (cell.rebusKey !== undefined && typeof cell.rebusKey !== "number") {
        throw new InvalidFileError(
          "puzzle",
          `cell[${row}][${col}].rebusKey must be a number`,
        );
      }
    }
  }

  if (!puzzle.clues || typeof puzzle.clues !== "object") {
    throw new InvalidFileError("puzzle", "missing or invalid clues");
  }

  if (!Array.isArray(puzzle.clues.across)) {
    throw new InvalidFileError("puzzle", "clues.across must be an array");
  }

  if (!Array.isArray(puzzle.clues.down)) {
    throw new InvalidFileError("puzzle", "clues.down must be an array");
  }

  if (puzzle.title !== undefined && typeof puzzle.title !== "string") {
    throw new InvalidFileError("puzzle", "title must be a string");
  }

  if (puzzle.author !== undefined && typeof puzzle.author !== "string") {
    throw new InvalidFileError("puzzle", "author must be a string");
  }

  if (puzzle.copyright !== undefined && typeof puzzle.copyright !== "string") {
    throw new InvalidFileError("puzzle", "copyright must be a string");
  }

  if (puzzle.notes !== undefined && typeof puzzle.notes !== "string") {
    throw new InvalidFileError("puzzle", "notes must be a string");
  }

  if (puzzle.date !== undefined && typeof puzzle.date !== "string") {
    throw new InvalidFileError("puzzle", "date must be a string");
  }

  if (puzzle.rebusTable !== undefined) {
    if (!(puzzle.rebusTable instanceof Map)) {
      throw new InvalidFileError("puzzle", "rebusTable must be a Map");
    }
    for (const [key, value] of puzzle.rebusTable.entries()) {
      if (typeof key !== "number") {
        throw new InvalidFileError("puzzle", "rebusTable keys must be numbers");
      }
      if (typeof value !== "string") {
        throw new InvalidFileError(
          "puzzle",
          "rebusTable values must be strings",
        );
      }
    }
  }

  return puzzle;
}
