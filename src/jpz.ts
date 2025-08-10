/**
 * Parser for JPZ crossword format (Crossword Compiler)
 * JPZ is an XML-based format
 */

import { XMLParser } from 'fast-xml-parser';

export interface JpzMetadata {
  title?: string;
  creator?: string;
  copyright?: string;
  description?: string;
  publisher?: string;
  identifier?: string;
}

export interface JpzCell {
  x: number;
  y: number;
  solution?: string;
  number?: number;
  type?: 'block' | 'cell';
  isCircled?: boolean;
  backgroundColor?: string;
  barTop?: boolean;
  barBottom?: boolean;
  barLeft?: boolean;
  barRight?: boolean;
}

export interface JpzClue {
  number: string | number;
  text: string;
  format?: string;
}

export interface JpzWord {
  id: string;
  cells: Array<{ x: number; y: number }>;
}

export interface JpzPuzzle {
  width: number;
  height: number;
  metadata: JpzMetadata;
  grid: JpzCell[][];
  across: JpzClue[];
  down: JpzClue[];
  words?: JpzWord[];
}

function parseMetadata(metadataNode: any): JpzMetadata {
  if (!metadataNode) return {};
  
  return {
    title: metadataNode.title || undefined,
    creator: metadataNode.creator || metadataNode.author || undefined,
    copyright: metadataNode.copyright || undefined,
    description: metadataNode.description || undefined,
    publisher: metadataNode.publisher || undefined,
    identifier: metadataNode.identifier || undefined
  };
}

function parseCells(gridNode: any): { cells: Map<string, JpzCell>, width: number, height: number } {
  const cells = new Map<string, JpzCell>();
  const width = parseInt(gridNode['@_width']) || 15;
  const height = parseInt(gridNode['@_height']) || 15;
  
  // Handle cells - can be a single cell or array
  const cellNodes = gridNode.cell;
  if (cellNodes) {
    const cellArray = Array.isArray(cellNodes) ? cellNodes : [cellNodes];
    
    for (const cell of cellArray) {
      const x = parseInt(cell['@_x']);
      const y = parseInt(cell['@_y']);
      const key = `${x},${y}`;
      
      const jpzCell: JpzCell = {
        x,
        y,
        type: cell['@_type'] === 'block' ? 'block' : 'cell',
        solution: cell['@_solution'] || cell['@_letter'] || undefined,
        number: cell['@_number'] ? parseInt(cell['@_number']) : undefined,
        isCircled: cell['@_background-shape'] === 'circle',
        backgroundColor: cell['@_background-color'] || undefined,
        barTop: cell['@_top-bar'] === 'true',
        barBottom: cell['@_bottom-bar'] === 'true', 
        barLeft: cell['@_left-bar'] === 'true',
        barRight: cell['@_right-bar'] === 'true'
      };
      
      cells.set(key, jpzCell);
    }
  }
  
  return { cells, width, height };
}

function buildGrid(cells: Map<string, JpzCell>, width: number, height: number): JpzCell[][] {
  const grid: JpzCell[][] = [];
  
  // JPZ uses 1-based indexing
  for (let y = 1; y <= height; y++) {
    const row: JpzCell[] = [];
    for (let x = 1; x <= width; x++) {
      const key = `${x},${y}`;
      const cell = cells.get(key);
      
      if (cell) {
        row.push(cell);
      } else {
        // Default empty cell
        row.push({
          x,
          y,
          type: 'cell'
        });
      }
    }
    grid.push(row);
  }
  
  return grid;
}

function parseClues(cluesNode: any): { across: JpzClue[], down: JpzClue[] } {
  const across: JpzClue[] = [];
  const down: JpzClue[] = [];
  
  if (!cluesNode) {
    return { across, down };
  }
  
  // Handle different clue structures
  const clueArrays = Array.isArray(cluesNode) ? cluesNode : [cluesNode];
  
  for (const clueSet of clueArrays) {
    // Get title/direction - might be nested object with text content
    let titleStr = '';
    if (typeof clueSet.title === 'string') {
      titleStr = clueSet.title;
    } else if (typeof clueSet.title === 'object' && clueSet.title) {
      // Handle nested elements like <title><b>Across</b></title>
      titleStr = clueSet.title.b || clueSet.title['#text'] || JSON.stringify(clueSet.title);
    } else if (clueSet['@_title']) {
      titleStr = clueSet['@_title'];
    }
    
    const isAcross = titleStr.toLowerCase().includes('across');
    const targetArray = isAcross ? across : down;
    
    // Get clues
    const clueNodes = clueSet.clue;
    if (clueNodes) {
      const clues = Array.isArray(clueNodes) ? clueNodes : [clueNodes];
      
      for (const clue of clues) {
        if (typeof clue === 'string') {
          // Simple string clue with number prefix
          const match = clue.match(/^(\d+)\.\s*(.+)$/);
          if (match) {
            targetArray.push({
              number: match[1] || '',
              text: match[2] || ''
            });
          }
        } else if (typeof clue === 'object') {
          // Structured clue
          const clueObj: JpzClue = {
            number: clue['@_number'] || clue.number || '',
            text: clue['#text'] || clue.text || clue['@_text'] || '',
            format: clue['@_format'] || undefined
          };
          
          // Handle word reference
          if (clue['@_word']) {
            clueObj.number = clue['@_word'];
          }
          
          targetArray.push(clueObj);
        }
      }
    }
  }
  
  return { across, down };
}

function parseWords(wordsNode: any): JpzWord[] {
  const words: JpzWord[] = [];
  
  if (!wordsNode || !wordsNode.word) {
    return words;
  }
  
  const wordNodes = Array.isArray(wordsNode.word) ? wordsNode.word : [wordsNode.word];
  
  for (const word of wordNodes) {
    const jpzWord: JpzWord = {
      id: word['@_id'] || '',
      cells: []
    };
    
    // Parse cells
    if (word.cells) {
      const cellList = word.cells.cell;
      if (cellList) {
        const cells = Array.isArray(cellList) ? cellList : [cellList];
        for (const cell of cells) {
          jpzWord.cells.push({
            x: parseInt(cell['@_x']),
            y: parseInt(cell['@_y'])
          });
        }
      }
    }
    
    words.push(jpzWord);
  }
  
  return words;
}

export function parseJpz(content: string): JpzPuzzle {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false
  });
  
  const doc = parser.parse(content);
  
  // Handle different JPZ root elements
  let puzzleRoot = doc['crossword-compiler-applet'] || 
                   doc['crossword-compiler'] || 
                   doc.puzzle ||
                   doc.crossword;
  
  if (!puzzleRoot) {
    throw new Error('Invalid JPZ file: no recognized root element');
  }
  
  // Find the puzzle data - might be nested
  let rectangularPuzzle = puzzleRoot['rectangular-puzzle'];
  if (!rectangularPuzzle && puzzleRoot.puzzle) {
    rectangularPuzzle = puzzleRoot.puzzle['rectangular-puzzle'];
  }
  if (!rectangularPuzzle) {
    rectangularPuzzle = puzzleRoot;
  }
  
  // Check if this is a non-crossword puzzle type we don't support
  if (rectangularPuzzle.coded) {
    throw new Error('Coded/cipher crosswords (Kaidoku) are not supported');
  }
  if (rectangularPuzzle.sudoku || rectangularPuzzle.kakuro) {
    throw new Error('Number puzzles are not supported');
  }
  if (rectangularPuzzle['word-search'] || rectangularPuzzle.wordsearch) {
    throw new Error('Word search puzzles are not supported');
  }
  
  // Extract components
  const metadata = parseMetadata(rectangularPuzzle.metadata);
  
  // Find grid and clues - should be in crossword section for standard crosswords
  const crossword = rectangularPuzzle.crossword || 
                   rectangularPuzzle.puzzle ||
                   rectangularPuzzle;
  const gridNode = crossword.grid || crossword.Grid || rectangularPuzzle.grid;
  
  if (!gridNode) {
    throw new Error('Invalid JPZ file: no grid found');
  }
  
  // Parse cells and build grid
  const { cells, width, height } = parseCells(gridNode);
  const grid = buildGrid(cells, width, height);
  
  // Parse clues - might be in different locations
  const cluesNode = crossword.clues || 
                   crossword.Clues || 
                   rectangularPuzzle.clues ||
                   rectangularPuzzle.Clues;
  
  const { across, down } = parseClues(cluesNode);
  
  // Parse words if present
  const wordsNode = crossword.words || crossword.Words;
  const words = wordsNode ? parseWords(wordsNode) : undefined;
  
  return {
    width,
    height,
    metadata,
    grid,
    across,
    down,
    words
  };
}