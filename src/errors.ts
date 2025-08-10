/**
 * Custom error classes for xword-parser
 */

import { ErrorCode, ErrorContext } from './types';

/**
 * Base error class for all parsing errors
 */
export class XwordParseError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: ErrorContext;
  
  constructor(message: string, code: ErrorCode = ErrorCode.FORMAT_DETECTION_FAILED, context?: ErrorContext) {
    super(message);
    this.name = 'XwordParseError';
    this.code = code;
    this.context = context;
  }
}

/**
 * Error thrown when the input format cannot be detected
 */
export class FormatDetectionError extends XwordParseError {
  constructor(message: string = 'Unable to detect puzzle format', context?: ErrorContext) {
    super(message, ErrorCode.FORMAT_DETECTION_FAILED, context);
    this.name = 'FormatDetectionError';
  }
}

/**
 * Error thrown when a file is corrupted or invalid
 */
export class InvalidFileError extends XwordParseError {
  constructor(format: string, message: string, context?: ErrorContext) {
    super(`Invalid ${format} file: ${message}`, ErrorCode.INVALID_FILE, context);
    this.name = 'InvalidFileError';
  }
}

/**
 * Error thrown when a puzzle type is not supported
 */
export class UnsupportedPuzzleTypeError extends XwordParseError {
  constructor(puzzleType: string, context?: ErrorContext) {
    super(`${puzzleType} puzzles are not supported`, ErrorCode.UNSUPPORTED_PUZZLE_TYPE, context);
    this.name = 'UnsupportedPuzzleTypeError';
  }
}

/**
 * Format-specific error classes
 */
export class IpuzParseError extends XwordParseError {
  constructor(message: string, code: ErrorCode = ErrorCode.IPUZ_PARSE_ERROR, context?: ErrorContext) {
    super(message, code, context);
    this.name = 'IpuzParseError';
  }
}

export class PuzParseError extends XwordParseError {
  constructor(message: string, code: ErrorCode = ErrorCode.PUZ_PARSE_ERROR, context?: ErrorContext) {
    super(message, code, context);
    this.name = 'PuzParseError';
  }
}

export class JpzParseError extends XwordParseError {
  constructor(message: string, code: ErrorCode = ErrorCode.JPZ_PARSE_ERROR, context?: ErrorContext) {
    super(message, code, context);
    this.name = 'JpzParseError';
  }
}

export class XdParseError extends XwordParseError {
  constructor(message: string, code: ErrorCode = ErrorCode.XD_PARSE_ERROR, context?: ErrorContext) {
    super(message, code, context);
    this.name = 'XdParseError';
  }
}