import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from './index';
import { parseIpuz } from './ipuz';
import { parsePuz } from './puz';
import { parseJpz } from './jpz';
import { parseXd } from './xd';

const testDataDir = join(__dirname, '..', 'testdata');

describe('Performance benchmarks', () => {
  function measureTime<T>(fn: () => T): { result: T; time: number } {
    const start = performance.now();
    const result = fn();
    const time = performance.now() - start;
    return { result, time };
  }

  describe('iPUZ parser performance', () => {
    it('should parse small iPUZ files quickly', () => {
      const file = join(testDataDir, 'ipuz', 'example.ipuz');
      const content = readFileSync(file, 'utf-8');
      
      const { result, time } = measureTime(() => parseIpuz(content));
      
      expect(result).toBeDefined();
      expect(time).toBeLessThan(50); // Should parse in under 50ms
      console.log(`Small iPUZ parsed in ${time.toFixed(2)}ms`);
    });

    it('should parse large iPUZ files efficiently', () => {
      const file = join(testDataDir, 'ipuz', 'marching-bands.ipuz');
      const content = readFileSync(file, 'utf-8');
      
      const { result, time } = measureTime(() => parseIpuz(content));
      
      expect(result).toBeDefined();
      expect(time).toBeLessThan(100); // Should parse in under 100ms
      console.log(`Large iPUZ parsed in ${time.toFixed(2)}ms`);
    });
  });

  describe('PUZ parser performance', () => {
    it('should parse PUZ files quickly', () => {
      const file = join(testDataDir, 'puz', 'av110622.puz');
      const buffer = readFileSync(file);
      
      const { result, time } = measureTime(() => parsePuz(buffer));
      
      expect(result).toBeDefined();
      expect(time).toBeLessThan(20); // Binary parsing should be very fast
      console.log(`PUZ parsed in ${time.toFixed(2)}ms`);
    });

    it('should handle multiple PUZ files efficiently', () => {
      const files = [
        'av110622.puz',
        'cs080904.puz',
        'nyt_diagramless.puz'
      ];
      
      const times: number[] = [];
      
      for (const filename of files) {
        const file = join(testDataDir, 'puz', filename);
        const buffer = readFileSync(file);
        
        const { result, time } = measureTime(() => parsePuz(buffer));
        
        expect(result).toBeDefined();
        times.push(time);
      }
      
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(30);
      console.log(`Average PUZ parse time: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('JPZ parser performance', () => {
    it('should parse JPZ XML files efficiently', () => {
      const file = join(testDataDir, 'jpz', 'FM.jpz');
      const content = readFileSync(file, 'utf-8');
      
      const { result, time } = measureTime(() => parseJpz(content));
      
      expect(result).toBeDefined();
      expect(time).toBeLessThan(100); // XML parsing may take longer
      console.log(`JPZ parsed in ${time.toFixed(2)}ms`);
    });
  });

  describe('XD parser performance', () => {
    it('should parse XD text files quickly', () => {
      const file = join(testDataDir, 'xd', 'usa2024-05-13.xd');
      const content = readFileSync(file, 'utf-8');
      
      const { result, time } = measureTime(() => parseXd(content));
      
      expect(result).toBeDefined();
      expect(time).toBeLessThan(20); // Text parsing should be fast
      console.log(`XD parsed in ${time.toFixed(2)}ms`);
    });
  });

  describe('Auto-detection performance', () => {
    it('should detect and parse formats quickly', () => {
      const testCases = [
        { file: join(testDataDir, 'ipuz', 'example.ipuz'), type: 'iPUZ' },
        { file: join(testDataDir, 'puz', 'av110622.puz'), type: 'PUZ' },
        { file: join(testDataDir, 'jpz', 'FM.jpz'), type: 'JPZ' },
        { file: join(testDataDir, 'xd', 'cs2007-05-11.xd'), type: 'XD' }
      ];
      
      for (const { file, type } of testCases) {
        const content = readFileSync(file);
        
        const { result, time } = measureTime(() => parse(content));
        
        expect(result).toBeDefined();
        expect(time).toBeLessThan(150); // Auto-detection + parsing
        console.log(`${type} auto-detected and parsed in ${time.toFixed(2)}ms`);
      }
    });

    it('should use filename hints efficiently', () => {
      const file = join(testDataDir, 'puz', 'av110622.puz');
      const buffer = readFileSync(file);
      
      // Without hint
      const { time: timeWithoutHint } = measureTime(() => parse(buffer));
      
      // With hint
      const { time: timeWithHint } = measureTime(() => 
        parse(buffer, { filename: 'test.puz' })
      );
      
      // Hint should make it faster or at least not slower
      expect(timeWithHint).toBeLessThanOrEqual(timeWithoutHint + 5);
      console.log(`Without hint: ${timeWithoutHint.toFixed(2)}ms, With hint: ${timeWithHint.toFixed(2)}ms`);
    });
  });

  describe('Memory efficiency', () => {
    it('should handle multiple large puzzles without excessive memory', () => {
      const files = [
        join(testDataDir, 'ipuz', 'marching-bands.ipuz'),
        join(testDataDir, 'jpz', 'FM.jpz')
      ];
      
      const puzzles = [];
      const startMem = process.memoryUsage().heapUsed;
      
      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const puzzle = parse(content);
        puzzles.push(puzzle);
      }
      
      const endMem = process.memoryUsage().heapUsed;
      const memUsed = (endMem - startMem) / 1024 / 1024; // Convert to MB
      
      expect(puzzles).toHaveLength(2);
      expect(memUsed).toBeLessThan(50); // Should use less than 50MB
      console.log(`Memory used for 2 large puzzles: ${memUsed.toFixed(2)}MB`);
    });
  });
});