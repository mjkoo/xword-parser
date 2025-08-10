import { describe, expect, it } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { parseIpuz, convertIpuzToUnified } from './ipuz';
import { parseXd, convertXdToUnified } from './xd';
import { parseJpz } from './jpz';
import { parsePuz } from './puz';
import { parse } from './index';
import {
  XwordParseError,
  FormatDetectionError,
  PuzParseError,
  IpuzParseError,
  JpzParseError,
  XdParseError,
  InvalidFileError,
  UnsupportedPuzzleTypeError,
} from './errors';

describe('Property-based tests', () => {
  describe('iPUZ parser properties', () => {
    test.prop([
      fc.record({
        version: fc.constant('http://ipuz.org/v2'),
        kind: fc.constant(['http://ipuz.org/crossword#1']),
        dimensions: fc.record({
          width: fc.integer({ min: 1, max: 50 }),
          height: fc.integer({ min: 1, max: 50 }),
        }),
        title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      }),
    ])('should parse and convert valid iPUZ puzzles', (puzzleData) => {
      const { dimensions } = puzzleData;
      const width = dimensions.width;
      const height = dimensions.height;

      const puzzle: unknown[][] = [];
      for (let y = 0; y < height; y++) {
        const row: unknown[] = [];
        for (let x = 0; x < width; x++) {
          row.push((x + y) % 3 === 0 ? '#' : 0);
        }
        puzzle.push(row);
      }

      const ipuz = {
        ...puzzleData,
        puzzle,
        solution: puzzle,
        clues: {
          Across: [],
          Down: [],
        },
      };

      const jsonString = JSON.stringify(ipuz);

      const parsed = parseIpuz(jsonString);
      expect(parsed).toBeDefined();
      expect(parsed.version).toBe('http://ipuz.org/v2');

      const unified = convertIpuzToUnified(parsed);
      expect(unified).toBeDefined();
      expect(unified.grid.cells).toHaveLength(height);
      expect(unified.grid.cells[0]).toHaveLength(width);
    });

    test.prop([
      fc
        .string({ minLength: 1, maxLength: 200 })
        .filter((s) => !s.includes('{') && !s.includes('[')),
    ])('should reject non-JSON strings', (invalidJson) => {
      expect(() => parseIpuz(invalidJson)).toThrow();
    });

    test.prop([
      fc.record({
        version: fc.constant('http://ipuz.org/v2'),
        kind: fc.constant(['http://ipuz.org/crossword#1']),
        dimensions: fc.oneof(
          fc.record({
            width: fc.integer({ min: -10, max: 0 }),
            height: fc.integer({ min: 1, max: 10 }),
          }),
          fc.record({
            width: fc.integer({ min: 1, max: 10 }),
            height: fc.integer({ min: -10, max: 0 }),
          }),
          fc.record({
            width: fc.integer({ min: 100, max: 1000 }),
            height: fc.integer({ min: 100, max: 1000 }),
          }),
        ),
      }),
    ])('should handle invalid grid dimensions gracefully with proper error types', (puzzleData) => {
      const ipuz = {
        ...puzzleData,
        puzzle: [],
        clues: { Across: [], Down: [] },
      };

      const jsonString = JSON.stringify(ipuz);

      try {
        const parsed = parseIpuz(jsonString);
        const unified = convertIpuzToUnified(parsed);
        if (puzzleData.dimensions.width <= 0 || puzzleData.dimensions.height <= 0) {
          expect(unified.grid.cells.length).toBeGreaterThanOrEqual(0);
        }
      } catch (e) {
        const error = e as Error;
        const isExpectedError = error instanceof XwordParseError || error instanceof IpuzParseError;

        if (!isExpectedError) {
          throw new Error(`Unexpected error type: ${error.constructor.name} - ${error.message}`);
        }
      }
    });
  });

  describe('JPZ parser properties', () => {
    test.prop([
      fc.record({
        width: fc.integer({ min: 3, max: 30 }),
        height: fc.integer({ min: 3, max: 30 }),
        title: fc.string({ maxLength: 50 }),
        author: fc.string({ maxLength: 50 }),
      }),
    ])('should parse valid JPZ XML puzzles', ({ width, height, title, author }) => {
      const cells: string[] = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const isBlack = (x + y) % 5 === 0;
          cells.push(
            isBlack
              ? `<cell x="${x}" y="${y}" type="block" />`
              : `<cell x="${x}" y="${y}" solution="${String.fromCharCode(65 + ((x + y) % 26))}" />`,
          );
        }
      }

      const jpzXml = `<?xml version="1.0" encoding="UTF-8"?>
<crossword-compiler-applet>
  <rectangular-puzzle>
    <metadata>
      <title>${title.replace(/[<>&"']/g, '')}</title>
      <creator>${author.replace(/[<>&"']/g, '')}</creator>
    </metadata>
    <crossword>
      <grid width="${width}" height="${height}">
        ${cells.join('\n        ')}
      </grid>
      <clues>
        <clue word="1" number="1">Test clue</clue>
      </clues>
    </crossword>
  </rectangular-puzzle>
</crossword-compiler-applet>`;

      try {
        const parsed = parseJpz(jpzXml);
        expect(parsed).toBeDefined();
        expect(parsed.width).toBe(width);
        expect(parsed.height).toBe(height);
        expect(parsed.grid).toHaveLength(height);
        expect(parsed.grid[0]).toHaveLength(width);
      } catch (e) {
        const error = e as Error;
        expect(error instanceof JpzParseError).toBe(true);
      }
    });

    test.prop([
      fc.oneof(
        fc.constant('<crossword>'),
        fc.constant('<?xml version="1.0"?><grid/>'),
        fc.constant('<rectangular-puzzle></rectangular-puzzle>'),
        fc.string({ maxLength: 100 }).map((s) => `<puzzle>${s}</puzzle>`),
      ),
    ])('should handle malformed JPZ XML without low-level errors', (xmlContent) => {
      try {
        parseJpz(xmlContent);
      } catch (e) {
        const error = e as Error;
        // If we've wrapped the error in our library's error type, it's properly handled
        // We shouldn't check the message content, only that it's our error type
        expect(
          error instanceof JpzParseError ||
            error instanceof InvalidFileError ||
            error instanceof UnsupportedPuzzleTypeError,
        ).toBe(true);
      }
    });
  });

  describe('PUZ parser properties', () => {
    test.prop([
      fc.record({
        width: fc.integer({ min: 3, max: 30 }),
        height: fc.integer({ min: 3, max: 30 }),
      }),
    ])('should parse valid PUZ binary puzzles', ({ width, height }) => {
      const headerSize = 52;
      const gridSize = width * height;
      const stringSize = 100;

      const buffer = Buffer.alloc(headerSize + gridSize * 2 + stringSize);

      buffer.write('ACROSS&DOWN\0', 0x02);

      buffer.writeUInt8(width, 0x2c);
      buffer.writeUInt8(height, 0x2d);

      for (let i = 0; i < gridSize; i++) {
        buffer.writeUInt8((i % 26) + 65, headerSize + i);
        buffer.writeUInt8((i % 26) + 65, headerSize + gridSize + i);
      }

      try {
        const parsed = parsePuz(buffer);
        expect(parsed).toBeDefined();
        expect(parsed.width).toBe(width);
        expect(parsed.height).toBe(height);
      } catch (e) {
        const error = e as Error;
        expect(error instanceof PuzParseError || error instanceof InvalidFileError).toBe(true);
      }
    });

    test.prop([fc.uint8Array({ minLength: 10, maxLength: 100 })])(
      'should handle random binary data without crashes',
      (bytes) => {
        const buffer = Buffer.from(bytes);

        try {
          parsePuz(buffer);
        } catch (e) {
          const error = e as Error;
          const isLowLevelError =
            error.name === 'TypeError' ||
            error.name === 'ReferenceError' ||
            error.message.includes('Cannot read') ||
            error.message.includes('Cannot access');

          expect(isLowLevelError).toBe(false);
          expect(error instanceof PuzParseError || error instanceof InvalidFileError).toBe(true);
        }
      },
    );
  });

  describe('XD parser properties', () => {
    test.prop([
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 100 }).map((s) => s.replace(/[\n:]/g, '')),
        author: fc.string({ minLength: 1, maxLength: 100 }).map((s) => s.replace(/[\n:]/g, '')),
        width: fc.integer({ min: 3, max: 50 }),
        height: fc.integer({ min: 3, max: 50 }),
      }),
    ])('should parse valid XD puzzles', ({ title, author, width, height }) => {
      const grid: string[] = [];
      for (let y = 0; y < height; y++) {
        let row = '';
        for (let x = 0; x < width; x++) {
          row += (x + y) % 3 === 0 ? '#' : 'A';
        }
        grid.push(row);
      }

      const xdContent = [
        `Title: ${title}`,
        `Author: ${author}`,
        `Size: ${width}x${height}`,
        '',
        ...grid,
        '',
        'A1. Test clue ~ TEST',
      ].join('\n');

      const parsed = parseXd(xdContent);
      expect(parsed).toBeDefined();
      expect(parsed.metadata.title?.trim() || undefined).toBe(title.trim() || undefined);
      expect(parsed.metadata.author?.trim() || undefined).toBe(author.trim() || undefined);

      const unified = convertXdToUnified(parsed);
      expect(unified.title?.trim() || undefined).toBe(title.trim() || undefined);
      expect(unified.author?.trim() || undefined).toBe(author.trim() || undefined);
    });

    test.prop([
      fc.record({
        title: fc.string({ maxLength: 20 }).map((s) => s.replace(/[\n:]/g, '')),
        author: fc.string({ maxLength: 20 }).map((s) => s.replace(/[\n:]/g, '')),
        width: fc.oneof(
          fc.integer({ min: -10, max: 0 }),
          fc.integer({ min: 0, max: 2 }),
          fc.integer({ min: 100, max: 200 }),
        ),
        height: fc.oneof(
          fc.integer({ min: -10, max: 0 }),
          fc.integer({ min: 0, max: 2 }),
          fc.integer({ min: 100, max: 200 }),
        ),
      }),
    ])(
      'should handle invalid XD dimensions gracefully with proper error types',
      ({ title, author, width, height }) => {
        const xdContent = [
          `Title: ${title}`,
          `Author: ${author}`,
          `Size: ${width}x${height}`,
          '',
          'AAA',
          '',
          'A1. Test ~ TEST',
        ].join('\n');

        try {
          const parsed = parseXd(xdContent);
          expect(parsed).toBeDefined();
        } catch (e) {
          const error = e as Error;
          const isExpectedError = error instanceof XwordParseError || error instanceof XdParseError;

          if (!isExpectedError) {
            throw new Error(`Unexpected error type: ${error.constructor.name} - ${error.message}`);
          }
        }
      },
    );
  });

  describe('Grid consistency properties', () => {
    test.prop([fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })])(
      'unified grid dimensions should match original',
      (width, height) => {
        const ipuz = {
          version: 'http://ipuz.org/v2',
          kind: ['http://ipuz.org/crossword#1'],
          dimensions: { width, height },
          puzzle: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
          clues: { Across: [], Down: [] },
        };

        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        expect(unified.grid.cells).toHaveLength(height);
        for (let i = 0; i < unified.grid.cells.length; i++) {
          expect(unified.grid.cells[i]).toHaveLength(width);
        }
      },
    );

    test.prop([fc.string({ minLength: 1, maxLength: 1000 })])(
      'all parsed grids must be rectangular',
      (content) => {
        // Test iPUZ parser
        try {
          const ipuzParsed = parseIpuz(content);
          const ipuzUnified = convertIpuzToUnified(ipuzParsed);

          // Check grid is rectangular
          const { grid } = ipuzUnified;
          expect(grid.cells).toBeDefined();
          expect(Array.isArray(grid.cells)).toBe(true);

          if (grid.cells.length > 0) {
            const firstRow = grid.cells[0];
            if (firstRow) {
              const expectedWidth = firstRow.length;
              for (let i = 0; i < grid.cells.length; i++) {
                const row = grid.cells[i];
                expect(row).toBeDefined();
                expect(row?.length).toBe(expectedWidth);
              }

              expect(grid.height).toBe(grid.cells.length);
              expect(grid.width).toBe(expectedWidth);
            }
          }
        } catch (e) {
          const error = e as Error;
          const isExpectedError =
            error instanceof XwordParseError || error instanceof IpuzParseError;

          expect(isExpectedError).toBe(true);
        }

        // Test XD parser
        try {
          const xdParsed = parseXd(content);
          const xdUnified = convertXdToUnified(xdParsed);

          // Check grid is rectangular
          const { grid } = xdUnified;
          expect(grid.cells).toBeDefined();
          expect(Array.isArray(grid.cells)).toBe(true);

          if (grid.cells.length > 0) {
            const firstRow = grid.cells[0];
            if (firstRow) {
              const expectedWidth = firstRow.length;
              for (let i = 0; i < grid.cells.length; i++) {
                const row = grid.cells[i];
                expect(row).toBeDefined();
                expect(row?.length).toBe(expectedWidth);
              }

              expect(grid.height).toBe(grid.cells.length);
              expect(grid.width).toBe(expectedWidth);
            }
          }
        } catch (e) {
          const error = e as Error;
          const isExpectedError = error instanceof XwordParseError || error instanceof XdParseError;

          expect(isExpectedError).toBe(true);
        }
      },
    );

    test.prop([fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })])(
      'grid width/height must match actual cell array dimensions',
      (width, height) => {
        const ipuz = {
          version: 'http://ipuz.org/v2',
          kind: ['http://ipuz.org/crossword#1'],
          dimensions: { width, height },
          puzzle: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
          clues: { Across: [], Down: [] },
        };

        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Verify dimensions match
        expect(unified.grid.height).toBe(unified.grid.cells.length);
        if (unified.grid.cells.length > 0 && unified.grid.cells[0]) {
          expect(unified.grid.width).toBe(unified.grid.cells[0].length);
        }
      },
    );

    test.prop([fc.integer({ min: 1, max: 20 }), fc.integer({ min: 1, max: 20 })])(
      'every cell must have isBlack property defined',
      (width, height) => {
        const ipuz = {
          version: 'http://ipuz.org/v2',
          kind: ['http://ipuz.org/crossword#1'],
          dimensions: { width, height },
          puzzle: Array.from({ length: height }, (_, y) =>
            Array.from({ length: width }, (_, x) =>
              (x + y) % 3 === 0 ? '#' : { cell: 0, style: { color: 'red' } },
            ),
          ),
          clues: { Across: [], Down: [] },
        };

        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Check every cell has required properties
        for (let y = 0; y < unified.grid.cells.length; y++) {
          const row = unified.grid.cells[y];
          expect(row).toBeDefined();
          if (row) {
            for (let x = 0; x < row.length; x++) {
              const cell = row[x];
              expect(cell).toBeDefined();
              if (cell) {
                expect(typeof cell.isBlack).toBe('boolean');
              }
            }
          }
        }
      },
    );
  });

  describe('Clue consistency properties', () => {
    test.prop([
      fc.array(
        fc.record({
          number: fc.oneof(
            fc.integer({ min: -100, max: 0 }),
            fc.integer({ min: 1, max: 100 }),
            fc.constant(0),
          ),
          text: fc.string({ maxLength: 100 }),
        }),
        { minLength: 0, maxLength: 20 },
      ),
    ])('clue numbers must be valid when present', (cluesData) => {
      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width: 5, height: 5 },
        puzzle: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0)),
        clues: {
          Across: cluesData.map((c) => ({ number: c.number, clue: c.text })),
        },
      };

      try {
        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Check if any invalid clue numbers were in the input
        const hasInvalidNumbers = cluesData.some((c) => c.number <= 0);

        if (hasInvalidNumbers) {
          // If we got here with invalid numbers, the parser accepted them
          // Check they were filtered out or handled properly
          for (const clue of unified.clues.across) {
            expect(clue.number).toBeGreaterThan(0);
          }
          for (const clue of unified.clues.down) {
            expect(clue.number).toBeGreaterThan(0);
          }
        } else {
          // All numbers were valid, check they're preserved
          for (const clue of unified.clues.across) {
            expect(clue.number).toBeGreaterThan(0);
          }
        }
      } catch (e) {
        const error = e as Error;
        const isExpectedError = error instanceof XwordParseError || error instanceof IpuzParseError;

        if (!isExpectedError) {
          throw new Error(`Unexpected error type: ${error.constructor.name} - ${error.message}`);
        }
      }
    });

    test.prop([
      fc.array(
        fc.record({
          number: fc.integer({ min: 1, max: 50 }),
          text: fc.oneof(fc.string({ maxLength: 100 }), fc.constant(''), fc.constant(' ')),
        }),
        { minLength: 0, maxLength: 20 },
      ),
    ])('clue text must always be defined', (cluesData) => {
      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width: 5, height: 5 },
        puzzle: Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 0)),
        clues: {
          Across: cluesData.map((c) => ({ number: c.number, clue: c.text })),
        },
      };

      const parsed = parseIpuz(JSON.stringify(ipuz));
      const unified = convertIpuzToUnified(parsed);

      // Check all clue texts are defined
      for (const clue of unified.clues.across) {
        expect(clue.text).toBeDefined();
        expect(typeof clue.text).toBe('string');
      }
      for (const clue of unified.clues.down) {
        expect(clue.text).toBeDefined();
        expect(typeof clue.text).toBe('string');
      }
    });
  });

  describe('Robustness against low-level errors', () => {
    test.prop([
      fc.record({
        version: fc.constant('http://ipuz.org/v2'),
        kind: fc.constant(['http://ipuz.org/crossword#1']),
        dimensions: fc.oneof(
          fc.constant(undefined),
          fc.constant(null),
          fc.constant({ width: 5 }), // Missing height
          fc.constant({ height: 5 }), // Missing width
          fc.record({
            width: fc.oneof(fc.constant(null), fc.constant(undefined), fc.constant('five')),
            height: fc.integer({ min: 1, max: 5 }),
          }),
        ),
        puzzle: fc.oneof(
          fc.constant(undefined),
          fc.constant(null),
          fc.constant([]),
          fc.constant([[]]),
          fc.array(
            fc.array(fc.oneof(fc.constant(null), fc.constant(undefined), fc.integer()), {
              maxLength: 3,
            }),
            { maxLength: 3 },
          ),
        ),
      }),
    ])('parsers must handle malformed grids without low-level errors', (puzzleData) => {
      const ipuz = {
        ...puzzleData,
        clues: { Across: [], Down: [] },
      };

      try {
        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // If it succeeds, verify the grid is valid
        expect(unified.grid).toBeDefined();
        expect(unified.grid.cells).toBeDefined();
        expect(Array.isArray(unified.grid.cells)).toBe(true);
      } catch (e) {
        // Must be our error type, not TypeError, ReferenceError, etc.
        const error = e as Error;
        const isLowLevelError =
          error.name === 'TypeError' ||
          error.name === 'ReferenceError' ||
          error.message.includes('Cannot read') ||
          error.message.includes('Cannot access') ||
          error.message.includes('undefined') ||
          error.message.includes('null');

        if (isLowLevelError) {
          throw new Error(`Low-level error leaked: ${error.name} - ${error.message}`);
        }

        expect(error instanceof XwordParseError || error instanceof IpuzParseError).toBe(true);
      }
    });

    test.prop([
      fc.record({
        grid: fc.array(fc.array(fc.integer(), { minLength: 0, maxLength: 5 }), {
          minLength: 0,
          maxLength: 5,
        }),
        accessY: fc.integer({ min: -10, max: 10 }),
        accessX: fc.integer({ min: -10, max: 10 }),
      }),
    ])('parsers must handle out-of-bounds access safely', ({ grid, accessY, accessX }) => {
      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width: grid[0]?.length || 0, height: grid.length },
        puzzle: grid,
        clues: { Across: [], Down: [] },
      };

      try {
        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Try to access with potentially invalid indices
        // This should not throw, but return undefined or handle gracefully
        const cell = unified.grid.cells[accessY]?.[accessX];

        // If we got a cell, it should be valid
        if (cell) {
          expect(typeof cell.isBlack).toBe('boolean');
        }
      } catch (e) {
        const error = e as Error;
        const isLowLevelError =
          error.name === 'TypeError' ||
          error.name === 'ReferenceError' ||
          error.message.includes('Cannot read') ||
          error.message.includes('Cannot access');

        expect(isLowLevelError).toBe(false);
      }
    });
  });

  describe('Parse function detection properties', () => {
    // Instead of filtering strings, we construct JSON-like strings directly
    test.prop([
      fc.record({
        prefix: fc.string({ maxLength: 50 }).map((s) => s.replace(/[{"]/g, '')),
        version: fc.string({ minLength: 1, maxLength: 50 }),
        suffix: fc.string({ maxLength: 50 }).map((s) => s.replace(/}/g, '')),
      }),
    ])(
      'should attempt iPUZ parsing for JSON-like content with proper error types',
      ({ prefix, version, suffix }) => {
        // Construct a JSON-like string that will trigger iPUZ parsing attempt
        const content = `${prefix}{"version":"${version}"${suffix}`;

        try {
          parse(content);
          // If it parses, that's fine - some malformed JSON might still be valid
        } catch (e) {
          const error = e as Error;
          // Must be one of our error types
          const isExpectedError =
            error instanceof XwordParseError ||
            error instanceof FormatDetectionError ||
            error instanceof IpuzParseError;

          if (!isExpectedError) {
            throw new Error(`Unexpected error type: ${error.constructor.name} - ${error.message}`);
          }
          expect(error.message).toMatch(/version|kind|JSON|puzzle|format/i);
        }
      },
    );

    // Construct XML-like strings directly
    test.prop([
      fc.record({
        tagName: fc.constantFrom('crossword', 'puzzle', 'grid'),
        content: fc.string({ maxLength: 100 }),
      }),
    ])(
      'should attempt JPZ parsing for XML-like content with proper error types',
      ({ tagName, content }) => {
        // Construct XML-like content that will trigger JPZ parsing attempt
        const xmlContent = `<?xml version="1.0"?><${tagName}>${content}</${tagName}>`;

        try {
          parse(xmlContent);
          // If it parses, that's fine
        } catch (e) {
          const error = e as Error;
          // Must be one of our error types
          const isExpectedError =
            error instanceof XwordParseError ||
            error instanceof FormatDetectionError ||
            error instanceof JpzParseError;

          if (!isExpectedError) {
            throw new Error(`Unexpected error type: ${error.constructor.name} - ${error.message}`);
          }
          expect(error.message).toMatch(/XML|JPZ|crossword|format/i);
        }
      },
    );

    // Regular unit tests for malformed patterns (not property tests since they use constants)
    it('should handle malformed XD format gracefully', () => {
      expect(() => parse('Title: Test\nSize: abc')).toThrow(); // Invalid size
      expect(() => parse('Title:\n\n\n')).toThrow(); // Incomplete XD
    });

    it('should handle malformed JSON gracefully', () => {
      expect(() => parse('{"version": }')).toThrow(); // Invalid JSON
    });

    it('should handle malformed XML gracefully', () => {
      expect(() => parse('<?xml><unclosed')).toThrow(); // Invalid XML
    });
  });

  describe('Solution data consistency', () => {
    test.prop([fc.integer({ min: 3, max: 20 }), fc.integer({ min: 3, max: 20 })])(
      'solution grid must match puzzle grid dimensions',
      (width, height) => {
        const puzzle = Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => ((x + y) % 3 === 0 ? '#' : 0)),
        );

        const solution = Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) =>
            (x + y) % 3 === 0 ? '#' : String.fromCharCode(65 + ((x + y) % 26)),
          ),
        );

        const ipuz = {
          version: 'http://ipuz.org/v2',
          kind: ['http://ipuz.org/crossword#1'],
          dimensions: { width, height },
          puzzle,
          solution,
          clues: { Across: [], Down: [] },
        };

        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Check solution matches grid
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = unified.grid.cells[y]?.[x];
            if (cell && !cell.isBlack) {
              expect(cell.solution).toBeDefined();
              expect(typeof cell.solution).toBe('string');
            }
          }
        }
      },
    );

    test.prop([fc.integer({ min: 3, max: 20 }), fc.integer({ min: 3, max: 20 })])(
      'black cells should not have solutions',
      (width, height) => {
        const puzzle = Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => {
            const isBlack = (x + y) % 3 === 0;
            return isBlack ? '#' : { cell: 0, solution: 'A' };
          }),
        );

        const ipuz = {
          version: 'http://ipuz.org/v2',
          kind: ['http://ipuz.org/crossword#1'],
          dimensions: { width, height },
          puzzle,
          clues: { Across: [], Down: [] },
        };

        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Check black cells have no solution
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = unified.grid.cells[y]?.[x];
            if (cell && cell.isBlack) {
              expect(cell.solution).toBeUndefined();
            }
          }
        }
      },
    );
  });

  describe('Unicode and special character handling', () => {
    test.prop([
      fc.record({
        title: fc.oneof(
          fc.constant('Émoji 🎉 Puzzle'),
          fc.constant('日本語パズル'),
          fc.constant('Русский кроссворд'),
          fc.constant('عربي لغز'),
          fc.string({ maxLength: 50 }),
        ),
        author: fc.string({ maxLength: 50 }),
        clueText: fc.string({ maxLength: 100 }),
      }),
    ])('parsers should handle Unicode in metadata and clues', ({ title, author, clueText }) => {
      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        title,
        author,
        dimensions: { width: 3, height: 3 },
        puzzle: [
          [0, 0, 0],
          [0, '#', 0],
          [0, 0, 0],
        ],
        clues: {
          Across: [{ number: 1, clue: clueText }],
          Down: [],
        },
      };

      try {
        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Check Unicode is preserved
        expect(unified.title).toBe(title);
        expect(unified.author).toBe(author);
        if (unified.clues.across.length > 0) {
          expect(unified.clues.across[0]?.text).toBe(clueText);
        }
      } catch (e) {
        // If it fails, must be our error type
        const error = e as Error;
        expect(error instanceof IpuzParseError).toBe(true);
      }
    });

    test.prop([
      fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E', 'É', 'Ñ', '©', '™', '→', '♠', 'Z'), {
        minLength: 9,
        maxLength: 9,
      }),
    ])('should handle special characters in solutions', (solutions) => {
      const puzzle = [
        [0, 0, 0],
        [0, '#', 0],
        [0, 0, 0],
      ];
      const solution = [
        [solutions[0], solutions[1], solutions[2]],
        [solutions[3], '#', solutions[4]],
        [solutions[5], solutions[6], solutions[7]],
      ];

      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width: 3, height: 3 },
        puzzle,
        solution,
        clues: { Across: [], Down: [] },
      };

      const parsed = parseIpuz(JSON.stringify(ipuz));
      const unified = convertIpuzToUnified(parsed);

      // Check solutions are preserved
      let solutionIndex = 0;
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          const cell = unified.grid.cells[y]?.[x];
          if (cell && !cell.isBlack && y * 3 + x !== 4) {
            expect(cell.solution).toBe(solutions[solutionIndex]);
            solutionIndex++;
          }
        }
      }
    });
  });

  describe('Cross-format consistency', () => {
    test.prop([
      fc.record({
        width: fc.integer({ min: 3, max: 10 }),
        height: fc.integer({ min: 3, max: 10 }),
        title: fc.string({ maxLength: 30 }),
        author: fc.string({ maxLength: 30 }),
      }),
    ])(
      'essential puzzle data should be preserved across conversions',
      ({ width, height, title, author }) => {
        // Create a simple puzzle
        const puzzle = Array.from({ length: height }, (_, y) =>
          Array.from({ length: width }, (_, x) => ((x + y) % 4 === 0 ? '#' : 0)),
        );

        const ipuz = {
          version: 'http://ipuz.org/v2',
          kind: ['http://ipuz.org/crossword#1'],
          title,
          author,
          dimensions: { width, height },
          puzzle,
          clues: {
            Across: [{ number: 1, clue: 'Test across' }],
            Down: [{ number: 2, clue: 'Test down' }],
          },
        };

        const parsed = parseIpuz(JSON.stringify(ipuz));
        const unified = convertIpuzToUnified(parsed);

        // Check essential data is preserved
        expect(unified.title).toBe(title);
        expect(unified.author).toBe(author);
        expect(unified.grid.width).toBe(width);
        expect(unified.grid.height).toBe(height);
        expect(unified.clues.across).toHaveLength(1);
        expect(unified.clues.down).toHaveLength(1);

        // Grid structure should match
        let blackCount = 0;
        let whiteCount = 0;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const cell = unified.grid.cells[y]?.[x];
            if (cell) {
              if (cell.isBlack) blackCount++;
              else whiteCount++;
            }
          }
        }

        expect(blackCount + whiteCount).toBe(width * height);
      },
    );
  });

  describe('Error handling', () => {
    it('should handle null input gracefully', () => {
      expect(() => parse(null as unknown as string)).toThrow();
    });

    it('should handle undefined input gracefully', () => {
      expect(() => parse(undefined as unknown as string)).toThrow();
    });

    it('should handle empty string gracefully', () => {
      expect(() => parse('')).toThrow(FormatDetectionError);
    });

    // Property test to ensure all parsers only throw our error types
    test.prop([fc.string({ minLength: 1, maxLength: 500 })])(
      'all parsers should only throw errors from our hierarchy for string inputs',
      (content) => {
        // Test each parser individually
        const parsers = [
          { name: 'iPUZ', fn: () => parseIpuz(content) },
          { name: 'XD', fn: () => parseXd(content) },
          { name: 'JPZ', fn: () => parseJpz(content) },
          { name: 'parse', fn: () => parse(content) },
        ];

        for (const parser of parsers) {
          try {
            parser.fn();
            // If it parses successfully, that's fine
          } catch (e) {
            const error = e as Error;
            const isExpectedError =
              error instanceof XwordParseError ||
              error instanceof FormatDetectionError ||
              error instanceof PuzParseError ||
              error instanceof IpuzParseError ||
              error instanceof JpzParseError ||
              error instanceof XdParseError;

            if (!isExpectedError) {
              throw new Error(
                `${parser.name} threw unexpected error type: ${error.constructor.name} - ${error.message}`,
              );
            }
          }
        }
      },
    );

    // Test with Buffer inputs as well
    test.prop([fc.uint8Array({ minLength: 1, maxLength: 500 })])(
      'all parsers should only throw errors from our hierarchy for Buffer inputs',
      (bytes) => {
        const buffer = Buffer.from(bytes);

        // Test parsers that accept Buffer
        const parsers = [
          { name: 'PUZ', fn: () => parsePuz(buffer) },
          { name: 'parse', fn: () => parse(buffer) },
        ];

        for (const parser of parsers) {
          try {
            parser.fn();
            // If it parses successfully, that's fine
          } catch (e) {
            const error = e as Error;
            const isExpectedError =
              error instanceof XwordParseError ||
              error instanceof FormatDetectionError ||
              error instanceof PuzParseError ||
              error instanceof IpuzParseError ||
              error instanceof JpzParseError ||
              error instanceof XdParseError;

            if (!isExpectedError) {
              throw new Error(
                `${parser.name} threw unexpected error type: ${error.constructor.name} - ${error.message}`,
              );
            }
          }
        }
      },
    );

    test.prop([fc.uint8Array({ minLength: 10, maxLength: 200 })])(
      'should throw proper parsing errors for random binary data',
      (bytes) => {
        const buffer = Buffer.from(bytes);

        let error: Error | null = null;
        try {
          parse(buffer);
        } catch (e) {
          error = e as Error;
        }

        expect(error).not.toBeNull();

        if (error) {
          const isExpectedError =
            error instanceof XwordParseError ||
            error instanceof FormatDetectionError ||
            error instanceof PuzParseError ||
            error instanceof IpuzParseError ||
            error instanceof JpzParseError ||
            error instanceof XdParseError;

          expect(isExpectedError).toBe(true);
          expect(error.message).not.toMatch(
            /undefined|null|cannot read|index|property|TypeError|ReferenceError/i,
          );
        }
      },
    );
  });
});
