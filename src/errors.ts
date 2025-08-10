/**
 * Custom error classes for xword-parser
 */

/**
 * Base error class for all parsing errors
 */
export class XwordParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XwordParseError';
  }
}

/**
 * Error thrown when the input format cannot be detected
 */
export class FormatDetectionError extends XwordParseError {
  constructor(message: string = 'Unable to detect puzzle format') {
    super(message);
    this.name = 'FormatDetectionError';
  }
}

/**
 * Error thrown when a file is corrupted or invalid
 */
export class InvalidFileError extends XwordParseError {
  constructor(format: string, message: string) {
    super(`Invalid ${format} file: ${message}`);
    this.name = 'InvalidFileError';
  }
}

/**
 * Error thrown when a puzzle type is not supported
 */
export class UnsupportedPuzzleTypeError extends XwordParseError {
  constructor(puzzleType: string) {
    super(`${puzzleType} puzzles are not supported`);
    this.name = 'UnsupportedPuzzleTypeError';
  }
}

/**
 * Format-specific error classes
 */
export class IpuzParseError extends XwordParseError {
  constructor(message: string) {
    super(message);
    this.name = 'IpuzParseError';
  }
}

export class PuzParseError extends XwordParseError {
  constructor(message: string) {
    super(message);
    this.name = 'PuzParseError';
  }
}

export class JpzParseError extends XwordParseError {
  constructor(message: string) {
    super(message);
    this.name = 'JpzParseError';
  }
}

export class XdParseError extends XwordParseError {
  constructor(message: string) {
    super(message);
    this.name = 'XdParseError';
  }
}