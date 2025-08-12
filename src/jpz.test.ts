import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseJpz, convertJpzToUnified, type JpzPuzzle } from './jpz';

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

  describe('Edge Cases', () => {
    it('should handle 99x99 JPZ puzzle', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <metadata>
              <title>Large Puzzle</title>
              <creator>Test</creator>
            </metadata>
            <crossword>
              <grid width="99" height="99">
                ${Array(99)
                  .fill(null)
                  .map(() => `<row>${Array(99).fill('<cell></cell>').join('')}</row>`)
                  .join('')}
              </grid>
              <clues>
                <clue word="1" number="1">Test clue</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.width).toBe(99);
      expect(result.height).toBe(99);

      const unified = convertJpzToUnified(result);
      expect(unified.grid.cells.length).toBe(99);
      expect(unified.grid.cells[0]?.length).toBe(99);
    });

    it('should handle unicode in JPZ format', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <metadata>
              <title>Unicode Test 🎯</title>
              <creator>José García</creator>
              <copyright>© 2024</copyright>
              <description>Test with émojis</description>
            </metadata>
            <crossword>
              <grid width="3" height="3">
                <row><cell>♠</cell><cell>♥</cell><cell>♦</cell></row>
                <row><cell>α</cell><cell>β</cell><cell>γ</cell></row>
                <row><cell>你</cell><cell>好</cell><cell>世</cell></row>
              </grid>
              <clues>
                <clue word="1" number="1">Unicode clue 🎉</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.metadata?.title).toBe('Unicode Test 🎯');
      expect(result.metadata?.creator).toBe('José García');
      expect(result.metadata?.copyright).toBe('© 2024');

      const unified = convertJpzToUnified(result);
      expect(unified.title).toBe('Unicode Test 🎯');
      expect(unified.author).toBe('José García');
      expect(unified.copyright).toBe('© 2024');
    });

    it('should handle grid with all black squares', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <metadata>
              <title>All Black</title>
            </metadata>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" type="block"></cell>
                <cell x="2" y="1" type="block"></cell>
                <cell x="3" y="1" type="block"></cell>
                <cell x="1" y="2" type="block"></cell>
                <cell x="2" y="2" type="block"></cell>
                <cell x="3" y="2" type="block"></cell>
                <cell x="1" y="3" type="block"></cell>
                <cell x="2" y="3" type="block"></cell>
                <cell x="3" y="3" type="block"></cell>
              </grid>
              <clues></clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      const unified = convertJpzToUnified(result);

      expect(unified.grid.cells.every((row) => row.every((cell) => cell.isBlack))).toBe(true);
      expect(unified.clues.across).toEqual([]);
      expect(unified.clues.down).toEqual([]);
    });

    it('should handle puzzle with no clues', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <metadata>
              <title>No Clues</title>
            </metadata>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A"></cell>
                <cell x="2" y="1" solution="B"></cell>
                <cell x="3" y="1" solution="C"></cell>
                <cell x="1" y="2" solution="D"></cell>
                <cell x="2" y="2" type="block"></cell>
                <cell x="3" y="2" solution="E"></cell>
                <cell x="1" y="3" solution="F"></cell>
                <cell x="2" y="3" solution="G"></cell>
                <cell x="3" y="3" solution="H"></cell>
              </grid>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      const unified = convertJpzToUnified(result);

      expect(unified.clues.across).toEqual([]);
      expect(unified.clues.down).toEqual([]);
      expect(unified.grid.cells[0]?.[0]?.solution).toBe('A');
      expect(unified.grid.cells[0]?.[1]?.solution).toBe('B');
    });

    it('should throw error when grid element is missing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <metadata>
              <title>No Grid</title>
            </metadata>
            <crossword>
              <!-- Grid is missing -->
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('no grid found');
    });

    it('should throw error when grid dimensions are missing', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid>
                <!-- No width/height attributes -->
                <cell x="1" y="1" solution="A"></cell>
              </grid>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('Grid dimensions (width and height) are required');
    });

    it('should throw error for invalid grid dimensions', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="0" height="5">
                <cell x="1" y="1" solution="A"></cell>
              </grid>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('Invalid grid dimensions');
    });

    it('should throw error for excessively large grid', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="200" height="200">
                <cell x="1" y="1" solution="A"></cell>
              </grid>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('Invalid grid dimensions');
      expect(() => parseJpz(xml)).toThrow('Maximum supported size is 100x100');
    });

    it('should reject sudoku puzzles', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <sudoku>
              <grid width="9" height="9"></grid>
            </sudoku>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('Number puzzles');
    });

    it('should reject word search puzzles', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <word-search>
              <grid width="10" height="10"></grid>
            </word-search>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('Word search');
    });

    it('should handle nested puzzle structure', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <puzzle>
            <rectangular-puzzle>
              <crossword>
                <grid width="3" height="3">
                  <cell x="1" y="1" solution="A"></cell>
                  <cell x="2" y="1" solution="B"></cell>
                  <cell x="3" y="1" type="block"></cell>
                  <cell x="1" y="2" solution="C"></cell>
                  <cell x="2" y="2" solution="D"></cell>
                  <cell x="3" y="2" solution="E"></cell>
                  <cell x="1" y="3" type="block"></cell>
                  <cell x="2" y="3" solution="F"></cell>
                  <cell x="3" y="3" solution="G"></cell>
                </grid>
              </crossword>
            </rectangular-puzzle>
          </puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
      expect(result.grid[0]?.[0]?.solution).toBe('A');
    });

    it('should parse clues with nested title elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" number="1"></cell>
                <cell x="2" y="1" solution="B"></cell>
                <cell x="3" y="1" solution="C"></cell>
              </grid>
              <clues>
                <title><b>Across</b></title>
                <clue number="1">First clue</clue>
              </clues>
              <clues>
                <title>Down</title>
                <clue number="2">Second clue</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.across).toHaveLength(1);
      expect(result.across[0]?.text).toBe('First clue');
      expect(result.down).toHaveLength(1);
      expect(result.down[0]?.text).toBe('Second clue');
    });

    it('should parse clues with @_title attribute', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" number="1"></cell>
              </grid>
              <clues title="Across">
                <clue number="1">Test clue</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.across).toHaveLength(1);
      expect(result.across[0]?.text).toBe('Test clue');
    });

    it('should parse simple string clues with number prefix', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" number="1"></cell>
                <cell x="1" y="2" solution="B" number="2"></cell>
              </grid>
              <clues title="Across">
                <clue>1. First letter of alphabet</clue>
                <clue>2. Second letter</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.across).toHaveLength(2);
      expect(result.across[0]?.number).toBe('1');
      expect(result.across[0]?.text).toBe('First letter of alphabet');
      expect(result.across[1]?.number).toBe('2');
      expect(result.across[1]?.text).toBe('Second letter');
    });

    it('should parse words element', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" number="1"></cell>
                <cell x="2" y="1" solution="B"></cell>
                <cell x="3" y="1" solution="C"></cell>
              </grid>
              <words>
                <word id="1-across">
                  <cells>
                    <cell x="1" y="1"></cell>
                    <cell x="2" y="1"></cell>
                    <cell x="3" y="1"></cell>
                  </cells>
                </word>
                <word id="1-down">
                  <cells>
                    <cell x="1" y="1"></cell>
                    <cell x="1" y="2"></cell>
                  </cells>
                </word>
              </words>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.words).toBeDefined();
      expect(result.words).toHaveLength(2);
      expect(result.words?.[0]?.id).toBe('1-across');
      expect(result.words?.[0]?.cells).toHaveLength(3);
      expect(result.words?.[0]?.cells[0]).toEqual({ x: 1, y: 1 });
      expect(result.words?.[1]?.id).toBe('1-down');
      expect(result.words?.[1]?.cells).toHaveLength(2);

      // Test that words are included in unified conversion
      const unified = convertJpzToUnified(result);
      expect(unified.additionalProperties?.words).toBeDefined();
      expect(unified.additionalProperties?.words).toEqual(result.words);
    });

    it('should handle cells with bar properties', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" top-bar="true" left-bar="true"></cell>
                <cell x="2" y="1" solution="B" bottom-bar="true"></cell>
                <cell x="3" y="1" solution="C" right-bar="true"></cell>
                <cell x="1" y="2" solution="D" background-color="#FF0000"></cell>
              </grid>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      expect(result.grid[0]?.[0]?.barTop).toBe(true);
      expect(result.grid[0]?.[0]?.barLeft).toBe(true);
      expect(result.grid[0]?.[1]?.barBottom).toBe(true);
      expect(result.grid[0]?.[2]?.barRight).toBe(true);
      expect(result.grid[1]?.[0]?.backgroundColor).toBe('#FF0000');

      // Test conversion includes bar properties
      const unified = convertJpzToUnified(result);
      expect(unified.grid.cells[0]?.[0]?.additionalProperties?.barTop).toBe(true);
      expect(unified.grid.cells[0]?.[0]?.additionalProperties?.barLeft).toBe(true);
      expect(unified.grid.cells[0]?.[1]?.additionalProperties?.barBottom).toBe(true);
      expect(unified.grid.cells[0]?.[2]?.additionalProperties?.barRight).toBe(true);
      expect(unified.grid.cells[1]?.[0]?.additionalProperties?.backgroundColor).toBe('#FF0000');
    });

    it('should throw error when no recognized root element', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <unknown-root>
          <some-content />
        </unknown-root>`;

      expect(() => parseJpz(xml)).toThrow('no recognized root element');
    });

    it('should throw error when grid is invalid (not an object)', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid>invalid grid content</grid>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      expect(() => parseJpz(xml)).toThrow('Missing or invalid grid element');
    });

    it('should handle clues with nested title containing text node', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" number="1"></cell>
              </grid>
              <clues>
                <title>Some text content</title>
                <clue number="1">Test clue</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      // Should parse successfully even with non-standard title format
      expect(result.down).toHaveLength(1);
      expect(result.down[0]?.text).toBe('Test clue');
    });

    it('should handle parseWords with no word nodes', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A"></cell>
              </grid>
              <words>
                <!-- No word elements -->
              </words>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      // When words element is empty, it parses as empty string which is falsy
      // So the ternary in parseJpz returns undefined
      expect(result.words).toBeUndefined();
    });

    it('should handle clues in down format with number conversion', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword-compiler-applet>
          <rectangular-puzzle>
            <crossword>
              <grid width="3" height="3">
                <cell x="1" y="1" solution="A" number="1"></cell>
              </grid>
              <clues title="Down">
                <clue number="1">Down clue</clue>
                <clue number="invalid">Invalid number clue</clue>
              </clues>
            </crossword>
          </rectangular-puzzle>
        </crossword-compiler-applet>`;

      const result = parseJpz(xml);
      const unified = convertJpzToUnified(result);
      
      expect(result.down).toHaveLength(2);
      expect(unified.clues.down[0]?.number).toBe(1);
      // Invalid number should convert to NaN
      expect(unified.clues.down[1]?.number).toBeNaN();
    });

    it('should handle alternate puzzle root elements', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <crossword>
          <rectangular-puzzle>
            <grid width="3" height="3">
              <cell x="1" y="1" solution="A"></cell>
              <cell x="2" y="1" solution="B"></cell>
            </grid>
          </rectangular-puzzle>
        </crossword>`;

      const result = parseJpz(xml);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
    });

    it('should handle fallback when rectangularPuzzle is not found', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <puzzle>
          <grid width="3" height="3">
            <cell x="1" y="1" solution="A"></cell>
          </grid>
        </puzzle>`;

      const result = parseJpz(xml);
      expect(result.width).toBe(3);
      expect(result.height).toBe(3);
    });
  });
});
