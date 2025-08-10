import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseXd, type XdPuzzle } from './xd';

describe('parseXd', () => {
  const testDataDir = join(process.cwd(), 'testdata', 'xd');
  const xdFiles = readdirSync(testDataDir).filter(f => f.endsWith('.xd'));

  it('should parse all XD test files without errors', () => {
    for (const file of xdFiles) {
      const filePath = join(testDataDir, file);
      const content = readFileSync(filePath, 'utf-8');
      
      let puzzle: XdPuzzle;
      try {
        puzzle = parseXd(content);
      } catch (error) {
        throw new Error(`Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      expect(puzzle).toBeDefined();
      expect(puzzle.metadata).toBeDefined();
      expect(puzzle.grid).toBeDefined();
      expect(Array.isArray(puzzle.grid)).toBe(true);
      expect(puzzle.across).toBeDefined();
      expect(Array.isArray(puzzle.across)).toBe(true);
      expect(puzzle.down).toBeDefined();
      expect(Array.isArray(puzzle.down)).toBe(true);
    }
  });

  it('should parse NYT 2010-09-08 puzzle correctly', () => {
    const filePath = join(testDataDir, 'nyt2010-09-08.xd');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseXd(content);
    
    expect(puzzle.metadata.title).toBe('New York Times, Wednesday, September 8, 2010');
    expect(puzzle.metadata.author).toBe('Tracy Gray');
    expect(puzzle.metadata.editor).toBe('Will Shortz');
    expect(puzzle.metadata.date).toBe('2010-09-08');
    expect(puzzle.metadata.rebus).toBe('1=ZZ');
    
    expect(puzzle.grid).toHaveLength(15);
    expect(puzzle.grid[0]).toHaveLength(15);
    expect(puzzle.grid[0]?.[0]).toBe('M');
    expect(puzzle.grid[0]?.[1]).toBe('E');
    expect(puzzle.grid[0]?.[2]).toBe('G');
    expect(puzzle.grid[0]?.[3]).toBe('A');
    expect(puzzle.grid[0]?.[4]).toBe('#');
    
    expect(puzzle.across.length).toBeGreaterThan(0);
    expect(puzzle.down.length).toBeGreaterThan(0);
    
    const firstAcross = puzzle.across[0];
    expect(firstAcross?.number).toBe('1');
    expect(firstAcross?.clue).toBe('Prefix with bucks');
    expect(firstAcross?.answer).toBe('MEGA');
  });

  it('should parse LA Times 2020-04-25 puzzle correctly', () => {
    const filePath = join(testDataDir, 'lat2020-04-25.xd');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseXd(content);
    
    expect(puzzle.metadata.title).toBe('LA Times, Sat, Apr 25, 2020');
    expect(puzzle.metadata.author).toBe('C.C. Burnikel / Ed. Rich Norris');
    expect(puzzle.metadata.copyright).toBe('© 2020 Tribune Content Agency, LLC');
    expect(puzzle.metadata.date).toBe('2020-04-25');
    
    expect(puzzle.grid).toHaveLength(15);
    expect(puzzle.grid[0]).toHaveLength(15);
    
    const firstAcross = puzzle.across[0];
    expect(firstAcross?.number).toBe('1');
    expect(firstAcross?.clue).toBe('"Stop kidding yourself"');
    expect(firstAcross?.answer).toBe('LETSBEREAL');
    
    const firstDown = puzzle.down[0];
    expect(firstDown?.number).toBe('1');
    expect(firstDown?.clue).toBe('It\'s thrown at rodeos');
    expect(firstDown?.answer).toBe('LARIAT');
  });

  it('should handle puzzles with notes section', () => {
    const testContent = `Title: Test Puzzle
Author: Test Author

ABC
DEF
GHI

A1. First clue ~ ABC
A4. Second clue ~ DEF
D1. Down clue ~ ADG

This is a note about the puzzle.
It spans multiple lines.`;

    const puzzle = parseXd(testContent);
    
    expect(puzzle.notes).toBeDefined();
    expect(puzzle.notes).toContain('This is a note about the puzzle');
    expect(puzzle.notes).toContain('It spans multiple lines');
  });

  it('should handle rebus cells in grid', () => {
    const filePath = join(testDataDir, 'nyt2010-09-08.xd');
    const content = readFileSync(filePath, 'utf-8');
    const puzzle = parseXd(content);
    
    expect(puzzle.grid[2]?.[2]).toBe('1');
    expect(puzzle.grid[2]?.[7]).toBe('1');
    
    expect(puzzle.metadata.rebus).toBe('1=ZZ');
  });

  it('should throw error for invalid XD format', () => {
    const invalidContent = 'This is not a valid XD file';
    
    expect(() => parseXd(invalidContent)).toThrow('Invalid XD file: no grid section found');
  });

  it('should handle various metadata fields', () => {
    const testContent = `Title: Test
Author: Author Name
Editor: Editor Name
Copyright: © 2024
Date: 2024-01-01
CustomField: Custom Value

ABC
DEF
GHI

A1. Clue ~ ABC`;

    const puzzle = parseXd(testContent);
    
    expect(puzzle.metadata.title).toBe('Test');
    expect(puzzle.metadata.author).toBe('Author Name');
    expect(puzzle.metadata.editor).toBe('Editor Name');
    expect(puzzle.metadata.copyright).toBe('© 2024');
    expect(puzzle.metadata.date).toBe('2024-01-01');
    expect(puzzle.metadata.customField).toBe('Custom Value');
  });

  it('should parse grid with various cell types', () => {
    const testContent = `Title: Test

ABC#.
12xyz
_____

A1. Test ~ ABC`;

    const puzzle = parseXd(testContent);
    
    expect(puzzle.grid[0]?.[0]).toBe('A');
    expect(puzzle.grid[0]?.[1]).toBe('B');
    expect(puzzle.grid[0]?.[2]).toBe('C');
    expect(puzzle.grid[0]?.[3]).toBe('#');
    expect(puzzle.grid[0]?.[4]).toBe('.');
    
    expect(puzzle.grid[1]?.[0]).toBe('1');
    expect(puzzle.grid[1]?.[1]).toBe('2');
    expect(puzzle.grid[1]?.[2]).toBe('x');
    expect(puzzle.grid[1]?.[3]).toBe('y');
    expect(puzzle.grid[1]?.[4]).toBe('z');
    
    expect(puzzle.grid[2]?.[0]).toBe('_');
  });
});