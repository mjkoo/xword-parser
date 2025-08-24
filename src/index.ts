import { parseIpuz, convertIpuzToUnified } from "./ipuz";
import { parseXd, convertXdToUnified } from "./xd";
import { parsePuz, convertPuzToUnified } from "./puz";
import { parseJpz, convertJpzToUnified } from "./jpz";
import { FormatDetectionError, ParseError } from "./errors";
import { getOrderedFormatsToTry } from "./detect";
import type { Puzzle, ParseOptions } from "./types";

/**
 * Parse a crossword puzzle from various formats (iPUZ, PUZ, JPZ, XD).
 * Automatically detects the format and returns a unified puzzle structure.
 *
 * @param data - The puzzle data as string, Buffer, or ArrayBuffer
 * @param options - Optional parsing options
 * @param options.filename - Filename hint to improve format detection
 * @param options.encoding - Character encoding for text formats (default: 'utf-8')
 * @param options.maxGridSize - Maximum allowed grid dimensions
 * @returns A unified Puzzle object
 * @throws {FormatDetectionError} When the format cannot be detected
 * @throws {ParseError} When parsing fails for the detected format
 *
 * @example
 * ```typescript
 * import { parse } from 'xword-parser';
 * import { readFileSync } from 'fs';
 *
 * const content = readFileSync('puzzle.puz');
 * const puzzle = parse(content, { filename: 'puzzle.puz' });
 * console.log(puzzle.title, puzzle.grid.width + 'x' + puzzle.grid.height);
 * ```
 */
export function parse(
  data: string | Buffer | ArrayBuffer,
  options?: ParseOptions,
): Puzzle {
  let content: string | Buffer;
  if (data instanceof ArrayBuffer) {
    content = Buffer.from(data);
  } else {
    content = data;
  }

  const formatsToTry = getOrderedFormatsToTry(content, options?.filename);
  let lastError: unknown;

  for (const format of formatsToTry) {
    try {
      switch (format) {
        case "ipuz": {
          const textContent =
            typeof content === "string"
              ? content
              : content.toString(options?.encoding || "utf-8");
          const puzzle = parseIpuz(textContent, options);
          return convertIpuzToUnified(puzzle);
        }
        case "puz": {
          if (typeof content !== "string") {
            const puzzle = parsePuz(content, options);
            return convertPuzToUnified(puzzle);
          }
          break;
        }
        case "jpz": {
          const textContent =
            typeof content === "string"
              ? content
              : content.toString(options?.encoding || "utf-8");
          const puzzle = parseJpz(textContent, options);
          return convertJpzToUnified(puzzle);
        }
        case "xd": {
          const textContent =
            typeof content === "string"
              ? content
              : content.toString(options?.encoding || "utf-8");
          const puzzle = parseXd(textContent, options);
          return convertXdToUnified(puzzle);
        }
      }
    } catch (e) {
      lastError = e;
      // Only continue trying other formats if this is a format mismatch
      if (e instanceof ParseError && !e.isFormatMismatch()) {
        throw e;
      }
    }
  }

  // If we get here, no format worked
  // Only throw lastError if it was NOT a format mismatch (i.e., a real parse error)
  if (
    lastError &&
    !(lastError instanceof ParseError && lastError.isFormatMismatch())
  ) {
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new FormatDetectionError(
      "Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD",
      undefined,
      lastError,
    );
  }

  // Otherwise, we couldn't detect the format
  throw new FormatDetectionError(
    "Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD",
  );
}

export {
  parseIpuz,
  convertIpuzToUnified,
  parseXd,
  convertXdToUnified,
  parsePuz,
  convertPuzToUnified,
  parseJpz,
  convertJpzToUnified,
};

export * from "./types";
export * from "./errors";
export * from "./ipuz";
export * from "./xd";
export * from "./puz";
export * from "./jpz";
