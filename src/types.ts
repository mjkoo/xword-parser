/**
 * Public types for xword-parser library
 * This file contains all types that are part of the public API
 */

/**
 * Unified crossword puzzle representation
 * All format parsers convert to this common structure
 */
export interface Puzzle {
  title?: string;
  author?: string;
  copyright?: string;
  grid: Grid;
  clues: Clues;
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
  /** Optional filename hint for format detection (e.g., "puzzle.puz", "crossword.ipuz") */
  filename?: string;
  /** Character encoding for text-based formats (default: "utf-8") */
  encoding?: BufferEncoding;
}

/**
 * Error codes for programmatic error handling
 */
export enum ErrorCode {
  // General errors
  FORMAT_DETECTION_FAILED = 'FORMAT_DETECTION_FAILED',
  INVALID_FILE = 'INVALID_FILE',
  UNSUPPORTED_PUZZLE_TYPE = 'UNSUPPORTED_PUZZLE_TYPE',

  // Format-specific errors
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

/**
 * Error context information
 */
export interface ErrorContext {
  /** Line number where error occurred (for text formats) */
  line?: number;
  /** Column number where error occurred */
  column?: number;
  /** Field name that caused the error */
  field?: string;
  /** File offset where error occurred (for binary formats) */
  offset?: number;
  /** Additional details about the error */
  details?: Record<string, unknown>;
}

export type Direction = 'across' | 'down';
