/**
 * Parser for JPZ crossword format (Crossword Compiler)
 * JPZ is an XML-based format
 */

import { XMLParser } from 'fast-xml-parser';
import { InvalidFileError, UnsupportedPuzzleTypeError, JpzParseError } from './errors';
import type { Puzzle, Grid, Cell as UnifiedCell, Clues } from './types';
import { ErrorCode } from './types';
import { MAX_GRID_WIDTH, MAX_GRID_HEIGHT } from './constants';

// Type definitions for XML parser output
interface JpzXmlNode {
  [key: string]: unknown;
  '@_width'?: string;
  '@_height'?: string;
  '@_x'?: string;
  '@_y'?: string;
  '@_type'?: string;
  '@_solution'?: string;
  '@_letter'?: string;
  '@_number'?: string;
  '@_background-shape'?: string;
  '@_background-color'?: string;
  '@_top-bar'?: string;
  '@_bottom-bar'?: string;
  '@_left-bar'?: string;
  '@_right-bar'?: string;
  '@_title'?: string;
  '@_format'?: string;
  '@_text'?: string;
  '@_word'?: string;
  '@_id'?: string;
  '#text'?: string;
  cell?: JpzXmlNode | JpzXmlNode[];
  cells?: { cell?: JpzXmlNode | JpzXmlNode[] };
  title?: string | { b?: string; '#text'?: string };
  creator?: string;
  author?: string;
  copyright?: string;
  description?: string;
  publisher?: string;
  identifier?: string;
  clue?: JpzXmlNode | JpzXmlNode[];
  text?: string;
  number?: string;
  word?: JpzXmlNode | JpzXmlNode[];
  // Additional properties found in parsing
  'rectangular-puzzle'?: JpzXmlNode;
  puzzle?: JpzXmlNode;
  crossword?: JpzXmlNode;
  coded?: unknown;
  sudoku?: unknown;
  kakuro?: unknown;
  'word-search'?: unknown;
  wordsearch?: unknown;
  metadata?: JpzXmlNode;
  grid?: JpzXmlNode;
  Grid?: JpzXmlNode;
  clues?: JpzXmlNode | JpzXmlNode[];
  Clues?: JpzXmlNode | JpzXmlNode[];
  words?: JpzXmlNode;
  Words?: JpzXmlNode;
}

interface JpzXmlRoot {
  'crossword-compiler-applet'?: JpzXmlNode;
  'crossword-compiler'?: JpzXmlNode;
  puzzle?: JpzXmlNode;
  crossword?: JpzXmlNode;
}

// Type guards
function isJpzXmlNode(value: unknown): value is JpzXmlNode {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseStringAttribute(value: unknown): string | undefined {
  return isString(value) ? value : undefined;
}

function parseIntAttribute(value: unknown): number | undefined {
  if (isString(value)) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

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

function parseMetadata(metadataNode: unknown): JpzMetadata {
  if (!isJpzXmlNode(metadataNode)) return {};

  return {
    title: parseStringAttribute(metadataNode.title),
    creator:
      parseStringAttribute(metadataNode.creator) || parseStringAttribute(metadataNode.author),
    copyright: parseStringAttribute(metadataNode.copyright),
    description: parseStringAttribute(metadataNode.description),
    publisher: parseStringAttribute(metadataNode.publisher),
    identifier: parseStringAttribute(metadataNode.identifier),
  };
}

function parseCells(gridNode: unknown): {
  cells: Map<string, JpzCell>;
  width: number;
  height: number;
} {
  const cells = new Map<string, JpzCell>();

  if (!isJpzXmlNode(gridNode)) {
    return { cells, width: 15, height: 15 };
  }

  const width = parseIntAttribute(gridNode['@_width']) || 15;
  const height = parseIntAttribute(gridNode['@_height']) || 15;

  // Validate grid dimensions to prevent excessive memory usage
  if (width <= 0 || width > MAX_GRID_WIDTH || height <= 0 || height > MAX_GRID_HEIGHT) {
    throw new JpzParseError(
      `Invalid grid dimensions: ${width}x${height}. Maximum supported size is ${MAX_GRID_WIDTH}x${MAX_GRID_HEIGHT}`,
      ErrorCode.JPZ_INVALID_GRID,
      { details: { width, height } },
    );
  }

  // Handle cells - can be a single cell or array
  const cellNodes = gridNode.cell;
  if (cellNodes) {
    const cellArray = Array.isArray(cellNodes) ? cellNodes : [cellNodes];

    for (const cellNode of cellArray) {
      if (!isJpzXmlNode(cellNode)) continue;

      const x = parseIntAttribute(cellNode['@_x']);
      const y = parseIntAttribute(cellNode['@_y']);

      if (x === undefined || y === undefined) continue;

      const key = `${x},${y}`;

      const jpzCell: JpzCell = {
        x,
        y,
        type: parseStringAttribute(cellNode['@_type']) === 'block' ? 'block' : 'cell',
        solution:
          parseStringAttribute(cellNode['@_solution']) ||
          parseStringAttribute(cellNode['@_letter']),
        number: parseIntAttribute(cellNode['@_number']),
        isCircled: parseStringAttribute(cellNode['@_background-shape']) === 'circle',
        backgroundColor: parseStringAttribute(cellNode['@_background-color']),
        barTop: parseStringAttribute(cellNode['@_top-bar']) === 'true',
        barBottom: parseStringAttribute(cellNode['@_bottom-bar']) === 'true',
        barLeft: parseStringAttribute(cellNode['@_left-bar']) === 'true',
        barRight: parseStringAttribute(cellNode['@_right-bar']) === 'true',
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
          type: 'cell',
        });
      }
    }
    grid.push(row);
  }

  return grid;
}

function parseClues(cluesNode: unknown): { across: JpzClue[]; down: JpzClue[] } {
  const across: JpzClue[] = [];
  const down: JpzClue[] = [];

  if (!isJpzXmlNode(cluesNode)) {
    return { across, down };
  }

  // Handle different clue structures
  const clueArrays = Array.isArray(cluesNode) ? cluesNode : [cluesNode];

  for (const clueSet of clueArrays) {
    if (!isJpzXmlNode(clueSet)) continue;

    // Get title/direction - might be nested object with text content
    let titleStr = '';
    if (isString(clueSet.title)) {
      titleStr = clueSet.title;
    } else if (isJpzXmlNode(clueSet.title)) {
      // Handle nested elements like <title><b>Across</b></title>
      const titleNode = clueSet.title;
      titleStr =
        parseStringAttribute(titleNode.b) ||
        parseStringAttribute(titleNode['#text']) ||
        JSON.stringify(titleNode);
    } else if (parseStringAttribute(clueSet['@_title'])) {
      titleStr = parseStringAttribute(clueSet['@_title']) || '';
    }

    const isAcross = titleStr.toLowerCase().includes('across');
    const targetArray = isAcross ? across : down;

    // Get clues
    const clueNodes = clueSet.clue;
    if (clueNodes) {
      const clues = Array.isArray(clueNodes) ? clueNodes : [clueNodes];

      for (const clue of clues) {
        if (isString(clue)) {
          // Simple string clue with number prefix
          const match = clue.match(/^(\d+)\.\s*(.+)$/);
          if (match) {
            targetArray.push({
              number: match[1] || '',
              text: match[2] || '',
            });
          }
        } else if (isJpzXmlNode(clue)) {
          // Structured clue
          const clueObj: JpzClue = {
            number:
              parseStringAttribute(clue['@_number']) || parseStringAttribute(clue.number) || '',
            text:
              parseStringAttribute(clue['#text']) ||
              parseStringAttribute(clue.text) ||
              parseStringAttribute(clue['@_text']) ||
              '',
            format: parseStringAttribute(clue['@_format']),
          };

          // Handle word reference
          const wordRef = parseStringAttribute(clue['@_word']);
          if (wordRef) {
            clueObj.number = wordRef;
          }

          targetArray.push(clueObj);
        }
      }
    }
  }

  return { across, down };
}

function parseWords(wordsNode: unknown): JpzWord[] {
  const words: JpzWord[] = [];

  if (!isJpzXmlNode(wordsNode) || !wordsNode.word) {
    return words;
  }

  const wordNodes = Array.isArray(wordsNode.word) ? wordsNode.word : [wordsNode.word];

  for (const word of wordNodes) {
    if (!isJpzXmlNode(word)) continue;

    const jpzWord: JpzWord = {
      id: parseStringAttribute(word['@_id']) || '',
      cells: [],
    };

    // Parse cells
    if (isJpzXmlNode(word.cells)) {
      const cellList = word.cells.cell;
      if (cellList) {
        const cells = Array.isArray(cellList) ? cellList : [cellList];
        for (const cell of cells) {
          if (!isJpzXmlNode(cell)) continue;

          const x = parseIntAttribute(cell['@_x']);
          const y = parseIntAttribute(cell['@_y']);

          if (x !== undefined && y !== undefined) {
            jpzWord.cells.push({ x, y });
          }
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
    parseAttributeValue: false,
  });

  let doc: JpzXmlRoot;
  try {
    doc = parser.parse(content) as JpzXmlRoot;
  } catch (e) {
    throw new JpzParseError(
      `Invalid XML: ${e instanceof Error ? e.message : 'Unknown error'}`,
      ErrorCode.JPZ_INVALID_XML,
      undefined,
      e,
    );
  }

  // Handle different JPZ root elements
  const puzzleRoot =
    doc['crossword-compiler-applet'] || doc['crossword-compiler'] || doc.puzzle || doc.crossword;

  if (!isJpzXmlNode(puzzleRoot)) {
    throw new InvalidFileError('JPZ', 'no recognized root element');
  }

  // Find the puzzle data - might be nested
  let rectangularPuzzle = puzzleRoot['rectangular-puzzle'];
  if (!isJpzXmlNode(rectangularPuzzle) && isJpzXmlNode(puzzleRoot.puzzle)) {
    const puzzleChild = puzzleRoot.puzzle;
    if (isJpzXmlNode(puzzleChild)) {
      rectangularPuzzle = puzzleChild['rectangular-puzzle'];
    }
  }
  if (!isJpzXmlNode(rectangularPuzzle)) {
    rectangularPuzzle = puzzleRoot;
  }

  // Check if this is a non-crossword puzzle type we don't support
  if (rectangularPuzzle.coded) {
    throw new UnsupportedPuzzleTypeError('Coded/cipher crosswords (Kaidoku)');
  }
  if (rectangularPuzzle.sudoku || rectangularPuzzle.kakuro) {
    throw new UnsupportedPuzzleTypeError('Number puzzles');
  }
  if (rectangularPuzzle['word-search'] || rectangularPuzzle.wordsearch) {
    throw new UnsupportedPuzzleTypeError('Word search');
  }

  // Extract components
  const metadata = parseMetadata(rectangularPuzzle.metadata);

  // Find grid and clues - should be in crossword section for standard crosswords
  const crosswordNode =
    rectangularPuzzle.crossword || rectangularPuzzle.puzzle || rectangularPuzzle;

  let gridNode: unknown = undefined;
  if (isJpzXmlNode(crosswordNode)) {
    gridNode = crosswordNode.grid || crosswordNode.Grid;
  }
  if (!gridNode && isJpzXmlNode(rectangularPuzzle)) {
    gridNode = rectangularPuzzle.grid;
  }

  if (!gridNode) {
    throw new InvalidFileError('JPZ', 'no grid found');
  }

  // Parse cells and build grid
  const { cells, width, height } = parseCells(gridNode);
  const grid = buildGrid(cells, width, height);

  // Parse clues - might be in different locations
  let cluesNode: unknown = undefined;
  if (isJpzXmlNode(crosswordNode)) {
    cluesNode = crosswordNode.clues || crosswordNode.Clues;
  }
  if (!cluesNode && isJpzXmlNode(rectangularPuzzle)) {
    cluesNode = rectangularPuzzle.clues || rectangularPuzzle.Clues;
  }

  const { across, down } = parseClues(cluesNode);

  // Parse words if present
  let wordsNode: unknown = undefined;
  if (isJpzXmlNode(crosswordNode)) {
    wordsNode = crosswordNode.words || crosswordNode.Words;
  }
  const words = wordsNode ? parseWords(wordsNode) : undefined;

  return {
    width,
    height,
    metadata,
    grid,
    across,
    down,
    words,
  };
}

// Convert JPZ puzzle to unified format
export function convertJpzToUnified(puzzle: JpzPuzzle): Puzzle {
  const grid: Grid = {
    width: puzzle.width,
    height: puzzle.height,
    cells: [],
  };

  // Convert grid
  for (const row of puzzle.grid) {
    const cellRow: UnifiedCell[] = [];
    for (const cell of row) {
      const unifiedCell: UnifiedCell = {
        solution: cell.solution,
        number: cell.number,
        isBlack: cell.type === 'block',
        isCircled: cell.isCircled,
      };

      // Add cell-specific metadata if present
      if (cell.backgroundColor || cell.barTop || cell.barBottom || cell.barLeft || cell.barRight) {
        unifiedCell.additionalProperties = {};
        if (cell.backgroundColor) {
          unifiedCell.additionalProperties.backgroundColor = cell.backgroundColor;
        }
        if (cell.barTop) unifiedCell.additionalProperties.barTop = cell.barTop;
        if (cell.barBottom) unifiedCell.additionalProperties.barBottom = cell.barBottom;
        if (cell.barLeft) unifiedCell.additionalProperties.barLeft = cell.barLeft;
        if (cell.barRight) unifiedCell.additionalProperties.barRight = cell.barRight;
      }

      cellRow.push(unifiedCell);
    }
    grid.cells.push(cellRow);
  }

  // Convert clues
  const clues: Clues = {
    across: puzzle.across.map((c) => ({
      number: typeof c.number === 'string' ? parseInt(c.number) : c.number,
      text: c.text,
    })),
    down: puzzle.down.map((c) => ({
      number: typeof c.number === 'string' ? parseInt(c.number) : c.number,
      text: c.text,
    })),
  };

  const result: Puzzle = {
    title: puzzle.metadata.title,
    author: puzzle.metadata.creator,
    copyright: puzzle.metadata.copyright,
    grid,
    clues,
  };

  // Add puzzle-level metadata if present
  const additionalProps: Record<string, unknown> = {};

  if (puzzle.metadata.description) additionalProps.description = puzzle.metadata.description;
  if (puzzle.metadata.publisher) additionalProps.publisher = puzzle.metadata.publisher;
  if (puzzle.metadata.identifier) additionalProps.identifier = puzzle.metadata.identifier;

  // Add words information if present
  if (puzzle.words && puzzle.words.length > 0) {
    additionalProps.words = puzzle.words;
  }

  if (Object.keys(additionalProps).length > 0) {
    result.additionalProperties = additionalProps;
  }

  return result;
}
