/**
 * Parser for PUZ crossword format (Across Lite)
 * Based on reverse-engineered specification
 */

import { InvalidFileError } from './errors';
import type { Puzzle, Grid, Cell as UnifiedCell, Clues } from './types';

export interface PuzMetadata {
  title?: string;
  author?: string;
  copyright?: string;
  notes?: string;
}

export interface PuzClue {
  number: number;
  text: string;
}

export interface PuzCell {
  solution?: string;
  playerState?: string;
  isBlack: boolean;
  isCircled?: boolean;
  hasRebus?: boolean;
  rebusKey?: number;
}

export interface PuzPuzzle {
  width: number;
  height: number;
  metadata: PuzMetadata;
  grid: PuzCell[][];
  across: PuzClue[];
  down: PuzClue[];
  rebusTable?: Map<number, string>;
  isScrambled?: boolean;
  timer?: {
    elapsed: number;
    running: boolean;
  };
}

// PUZ file header structure
interface PuzHeader {
  checksum: number;
  magic: string;
  cibChecksum: number;
  maskedLowChecksum: number;
  maskedHighChecksum: number;
  version: string;
  reserved1: number;
  scrambledChecksum: number;
  reserved2: Buffer;
  width: number;
  height: number;
  numClues: number;
  puzzleType: number;
  scrambledTag: number;
}

const MAGIC_STRING = 'ACROSS&DOWN';

class PuzBinaryReader {
  private _buffer: Buffer;
  private offset: number;

  constructor(data: Buffer | ArrayBuffer | Uint8Array) {
    if (data instanceof ArrayBuffer) {
      this._buffer = Buffer.from(data);
    } else if (data instanceof Uint8Array) {
      this._buffer = Buffer.from(data);
    } else {
      this._buffer = data;
    }
    this.offset = 0;
  }

  readUInt8(): number {
    const value = this._buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readUInt16LE(): number {
    const value = this._buffer.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  readBytes(length: number): Buffer {
    const value = this._buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  readString(length: number, trimNull: boolean = true): string {
    const bytes = this.readBytes(length);
    if (trimNull) {
      // Remove trailing nulls
      let end = bytes.indexOf(0);
      if (end === -1) end = length;
      return bytes.toString('latin1', 0, end);
    }
    return bytes.toString('latin1');
  }

  readNullTerminatedString(): string {
    const start = this.offset;
    while (this.offset < this._buffer.length && this._buffer[this.offset] !== 0) {
      this.offset++;
    }
    const str = this._buffer.toString('latin1', start, this.offset);
    this.offset++; // Skip null terminator
    return str;
  }

  seek(position: number): void {
    this.offset = position;
  }

  get position(): number {
    return this.offset;
  }

  get length(): number {
    return this._buffer.length;
  }

  get buffer(): Buffer {
    return this._buffer;
  }

  hasMore(): boolean {
    return this.offset < this._buffer.length;
  }
}

function readHeader(reader: PuzBinaryReader): PuzHeader {
  // Search for the magic string "ACROSS&DOWN" in the file
  const magicBytes = Buffer.from(MAGIC_STRING, 'latin1');
  let magicOffset = -1;

  // Search for the magic string in the buffer
  for (let i = 0; i <= reader.length - magicBytes.length; i++) {
    let found = true;
    for (let j = 0; j < magicBytes.length; j++) {
      if (reader.buffer[i + j] !== magicBytes[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      magicOffset = i;
      break;
    }
  }

  if (magicOffset === -1) {
    throw new InvalidFileError('PUZ', `magic string "${MAGIC_STRING}" not found`);
  }

  // Position reader at the start of the actual PUZ data (2 bytes before magic string)
  const headerStart = magicOffset - 2;
  if (headerStart < 0) {
    throw new InvalidFileError('PUZ', 'magic string found too early in file');
  }

  reader.seek(headerStart);

  // Read header fields according to PUZ specification
  const checksum = reader.readUInt16LE(); // 0x00-0x01
  const magic = reader.readString(12); // 0x02-0x0D
  const cibChecksum = reader.readUInt16LE(); // 0x0E-0x0F
  const maskedLowChecksum = reader.readUInt16LE(); // 0x10-0x11
  const maskedHighChecksum = reader.readUInt16LE(); // 0x12-0x13
  const version = reader.readString(4); // 0x14-0x17
  const reserved1 = reader.readUInt16LE(); // 0x18-0x19
  const scrambledChecksum = reader.readUInt16LE(); // 0x1A-0x1B
  const reserved2 = reader.readBytes(12); // 0x1C-0x27
  reader.readBytes(4); // 0x28-0x2B (skip unknown bytes)
  const width = reader.readUInt8(); // 0x2C
  const height = reader.readUInt8(); // 0x2D
  const numClues = reader.readUInt16LE(); // 0x2E-0x2F
  const puzzleType = reader.readUInt16LE(); // 0x30-0x31
  const scrambledTag = reader.readUInt16LE(); // 0x32-0x33

  const header: PuzHeader = {
    checksum,
    magic,
    cibChecksum,
    maskedLowChecksum,
    maskedHighChecksum,
    version,
    reserved1,
    scrambledChecksum,
    reserved2,
    width,
    height,
    numClues,
    puzzleType,
    scrambledTag,
  };

  // Verify we read the magic string correctly
  if (header.magic !== MAGIC_STRING) {
    throw new InvalidFileError(
      'PUZ',
      `magic string mismatch after positioning. Expected "${MAGIC_STRING}", got "${header.magic}"`,
    );
  }

  return header;
}

function parseGrid(
  solution: string,
  playerState: string,
  width: number,
  height: number,
): PuzCell[][] {
  const grid: PuzCell[][] = [];

  for (let row = 0; row < height; row++) {
    const cells: PuzCell[] = [];
    for (let col = 0; col < width; col++) {
      const index = row * width + col;
      const solutionChar = solution[index];
      const playerChar = playerState[index];

      cells.push({
        solution: solutionChar === '.' ? undefined : solutionChar,
        playerState: playerChar === '-' || playerChar === '.' ? undefined : playerChar,
        isBlack: solutionChar === '.',
      });
    }
    grid.push(cells);
  }

  return grid;
}

function assignClueNumbers(grid: PuzCell[][]): Map<string, number> {
  const cluePositions = new Map<string, number>();
  let clueNumber = 1;
  const height = grid.length;
  const width = grid[0]?.length || 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (grid[row]?.[col]?.isBlack) continue;

      const hasAcross =
        (col === 0 || grid[row]?.[col - 1]?.isBlack) &&
        col < width - 1 &&
        !grid[row]?.[col + 1]?.isBlack;

      const hasDown =
        (row === 0 || grid[row - 1]?.[col]?.isBlack) &&
        row < height - 1 &&
        !grid[row + 1]?.[col]?.isBlack;

      if (hasAcross || hasDown) {
        if (hasAcross) {
          cluePositions.set(`A${row},${col}`, clueNumber);
        }
        if (hasDown) {
          cluePositions.set(`D${row},${col}`, clueNumber);
        }
        clueNumber++;
      }
    }
  }

  return cluePositions;
}

function parseClues(
  clueStrings: string[],
  cluePositions: Map<string, number>,
): { across: PuzClue[]; down: PuzClue[] } {
  const across: PuzClue[] = [];
  const down: PuzClue[] = [];
  let clueIndex = 0;

  // Sort positions to ensure correct clue assignment
  const sortedPositions = Array.from(cluePositions.entries()).sort((a, b) => {
    const [aType, aPos] = a[0].split(',');
    const [bType, bPos] = b[0].split(',');
    const aRow = parseInt(aType?.substring(1) || '0');
    const bRow = parseInt(bType?.substring(1) || '0');
    const aCol = parseInt(aPos || '0');
    const bCol = parseInt(bPos || '0');

    if (aRow !== bRow) return aRow - bRow;
    return aCol - bCol;
  });

  // First pass: collect all across clues
  for (const [key, number] of sortedPositions) {
    if (key.startsWith('A') && clueIndex < clueStrings.length) {
      across.push({
        number,
        text: clueStrings[clueIndex++] || '',
      });
    }
  }

  // Second pass: collect all down clues
  for (const [key, number] of sortedPositions) {
    if (key.startsWith('D') && clueIndex < clueStrings.length) {
      down.push({
        number,
        text: clueStrings[clueIndex++] || '',
      });
    }
  }

  return { across, down };
}

function parseExtraSections(
  reader: PuzBinaryReader,
  grid: PuzCell[][],
): {
  rebusTable?: Map<number, string>;
  timer?: { elapsed: number; running: boolean };
} {
  const result: {
    rebusTable?: Map<number, string>;
    timer?: { elapsed: number; running: boolean };
  } = {};

  while (reader.hasMore()) {
    // Check if we have enough bytes for a section header
    if (reader.position + 8 > reader.length) break;

    // Skip null padding bytes between sections
    while (reader.hasMore() && reader.buffer[reader.position] === 0) {
      reader.readUInt8();
    }

    // Check again after skipping padding
    if (reader.position + 8 > reader.length) break;

    const sectionTitle = reader.readString(4);
    const dataLength = reader.readUInt16LE();
    reader.readUInt16LE(); // checksum (unused)

    // Skip if not a valid section
    if (dataLength > reader.length - reader.position) break;

    const sectionData = reader.readBytes(dataLength);

    switch (sectionTitle) {
      case 'GRBS': {
        // Rebus grid - one byte per square
        const height = grid.length;
        const width = grid[0]?.length || 0;
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            const index = row * width + col;
            if (index < sectionData.length) {
              const rebusKey = sectionData[index];
              if (rebusKey && rebusKey > 0 && grid[row]?.[col]) {
                grid[row]![col]!.hasRebus = true;
                grid[row]![col]!.rebusKey = rebusKey - 1;
              }
            }
          }
        }
        break;
      }

      case 'RTBL': {
        // Rebus table - semicolon-separated values with key:value pairs
        const tableStr = sectionData.toString('latin1');
        const entries = tableStr.split(';');
        result.rebusTable = new Map();

        for (const entry of entries) {
          if (entry.includes(':')) {
            const [key, value] = entry.split(':');
            const keyNum = parseInt(key || '0');
            if (!isNaN(keyNum)) {
              result.rebusTable.set(keyNum, value || '');
            }
          }
        }
        break;
      }

      case 'GEXT': {
        // Grid extras - circled squares, etc.
        const height = grid.length;
        const width = grid[0]?.length || 0;
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            const index = row * width + col;
            if (index < sectionData.length && grid[row]?.[col]) {
              const flags = sectionData[index];
              if (flags && flags & 0x80) {
                grid[row]![col]!.isCircled = true;
              }
            }
          }
        }
        break;
      }

      case 'LTIM': {
        // Timer data
        const timerStr = sectionData.toString('latin1');
        const [elapsed, running] = timerStr.split(',');
        result.timer = {
          elapsed: parseInt(elapsed || '0') || 0,
          running: running === '0' ? false : true,
        };
        break;
      }
    }
  }

  return result;
}

export function parsePuz(data: Buffer | ArrayBuffer | Uint8Array | string): PuzPuzzle {
  let buffer: Buffer;

  if (typeof data === 'string') {
    // If string is passed, assume it's base64 encoded
    buffer = Buffer.from(data, 'base64');
  } else if (data instanceof Buffer) {
    buffer = data;
  } else {
    buffer = Buffer.from(data as ArrayBuffer);
  }

  const reader = new PuzBinaryReader(buffer);
  const header = readHeader(reader);

  // Read puzzle data
  const gridSize = header.width * header.height;
  const solution = reader.readString(gridSize);
  const playerState = reader.readString(gridSize);

  // Read strings
  const title = reader.readNullTerminatedString();
  const author = reader.readNullTerminatedString();
  const copyright = reader.readNullTerminatedString();

  // Read clues
  const clueStrings: string[] = [];
  for (let i = 0; i < header.numClues; i++) {
    clueStrings.push(reader.readNullTerminatedString());
  }

  const notes = reader.readNullTerminatedString();

  // Parse grid
  const grid = parseGrid(solution, playerState, header.width, header.height);

  // Assign clue numbers and parse clues
  const cluePositions = assignClueNumbers(grid);
  const { across, down } = parseClues(clueStrings, cluePositions);

  // Parse extra sections
  const extras = parseExtraSections(reader, grid);

  return {
    width: header.width,
    height: header.height,
    metadata: {
      title: title || undefined,
      author: author || undefined,
      copyright: copyright || undefined,
      notes: notes || undefined,
    },
    grid,
    across,
    down,
    rebusTable: extras.rebusTable,
    isScrambled: header.scrambledTag !== 0,
    timer: extras.timer,
  };
}

// Convert PUZ puzzle to unified format
export function convertPuzToUnified(puzzle: PuzPuzzle): Puzzle {
  const grid: Grid = {
    width: puzzle.width,
    height: puzzle.height,
    cells: [],
  };

  // Convert grid and assign numbers
  let cellNumber = 1;
  for (let y = 0; y < puzzle.height; y++) {
    const row: UnifiedCell[] = [];
    for (let x = 0; x < puzzle.width; x++) {
      const puzCell = puzzle.grid[y]?.[x];

      // Determine if this cell should have a number
      let number: number | undefined;
      if (puzCell && !puzCell.isBlack) {
        const needsNumber =
          // Start of across word
          ((x === 0 || puzzle.grid[y]?.[x - 1]?.isBlack) &&
            x < puzzle.width - 1 &&
            !puzzle.grid[y]?.[x + 1]?.isBlack) ||
          // Start of down word
          ((y === 0 || puzzle.grid[y - 1]?.[x]?.isBlack) &&
            y < puzzle.height - 1 &&
            !puzzle.grid[y + 1]?.[x]?.isBlack);

        if (needsNumber) {
          number = cellNumber++;
        }
      }

      const cell: UnifiedCell = {
        solution: puzCell?.solution,
        number,
        isBlack: puzCell?.isBlack || false,
      };

      // Add cell-specific metadata
      if (puzCell?.isCircled) {
        cell.isCircled = true;
      }
      if (puzCell?.hasRebus) {
        cell.hasRebus = true;
        if (puzCell.rebusKey !== undefined) {
          cell.rebusKey = puzCell.rebusKey;
        }
      }

      row.push(cell);
    }
    grid.cells.push(row);
  }

  // Convert clues
  const clues: Clues = {
    across: puzzle.across.map((c) => ({
      number: c.number,
      text: c.text,
    })),
    down: puzzle.down.map((c) => ({
      number: c.number,
      text: c.text,
    })),
  };

  const result: Puzzle = {
    title: puzzle.metadata.title,
    author: puzzle.metadata.author,
    copyright: puzzle.metadata.copyright,
    notes: puzzle.metadata.notes,
    grid,
    clues,
    rebusTable: puzzle.rebusTable,
  };

  // Add puzzle-level metadata if present
  const additionalProps: Record<string, unknown> = {};
  if (puzzle.isScrambled) {
    additionalProps.isScrambled = puzzle.isScrambled;
  }
  if (puzzle.timer) {
    additionalProps.timer = puzzle.timer;
  }

  if (Object.keys(additionalProps).length > 0) {
    result.additionalProperties = additionalProps;
  }

  return result;
}
