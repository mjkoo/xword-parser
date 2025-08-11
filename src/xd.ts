import { XdParseError } from './errors';
import { ErrorCode } from './types';
import type { Puzzle, Grid, Cell as UnifiedCell, Clues } from './types';
import { MAX_GRID_WIDTH, MAX_GRID_HEIGHT } from './constants';

export interface XdMetadata {
  title?: string;
  author?: string;
  editor?: string;
  copyright?: string;
  date?: string;
  rebus?: string;
  [key: string]: string | undefined;
}

export interface XdClue {
  number: string;
  clue: string;
  answer: string;
  metadata?: Record<string, string>;
}

export interface XdPuzzle {
  metadata: XdMetadata;
  grid: string[][];
  across: XdClue[];
  down: XdClue[];
  notes?: string;
}

function parseMetadata(lines: string[]): XdMetadata {
  const metadata: XdMetadata = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();

    if (key && value) {
      // Convert first character to lowercase to match TypeScript conventions
      const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
      metadata[normalizedKey] = value;
    }
  }

  return metadata;
}

function parseGrid(lines: string[]): string[][] {
  return lines.map((line) => {
    const cells: string[] = [];
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char !== undefined) {
        cells.push(char);
      }
    }
    return cells;
  });
}

function parseClues(lines: string[]): { across: XdClue[]; down: XdClue[] } {
  const across: XdClue[] = [];
  const down: XdClue[] = [];

  for (const line of lines) {
    if (line.length === 0) continue;

    const match = line.match(/^([AD])(\d+)\.\s+(.+?)(?:\s+~\s+(.+))?$/);
    if (match) {
      const [, direction, number, clue, answer] = match;

      const clueObj: XdClue = {
        number: number ?? '',
        clue: clue?.trim() ?? '',
        answer: answer?.trim() ?? '',
      };

      if (direction === 'A') {
        across.push(clueObj);
      } else {
        down.push(clueObj);
      }
    }
  }

  return { across, down };
}

function splitIntoSections(content: string): {
  metadata: string[];
  grid: string[];
  clues: string[];
  notes: string[];
} {
  const lines = content.split('\n');
  const sections: string[][] = [];
  let currentSection: string[] = [];
  let blankLineCount = 0;

  for (const line of lines) {
    if (line.trim() === '') {
      blankLineCount++;
      if (blankLineCount >= 2 && currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
        blankLineCount = 0;
      }
    } else {
      if (blankLineCount === 1 && currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
      blankLineCount = 0;
      currentSection.push(line);
    }
  }

  if (currentSection.length > 0) {
    sections.push(currentSection);
  }

  const result = {
    metadata: [] as string[],
    grid: [] as string[],
    clues: [] as string[],
    notes: [] as string[],
  };

  let sectionIndex = 0;

  if (sections.length > sectionIndex) {
    const section = sections[sectionIndex];
    if (section && section.some((line) => line.includes(':'))) {
      result.metadata = section;
      sectionIndex++;
    }
  }

  if (sections.length > sectionIndex) {
    const section = sections[sectionIndex];
    if (section && section.every((line) => /^[A-Za-z0-9#._]+$/.test(line) && line.length > 0)) {
      result.grid = section;
      sectionIndex++;
    }
  }

  while (sections.length > sectionIndex) {
    const section = sections[sectionIndex];
    if (section && section.some((line) => /^[AD]\d+\./.test(line))) {
      result.clues.push(...section);
      sectionIndex++;
    } else {
      break;
    }
  }

  if (sections.length > sectionIndex) {
    for (let i = sectionIndex; i < sections.length; i++) {
      const section = sections[i];
      if (section) {
        result.notes.push(...section);
      }
    }
  }

  return result;
}

export function parseXd(content: string): XdPuzzle {
  const sections = splitIntoSections(content);

  if (sections.grid.length === 0) {
    throw new XdParseError('Invalid XD file: no grid section found', ErrorCode.XD_FORMAT_ERROR);
  }

  const metadata = parseMetadata(sections.metadata);
  const grid = parseGrid(sections.grid);
  const { across, down } = parseClues(sections.clues);

  // Validate grid is not empty
  if (grid.length === 0) {
    throw new XdParseError('Grid is empty', ErrorCode.XD_INVALID_GRID);
  }

  // Validate grid has consistent row lengths
  const width = grid[0]?.length || 0;
  if (width === 0) {
    throw new XdParseError('Grid has no columns', ErrorCode.XD_INVALID_GRID);
  }

  const height = grid.length;

  // Validate grid dimensions are within limits
  if (width > MAX_GRID_WIDTH || height > MAX_GRID_HEIGHT) {
    throw new XdParseError(
      `Grid dimensions too large: ${width}x${height}. Maximum supported size is ${MAX_GRID_WIDTH}x${MAX_GRID_HEIGHT}`,
      ErrorCode.XD_INVALID_GRID,
    );
  }

  for (let i = 0; i < grid.length; i++) {
    if (!grid[i] || grid[i]?.length !== width) {
      throw new XdParseError(
        `Grid row ${i} has inconsistent width (expected ${width}, got ${grid[i]?.length || 0})`,
        ErrorCode.XD_INVALID_GRID,
      );
    }
  }

  // Validate clues exist
  if (across.length === 0 && down.length === 0) {
    throw new XdParseError('No clues found', ErrorCode.XD_MISSING_CLUES);
  }

  const puzzle: XdPuzzle = {
    metadata,
    grid,
    across,
    down,
  };

  if (sections.notes.length > 0) {
    puzzle.notes = sections.notes.join('\n').trim();
  }

  return puzzle;
}

// Convert XD puzzle to unified format
export function convertXdToUnified(puzzle: XdPuzzle): Puzzle {
  // Parser guarantees grid is not empty and has consistent width
  const firstRow = puzzle.grid[0];
  if (!firstRow) {
    // This should never happen as parser validates grid is not empty
    throw new Error('Invalid state: grid is empty');
  }

  const grid: Grid = {
    width: firstRow.length,
    height: puzzle.grid.length,
    cells: [],
  };

  // Convert grid - XD grid is string[][], we need to determine cell properties
  let cellNumber = 1;
  for (let y = 0; y < puzzle.grid.length; y++) {
    const row = puzzle.grid[y]!; // Parser guarantees all rows exist

    const cellRow: UnifiedCell[] = [];
    for (let x = 0; x < row.length; x++) {
      const cellValue = row[x]!; // Parser guarantees consistent width
      const isBlack = cellValue === '#';

      // Determine if this cell should have a number
      let number: number | undefined;
      if (!isBlack) {
        const needsNumber =
          // Start of across word
          ((x === 0 || puzzle.grid[y]![x - 1] === '#') &&
            x < row.length - 1 &&
            puzzle.grid[y]![x + 1] !== '#') ||
          // Start of down word
          ((y === 0 || puzzle.grid[y - 1]?.[x] === '#') &&
            y < puzzle.grid.length - 1 &&
            puzzle.grid[y + 1]?.[x] !== '#');

        if (needsNumber) {
          number = cellNumber++;
        }
      }

      cellRow.push({
        solution: isBlack ? undefined : cellValue,
        number,
        isBlack,
      });
    }
    grid.cells.push(cellRow);
  }

  // Convert clues
  const clues: Clues = {
    across: puzzle.across.map((c) => ({
      number: parseInt(c.number),
      text: c.clue,
    })),
    down: puzzle.down.map((c) => ({
      number: parseInt(c.number),
      text: c.clue,
    })),
  };

  const result: Puzzle = {
    title: puzzle.metadata.title,
    author: puzzle.metadata.author,
    copyright: puzzle.metadata.copyright,
    notes: puzzle.notes,
    date: puzzle.metadata.date,
    grid,
    clues,
  };

  // Add puzzle-level metadata if present
  const additionalProps: Record<string, unknown> = {};

  if (puzzle.metadata.editor) additionalProps.editor = puzzle.metadata.editor;

  // XD format also supports rebus metadata (different format than PUZ)
  if (puzzle.metadata.rebus) additionalProps.rebus = puzzle.metadata.rebus;
  if (puzzle.metadata.notepad) additionalProps.notepad = puzzle.metadata.notepad;

  if (Object.keys(additionalProps).length > 0) {
    result.additionalProperties = additionalProps;
  }

  return result;
}
