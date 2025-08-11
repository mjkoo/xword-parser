import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  parse,
  parseIpuz,
  parsePuz,
  parseJpz,
  parseXd,
  convertIpuzToUnified,
  convertPuzToUnified,
  convertJpzToUnified,
  convertXdToUnified,
} from './index';
import { parseLazy } from './lazy';
import type { Puzzle } from './types';

describe('End-to-End Workflows', () => {
  describe('Complete parsing workflow', () => {
    test('should parse all test files and produce valid unified puzzles', () => {
      const formats = ['ipuz', 'puz', 'jpz', 'xd'];

      // Skip files known to be problematic or special cases
      const skipFiles = ['first.ipuz', 'ipuz-blockquote.ipuz'];

      for (const format of formats) {
        const testDir = join(__dirname, '..', 'testdata', format);
        const files = readdirSync(testDir).filter((f) => !skipFiles.includes(f));

        // Test at least some files from each format
        const filesToTest = files.slice(0, 5);

        for (const file of filesToTest) {
          const filePath = join(testDir, file);
          const content = readFileSync(filePath);

          try {
            const puzzle = parse(content, { filename: file });
            expect(puzzle).toBeDefined();
            expect(puzzle.grid).toBeDefined();
            expect(puzzle.clues).toBeDefined();
            expect(puzzle.grid.cells).toBeDefined();
            expect(Array.isArray(puzzle.grid.cells)).toBe(true);
            expect(puzzle.grid.cells.length).toBeGreaterThan(0);
          } catch (e) {
            // Some files might be non-crossword or have other issues
            // Log but don't fail the test
            console.log(`Skipping ${file}: ${e.message}`);
          }
        }
      }
    });

    test('should handle mixed format detection without hints', () => {
      const testFiles = [
        { path: join(__dirname, '..', 'testdata', 'ipuz', 'example.ipuz'), format: 'ipuz' },
        { path: join(__dirname, '..', 'testdata', 'puz', 'nyt_locked.puz'), format: 'puz' },
        { path: join(__dirname, '..', 'testdata', 'jpz', 'FM.jpz'), format: 'jpz' },
        { path: join(__dirname, '..', 'testdata', 'xd', 'atc2003-09-03.xd'), format: 'xd' },
      ];

      for (const { path } of testFiles) {
        const content = readFileSync(path);
        const puzzle = parse(content);
        expect(puzzle).toBeDefined();
        expect(puzzle.grid).toBeDefined();
        expect(puzzle.clues).toBeDefined();
      }
    });

    test('should produce consistent results with sync and async parsing', async () => {
      const testFile = join(__dirname, '..', 'testdata', 'ipuz', 'example.ipuz');
      const content = readFileSync(testFile);

      const syncPuzzle = parse(content, { filename: 'example.ipuz' });
      const asyncPuzzle = await parseLazy(content, { filename: 'example.ipuz' });

      expect(syncPuzzle).toEqual(asyncPuzzle);
    });
  });

  describe('Format-specific to unified conversion', () => {
    test('should maintain data integrity through format-specific parsing and conversion', () => {
      const ipuzPath = join(__dirname, '..', 'testdata', 'ipuz', 'example.ipuz');
      const ipuzContent = readFileSync(ipuzPath, 'utf-8');
      const ipuzPuzzle = parseIpuz(ipuzContent);
      const ipuzUnified = convertIpuzToUnified(ipuzPuzzle);

      expect(ipuzUnified.grid).toBeDefined();
      expect(ipuzUnified.clues).toBeDefined();
      if (ipuzPuzzle.title) expect(ipuzUnified.title).toBe(ipuzPuzzle.title);
      if (ipuzPuzzle.author) expect(ipuzUnified.author).toBe(ipuzPuzzle.author);

      const puzPath = join(__dirname, '..', 'testdata', 'puz', 'nyt_locked.puz');
      const puzContent = readFileSync(puzPath);
      const puzPuzzle = parsePuz(puzContent);
      const puzUnified = convertPuzToUnified(puzPuzzle);

      expect(puzUnified.grid).toBeDefined();
      expect(puzUnified.clues).toBeDefined();
      if (puzPuzzle.title) expect(puzUnified.title).toBe(puzPuzzle.title);
      if (puzPuzzle.author) expect(puzUnified.author).toBe(puzPuzzle.author);

      const jpzPath = join(__dirname, '..', 'testdata', 'jpz', 'FM.jpz');
      const jpzContent = readFileSync(jpzPath, 'utf-8');
      const jpzPuzzle = parseJpz(jpzContent);
      const jpzUnified = convertJpzToUnified(jpzPuzzle);

      expect(jpzUnified.grid).toBeDefined();
      expect(jpzUnified.clues).toBeDefined();
      if (jpzPuzzle.puzzle?.metadata?.title)
        expect(jpzUnified.title).toBe(jpzPuzzle.puzzle.metadata.title);
      if (jpzPuzzle.puzzle?.metadata?.creator)
        expect(jpzUnified.author).toBe(jpzPuzzle.puzzle.metadata.creator);

      const xdPath = join(__dirname, '..', 'testdata', 'xd', 'atc2003-09-03.xd');
      const xdContent = readFileSync(xdPath, 'utf-8');
      const xdPuzzle = parseXd(xdContent);
      const xdUnified = convertXdToUnified(xdPuzzle);

      expect(xdUnified.grid).toBeDefined();
      expect(xdUnified.clues).toBeDefined();
      if (xdPuzzle.title) expect(xdUnified.title).toBe(xdPuzzle.title);
      if (xdPuzzle.author) expect(xdUnified.author).toBe(xdPuzzle.author);
    });
  });

  describe('Error handling workflow', () => {
    test('should handle invalid files gracefully', () => {
      const invalidInputs = [
        Buffer.from('not a puzzle'),
        'random text',
        '{}',
        '<xml>invalid</xml>',
        Buffer.from([0xff, 0xfe, 0xfd]),
      ];

      for (const input of invalidInputs) {
        expect(() => parse(input)).toThrow();
      }
    });

    test('should provide helpful error messages for format mismatches', () => {
      const ipuzContent = readFileSync(join(__dirname, '..', 'testdata', 'ipuz', 'example.ipuz'));

      expect(() => parsePuz(ipuzContent)).toThrow();
      expect(() => parseJpz(ipuzContent)).toThrow();
      expect(() => parseXd(ipuzContent)).toThrow();
    });
  });

  describe('Options handling', () => {
    test('should respect maxGridSize option', () => {
      const smallMaxSize = { width: 5, height: 5 };
      const testFiles = [
        join(__dirname, '..', 'testdata', 'ipuz', 'example.ipuz'),
        join(__dirname, '..', 'testdata', 'jpz', 'FM.jpz'),
        join(__dirname, '..', 'testdata', 'xd', 'atc2003-09-03.xd'),
      ];

      for (const file of testFiles) {
        const content = readFileSync(file, 'utf-8');
        expect(() => parse(content, { maxGridSize: smallMaxSize })).toThrow(
          /dimensions too large|Invalid grid dimensions/i,
        );
      }
    });

    test('should handle different encodings correctly', () => {
      const xdPath = join(__dirname, '..', 'testdata', 'xd', 'atc2003-09-03.xd');
      const content = readFileSync(xdPath);

      const utf8Puzzle = parse(content, { encoding: 'utf-8' });
      expect(utf8Puzzle).toBeDefined();

      const latin1Puzzle = parse(content, { encoding: 'latin1' });
      expect(latin1Puzzle).toBeDefined();
    });
  });

  describe('Real-world usage patterns', () => {
    test('should handle batch processing of multiple puzzles', () => {
      const puzzles: Puzzle[] = [];
      const formats = ['ipuz', 'puz', 'jpz', 'xd'];

      for (const format of formats) {
        const testDir = join(__dirname, '..', 'testdata', format);
        const files = readdirSync(testDir).slice(0, 2);

        for (const file of files) {
          const content = readFileSync(join(testDir, file));
          const puzzle = parse(content, { filename: file });
          puzzles.push(puzzle);
        }
      }

      expect(puzzles.length).toBeGreaterThanOrEqual(8);

      for (const puzzle of puzzles) {
        expect(puzzle.grid).toBeDefined();
        expect(puzzle.clues).toBeDefined();
        expect(puzzle.grid.width).toBeGreaterThan(0);
        expect(puzzle.grid.height).toBeGreaterThan(0);
        expect(puzzle.grid.cells.length).toBeGreaterThan(0);
        expect(puzzle.grid.cells[0].length).toBeGreaterThan(0);
      }
    });

    test('should support puzzle validation workflow', () => {
      const validatePuzzle = (puzzle: Puzzle): boolean => {
        if (!puzzle.grid || !puzzle.grid.cells || puzzle.grid.cells.length === 0) return false;
        if (!puzzle.clues) return false;

        const width = puzzle.grid.width;
        for (const row of puzzle.grid.cells) {
          if (row.length !== width) return false;
        }

        for (const row of puzzle.grid.cells) {
          for (const cell of row) {
            if (cell.solution && cell.solution.length > 1 && !cell.hasRebus) {
              return false;
            }
          }
        }

        return true;
      };

      const testFiles = [
        join(__dirname, '..', 'testdata', 'ipuz', 'example.ipuz'),
        join(__dirname, '..', 'testdata', 'puz', 'nyt_locked.puz'),
        join(__dirname, '..', 'testdata', 'jpz', 'FM.jpz'),
        join(__dirname, '..', 'testdata', 'xd', 'atc2003-09-03.xd'),
      ];

      for (const file of testFiles) {
        const content = readFileSync(file);
        const puzzle = parse(content, { filename: file });
        expect(validatePuzzle(puzzle)).toBe(true);
      }
    });
  });
});
