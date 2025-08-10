import { describe, it, expect } from 'vitest';
import { parseIpuz, CellType, type IpuzPuzzle } from './ipuz';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('ipuz parser', () => {
  const testDataDir = join(__dirname, '..', 'testdata', 'ipuz');
  const testFiles = readdirSync(testDataDir)
    .filter(f => f.endsWith('.ipuz'))
    .sort();

  // Helper function for common assertions
  function assertBasicStructure(puzzle: IpuzPuzzle, filename: string) {
    // All puzzles should have these basic properties
    expect(puzzle.version, `${filename}: missing version`).toBeDefined();
    expect(puzzle.kind, `${filename}: missing kind`).toBeDefined();
    expect(Array.isArray(puzzle.kind), `${filename}: kind should be array`).toBe(true);
    expect(puzzle.kind.some(k => k.includes('crossword')), `${filename}: should be crossword`).toBe(true);
    
    // Dimensions
    expect(puzzle.dimensions, `${filename}: missing dimensions`).toBeDefined();
    expect(puzzle.dimensions.width, `${filename}: missing width`).toBeGreaterThan(0);
    expect(puzzle.dimensions.height, `${filename}: missing height`).toBeGreaterThan(0);
    
    // Puzzle grid
    expect(puzzle.puzzle, `${filename}: missing puzzle grid`).toBeDefined();
    expect(Array.isArray(puzzle.puzzle), `${filename}: puzzle should be array`).toBe(true);
    expect(puzzle.puzzle.length, `${filename}: puzzle height mismatch`).toBe(puzzle.dimensions.height);
    
    // Check each row
    puzzle.puzzle.forEach((row, i) => {
      expect(row.length, `${filename}: row ${i} width mismatch`).toBe(puzzle.dimensions.width);
    });
    
    // Clues
    expect(puzzle.clues, `${filename}: missing clues`).toBeDefined();
    expect(typeof puzzle.clues, `${filename}: clues should be object`).toBe('object');
  }

  function assertCellTypes(puzzle: IpuzPuzzle, filename: string) {
    let normalCount = 0;
    let blockCount = 0;
    let nullCount = 0;
    
    puzzle.puzzle.forEach((row, y) => {
      row.forEach((cell, x) => {
        expect(cell, `${filename}: cell at [${y}][${x}] is undefined`).toBeDefined();
        expect(cell.type, `${filename}: cell at [${y}][${x}] missing type`).toBeDefined();
        expect(Object.values(CellType), `${filename}: invalid cell type at [${y}][${x}]`).toContain(cell.type);
        
        if (cell.type === CellType.NORMAL) normalCount++;
        else if (cell.type === CellType.BLOCK) blockCount++;
        else if (cell.type === CellType.NULL) nullCount++;
      });
    });
    
    return { normalCount, blockCount, nullCount };
  }

  function assertClueStructure(puzzle: IpuzPuzzle, filename: string) {
    Object.entries(puzzle.clues).forEach(([direction, clues]) => {
      expect(Array.isArray(clues), `${filename}: clues for ${direction} should be array`).toBe(true);
      
      clues.forEach((clue, i) => {
        expect(clue.number, `${filename}: ${direction}[${i}] missing number`).toBeDefined();
        expect(clue.text, `${filename}: ${direction}[${i}] missing text`).toBeDefined();
        expect(typeof clue.text, `${filename}: ${direction}[${i}] text should be string`).toBe('string');
      });
    });
  }

  // Test file-specific characteristics
  const fileSpecificTests: Record<string, (puzzle: IpuzPuzzle) => void> = {
    'example.ipuz': (puzzle) => {
      expect(puzzle.title).toBe('High-Tech Mergers');
      expect(puzzle.author).toBe('Roy Leban');
      expect(puzzle.dimensions.width).toBe(15);
      expect(puzzle.dimensions.height).toBe(15);
      expect(puzzle.clues.Across).toHaveLength(37);
      expect(puzzle.clues.Down).toHaveLength(41);
      expect(puzzle.solution).toBeDefined();
      expect(puzzle.intro).toContain('anagram the circled letters');
      
      // Check for circled cells
      const circledCells: Array<[number, number]> = [
        [2, 4], [2, 7], [3, 11], [7, 3], [7, 11], [12, 3], [12, 8], [12, 11]
      ];
      circledCells.forEach(([row, col]) => {
        const cell = puzzle.puzzle[row]?.[col];
        expect(cell?.style?.shapebg).toBe('circle');
      });
    },
    
    'example_v2.ipuz': (puzzle) => {
      // Should be same as example but with v2 features
      expect(puzzle.title).toBe('High-Tech Mergers');
      expect(puzzle.charset).toBe('abcdefghijklmnopqrstuvwxyz1234567890');
    },
    
    'test.ipuz': (puzzle) => {
      expect(puzzle.title).toBe('Example Puzzle for Kotwords');
      expect(puzzle.author).toBe('Jeff Davidson');
      expect(puzzle.dimensions.width).toBe(5);
      expect(puzzle.dimensions.height).toBe(5);
      expect(puzzle.notes).toBe('Notepad text goes here.');
      
      // Check specific cells
      expect(puzzle.puzzle[0]?.[0]?.number).toBe('1');
      expect(puzzle.puzzle[2]?.[0]?.style?.shapebg).toBe('circle');
      expect(puzzle.puzzle[2]?.[4]?.style?.shapebg).toBe('circle');
      
      // Check solution
      expect(puzzle.solution?.[2]?.[2]).toBe('XYZ');
      expect(puzzle.solution?.[4]?.[3]).toBe('$');
      expect(puzzle.solution?.[4]?.[4]).toBe('@');
    },
    
    'test-bgimage.ipuz': (puzzle) => {
      expect(puzzle.author).toBe('Jeff Davidson / Jeff Editor');
      
      // Check for background images
      const cellWithBg1 = puzzle.puzzle[1]?.[3];
      expect(cellWithBg1?.style?.imagebg).toContain('data:image/png;base64');
      
      const cellWithBg2 = puzzle.puzzle[3]?.[0];
      expect(cellWithBg2?.style?.imagebg).toContain('data:image/png;base64');
    },
    
    'test-diagramless.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(5);
      expect(puzzle.dimensions.height).toBe(5);
      // Diagramless puzzles typically don't show block positions initially
    },
    
    'test-no-solution.ipuz': (puzzle) => {
      expect(puzzle.solution).toBeUndefined();
    },
    
    'test-solved.ipuz': (puzzle) => {
      expect(puzzle.saved).toBeDefined();
      expect(Array.isArray(puzzle.saved)).toBe(true);
    },
    
    'annotations.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(5);
      expect(puzzle.dimensions.height).toBe(5);
      
      // Check for barred cells
      const barredCell = puzzle.puzzle[0]?.[2];
      expect(barredCell?.style?.barred).toBe('L');
      expect(barredCell?.style?.color).toBe('C0C0C0');
      
      // Special clue sections
      expect(puzzle.clues['Track 1']).toHaveLength(4);
      expect(puzzle.clues['Other tracks']).toHaveLength(1);
    },
    
    'coded.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(7);
      expect(puzzle.dimensions.height).toBe(7);
      expect(puzzle.explanation).toBe('Congratulations! The puzzle is solved correctly.');
      
      // Coded puzzles use numbers as cell labels
      const firstCell = puzzle.puzzle[0]?.[0];
      expect(firstCell?.number).toBe('2');
      // Solution has the actual letters
      expect(puzzle.solution?.[0]?.[0]).toBe('A');
    },
    
    'first.ipuz': (puzzle) => {
      expect(puzzle.title).toBe("FUN's Word-Cross Puzzle");
      expect(puzzle.author).toBe('Arthur Wynne');
      expect(puzzle.dimensions.width).toBe(13);
      expect(puzzle.dimensions.height).toBe(13);
      
      // Historical first crossword - no black squares
      const { blockCount } = assertCellTypes(puzzle, 'first.ipuz');
      expect(blockCount).toBe(0);
    },
    
    'rows-garden.ipuz': (puzzle) => {
      expect(puzzle.title).toBe('Test Title');
      expect(puzzle.dimensions.width).toBe(21);
      expect(puzzle.dimensions.height).toBe(12);
      
      // Variety puzzle with special clue sections
      expect(puzzle.clues.Rows).toHaveLength(12);
      expect(puzzle.clues.Blooms).toHaveLength(38);
    },
    
    'spiral.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(3);
      expect(puzzle.dimensions.height).toBe(3);
      
      // Spiral puzzles have special clue directions
      expect(puzzle.clues.Inward).toHaveLength(2);
      expect(puzzle.clues.Outward).toHaveLength(3);
    },
    
    'hearts-and-arrows.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(13);
      expect(puzzle.dimensions.height).toBe(5);
      
      // Custom clue sections
      expect(puzzle.clues.Arrows).toHaveLength(5);
      expect(puzzle.clues.Hearts).toHaveLength(5);
    },
    
    'around-the-bend.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(4);
      expect(puzzle.dimensions.height).toBe(4);
      expect(puzzle.clues.Clues).toHaveLength(4);
    },
    
    'gaps.ipuz': (puzzle) => {
      expect(puzzle.title).toBe('Test');
      expect(puzzle.dimensions.width).toBe(7);
      expect(puzzle.dimensions.height).toBe(5);
      expect(puzzle.clues.Across).toHaveLength(6);
      expect(puzzle.clues.Down).toHaveLength(5);
    },
    
    'jelly-roll.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(3);
      expect(puzzle.dimensions.height).toBe(3);
      expect(puzzle.clues['Jelly Rolls']).toHaveLength(2);
      expect(puzzle.clues['Colored Paths']).toHaveLength(4);
    },
    
    'labyrinth.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(4);
      expect(puzzle.dimensions.height).toBe(3);
      expect(puzzle.clues.Rows).toHaveLength(3);
      expect(puzzle.clues.Winding).toHaveLength(1);
    },
    
    'marching-bands.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(5);
      expect(puzzle.dimensions.height).toBe(5);
      expect(puzzle.clues.Bands).toHaveLength(2);
      expect(puzzle.clues.Rows).toHaveLength(5);
    },
    
    'patchwork.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(5);
      expect(puzzle.dimensions.height).toBe(5);
      expect(puzzle.clues.Rows).toHaveLength(5);
      expect(puzzle.clues.Pieces).toHaveLength(5);
    },
    
    'patchwork-unlabeled-pieces.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(5);
      expect(puzzle.dimensions.height).toBe(5);
      expect(puzzle.clues.Rows).toHaveLength(5);
      expect(puzzle.clues.Pieces).toHaveLength(0);
    },
    
    'snake-charmer.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(3);
      expect(puzzle.dimensions.height).toBe(3);
      expect(puzzle.clues.Clues).toHaveLength(4);
    },
    
    'spell-weaving.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(4);
      expect(puzzle.dimensions.height).toBe(4);
      expect(puzzle.clues.Clues).toHaveLength(3);
    },
    
    'twists-and-turns.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(6);
      expect(puzzle.dimensions.height).toBe(6);
      expect(puzzle.clues.Turns).toHaveLength(7);
      expect(puzzle.clues.Twists).toHaveLength(4);
    },
    
    'two-tone.ipuz': (puzzle) => {
      expect(puzzle.dimensions.width).toBe(3);
      expect(puzzle.dimensions.height).toBe(3);
      expect(puzzle.clues['All Squares']).toHaveLength(2);
      expect(puzzle.clues['Every Other']).toHaveLength(4);
    }
  };

  describe('individual file tests', () => {
    testFiles.forEach(filename => {
      it(`should parse ${filename} correctly`, () => {
        const content = readFileSync(join(testDataDir, filename), 'utf-8');
        const puzzle = parseIpuz(content);
        
        // Run basic structure tests for all files
        assertBasicStructure(puzzle, filename);
        assertCellTypes(puzzle, filename);
        assertClueStructure(puzzle, filename);
        
        // Run file-specific tests if defined
        const specificTest = fileSpecificTests[filename];
        if (specificTest) {
          specificTest(puzzle);
        }
      });
    });
  });

  describe('parsing features', () => {
    it('should handle JSONP wrapper format', () => {
      const content = readFileSync(join(testDataDir, 'example.ipuz'), 'utf-8');
      expect(content.startsWith('ipuz(')).toBe(true);
      expect(content.endsWith(')')).toBe(true);
      
      const puzzle = parseIpuz(content);
      expect(puzzle.title).toBe('High-Tech Mergers');
    });

    it('should handle plain JSON format', () => {
      const content = readFileSync(join(testDataDir, 'test.ipuz'), 'utf-8');
      expect(content.startsWith('{')).toBe(true);
      
      const puzzle = parseIpuz(content);
      expect(puzzle.title).toBe('Example Puzzle for Kotwords');
    });

    it('should parse all cell style properties', () => {
      const content = readFileSync(join(testDataDir, 'annotations.ipuz'), 'utf-8');
      const puzzle = parseIpuz(content);
      
      // Find cells with styles
      let foundBarred = false;
      let foundColor = false;
      
      puzzle.puzzle.forEach(row => {
        row.forEach(cell => {
          if (cell.style?.barred) foundBarred = true;
          if (cell.style?.color) foundColor = true;
        });
      });
      
      expect(foundBarred).toBe(true);
      expect(foundColor).toBe(true);
    });

    it('should parse clues with cell references', () => {
      const content = readFileSync(join(testDataDir, 'test.ipuz'), 'utf-8');
      const puzzle = parseIpuz(content);
      
      const firstAcross = puzzle.clues.Across?.[0];
      expect(firstAcross?.cells).toBeDefined();
      expect(firstAcross?.cells).toEqual([[1, 1], [2, 1], [3, 1], [4, 1]]);
    });

    it('should handle variety puzzle clue sections', () => {
      const varietyPuzzles = [
        'rows-garden.ipuz',
        'spiral.ipuz',
        'hearts-and-arrows.ipuz',
        'jelly-roll.ipuz'
      ];
      
      varietyPuzzles.forEach(filename => {
        const content = readFileSync(join(testDataDir, filename), 'utf-8');
        const puzzle = parseIpuz(content);
        
        // Should have non-standard clue sections
        const sections = Object.keys(puzzle.clues);
        const hasNonStandard = sections.some(s => s !== 'Across' && s !== 'Down');
        expect(hasNonStandard, `${filename} should have variety clue sections`).toBe(true);
      });
    });

    it('should handle extensions', () => {
      // Create a test with extensions
      const puzzleWithExtension = JSON.stringify({
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/crossword#1'],
        dimensions: { width: 3, height: 3 },
        puzzle: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        'http://example.com/extension': { custom: 'data' },
        'https://test.org/feature': 'value'
      });
      
      const puzzle = parseIpuz(puzzleWithExtension);
      expect(puzzle.extensions['http://example.com/extension']).toEqual({ custom: 'data' });
      expect(puzzle.extensions['https://test.org/feature']).toBe('value');
    });
  });

  describe('error handling', () => {
    it('should reject non-crossword puzzles', () => {
      const nonCrossword = JSON.stringify({
        version: 'http://ipuz.org/v2',
        kind: ['http://ipuz.org/sudoku#1'],
        puzzle: []
      });
      
      expect(() => parseIpuz(nonCrossword)).toThrow('Non-crossword puzzles are not supported');
    });

    it('should handle malformed JSON', () => {
      expect(() => parseIpuz('{')).toThrow();
      expect(() => parseIpuz('not json')).toThrow();
    });

    it('should handle missing required fields gracefully', () => {
      const minimal = JSON.stringify({
        kind: ['http://ipuz.org/crossword#1']
      });
      
      const puzzle = parseIpuz(minimal);
      expect(puzzle.version).toBe('');
      expect(puzzle.dimensions.width).toBe(0);
      expect(puzzle.dimensions.height).toBe(0);
      expect(puzzle.puzzle).toEqual([]);
    });
  });

  describe('data integrity', () => {
    testFiles.forEach(filename => {
      it(`${filename} should have consistent grid dimensions`, () => {
        const content = readFileSync(join(testDataDir, filename), 'utf-8');
        const puzzle = parseIpuz(content);
        
        expect(puzzle.puzzle.length).toBe(puzzle.dimensions.height);
        puzzle.puzzle.forEach((row, i) => {
          expect(row.length, `Row ${i} has wrong length`).toBe(puzzle.dimensions.width);
        });
      });

      it(`${filename} should have valid cell types`, () => {
        const content = readFileSync(join(testDataDir, filename), 'utf-8');
        const puzzle = parseIpuz(content);
        
        puzzle.puzzle.forEach((row, y) => {
          row.forEach((cell, x) => {
            expect(Object.values(CellType), `Invalid cell type at [${y}][${x}]`).toContain(cell.type);
          });
        });
      });
    });
  });
});