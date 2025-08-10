import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseJpz, type JpzPuzzle } from './jpz';

describe('parseJpz', () => {
  const testDataDir = join(process.cwd(), 'testdata', 'jpz');
  const jpzFiles = readdirSync(testDataDir).filter((f) => f.endsWith('.jpz'));

  it('should parse standard JPZ crossword files', () => {
    for (const file of jpzFiles) {
      const filePath = join(testDataDir, file);
      const content = readFileSync(filePath, 'utf-8');

      // Skip non-crossword puzzle files
      if (file === 'kaidoku.jpz') {
        // This is a coded crossword which we don't support
        expect(() => parseJpz(content)).toThrow('Coded/cipher crosswords');
        continue;
      }

      let puzzle: JpzPuzzle;
      try {
        puzzle = parseJpz(content);
      } catch (error) {
        throw new Error(
          `Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      expect(puzzle).toBeDefined();
      expect(puzzle.width).toBeGreaterThan(0);
      expect(puzzle.height).toBeGreaterThan(0);
      expect(puzzle.grid).toBeDefined();
      expect(Array.isArray(puzzle.grid)).toBe(true);
      expect(puzzle.grid.length).toBe(puzzle.height);
      expect(puzzle.across).toBeDefined();
      expect(Array.isArray(puzzle.across)).toBe(true);
      expect(puzzle.down).toBeDefined();
      expect(Array.isArray(puzzle.down)).toBe(true);
    }
  });

  it('should parse FM.jpz puzzle correctly', () => {
    const filePath = join(testDataDir, 'FM.jpz');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseJpz(content);

    expect(puzzle.width).toBe(15);
    expect(puzzle.height).toBe(15);

    // Check metadata
    expect(puzzle.metadata.title).toBe('FM (A Grid Charlemagne Puzzle)');
    expect(puzzle.metadata.creator).toBe('Alex Boisvert');
    expect(puzzle.metadata.copyright).toContain('2021 Crossword Nexus');

    // Check grid structure
    expect(puzzle.grid).toHaveLength(15);
    expect(puzzle.grid[0]).toHaveLength(15);

    // Check first cell (1,1) is a block
    const firstCell = puzzle.grid[0]?.[0];
    expect(firstCell?.type).toBe('block');

    // Check cell (2,1) has solution 'R' and number 1
    const secondCell = puzzle.grid[0]?.[1];
    expect(secondCell?.solution).toBe('R');
    expect(secondCell?.number).toBe(1);

    // Check that we have clues
    expect(puzzle.across.length).toBeGreaterThan(0);
    expect(puzzle.down.length).toBeGreaterThan(0);
  });

  it('should parse puzzle metadata correctly', () => {
    const filePath = join(testDataDir, '120316-cs120316.jpz');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseJpz(content);

    expect(puzzle.metadata).toBeDefined();
    // At least one metadata field should be present
    const hasMetadata =
      puzzle.metadata.title || puzzle.metadata.creator || puzzle.metadata.copyright;
    expect(hasMetadata).toBeTruthy();
  });

  it('should handle grid cells with various properties', () => {
    const filePath = join(testDataDir, 'FM.jpz');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseJpz(content);

    let hasBlockCell = false;
    let hasNumberedCell = false;
    let hasSolutionCell = false;

    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (cell.type === 'block') {
          hasBlockCell = true;
        }
        if (cell.number && cell.number > 0) {
          hasNumberedCell = true;
        }
        if (cell.solution) {
          hasSolutionCell = true;
        }
      }
    }

    expect(hasBlockCell).toBe(true);
    expect(hasNumberedCell).toBe(true);
    expect(hasSolutionCell).toBe(true);
  });

  it('should parse clues with proper numbering', () => {
    const filePath = join(testDataDir, 'FM.jpz');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseJpz(content);

    // Check first across clue
    const firstAcross = puzzle.across[0];
    if (firstAcross) {
      expect(firstAcross.number).toBeDefined();
      expect(firstAcross.text).toBeDefined();
      expect(firstAcross.text.length).toBeGreaterThan(0);
    }

    // Check first down clue
    const firstDown = puzzle.down[0];
    if (firstDown) {
      expect(firstDown.number).toBeDefined();
      expect(firstDown.text).toBeDefined();
      expect(firstDown.text.length).toBeGreaterThan(0);
    }
  });

  it('should handle different JPZ format variations', () => {
    // Test each file to ensure format variations are handled
    for (const file of jpzFiles) {
      // Skip non-crossword files
      if (file === 'kaidoku.jpz') continue;

      const filePath = join(testDataDir, file);
      const content = readFileSync(filePath, 'utf-8');

      // Should not throw for standard crosswords
      expect(() => parseJpz(content)).not.toThrow();

      const puzzle = parseJpz(content);

      // Basic sanity checks
      expect(puzzle.width).toBeGreaterThan(0);
      expect(puzzle.height).toBeGreaterThan(0);
      expect(puzzle.grid.length).toBe(puzzle.height);
      if (puzzle.grid[0]) {
        expect(puzzle.grid[0].length).toBe(puzzle.width);
      }
    }
  });

  it('should reject non-crossword puzzle types', () => {
    const filePath = join(testDataDir, 'kaidoku.jpz');
    const content = readFileSync(filePath, 'utf-8');

    expect(() => parseJpz(content)).toThrow(
      'Coded/cipher crosswords (Kaidoku) puzzles are not supported',
    );
  });
});
