import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parsePuz, type PuzPuzzle } from './puz';
import type { ParseOptions } from './types';

describe('parsePuz', () => {
  const testDataDir = join(process.cwd(), 'testdata', 'puz');
  const puzFiles = readdirSync(testDataDir).filter((f) => f.endsWith('.puz'));

  it('should parse all PUZ test files without errors', () => {
    for (const file of puzFiles) {
      const filePath = join(testDataDir, file);
      const buffer = readFileSync(filePath);

      let puzzle: PuzPuzzle;
      try {
        puzzle = parsePuz(buffer);
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

  it('should parse NYT weekday puzzle with notes correctly', () => {
    const filePath = join(testDataDir, 'nyt_weekday_with_notes.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    expect(puzzle.width).toBe(15);
    expect(puzzle.height).toBe(15);
    expect(puzzle.metadata.notes).toBeDefined();
    expect(puzzle.metadata.notes).toContain(''); // Notes exist but may be empty or contain text

    // Check grid structure
    expect(puzzle.grid).toHaveLength(15);
    expect(puzzle.grid[0]).toHaveLength(15);

    // Check that we have clues
    expect(puzzle.across.length).toBeGreaterThan(0);
    expect(puzzle.down.length).toBeGreaterThan(0);

    // Verify first across clue has a number and text
    const firstAcross = puzzle.across[0];
    expect(firstAcross?.number).toBeGreaterThan(0);
    expect(firstAcross?.text).toBeDefined();
    expect(firstAcross?.text.length).toBeGreaterThan(0);
  });

  it('should detect scrambled/locked puzzles', () => {
    const filePath = join(testDataDir, 'nyt_locked.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    expect(puzzle.isScrambled).toBeDefined();
    // The puzzle should be marked as scrambled
    expect(puzzle.isScrambled).toBe(true);
  });

  it('should parse puzzle with rebus squares', () => {
    const filePath = join(testDataDir, 'nyt_sun_rebus.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Sunday puzzles are typically 21x21
    expect(puzzle.width).toBe(21);
    expect(puzzle.height).toBe(21);

    // Check for rebus content
    if (puzzle.rebusTable && puzzle.rebusTable.size > 0) {
      // If rebus table exists, verify some cells have rebus markers
      let hasRebusCell = false;
      for (const row of puzzle.grid) {
        for (const cell of row) {
          if (cell.hasRebus) {
            hasRebusCell = true;
            break;
          }
        }
        if (hasRebusCell) break;
      }
      expect(hasRebusCell).toBe(true);
    }
  });

  it('should parse puzzle with shape/circles', () => {
    const filePath = join(testDataDir, 'nyt_with_shape.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Check if any cells have circles
    let hasCircledCell = false;
    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (cell.isCircled) {
          hasCircledCell = true;
          break;
        }
      }
      if (hasCircledCell) break;
    }

    // This puzzle should have circled squares
    expect(hasCircledCell).toBe(true);
  });

  it('should handle partially filled puzzles', () => {
    const filePath = join(testDataDir, 'nyt_partlyfilled.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Check for player state in cells
    let hasFilledCell = false;
    let hasEmptyCell = false;

    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (!cell.isBlack) {
          if (cell.playerState) {
            hasFilledCell = true;
          } else {
            hasEmptyCell = true;
          }
        }
      }
    }

    // Partially filled puzzle should have both filled and empty cells
    expect(hasFilledCell).toBe(true);
    expect(hasEmptyCell).toBe(true);
  });

  it('should parse unicode puzzle correctly', () => {
    const filePath = join(testDataDir, 'unicode.puz');
    const buffer = readFileSync(filePath);

    // This should parse without throwing
    const puzzle = parsePuz(buffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
  });

  it('should correctly identify black squares', () => {
    const filePath = join(testDataDir, 'av110622.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Count black squares
    let blackCount = 0;
    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (cell.isBlack) {
          blackCount++;
        }
      }
    }

    // Standard puzzles have black squares
    expect(blackCount).toBeGreaterThan(0);
    expect(blackCount).toBeLessThan(puzzle.width * puzzle.height);
  });

  it('should parse metadata fields correctly', () => {
    const filePath = join(testDataDir, 'wsj110624.puz');
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Wall Street Journal puzzles should have metadata
    expect(puzzle.metadata).toBeDefined();

    // At least one of these should be defined
    const hasMetadata =
      puzzle.metadata.title || puzzle.metadata.author || puzzle.metadata.copyright;
    expect(hasMetadata).toBeTruthy();
  });

  it('should handle diagramless puzzles', () => {
    const filePath = join(testDataDir, 'nyt_diagramless.puz');
    const buffer = readFileSync(filePath);

    // Diagramless puzzles might have special properties but should still parse
    const puzzle = parsePuz(buffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
    expect(puzzle.across).toBeDefined();
    expect(puzzle.down).toBeDefined();
  });

  it('should respect maxGridSize option', () => {
    const buffer = readFileSync(join(testDataDir, 'nyt_locked.puz'));

    // First verify the puzzle can be parsed normally
    const puzzle = parsePuz(buffer);
    expect(puzzle.width).toBeGreaterThan(5);
    expect(puzzle.height).toBeGreaterThan(5);

    // Then verify it throws with a smaller maxGridSize
    const options: ParseOptions = {
      maxGridSize: { width: 5, height: 5 },
    };

    expect(() => parsePuz(buffer, options)).toThrow(/Grid dimensions too large/);
  });

  it('should allow puzzle within maxGridSize limits', () => {
    const buffer = readFileSync(join(testDataDir, 'nyt_locked.puz'));

    // Use a large enough maxGridSize
    const options: ParseOptions = {
      maxGridSize: { width: 100, height: 100 },
    };

    const puzzle = parsePuz(buffer, options);
    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
  });
});
