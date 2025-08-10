/**
 * Lazy-loading version of the main parse function
 * Dynamically imports parsers only when needed
 */

import { FormatDetectionError } from './errors';
import type { Puzzle, ParseOptions } from './types';

/**
 * Parse crossword puzzle data with lazy loading of format parsers
 * This reduces bundle size when only specific formats are used
 */
export async function parseLazy(
  data: string | Buffer | ArrayBuffer,
  options?: ParseOptions,
): Promise<Puzzle> {
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
        const textContent = typeof content === 'string' ? content : content.toString('utf-8');
        const { parseIpuz, convertIpuzToUnified } = await import('./ipuz');
        const puzzle = parseIpuz(textContent);
        return convertIpuzToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    } else if (ext === 'puz') {
      try {
        const buffer = typeof content === 'string' ? Buffer.from(content, 'base64') : content;
        const { parsePuz, convertPuzToUnified } = await import('./puz');
        const puzzle = parsePuz(buffer);
        return convertPuzToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    } else if (ext === 'jpz') {
      try {
        const textContent = typeof content === 'string' ? content : content.toString('utf-8');
        const { parseJpz, convertJpzToUnified } = await import('./jpz');
        const puzzle = parseJpz(textContent);
        return convertJpzToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    } else if (ext === 'xd') {
      try {
        const textContent = typeof content === 'string' ? content : content.toString('utf-8');
        const { parseXd, convertXdToUnified } = await import('./xd');
        const puzzle = parseXd(textContent);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Fall through to content-based detection
      }
    }
  }

  // Auto-detect format based on content
  if (typeof content === 'string') {
    // Try text-based formats

    // Check for iPUZ (starts with ipuz({ or is JSON with version field)
    const trimmed = content.trim();
    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      try {
        const { parseIpuz, convertIpuzToUnified } = await import('./ipuz');
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
        const { parseJpz, convertJpzToUnified } = await import('./jpz');
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
        const { parseXd, convertXdToUnified } = await import('./xd');
        const puzzle = parseXd(content);
        return convertXdToUnified(puzzle);
      } catch (e) {
        // Not XD, continue checking
      }
    }

    // Try parsing as PUZ binary (might be base64 encoded or similar)
    try {
      const buffer = Buffer.from(content, 'base64');
      const { parsePuz, convertPuzToUnified } = await import('./puz');
      const puzzle = parsePuz(buffer);
      return convertPuzToUnified(puzzle);
    } catch (e) {
      // Not base64 PUZ
    }
  } else {
    // Binary data - try PUZ format
    try {
      const { parsePuz, convertPuzToUnified } = await import('./puz');
      const puzzle = parsePuz(content);
      return convertPuzToUnified(puzzle);
    } catch (e) {
      // Not PUZ, try converting to string for text formats
      const textContent = content.toString('utf-8');

      // Try text formats with string version
      const trimmed = textContent.trim();
      if (
        trimmed.startsWith('ipuz({') ||
        (trimmed.startsWith('{') && trimmed.includes('"version"'))
      ) {
        try {
          const { parseIpuz, convertIpuzToUnified } = await import('./ipuz');
          const puzzle = parseIpuz(textContent);
          return convertIpuzToUnified(puzzle);
        } catch (e) {
          // Not iPUZ
        }
      }

      if (textContent.includes('<?xml') || textContent.includes('<crossword')) {
        try {
          const { parseJpz, convertJpzToUnified } = await import('./jpz');
          const puzzle = parseJpz(textContent);
          return convertJpzToUnified(puzzle);
        } catch (e) {
          // Not JPZ
        }
      }
    }
  }

  throw new FormatDetectionError(
    'Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD',
  );
}
