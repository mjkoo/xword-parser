import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseLazy } from './lazy';

describe('lazy parser', () => {
  it('should parse iPUZ file lazily', async () => {
    const data = readFileSync(join('testdata', 'ipuz', 'example.ipuz'), 'utf-8');
    const puzzle = await parseLazy(data);
    
    expect(puzzle.title).toBe('High-Tech Mergers');
    expect(puzzle.author).toBe('Roy Leban');
    expect(puzzle.grid.width).toBe(15);
    expect(puzzle.grid.height).toBe(15);
  });

  it('should parse PUZ file lazily', async () => {
    const data = readFileSync(join('testdata', 'puz', 'av110622.puz'));
    const puzzle = await parseLazy(data);
    
    expect(puzzle.title).toBe('AV Club xword, 6 22 11');
    expect(puzzle.grid.width).toBe(15);
    expect(puzzle.grid.height).toBe(15);
  });

  it('should parse JPZ file lazily', async () => {
    const data = readFileSync(join('testdata', 'jpz', 'FM.jpz'), 'utf-8');
    const puzzle = await parseLazy(data);
    
    expect(puzzle.title).toBe('FM (A Grid Charlemagne Puzzle)');
    expect(puzzle.author).toBe('Alex Boisvert');
    expect(puzzle.grid.width).toBe(15);
    expect(puzzle.grid.height).toBe(15);
  });

  it('should parse XD file lazily', async () => {
    const data = readFileSync(join('testdata', 'xd', 'bg2007-07-08.xd'), 'utf-8');
    const puzzle = await parseLazy(data);
    
    expect(puzzle.title).toBe('New Acronyms');
    expect(puzzle.author).toBe('Emily Cox & Henry Rathvon');
    expect(puzzle.grid.width).toBe(21);
    expect(puzzle.grid.height).toBe(21);
  });

  it('should support filename hints', async () => {
    const data = readFileSync(join('testdata', 'ipuz', 'example.ipuz'), 'utf-8');
    const puzzle = await parseLazy(data, { filename: 'puzzle.ipuz' });
    
    expect(puzzle.title).toBe('High-Tech Mergers');
    expect(puzzle.grid.width).toBe(15);
  });
});