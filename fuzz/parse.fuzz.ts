import { fuzz } from "@vitiate/core";
import { expect } from "vitest";
import { parse } from "../src/index";
import type { Puzzle } from "../src/types";
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

fuzz(
  "validates format detection, encoding options, and error handling",
  (data: Buffer) => {
    const inputs = [data, data.toString("utf-8")];

    const filenames = [
      undefined,
      "puzzle.puz",
      "puzzle.ipuz",
      "puzzle.jpz",
      "puzzle.xd",
      "",
    ];

    for (const input of inputs) {
      for (const filename of filenames) {
        let parsed: Puzzle | undefined;
        let parseError: unknown = null;

        try {
          parsed = parse(input, filename ? { filename } : undefined);
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

          expect(parseError.code).toBeTypeOf("string");
          expect(parseError.message).toBeTypeOf("string");
          expect(parseError.message.length).toBeGreaterThan(0);
          continue;
        }

        expect(parsed).toBeDefined();
        if (!parsed) continue;

        expect(parsed.grid).toBeDefined();
        expect(parsed.clues).toBeDefined();

        expect(parsed.grid).toBeTypeOf("object");
        expect(parsed.grid.width).toBeTypeOf("number");
        expect(parsed.grid.height).toBeTypeOf("number");
        expect(parsed.grid.width).toBeGreaterThan(0);
        expect(parsed.grid.height).toBeGreaterThan(0);
        expect(Array.isArray(parsed.grid.cells)).toBe(true);
        expect(parsed.grid.cells).toHaveLength(parsed.grid.height);

        for (let row = 0; row < parsed.grid.height; row++) {
          const cellRow = parsed.grid.cells[row]!;
          expect(Array.isArray(cellRow)).toBe(true);
          expect(cellRow).toHaveLength(parsed.grid.width);

          for (let col = 0; col < cellRow.length; col++) {
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
            if (cell.rebusKey !== undefined) {
              expect(cell.rebusKey).toBeTypeOf("number");
            }
          }
        }

        expect(parsed.clues).toBeTypeOf("object");

        if (parsed.title !== undefined) {
          expect(parsed.title).toBeTypeOf("string");
        }
        if (parsed.author !== undefined) {
          expect(parsed.author).toBeTypeOf("string");
        }
        if (parsed.copyright !== undefined) {
          expect(parsed.copyright).toBeTypeOf("string");
        }
        if (parsed.notes !== undefined) {
          expect(parsed.notes).toBeTypeOf("string");
        }
        if (parsed.date !== undefined) {
          expect(parsed.date).toBeTypeOf("string");
        }

        if (parsed.rebusTable !== undefined) {
          expect(parsed.rebusTable).toBeInstanceOf(Map);
          for (const [key, value] of parsed.rebusTable.entries()) {
            expect(key).toBeTypeOf("number");
            expect(value).toBeTypeOf("string");
          }
        }

        if (parsed.additionalProperties !== undefined) {
          expect(parsed.additionalProperties).toBeTypeOf("object");
        }
      }
    }

    const encodings = ["utf-8", "latin1"];

    for (const encoding of encodings) {
      let parsed: Puzzle | undefined;
      let parseError: unknown = null;

      try {
        parsed = parse(data, { encoding: encoding as BufferEncoding });
      } catch (error) {
        parseError = error;
      }

      if (parseError) {
        if (!(parseError instanceof ParseError)) throw parseError as Error;
        expect(parseError.code).toBeTypeOf("string");
        expect(parseError.message).toBeTypeOf("string");
      } else if (parsed) {
        expect(parsed.grid).toBeDefined();
        expect(parsed.clues).toBeDefined();
        expect(parsed.grid).toBeTypeOf("object");
        expect(parsed.clues).toBeTypeOf("object");
      }
    }
  },
);
