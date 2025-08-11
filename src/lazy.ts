import { FormatDetectionError, XwordParseError } from './errors';
import { getOrderedFormatsToTry } from './detect';
import type { Puzzle, ParseOptions } from './types';

export async function parseLazy(
  data: string | Buffer | ArrayBuffer,
  options?: ParseOptions,
): Promise<Puzzle> {
  let content: string | Buffer;
  if (data instanceof ArrayBuffer) {
    content = Buffer.from(data);
  } else {
    content = data;
  }

  const formatsToTry = getOrderedFormatsToTry(content, options?.filename);
  let lastError: unknown;

  for (const format of formatsToTry) {
    try {
      switch (format) {
        case 'ipuz': {
          const textContent =
            typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
          const { parseIpuz, convertIpuzToUnified } = await import('./ipuz');
          const puzzle = parseIpuz(textContent, options);
          return convertIpuzToUnified(puzzle);
        }
        case 'puz': {
          if (typeof content !== 'string') {
            const { parsePuz, convertPuzToUnified } = await import('./puz');
            const puzzle = parsePuz(content);
            return convertPuzToUnified(puzzle);
          }
          break;
        }
        case 'jpz': {
          const textContent =
            typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
          const { parseJpz, convertJpzToUnified } = await import('./jpz');
          const puzzle = parseJpz(textContent, options);
          return convertJpzToUnified(puzzle);
        }
        case 'xd': {
          const textContent =
            typeof content === 'string' ? content : content.toString(options?.encoding || 'utf-8');
          const { parseXd, convertXdToUnified } = await import('./xd');
          const puzzle = parseXd(textContent, options);
          return convertXdToUnified(puzzle);
        }
      }
    } catch (e) {
      lastError = e;
      // Only continue trying other formats if this is a format mismatch
      if (e instanceof XwordParseError && !e.isFormatMismatch()) {
        throw e;
      }
    }
  }

  // If we get here, no format worked
  // Only throw lastError if it was NOT a format mismatch (i.e., a real parse error)
  if (lastError && !(lastError instanceof XwordParseError && lastError.isFormatMismatch())) {
    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new FormatDetectionError(
      'Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD',
      undefined,
      lastError,
    );
  }

  // Otherwise, we couldn't detect the format
  throw new FormatDetectionError(
    'Unable to detect puzzle format. Supported formats: iPUZ, PUZ, JPZ, XD',
  );
}
