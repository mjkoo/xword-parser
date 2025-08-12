import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseLazy } from './lazy';
import { FormatDetectionError } from './errors';

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

  it('should handle ArrayBuffer input', async () => {
    const buffer = readFileSync(join('testdata', 'puz', 'av110622.puz'));
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
    const puzzle = await parseLazy(arrayBuffer);

    expect(puzzle.title).toBe('AV Club xword, 6 22 11');
    expect(puzzle.grid.width).toBe(15);
  });

  it('should skip PUZ parsing for string content', async () => {
    const data = 'not a puz file content';
    await expect(parseLazy(data)).rejects.toThrow(FormatDetectionError);
  });

  it('should throw non-format-mismatch ParseError immediately', async () => {
    // Create an iPUZ with invalid structure that will cause a non-format-mismatch error
    const invalidIpuz = JSON.stringify({
      version: 'http://ipuz.org/v2',
      kind: ['http://ipuz.org/crossword#1'],
      dimensions: { width: 3, height: 3 },
      puzzle: 'invalid', // This should cause a parse error that's not a format mismatch
    });
    await expect(parseLazy(invalidIpuz)).rejects.toThrow('Missing or invalid puzzle grid');
  });

  it('should throw FormatDetectionError when no format works', async () => {
    const invalidData = 'This is definitely not a valid puzzle format';
    await expect(parseLazy(invalidData)).rejects.toThrow(FormatDetectionError);
    await expect(parseLazy(invalidData)).rejects.toThrow(
      'Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD',
    );
  });

  it('should wrap non-Error exceptions in FormatDetectionError', async () => {
    // Create a malformed JSON that will cause a parsing error
    const malformedJson =
      '{"version": "http://ipuz.org/v2", "kind": ["http://ipuz.org/crossword#1"], ';

    try {
      await parseLazy(malformedJson);
      expect.fail('Should have thrown an error');
    } catch (e) {
      expect(e).toBeInstanceOf(FormatDetectionError);
      if (e instanceof FormatDetectionError) {
        expect(e.message).toContain('Unable to detect puzzle format');
      }
    }
  });

  it('should propagate real parse errors with cause', async () => {
    // Create a JSON that passes initial checks but has invalid crossword structure
    const invalidCrossword = JSON.stringify({
      version: 'http://ipuz.org/v2',
      kind: ['http://ipuz.org/crossword#1'],
      dimensions: { width: -1, height: -1 },
      puzzle: [],
    });

    await expect(parseLazy(invalidCrossword)).rejects.toThrow(
      'Width and height must be positive numbers',
    );
  });

  it('should handle encoding option for text formats', async () => {
    const data = readFileSync(join('testdata', 'xd', 'bg2007-07-08.xd'));
    const puzzle = await parseLazy(data, { encoding: 'utf-8' });

    expect(puzzle.title).toBe('New Acronyms');
    expect(puzzle.author).toBe('Emily Cox & Henry Rathvon');
  });

  it('should handle JPZ with custom encoding', async () => {
    const data = readFileSync(join('testdata', 'jpz', 'FM.jpz'));
    const puzzle = await parseLazy(data, { encoding: 'utf-8' });

    expect(puzzle.title).toBe('FM (A Grid Charlemagne Puzzle)');
  });

  it('should handle iPUZ Buffer with custom encoding', async () => {
    const data = readFileSync(join('testdata', 'ipuz', 'example.ipuz'));
    const puzzle = await parseLazy(data, { encoding: 'utf-8' });

    expect(puzzle.title).toBe('High-Tech Mergers');
  });
});
