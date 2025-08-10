import { describe, expect, it } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { parse } from './index';
import { parseIpuz, convertIpuzToUnified } from './ipuz';
import { parseXd, convertXdToUnified } from './xd';
import { 
  XwordParseError, 
  FormatDetectionError, 
  PuzParseError,
  IpuzParseError,
  JpzParseError,
  XdParseError
} from './errors';

describe('Property-based tests', () => {
  describe('iPUZ parser properties', () => {
    test.prop([
      fc.record({
        version: fc.constant('http://ipuz.org/v2'),
        kind: fc.constant(['http://ipuz.org/crossword#1']),
        dimensions: fc.record({
          width: fc.integer({ min: 1, max: 10 }),
          height: fc.integer({ min: 1, max: 10 })
        }),
        title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        author: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        copyright: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        notes: fc.option(fc.string({ minLength: 1, maxLength: 500 }))
      })
    ])('should parse and convert valid iPUZ puzzles', (puzzleData) => {
      const { dimensions } = puzzleData;
      const width = dimensions.width;
      const height = dimensions.height;
      
      // Generate a valid puzzle grid
      const puzzle: unknown[][] = [];
      for (let y = 0; y < height; y++) {
        const row: unknown[] = [];
        for (let x = 0; x < width; x++) {
          // Randomly make some cells black
          if (Math.random() > 0.8) {
            row.push('#');
          } else {
            row.push(0); // Empty cell
          }
        }
        puzzle.push(row);
      }
      
      const ipuz = {
        ...puzzleData,
        puzzle,
        solution: puzzle, // Use same for solution
        clues: {
          Across: [],
          Down: []
        }
      };
      
      const jsonString = JSON.stringify(ipuz);
      
      // Should parse without throwing
      const parsed = parseIpuz(jsonString);
      expect(parsed).toBeDefined();
      expect(parsed.version).toBe('http://ipuz.org/v2');
      
      // Should convert to unified format
      const unified = convertIpuzToUnified(parsed);
      expect(unified).toBeDefined();
      expect(unified.grid.cells).toHaveLength(height);
      expect(unified.grid.cells[0]).toHaveLength(width);
    });

    test.prop([
      fc.string({ minLength: 1 }).filter(s => !s.includes('{') && !s.includes('['))
    ])('should reject non-JSON strings', (invalidJson) => {
      expect(() => parseIpuz(invalidJson)).toThrow();
    });

    test.prop([
      fc.jsonValue().filter(v => 
        typeof v !== 'object' || 
        v === null || 
        !('version' in v) || 
        !('kind' in v)
      )
    ])('should reject JSON without required iPUZ fields', (jsonValue) => {
      const jsonString = JSON.stringify(jsonValue);
      expect(() => parseIpuz(jsonString)).toThrow();
    });
  });

  describe('XD parser properties', () => {
    test.prop([
      fc.record({
        title: fc.string({ minLength: 1, maxLength: 100 }).map(s => s.replace(/[\n:]/g, '')),
        author: fc.string({ minLength: 1, maxLength: 100 }).map(s => s.replace(/[\n:]/g, '')),
        width: fc.integer({ min: 3, max: 15 }),
        height: fc.integer({ min: 3, max: 15 })
      })
    ])('should parse valid XD puzzles', ({ title, author, width, height }) => {
      // Generate a valid grid
      const grid: string[] = [];
      for (let y = 0; y < height; y++) {
        let row = '';
        for (let x = 0; x < width; x++) {
          // Random letter or black square
          row += Math.random() > 0.2 ? 'A' : '#';
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
        'A1. Test clue ~ TEST'
      ].join('\n');
      
      const parsed = parseXd(xdContent);
      expect(parsed).toBeDefined();
      expect(parsed.metadata.title).toBe(title);
      expect(parsed.metadata.author).toBe(author);
      expect(parsed.grid).toHaveLength(height);
      expect(parsed.grid[0]).toHaveLength(width);
      
      // Should convert to unified
      const unified = convertXdToUnified(parsed);
      expect(unified.title).toBe(title);
      expect(unified.author).toBe(author);
    });

    test.prop([
      fc.array(
        fc.string({ minLength: 1, maxLength: 20 }),
        { minLength: 3, maxLength: 10 }
      ).filter(lines => !lines.some(l => l.includes('Size:')))
    ])('should reject XD without size header', (lines) => {
      const content = lines.join('\n');
      expect(() => parseXd(content)).toThrow();
    });
  });

  describe('Grid consistency properties', () => {
    test.prop([
      fc.integer({ min: 1, max: 25 }),
      fc.integer({ min: 1, max: 25 })
    ])('unified grid dimensions should match original', (width, height) => {
      // Create a simple iPUZ puzzle
      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width, height },
        puzzle: Array.from({ length: height }, () => Array.from({ length: width }, () => 0)),
        clues: { Across: [], Down: [] }
      };
      
      const parsed = parseIpuz(JSON.stringify(ipuz));
      const unified = convertIpuzToUnified(parsed);
      
      expect(unified.grid.cells).toHaveLength(height);
      for (let i = 0; i < unified.grid.cells.length; i++) {
        expect(unified.grid.cells[i]).toHaveLength(width);
      }
    });

    test.prop([
      fc.array(
        fc.array(
          fc.oneof(
            fc.constant('#'),
            fc.constantFrom('A', 'B', 'C', 'D', 'E')
          ),
          { minLength: 3, maxLength: 10 }
        ),
        { minLength: 3, maxLength: 10 }
      )
    ])('black squares should be preserved in conversion', (gridData) => {
      const height = gridData.length;
      const width = gridData[0]?.length || 0;
      
      // Normalize grid to same width
      const normalizedGrid = gridData.map(row => {
        while (row.length < width) row.push('#');
        return row.slice(0, width);
      });
      
      const ipuz = {
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width, height },
        puzzle: normalizedGrid,
        clues: { Across: [], Down: [] }
      };
      
      const parsed = parseIpuz(JSON.stringify(ipuz));
      const unified = convertIpuzToUnified(parsed);
      
      // Check that black squares are in the same positions
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const original = normalizedGrid[y]?.[x];
          const converted = unified.grid.cells[y]?.[x];
          
          if (original === '#') {
            expect(converted?.isBlack).toBe(true);
          } else {
            expect(converted?.isBlack).not.toBe(true);
          }
        }
      }
    });
  });

  describe('Parse function detection properties', () => {
    test.prop([
      fc.string({ minLength: 10, maxLength: 1000 })
        .filter(s => s.includes('{') && s.includes('"version"'))
    ])('should attempt iPUZ parsing for JSON-like content', (content) => {
      // May succeed or fail, but should attempt iPUZ
      try {
        parse(content);
      } catch (e) {
        // If it fails, it should be because of invalid iPUZ structure
        const error = e as Error;
        expect(error.message).toMatch(/version|kind|JSON|puzzle|format/i);
      }
    });

    test.prop([
      fc.string({ minLength: 10, maxLength: 1000 })
        .filter(s => s.includes('<?xml') || s.includes('<crossword'))
    ])('should attempt JPZ parsing for XML-like content', (content) => {
      // May succeed or fail, but should attempt JPZ
      try {
        parse(content);
      } catch (e) {
        // If it fails, it should be because of invalid XML/JPZ structure
        const error = e as Error;
        expect(error.message).toMatch(/XML|JPZ|crossword|format/i);
      }
    });
  });

  describe('Error handling', () => {
    // These are unit tests since they use constant values
    it('should handle null input gracefully', () => {
      expect(() => parse(null as unknown as string)).toThrow(XwordParseError);
    });

    it('should handle undefined input gracefully', () => {
      expect(() => parse(undefined as unknown as string)).toThrow(XwordParseError);
    });

    it('should handle empty string gracefully', () => {
      expect(() => parse('')).toThrow(FormatDetectionError);
    });

    it('should handle whitespace-only string gracefully', () => {
      expect(() => parse(' \n\t ')).toThrow(FormatDetectionError);
    });

    // This is a property test since it uses random data
    test.prop([
      fc.uint8Array({ minLength: 10, maxLength: 100 })
    ])('should throw proper parsing errors for random binary data', (bytes) => {
      const buffer = Buffer.from(bytes);
      
      // Should throw a proper parsing error, not a runtime error
      let error: Error | null = null;
      try {
        parse(buffer);
      } catch (e) {
        error = e as Error;
      }
      
      // Must have thrown an error (random bytes are unlikely to be valid)
      expect(error).not.toBeNull();
      
      // Must be a proper parsing error, not a runtime error
      if (error) {
        // Check it's one of our expected error types
        const isExpectedError = 
          error instanceof XwordParseError ||
          error instanceof FormatDetectionError ||
          error instanceof PuzParseError ||
          error instanceof IpuzParseError ||
          error instanceof JpzParseError ||
          error instanceof XdParseError;
        
        expect(isExpectedError).toBe(true);
        
        // Should have a meaningful message, not a runtime error message
        expect(error.message).not.toMatch(/undefined|null|cannot read|index|property|TypeError|ReferenceError/i);
      }
    });
    
    // Test that parsers handle truncated/malformed data without runtime errors
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 })
    ])('should handle malformed JSON-like strings without runtime errors', (str) => {
      // Add partial JSON structure to trigger iPUZ parser
      const malformed = '{' + str;
      
      try {
        parse(malformed);
      } catch (e) {
        const error = e as Error;
        // Should be a parsing error, not a runtime error
        expect(error).toBeInstanceOf(Error);
        expect(error.message).not.toMatch(/undefined|null|cannot read|property|TypeError|ReferenceError/i);
      }
    });
    
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 })
    ])('should handle malformed XML-like strings without runtime errors', (str) => {
      // Add partial XML structure to trigger JPZ parser
      const malformed = '<?xml version="1.0"?><crossword>' + str;
      
      try {
        parse(malformed);
      } catch (e) {
        const error = e as Error;
        // Should be a parsing error, not a runtime error
        expect(error).toBeInstanceOf(Error);
        expect(error.message).not.toMatch(/undefined|null|cannot read|property|TypeError|ReferenceError/i);
      }
    });
  });
});