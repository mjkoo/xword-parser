/**
 * Parser for ipuz crossword format.
 * Based on specification at https://www.puzzazz.com/ipuz
 */

import { UnsupportedPuzzleTypeError, IpuzParseError } from './errors';
import type { Puzzle, Grid, Cell as UnifiedCell, Clues } from './types';
import { ErrorCode } from './types';

export enum CellType {
  NORMAL = 'normal',
  BLOCK = 'block',
  NULL = 'null',
}

export interface CellStyle {
  shapebg?: string;
  highlight?: boolean;
  named?: boolean;
  border?: number;
  divided?: string;
  label?: string;
  mark?: Record<string, unknown>;
  imagebg?: string;
  color?: string;
  colortext?: string;
  colorborder?: string;
  colorbar?: string;
  barred?: string;
  dotted?: string;
  dashed?: string;
  lessthan?: string;
  greaterthan?: string;
  equal?: string;
  handler?: string;
  handlerdata?: unknown;
}

export interface IpuzCell {
  type: CellType;
  number?: number | string;
  value?: string;
  solution?: string;
  style?: CellStyle;
  continued?: Record<string, unknown>;
  directions?: string[];
  given?: boolean;
}

export interface IpuzClue {
  number: number | string;
  text: string;
  cells?: Array<[number, number]>;
  references?: Array<number | string>;
  continued?: Record<string, unknown>;
  highlight?: boolean;
  image?: string;
}

export interface IpuzPuzzle {
  version: string;
  kind: string[];

  dimensions: {
    width: number;
    height: number;
  };

  puzzle: IpuzCell[][];

  title?: string;
  author?: string;
  copyright?: string;
  publisher?: string;
  publication?: string;
  url?: string;
  uniqueId?: string;
  intro?: string;
  explanation?: string;
  annotation?: string;
  notes?: string;
  difficulty?: string;
  origin?: string;
  date?: string;

  empty?: string;
  charset?: string;

  clues: Record<string, IpuzClue[]>;

  solution?: Array<Array<string | null>>;

  zones?: Array<Record<string, unknown>>;

  styles?: Record<string, unknown>;

  extensions: Record<string, unknown>;

  volatile?: Record<string, boolean>;

  checksum?: string[];

  saved?: Array<Array<string | null>>;

  enumeration?: boolean;
  enumerations?: string[];

  misses?: Record<string, unknown>;

  block?: string;

  showEnumerations?: boolean;
  cluePlacement?: string;

  answer?: string;
  answers?: string[];
}

interface IpuzCellData {
  cell?: unknown;
  style?: Record<string, unknown>;
  value?: string;
  continued?: Record<string, unknown>;
  directions?: string[];
  given?: boolean;
}

interface IpuzClueData {
  number?: number | string;
  clue?: string;
  cells?: Array<[number, number]>;
  references?: Array<number | string>;
  continued?: Record<string, unknown>;
  highlight?: boolean;
  image?: string;
}

interface IpuzData {
  version?: string;
  kind?: string[];
  dimensions?: {
    width: number;
    height: number;
  };
  puzzle?: unknown[][];
  solution?: Array<Array<string | null>>;
  clues?: Record<string, unknown[]>;
  saved?: Array<Array<string | null>>;
  title?: string;
  author?: string;
  copyright?: string;
  publisher?: string;
  publication?: string;
  url?: string;
  uniqueid?: string;
  intro?: string;
  explanation?: string;
  annotation?: string;
  notes?: string;
  difficulty?: string;
  origin?: string;
  date?: string;
  empty?: string;
  charset?: string;
  block?: string;
  showenumerations?: boolean;
  clueplacement?: string;
  answer?: string;
  answers?: string[];
  enumeration?: boolean;
  enumerations?: string[];
  volatile?: Record<string, boolean>;
  checksum?: string[];
  zones?: Array<Record<string, unknown>>;
  styles?: Record<string, unknown>;
  misses?: Record<string, unknown>;
  [key: string]: unknown;
}

function parseCellFromIpuz(cellData: unknown, solutionData?: unknown): IpuzCell {
  const cell: IpuzCell = {
    type: CellType.NORMAL,
  };

  if (cellData === null || cellData === 'null') {
    cell.type = CellType.NULL;
    return cell;
  }

  if (cellData === '#') {
    cell.type = CellType.BLOCK;
    return cell;
  }

  if (typeof cellData === 'object' && cellData !== null) {
    const cellObj = cellData as IpuzCellData;

    if ('cell' in cellObj && cellObj.cell !== undefined) {
      const baseValue = cellObj.cell;
      if (baseValue === '#') {
        cell.type = CellType.BLOCK;
      } else if (baseValue === 'null' || baseValue === null) {
        cell.type = CellType.NULL;
      } else if (typeof baseValue === 'number' || typeof baseValue === 'string') {
        if (baseValue !== 0 && baseValue !== '0') {
          cell.number = baseValue;
        }
      }
    }

    if ('style' in cellObj && cellObj.style) {
      cell.style = {};
      const styleFields: (keyof CellStyle)[] = [
        'shapebg',
        'highlight',
        'named',
        'border',
        'divided',
        'label',
        'mark',
        'imagebg',
        'color',
        'colortext',
        'colorborder',
        'colorbar',
        'barred',
        'dotted',
        'dashed',
        'lessthan',
        'greaterthan',
        'equal',
        'handler',
        'handlerdata',
      ];

      for (const field of styleFields) {
        if (field in cellObj.style) {
          const value = cellObj.style[field];
          if (value !== undefined) {
            (cell.style as Record<string, unknown>)[field] = value;
          }
        }
      }
    }

    if ('value' in cellObj && cellObj.value !== undefined) {
      cell.value = cellObj.value;
    }

    if ('continued' in cellObj && cellObj.continued !== undefined) {
      cell.continued = cellObj.continued;
    }

    if ('directions' in cellObj && cellObj.directions !== undefined) {
      cell.directions = cellObj.directions;
    }

    if ('given' in cellObj && cellObj.given !== undefined) {
      cell.given = cellObj.given;
    }
  } else if (typeof cellData === 'number' || typeof cellData === 'string') {
    if (typeof cellData === 'number' && cellData > 0) {
      cell.number = cellData;
    } else if (typeof cellData === 'string') {
      if (cellData === '0' || cellData === '#' || cellData === 'null') {
        // Handle special cases
        if (cellData === '#') {
          cell.type = CellType.BLOCK;
        }
      } else {
        // Try to parse as number for cell numbering
        const numVal = parseInt(cellData, 10);
        if (!isNaN(numVal) && numVal > 0) {
          cell.number = cellData;
        } else {
          // It's a letter/value
          cell.value = cellData;
        }
      }
    }
  }

  if (solutionData) {
    if (
      typeof solutionData === 'string' &&
      solutionData !== '#' &&
      solutionData !== 'null' &&
      solutionData !== null
    ) {
      cell.solution = solutionData;
    }
  }

  return cell;
}

function parseCluesFromIpuz(cluesData: Record<string, unknown[]>): Record<string, IpuzClue[]> {
  const clues: Record<string, IpuzClue[]> = {};

  for (const [direction, clueList] of Object.entries(cluesData)) {
    if (!Array.isArray(clueList)) {
      continue;
    }
    clues[direction] = [];

    for (const clueItem of clueList) {
      let clue: IpuzClue | null = null;

      if (Array.isArray(clueItem) && clueItem.length >= 2) {
        clue = {
          number: clueItem[0] as number | string,
          text: clueItem[1] as string,
        };

        if (clueItem.length > 2) {
          for (let i = 2; i < clueItem.length; i++) {
            const extra = clueItem[i] as unknown;
            if (typeof extra === 'object' && extra !== null) {
              const extraObj = extra as IpuzClueData;
              if ('references' in extraObj && extraObj.references) {
                clue.references = extraObj.references;
              }
              if ('continued' in extraObj && extraObj.continued) {
                clue.continued = extraObj.continued;
              }
              if ('highlight' in extraObj && extraObj.highlight) {
                clue.highlight = extraObj.highlight;
              }
              if ('image' in extraObj && extraObj.image) {
                clue.image = extraObj.image;
              }
            }
          }
        }
      } else if (typeof clueItem === 'object' && clueItem !== null) {
        const clueObj = clueItem as IpuzClueData;
        clue = {
          number: clueObj.number || '',
          text: clueObj.clue || '',
        };

        if (clueObj.cells) {
          clue.cells = clueObj.cells;
        }
        if (clueObj.references) {
          clue.references = clueObj.references;
        }
        if (clueObj.continued) {
          clue.continued = clueObj.continued;
        }
        if (clueObj.highlight !== undefined) {
          clue.highlight = clueObj.highlight;
        }
        if (clueObj.image) {
          clue.image = clueObj.image;
        }
      }

      if (clue) {
        clues[direction].push(clue);
      }
    }
  }

  return clues;
}

export function parseIpuz(content: string | Buffer): IpuzPuzzle {
  const stringContent = typeof content === 'string' ? content : content.toString('utf-8');
  let jsonContent = stringContent.trim();

  if (jsonContent.startsWith('ipuz(') && jsonContent.endsWith(')')) {
    jsonContent = jsonContent.slice(5, -1);
  }

  let data: IpuzData;
  try {
    data = JSON.parse(jsonContent) as IpuzData;
  } catch (e) {
    throw new IpuzParseError(
      `Invalid JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ErrorCode.IPUZ_INVALID_JSON,
      undefined,
      e,
    );
  }

  if (!data.kind || !data.kind.some((k: string) => k.includes('crossword'))) {
    throw new UnsupportedPuzzleTypeError('Non-crossword');
  }

  // Validate required fields for crossword puzzles
  if (!data.dimensions || typeof data.dimensions !== 'object') {
    throw new IpuzParseError(
      'Missing or invalid dimensions field',
      ErrorCode.IPUZ_MISSING_REQUIRED_FIELD,
    );
  }

  if (!data.dimensions.width || !data.dimensions.height) {
    throw new IpuzParseError(
      'Missing width or height in dimensions',
      ErrorCode.IPUZ_MISSING_REQUIRED_FIELD,
    );
  }

  if (typeof data.dimensions.width !== 'number' || typeof data.dimensions.height !== 'number') {
    throw new IpuzParseError('Width and height must be numbers', ErrorCode.IPUZ_INVALID_DATA_TYPE);
  }

  if (data.dimensions.width <= 0 || data.dimensions.height <= 0) {
    throw new IpuzParseError(
      'Width and height must be positive numbers',
      ErrorCode.IPUZ_INVALID_GRID_SIZE,
    );
  }

  if (!data.puzzle || !Array.isArray(data.puzzle)) {
    throw new IpuzParseError(
      'Missing or invalid puzzle grid',
      ErrorCode.IPUZ_MISSING_REQUIRED_FIELD,
    );
  }

  const puzzle: IpuzPuzzle = {
    version: data.version || '',
    kind: data.kind || [],
    dimensions: data.dimensions,
    puzzle: [],
    clues: {},
    extensions: {},
  };

  const simpleFields = [
    'title',
    'author',
    'copyright',
    'publisher',
    'publication',
    'url',
    'intro',
    'explanation',
    'annotation',
    'notes',
    'difficulty',
    'origin',
    'date',
    'empty',
    'charset',
    'block',
    'answer',
  ] as const;

  for (const field of simpleFields) {
    if (field in data && data[field] !== undefined) {
      // Use type assertion for known fields
      (puzzle as unknown as Record<string, unknown>)[field] = data[field];
    }
  }

  // Handle fields that need renaming from spec format to camelCase
  if ('uniqueid' in data && data.uniqueid !== undefined) {
    puzzle.uniqueId = data.uniqueid;
  }
  if ('showenumerations' in data && data.showenumerations !== undefined) {
    puzzle.showEnumerations = data.showenumerations;
  }
  if ('clueplacement' in data && data.clueplacement !== undefined) {
    puzzle.cluePlacement = data.clueplacement;
  }

  if ('answers' in data && data.answers) {
    puzzle.answers = data.answers;
  }

  if ('enumeration' in data && data.enumeration !== undefined) {
    puzzle.enumeration = data.enumeration;
  }

  if ('enumerations' in data && data.enumerations) {
    puzzle.enumerations = data.enumerations;
  }

  if ('volatile' in data && data.volatile) {
    puzzle.volatile = data.volatile;
  }

  if ('checksum' in data && data.checksum) {
    puzzle.checksum = data.checksum;
  }

  if ('zones' in data && data.zones) {
    puzzle.zones = data.zones;
  }

  if ('styles' in data && data.styles) {
    puzzle.styles = data.styles;
  }

  if ('misses' in data && data.misses) {
    puzzle.misses = data.misses;
  }

  const solutionGrid = data.solution || [];
  if (solutionGrid.length > 0) {
    puzzle.solution = solutionGrid;
  }

  if ('saved' in data && data.saved) {
    puzzle.saved = data.saved;
  }

  const puzzleGrid = data.puzzle || [];
  for (let rowIdx = 0; rowIdx < puzzleGrid.length; rowIdx++) {
    const row = puzzleGrid[rowIdx];
    if (!row) continue;

    const cellRow: IpuzCell[] = [];

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellData = row[colIdx];
      let solutionVal = undefined;

      if (
        solutionGrid.length > rowIdx &&
        solutionGrid[rowIdx] &&
        solutionGrid[rowIdx]!.length > colIdx
      ) {
        solutionVal = solutionGrid[rowIdx]![colIdx];
      }

      const cell = parseCellFromIpuz(cellData, solutionVal);
      cellRow.push(cell);
    }

    puzzle.puzzle.push(cellRow);
  }

  if ('clues' in data && data.clues) {
    puzzle.clues = parseCluesFromIpuz(data.clues);
  }

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('http://') || key.startsWith('https://') || key.includes(':')) {
      puzzle.extensions[key] = value;
    }
  }

  return puzzle;
}

// Convert iPUZ puzzle to unified format
export function convertIpuzToUnified(puzzle: IpuzPuzzle): Puzzle {
  const grid: Grid = {
    width: puzzle.dimensions.width,
    height: puzzle.dimensions.height,
    cells: [],
  };

  // Convert grid
  for (let y = 0; y < puzzle.dimensions.height; y++) {
    const row: UnifiedCell[] = [];
    for (let x = 0; x < puzzle.dimensions.width; x++) {
      const ipuzCell = puzzle.puzzle[y]?.[x];
      const solutionCell = puzzle.solution?.[y]?.[x];

      // iPUZ cells are already Cell objects from our parser
      const cellNumber = ipuzCell?.number
        ? typeof ipuzCell.number === 'string'
          ? parseInt(ipuzCell.number)
          : ipuzCell.number
        : undefined;

      const isBlack = ipuzCell?.type === CellType.BLOCK;

      const solution =
        typeof solutionCell === 'string' ? solutionCell : ipuzCell?.value || undefined;

      const cell: UnifiedCell = {
        solution,
        number: cellNumber,
        isBlack,
      };

      // Check for circle style (common in iPUZ)
      if (ipuzCell?.style?.shapebg === 'circle') {
        cell.isCircled = true;
      }

      // Add remaining cell-specific metadata if present
      if (ipuzCell?.style || ipuzCell?.continued || ipuzCell?.directions || ipuzCell?.given) {
        cell.additionalProperties = {};
        // Only add style if it has more than just shapebg='circle'
        if (
          ipuzCell.style &&
          (Object.keys(ipuzCell.style).length > 1 || ipuzCell.style.shapebg !== 'circle')
        ) {
          cell.additionalProperties.style = ipuzCell.style;
        }
        if (ipuzCell.continued) {
          cell.additionalProperties.continued = ipuzCell.continued;
        }
        if (ipuzCell.directions) {
          cell.additionalProperties.directions = ipuzCell.directions;
        }
        if (ipuzCell.given !== undefined) {
          cell.additionalProperties.given = ipuzCell.given;
        }
        // Remove additionalProperties if it's empty
        if (Object.keys(cell.additionalProperties).length === 0) {
          delete cell.additionalProperties;
        }
      }

      row.push(cell);
    }
    grid.cells.push(row);
  }

  // Convert clues
  const clues: Clues = {
    across: [],
    down: [],
  };

  if (puzzle.clues?.Across) {
    for (const clue of puzzle.clues.Across) {
      const clueNumber = typeof clue.number === 'string' ? parseInt(clue.number) : clue.number;
      // Skip invalid clue numbers (NaN, 0, negative)
      if (!isNaN(clueNumber) && clueNumber > 0) {
        clues.across.push({
          number: clueNumber,
          text: clue.text || '',
        });
      }
    }
  }

  if (puzzle.clues?.Down) {
    for (const clue of puzzle.clues.Down) {
      const clueNumber = typeof clue.number === 'string' ? parseInt(clue.number) : clue.number;
      // Skip invalid clue numbers (NaN, 0, negative)
      if (!isNaN(clueNumber) && clueNumber > 0) {
        clues.down.push({
          number: clueNumber,
          text: clue.text || '',
        });
      }
    }
  }

  const result: Puzzle = {
    title: puzzle.title,
    author: puzzle.author,
    copyright: puzzle.copyright,
    notes: puzzle.notes,
    date: puzzle.date,
    grid,
    clues,
  };

  // Add puzzle-level metadata if present
  const additionalProps: Record<string, unknown> = {};
  if (puzzle.difficulty) additionalProps.difficulty = puzzle.difficulty;
  if (puzzle.publisher) additionalProps.publisher = puzzle.publisher;
  if (puzzle.publication) additionalProps.publication = puzzle.publication;
  if (puzzle.url) additionalProps.url = puzzle.url;
  if (puzzle.uniqueId) additionalProps.uniqueId = puzzle.uniqueId;
  if (puzzle.intro) additionalProps.intro = puzzle.intro;
  if (puzzle.explanation) additionalProps.explanation = puzzle.explanation;
  if (puzzle.annotation) additionalProps.annotation = puzzle.annotation;

  // Add styles if present
  if (puzzle.styles && Object.keys(puzzle.styles).length > 0) {
    additionalProps.styles = puzzle.styles;
  }

  // Add zones if present
  if (puzzle.zones && puzzle.zones.length > 0) {
    additionalProps.zones = puzzle.zones;
  }

  // Add extensions if present
  if (Object.keys(puzzle.extensions).length > 0) {
    additionalProps.extensions = puzzle.extensions;
  }

  if (Object.keys(additionalProps).length > 0) {
    result.additionalProperties = additionalProps;
  }

  return result;
}
