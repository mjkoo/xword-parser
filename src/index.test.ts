import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, XwordParseError } from './index';

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

describe('XwordParseError', () => {
  it('should create an error with the correct name', () => {
    const error = new XwordParseError('Test error');
    expect(error.name).toBe('XwordParseError');
    expect(error.message).toBe('Test error');
  });
});
