export interface Puzzle {
  title?: string;
  author?: string;
  copyright?: string;
  notes?: string;
  date?: string;
  grid: Grid;
  clues: Clues;
  rebusTable?: Map<number, string>;
  additionalProperties?: Record<string, unknown>;
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[][];
  additionalProperties?: Record<string, unknown>;
}

export interface Cell {
  solution?: string;
  number?: number;
  isBlack: boolean;
  isCircled?: boolean;
  hasRebus?: boolean;
  rebusKey?: number;
  additionalProperties?: Record<string, unknown>;
}

export interface Clues {
  across: Clue[];
  down: Clue[];
  additionalProperties?: Record<string, unknown>;
}

export interface Clue {
  number: number;
  text: string;
  additionalProperties?: Record<string, unknown>;
}

export interface ParseOptions {
  filename?: string;
  encoding?: BufferEncoding;
}

export enum ErrorCode {
  FORMAT_DETECTION_FAILED = 'FORMAT_DETECTION_FAILED',
  INVALID_FILE = 'INVALID_FILE',
  UNSUPPORTED_PUZZLE_TYPE = 'UNSUPPORTED_PUZZLE_TYPE',

  IPUZ_PARSE_ERROR = 'IPUZ_PARSE_ERROR',
  IPUZ_INVALID_JSON = 'IPUZ_INVALID_JSON',
  IPUZ_MISSING_VERSION = 'IPUZ_MISSING_VERSION',
  IPUZ_MISSING_KIND = 'IPUZ_MISSING_KIND',

  PUZ_PARSE_ERROR = 'PUZ_PARSE_ERROR',
  PUZ_INVALID_HEADER = 'PUZ_INVALID_HEADER',
  PUZ_CHECKSUM_MISMATCH = 'PUZ_CHECKSUM_MISMATCH',

  JPZ_PARSE_ERROR = 'JPZ_PARSE_ERROR',
  JPZ_INVALID_XML = 'JPZ_INVALID_XML',
  JPZ_MISSING_GRID = 'JPZ_MISSING_GRID',

  XD_PARSE_ERROR = 'XD_PARSE_ERROR',
  XD_INVALID_GRID = 'XD_INVALID_GRID',
  XD_MISSING_CLUES = 'XD_MISSING_CLUES',
}

export interface ErrorContext {
  line?: number;
  column?: number;
  field?: string;
  offset?: number;
  details?: Record<string, unknown>;
}

export type Direction = 'across' | 'down';
