import { parseIpuz, convertIpuzToUnified } from './ipuz';
import { parseXd, convertXdToUnified } from './xd';
import { parsePuz, convertPuzToUnified } from './puz';
import { parseJpz, convertJpzToUnified } from './jpz';
import { FormatDetectionError } from './errors';
import type { Puzzle, ParseOptions } from './types';

export function parse(data: string | Buffer | ArrayBuffer, options?: ParseOptions): Puzzle {
  // Convert ArrayBuffer to Buffer if needed
  let content: string | Buffer;
  if (data instanceof ArrayBuffer) {
    content = Buffer.from(data);
  } else {
    content = data;
  }

  // Try detection based on filename hint first
  if (options?.filename) {
    const lowerName = options.filename.toLowerCase();
    const ext = lowerName.split('.').pop();

    if (ext === 'ipuz') {
      try {
        const textContent = typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
        const puzzle = parseIpuz(textContent);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    } else if (ext === 'puz') {
      // Only try PUZ if we have binary data
      if (typeof content !== 'string') {
        try {
          const puzzle = parsePuz(content);
          return convertPuzToUnified(puzzle);
        } catch (e) {
          // Fall through to content-based detection
        }
      }
    } else if (ext === 'jpz') {
      try {
        const textContent = typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
        const puzzle = parseJpz(textContent);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    } else if (ext === 'xd') {
      try {
        const textContent = typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
        const puzzle = parseXd(textContent);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    }
  }

  // Auto-detect format based on content
  if (typeof content === 'string') {
    // String input - only try text-based formats (iPUZ, JPZ, XD)
    // Do NOT try to decode as base64 or treat as PUZ

    // Check for iPUZ (starts with ipuz({ or is JSON with version field)
    const trimmed = content.trim();
    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      try {
        const puzzle = parseIpuz(content);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Not iPUZ, continue checking
      }
    }

    // Check for JPZ (XML with crossword elements)
    if (
      content.includes('<?xml') ||
      content.includes('<crossword') ||
      content.includes('<puzzle')
    ) {
      try {
        const puzzle = parseJpz(content);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Not JPZ, continue checking
      }
    }

    // Check for XD (has Title: or other metadata headers)
    const lines = content.split('\n');
    const hasXdHeaders = lines.some((line) =>
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line),
    );
    if (hasXdHeaders) {
      try {
        const puzzle = parseXd(content);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Not XD, continue checking
      }
    }
  } else {
    // Buffer input - try PUZ first, then convert to string and try text formats
    
    // Try PUZ format first (binary)
    try {
      const puzzle = parsePuz(content);
      return convertPuzToUnified(puzzle);
    } catch (e) {
      // Not PUZ, try converting to string for text formats
    }

    // Convert to string and try text formats
    const textContent = content.toString(options?.encoding || 'utf-8');
    const trimmed = textContent.trim();

    // Check for iPUZ
    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      try {
        const puzzle = parseIpuz(textContent);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Not iPUZ
      }
    }

    // Check for JPZ
    if (
      textContent.includes('<?xml') ||
      textContent.includes('<crossword') ||
      textContent.includes('<puzzle')
    ) {
      try {
        const puzzle = parseJpz(textContent);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Not JPZ
      }
    }

    // Check for XD
    const lines = textContent.split('\n');
    const hasXdHeaders = lines.some((line) =>
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line),
    );
    if (hasXdHeaders) {
      try {
        const puzzle = parseXd(textContent);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Not XD
      }
    }
  }

  throw new FormatDetectionError(
    'Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD',
  );
}

// Re-export all public types
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
  XdParseError,
} from './errors';

// Re-export parsers and types
export * from './ipuz';
export * from './xd';
export * from './puz';
export * from './jpz';
