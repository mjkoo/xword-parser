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

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FORMAT_DETECTION_FAILED,
    context?: ErrorContext,
    cause?: unknown,
  ) {
    super(message, { cause });
    Object.setPrototypeOf(this, XwordParseError.prototype);
    this.name = 'XwordParseError';
    this.code = code;
    this.context = context;
  }

  /**
   * Determines if this error indicates a format mismatch (file is valid but wrong format)
   * vs a real parsing error (file is corrupted or has other issues)
   */
  isFormatMismatch(): boolean {
    return (
      this.code === ErrorCode.UNSUPPORTED_PUZZLE_TYPE ||
      this.code === ErrorCode.FORMAT_DETECTION_FAILED
    );
  }
}

/**
 * Error thrown when the input format cannot be detected
 */
export class FormatDetectionError extends XwordParseError {
  constructor(
    message: string = 'Unable to detect puzzle format',
    context?: ErrorContext,
    cause?: unknown,
  ) {
    super(message, ErrorCode.FORMAT_DETECTION_FAILED, context, cause);
    Object.setPrototypeOf(this, FormatDetectionError.prototype);
    this.name = 'FormatDetectionError';
  }
}

/**
 * Error thrown when a file is corrupted or invalid
 */
export class InvalidFileError extends XwordParseError {
  constructor(format: string, message: string, context?: ErrorContext, cause?: unknown) {
    super(`Invalid ${format} file: ${message}`, ErrorCode.INVALID_FILE, context, cause);
    Object.setPrototypeOf(this, InvalidFileError.prototype);
    this.name = 'InvalidFileError';
  }
}

/**
 * Error thrown when a puzzle type is not supported
 */
export class UnsupportedPuzzleTypeError extends XwordParseError {
  constructor(puzzleType: string, context?: ErrorContext, cause?: unknown) {
    super(
      `${puzzleType} puzzles are not supported`,
      ErrorCode.UNSUPPORTED_PUZZLE_TYPE,
      context,
      cause,
    );
    Object.setPrototypeOf(this, UnsupportedPuzzleTypeError.prototype);
    this.name = 'UnsupportedPuzzleTypeError';
  }
}

/**
 * Format-specific error classes
 */
export class IpuzParseError extends XwordParseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.IPUZ_PARSE_ERROR,
    context?: ErrorContext,
    cause?: unknown,
  ) {
    super(message, code, context, cause);
    Object.setPrototypeOf(this, IpuzParseError.prototype);
    this.name = 'IpuzParseError';
  }

  override isFormatMismatch(): boolean {
    // IPUZ_INVALID_JSON means it's not valid JSON, so likely not an iPUZ file
    // IPUZ_MISSING_VERSION and IPUZ_MISSING_KIND mean it's JSON but not iPUZ format
    return (
      super.isFormatMismatch() ||
      this.code === ErrorCode.IPUZ_INVALID_JSON ||
      this.code === ErrorCode.IPUZ_MISSING_VERSION ||
      this.code === ErrorCode.IPUZ_MISSING_KIND
    );
  }
}

export class PuzParseError extends XwordParseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.PUZ_PARSE_ERROR,
    context?: ErrorContext,
    cause?: unknown,
  ) {
    super(message, code, context, cause);
    Object.setPrototypeOf(this, PuzParseError.prototype);
    this.name = 'PuzParseError';
  }

  override isFormatMismatch(): boolean {
    // PUZ_INVALID_HEADER means the file doesn't appear to be a PUZ file at all
    // PUZ_CHECKSUM_MISMATCH is a real error - the file is corrupted
    return super.isFormatMismatch() || this.code === ErrorCode.PUZ_INVALID_HEADER;
  }
}

export class JpzParseError extends XwordParseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.JPZ_PARSE_ERROR,
    context?: ErrorContext,
    cause?: unknown,
  ) {
    super(message, code, context, cause);
    Object.setPrototypeOf(this, JpzParseError.prototype);
    this.name = 'JpzParseError';
  }

  override isFormatMismatch(): boolean {
    // JPZ_INVALID_XML means it's not valid XML, so likely not a JPZ file
    // JPZ_MISSING_GRID could be a corrupted JPZ file, not a format mismatch
    return super.isFormatMismatch() || this.code === ErrorCode.JPZ_INVALID_XML;
  }
}

export class XdParseError extends XwordParseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.XD_PARSE_ERROR,
    context?: ErrorContext,
    cause?: unknown,
  ) {
    super(message, code, context, cause);
    Object.setPrototypeOf(this, XdParseError.prototype);
    this.name = 'XdParseError';
  }

  override isFormatMismatch(): boolean {
    // XD_FORMAT_ERROR indicates the content doesn't look like XD format
    return super.isFormatMismatch() || this.code === ErrorCode.XD_FORMAT_ERROR;
  }
}
