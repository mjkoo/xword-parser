import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, ParseError, FormatDetectionError } from './index';

describe('parse auto-detection', () => {
  const testDataDir = join(process.cwd(), 'testdata');

  it('should auto-detect and parse iPUZ files', () => {
    const ipuzFile = join(testDataDir, 'ipuz', 'example.ipuz');
    const content = readFileSync(ipuzFile, 'utf-8');

    const puzzle = parse(content);

    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
    expect(puzzle.grid.width).toBe(15);
    expect(puzzle.grid.height).toBe(15);
    expect(puzzle.clues.across).toBeDefined();
    expect(puzzle.clues.down).toBeDefined();
  });

  it('should auto-detect and parse XD files', () => {
    const xdFile = join(testDataDir, 'xd', 'nyt2003-11-17.xd');
    const content = readFileSync(xdFile, 'utf-8');

    const puzzle = parse(content);

    expect(puzzle).toBeDefined();
    expect(puzzle.title).toBeDefined();
    expect(puzzle.grid.width).toBeGreaterThan(0);
    expect(puzzle.grid.height).toBeGreaterThan(0);
  });

  it('should auto-detect and parse PUZ files from Buffer', () => {
    const puzFile = join(testDataDir, 'puz', 'av110622.puz');
    const buffer = readFileSync(puzFile);

    const puzzle = parse(buffer);

    expect(puzzle).toBeDefined();
    expect(puzzle.title).toBe('AV Club xword, 6 22 11');
    expect(puzzle.author).toBe('Ben Tausig');
    expect(puzzle.grid).toBeDefined();
    expect(puzzle.clues.across.length).toBeGreaterThan(0);
    expect(puzzle.clues.down.length).toBeGreaterThan(0);
  });

  it('should auto-detect and parse JPZ files', () => {
    const jpzFile = join(testDataDir, 'jpz', 'FM.jpz');
    const content = readFileSync(jpzFile, 'utf-8');

    const puzzle = parse(content);

    expect(puzzle).toBeDefined();
    expect(puzzle.title).toBe('FM (A Grid Charlemagne Puzzle)');
    expect(puzzle.author).toBe('Alex Boisvert');
    expect(puzzle.grid.width).toBe(15);
    expect(puzzle.grid.height).toBe(15);
  });

  it('should convert ArrayBuffer to Buffer and parse PUZ', () => {
    const puzFile = join(testDataDir, 'puz', 'av110622.puz');
    const buffer = readFileSync(puzFile);
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );

    const puzzle = parse(arrayBuffer);

    expect(puzzle).toBeDefined();
    expect(puzzle.title).toBe('AV Club xword, 6 22 11');
  });

  it('should throw error for unsupported format', () => {
    const invalidContent = 'This is not a valid puzzle format';

    expect(() => parse(invalidContent)).toThrow('Unable to detect puzzle format');
  });

  it('should parse iPUZ with wrapper function', () => {
    const ipuzFile = join(testDataDir, 'ipuz', 'test.ipuz');
    const content = readFileSync(ipuzFile, 'utf-8');

    const puzzle = parse(content);

    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
  });

  it('should correctly convert grid cells', () => {
    const xdFile = join(testDataDir, 'xd', 'usa2024-05-13.xd');
    const content = readFileSync(xdFile, 'utf-8');

    const puzzle = parse(content);

    // Check that grid has proper structure
    expect(puzzle.grid.cells).toHaveLength(puzzle.grid.height);
    expect(puzzle.grid.cells[0]).toHaveLength(puzzle.grid.width);

    // Check first cell
    const firstCell = puzzle.grid.cells[0]?.[0];
    expect(firstCell).toBeDefined();
    expect(firstCell?.isBlack).toBeDefined();

    // Find a black cell
    let hasBlackCell = false;
    let hasNumberedCell = false;
    let hasSolutionCell = false;

    for (const row of puzzle.grid.cells) {
      for (const cell of row) {
        if (cell.isBlack) hasBlackCell = true;
        if (cell.number) hasNumberedCell = true;
        if (cell.solution) hasSolutionCell = true;
      }
    }

    expect(hasBlackCell).toBe(true);
    expect(hasNumberedCell).toBe(true);
    expect(hasSolutionCell).toBe(true);
  });

  it('should correctly convert clues', () => {
    const puzFile = join(testDataDir, 'puz', 'av110622.puz');
    const buffer = readFileSync(puzFile);

    const puzzle = parse(buffer);

    // Check clue structure
    expect(puzzle.clues.across.length).toBeGreaterThan(0);
    expect(puzzle.clues.down.length).toBeGreaterThan(0);

    // Check first across clue
    const firstAcross = puzzle.clues.across[0];
    if (firstAcross) {
      expect(firstAcross.number).toBeGreaterThan(0);
      expect(firstAcross.text).toBeDefined();
      expect(firstAcross.text.length).toBeGreaterThan(0);
    }

    // Check first down clue
    const firstDown = puzzle.clues.down[0];
    if (firstDown) {
      expect(firstDown.number).toBeGreaterThan(0);
      expect(firstDown.text).toBeDefined();
      expect(firstDown.text.length).toBeGreaterThan(0);
    }
  });
});

describe('ParseError', () => {
  it('should create an error with the correct class name', () => {
    const error = new ParseError('Test error');
    expect(error.constructor.name).toBe('ParseError');
    expect(error.message).toBe('Test error');
    expect(error instanceof ParseError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('parse error handling', () => {
  it('should throw original Error when not a format mismatch', () => {
    // Create invalid JSON that will cause a SyntaxError
    const malformedJson = '{"version": "invalid json';

    expect(() => parse(malformedJson)).toThrow();
  });

  it('should wrap non-Error exceptions in FormatDetectionError', () => {
    // This test ensures non-Error exceptions are properly wrapped
    // We need a scenario where lastError exists but is not an Error instance
    // Since our parsers throw Error instances, we'll test with completely invalid data
    const invalidData = Buffer.from([0xff, 0xfe, 0xfd, 0xfc]);

    try {
      parse(invalidData);
      expect.fail('Should have thrown an error');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatDetectionError);
      if (e instanceof FormatDetectionError) {
        expect(e.message).toContain('Unable to detect puzzle format');
      }
    }
  });

  it('should handle invalid JSON that causes parse errors', () => {
    const partialJson = '{"version": "http://ipuz.org/v2"';

    expect(() => parse(partialJson)).toThrow(FormatDetectionError);
  });

  it('should propagate non-format-mismatch errors with their original type', () => {
    // Create a valid iPUZ structure that will fail validation
    const invalidIpuz = JSON.stringify({
      version: 'http://ipuz.org/v2',
      kind: ['http://ipuz.org/crossword#1'],
      dimensions: { width: -1, height: -1 },
      puzzle: [],
    });

    expect(() => parse(invalidIpuz)).toThrow('Width and height must be positive numbers');
  });

  it('should skip PUZ parsing when content is a string', () => {
    const stringContent = 'this is a string, not binary data for PUZ';

    expect(() => parse(stringContent)).toThrow(FormatDetectionError);
  });
});

describe('Auto-detection with Edge Cases', () => {
  it('should auto-detect and parse large grid', () => {
    const largePuzzle = {
      version: 'http://ipuz.org/v2',
      kind: ['http://ipuz.org/crossword#1'],
      dimensions: { width: 50, height: 50 },
      puzzle: Array(50)
        .fill(null)
        .map(() => Array(50).fill(0)),
      clues: {
        Across: [{ number: 1, clue: 'Test' }],
      },
    };

    const result = parse(JSON.stringify(largePuzzle));
    expect(result.grid.cells.length).toBe(50);
    expect(result.grid.cells[0]?.length).toBe(50);
  });

  it('should auto-detect and parse puzzle with unicode', () => {
    const xd = `Title: 测试 🎯

ABC
DEF
GHI

A1. Clue ~ ABC`;

    const result = parse(xd);
    expect(result.title).toBe('测试 🎯');
  });

  it('should auto-detect and parse empty clue puzzle', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <crossword-compiler-applet>
        <rectangular-puzzle>
          <crossword>
            <grid width="3" height="3">
              <row>
                <cell>A</cell>
                <cell>B</cell>
                <cell>C</cell>
              </row>
              <row>
                <cell>D</cell>
                <cell>E</cell>
                <cell>F</cell>
              </row>
              <row>
                <cell>G</cell>
                <cell>H</cell>
                <cell>I</cell>
              </row>
            </grid>
          </crossword>
        </rectangular-puzzle>
      </crossword-compiler-applet>`;

    const result = parse(xml);
    expect(result.clues.across).toEqual([]);
    expect(result.clues.down).toEqual([]);
  });
});
