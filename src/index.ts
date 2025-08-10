import { parseIpuz, type IpuzPuzzle, CellType } from './ipuz';
import { parseXd, type XdPuzzle } from './xd';
import { parsePuz, type PuzPuzzle } from './puz';
import { parseJpz, type JpzPuzzle } from './jpz';
import { FormatDetectionError } from './errors';

export function parse(data: string | Buffer | ArrayBuffer): XwordPuzzle {
  // Convert ArrayBuffer to Buffer if needed
  let content: string | Buffer;
  if (data instanceof ArrayBuffer) {
    content = Buffer.from(data);
  } else {
    content = data;
  }
  
  // Auto-detect format based on content
  if (typeof content === 'string') {
    // Try text-based formats
    
    // Check for iPUZ (starts with ipuz({ or is JSON with version field)
    const trimmed = content.trim();
    if (trimmed.startsWith('ipuz({') || (trimmed.startsWith('{') && trimmed.includes('"version"'))) {
      try {
        const puzzle = parseIpuz(content);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Not iPUZ, continue checking
      }
    }
    
    // Check for JPZ (XML with crossword elements)
    if (content.includes('<?xml') || content.includes('<crossword') || content.includes('<puzzle')) {
      try {
        const puzzle = parseJpz(content);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Not JPZ, continue checking
      }
    }
    
    // Check for XD (has Title: or other metadata headers)
    const lines = content.split('\n');
    const hasXdHeaders = lines.some(line => 
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line)
    );
    if (hasXdHeaders) {
      try {
        const puzzle = parseXd(content);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Not XD, continue checking
      }
    }
    
    // Try parsing as PUZ binary (might be base64 encoded or similar)
    try {
      const buffer = Buffer.from(content, 'base64');
      const puzzle = parsePuz(buffer);
      return convertPuzToUnified(puzzle);
    } catch (e) {
      // Not base64 PUZ
    }
  } else {
    // Binary data - try PUZ format
    try {
      const puzzle = parsePuz(content);
      return convertPuzToUnified(puzzle);
    } catch (e) {
      // Not PUZ, try converting to string for text formats
      const textContent = content.toString('utf-8');
      
      // Try text formats with string version
      const trimmed = textContent.trim();
      if (trimmed.startsWith('ipuz({') || (trimmed.startsWith('{') && trimmed.includes('"version"'))) {
        try {
          const puzzle = parseIpuz(textContent);
          return convertIpuzToUnified(puzzle);
        } catch (e) {
          // Not iPUZ
        }
      }
      
      if (textContent.includes('<?xml') || textContent.includes('<crossword')) {
        try {
          const puzzle = parseJpz(textContent);
          return convertJpzToUnified(puzzle);
        } catch (e) {
          // Not JPZ
        }
      }
    }
  }
  
  throw new FormatDetectionError('Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD');
}

// Converter functions (temporary implementations - will be moved to separate module)
function convertIpuzToUnified(puzzle: IpuzPuzzle): XwordPuzzle {
  const grid: Grid = {
    width: puzzle.dimensions.width,
    height: puzzle.dimensions.height,
    cells: []
  };
  
  // Convert grid
  for (let y = 0; y < puzzle.dimensions.height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < puzzle.dimensions.width; x++) {
      const ipuzCell = puzzle.puzzle[y]?.[x];
      const solutionCell = puzzle.solution?.[y]?.[x];
      
      // iPUZ cells are already Cell objects from our parser
      const cellNumber = ipuzCell?.number ? 
        (typeof ipuzCell.number === 'string' ? parseInt(ipuzCell.number) : ipuzCell.number) : 
        undefined;
      
      const isBlack = ipuzCell?.type === CellType.BLOCK;
      
      const solution = typeof solutionCell === 'string' ? solutionCell : 
                      ipuzCell?.value || undefined;
      
      row.push({
        solution,
        number: cellNumber,
        isBlack
      });
    }
    grid.cells.push(row);
  }
  
  // Convert clues
  const clues: Clues = {
    across: [],
    down: []
  };
  
  if (puzzle.clues?.Across) {
    for (const clue of puzzle.clues.Across) {
      clues.across.push({
        number: typeof clue.number === 'string' ? parseInt(clue.number) : clue.number,
        text: clue.text
      });
    }
  }
  
  if (puzzle.clues?.Down) {
    for (const clue of puzzle.clues.Down) {
      clues.down.push({
        number: typeof clue.number === 'string' ? parseInt(clue.number) : clue.number,
        text: clue.text
      });
    }
  }
  
  return {
    title: puzzle.title,
    author: puzzle.author,
    copyright: puzzle.copyright,
    grid,
    clues
  };
}

function convertXdToUnified(puzzle: XdPuzzle): XwordPuzzle {
  const grid: Grid = {
    width: puzzle.grid[0]?.length || 0,
    height: puzzle.grid.length,
    cells: []
  };
  
  // Convert grid - XD grid is string[][], we need to determine cell properties
  let cellNumber = 1;
  for (let y = 0; y < puzzle.grid.length; y++) {
    const row = puzzle.grid[y];
    if (!row) continue;
    
    const cellRow: Cell[] = [];
    for (let x = 0; x < row.length; x++) {
      const cellValue = row[x];
      const isBlack = cellValue === '#';
      
      // Determine if this cell should have a number
      let number: number | undefined;
      if (!isBlack) {
        const needsNumber = 
          // Start of across word
          ((x === 0 || puzzle.grid[y]?.[x-1] === '#') && 
           x < row.length - 1 && puzzle.grid[y]?.[x+1] !== '#') ||
          // Start of down word
          ((y === 0 || puzzle.grid[y-1]?.[x] === '#') && 
           y < puzzle.grid.length - 1 && puzzle.grid[y+1]?.[x] !== '#');
        
        if (needsNumber) {
          number = cellNumber++;
        }
      }
      
      cellRow.push({
        solution: isBlack ? undefined : cellValue,
        number,
        isBlack
      });
    }
    grid.cells.push(cellRow);
  }
  
  // Convert clues
  const clues: Clues = {
    across: puzzle.across.map(c => ({
      number: parseInt(c.number),
      text: c.clue
    })),
    down: puzzle.down.map(c => ({
      number: parseInt(c.number),
      text: c.clue
    }))
  };
  
  return {
    title: puzzle.metadata.title,
    author: puzzle.metadata.author,
    copyright: puzzle.metadata.copyright,
    grid,
    clues
  };
}

function convertPuzToUnified(puzzle: PuzPuzzle): XwordPuzzle {
  const grid: Grid = {
    width: puzzle.width,
    height: puzzle.height,
    cells: []
  };
  
  // Convert grid and assign numbers
  let cellNumber = 1;
  for (let y = 0; y < puzzle.height; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < puzzle.width; x++) {
      const puzCell = puzzle.grid[y]?.[x];
      
      // Determine if this cell should have a number
      let number: number | undefined;
      if (puzCell && !puzCell.isBlack) {
        const needsNumber = 
          // Start of across word
          ((x === 0 || puzzle.grid[y]?.[x-1]?.isBlack) && 
           x < puzzle.width - 1 && !puzzle.grid[y]?.[x+1]?.isBlack) ||
          // Start of down word
          ((y === 0 || puzzle.grid[y-1]?.[x]?.isBlack) && 
           y < puzzle.height - 1 && !puzzle.grid[y+1]?.[x]?.isBlack);
        
        if (needsNumber) {
          number = cellNumber++;
        }
      }
      
      row.push({
        solution: puzCell?.solution,
        number,
        isBlack: puzCell?.isBlack || false
      });
    }
    grid.cells.push(row);
  }
  
  // Convert clues
  const clues: Clues = {
    across: puzzle.across.map(c => ({
      number: c.number,
      text: c.text
    })),
    down: puzzle.down.map(c => ({
      number: c.number,
      text: c.text
    }))
  };
  
  return {
    title: puzzle.metadata.title,
    author: puzzle.metadata.author,
    copyright: puzzle.metadata.copyright,
    grid,
    clues
  };
}

function convertJpzToUnified(puzzle: JpzPuzzle): XwordPuzzle {
  const grid: Grid = {
    width: puzzle.width,
    height: puzzle.height,
    cells: []
  };
  
  // Convert grid
  for (const row of puzzle.grid) {
    const cellRow: Cell[] = [];
    for (const cell of row) {
      cellRow.push({
        solution: cell.solution,
        number: cell.number,
        isBlack: cell.type === 'block'
      });
    }
    grid.cells.push(cellRow);
  }
  
  // Convert clues
  const clues: Clues = {
    across: puzzle.across.map(c => ({
      number: typeof c.number === 'string' ? parseInt(c.number) : c.number,
      text: c.text
    })),
    down: puzzle.down.map(c => ({
      number: typeof c.number === 'string' ? parseInt(c.number) : c.number,
      text: c.text
    }))
  };
  
  return {
    title: puzzle.metadata.title,
    author: puzzle.metadata.creator,
    copyright: puzzle.metadata.copyright,
    grid,
    clues
  };
}

export interface XwordPuzzle {
  title?: string;
  author?: string;
  copyright?: string;
  grid: Grid;
  clues: Clues;
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[][];
}

export interface Cell {
  solution?: string;
  number?: number;
  isBlack: boolean;
}

export interface Clues {
  across: Clue[];
  down: Clue[];
}

export interface Clue {
  number: number;
  text: string;
}

export * from './types';
// Re-export error classes
export { 
  XwordParseError,
  FormatDetectionError,
  InvalidFileError,
  UnsupportedPuzzleTypeError,
  IpuzParseError,
  PuzParseError,
  JpzParseError,
  XdParseError
} from './errors';

// Re-export parsers and types
export * from './ipuz';
export * from './xd';
export * from './puz';
export * from './jpz';