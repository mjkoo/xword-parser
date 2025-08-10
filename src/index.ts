import { parseIpuz, convertIpuzToUnified } from './ipuz';
import { parseXd, convertXdToUnified } from './xd';
import { parsePuz, convertPuzToUnified } from './puz';
import { parseJpz, convertJpzToUnified } from './jpz';
import { FormatDetectionError, XwordParseError } from './errors';
import type { Puzzle, ParseOptions } from './types';

export function parse(data: string | Buffer | ArrayBuffer, options?: ParseOptions): Puzzle {
  let content: string | Buffer;
  if (data instanceof ArrayBuffer) {
    content = Buffer.from(data);
  } else {
    content = data;
  }

  if (options?.filename) {
    const lowerName = options.filename.toLowerCase();
    const ext = lowerName.split('.').pop();

    if (ext === 'ipuz') {
      try {
        const textContent =
          typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
        const puzzle = parseIpuz(textContent);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    } else if (ext === 'puz') {
      // Only try PUZ if we have binary data
      if (typeof content !== 'string') {
        try {
          const puzzle = parsePuz(content);
          return convertPuzToUnified(puzzle);
        } catch (e) {
          // Only continue trying other formats if this is a format mismatch
          if (e instanceof XwordParseError && !e.isFormatMismatch()) {
            throw e;
          }
        }
      }
    } else if (ext === 'jpz') {
      try {
        const textContent =
          typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
        const puzzle = parseJpz(textContent);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    } else if (ext === 'xd') {
      try {
        const textContent =
          typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
        const puzzle = parseXd(textContent);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }
  }

  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      try {
        const puzzle = parseIpuz(content);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }

    if (
      content.includes('<?xml') ||
      content.includes('<crossword') ||
      content.includes('<puzzle')
    ) {
      try {
        const puzzle = parseJpz(content);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }

    const lines = content.split('\n');
    const hasXdHeaders = lines.some((line) =>
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line),
    );
    if (hasXdHeaders) {
      try {
        const puzzle = parseXd(content);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }
  } else {
    try {
      const puzzle = parsePuz(content);
      return convertPuzToUnified(puzzle);
    } catch (e) {
      // Only continue trying other formats if this is a format mismatch
      if (e instanceof XwordParseError && !e.isFormatMismatch()) {
        throw e;
      }
    }

    const textContent = content.toString(options?.encoding || 'utf-8');
    const trimmed = textContent.trim();

    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      try {
        const puzzle = parseIpuz(textContent);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }

    if (
      textContent.includes('<?xml') ||
      textContent.includes('<crossword') ||
      textContent.includes('<puzzle')
    ) {
      try {
        const puzzle = parseJpz(textContent);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }

    const lines = textContent.split('\n');
    const hasXdHeaders = lines.some((line) =>
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line),
    );
    if (hasXdHeaders) {
      try {
        const puzzle = parseXd(textContent);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Only continue trying other formats if this is a format mismatch
        if (e instanceof XwordParseError && !e.isFormatMismatch()) {
          throw e;
        }
      }
    }
  }

  throw new FormatDetectionError(
    'Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD',
  );
}

export {
  parseIpuz,
  convertIpuzToUnified,
  parseXd,
  convertXdToUnified,
  parsePuz,
  convertPuzToUnified,
  parseJpz,
  convertJpzToUnified,
};

export * from './types';
export * from './errors';
export * from './ipuz';
export * from './xd';
export * from './puz';
export * from './jpz';
