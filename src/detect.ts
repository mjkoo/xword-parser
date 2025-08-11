export type FormatType = 'ipuz' | 'puz' | 'jpz' | 'xd' | 'unknown';

export interface FormatHint {
  format: FormatType;
  confidence: 'high' | 'medium' | 'low';
}

export function detectFormatFromContent(content: string | Buffer, filename?: string): FormatHint[] {
  const hints: FormatHint[] = [];

  // Check filename extension first
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'puz') {
      hints.push({ format: 'puz', confidence: 'high' });
    } else if (ext === 'ipuz') {
      hints.push({ format: 'ipuz', confidence: 'high' });
    } else if (ext === 'jpz') {
      hints.push({ format: 'jpz', confidence: 'high' });
    } else if (ext === 'xd') {
      hints.push({ format: 'xd', confidence: 'high' });
    }
  }

  // Content-based detection
  if (typeof content === 'string') {
    const trimmed = content.trim();

    // iPUZ detection
    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      if (!hints.some((h) => h.format === 'ipuz')) {
        hints.push({ format: 'ipuz', confidence: 'high' });
      }
    }

    // JPZ detection (XML)
    if (
      content.includes('<?xml') ||
      content.includes('<crossword') ||
      content.includes('<puzzle')
    ) {
      if (!hints.some((h) => h.format === 'jpz')) {
        hints.push({ format: 'jpz', confidence: 'high' });
      }
    }

    // XD detection
    const lines = content.split('\n');
    const hasXdHeaders = lines.some((line) =>
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line),
    );
    if (hasXdHeaders) {
      if (!hints.some((h) => h.format === 'xd')) {
        hints.push({ format: 'xd', confidence: 'high' });
      }
    }
  } else {
    // Binary content - likely PUZ
    if (!hints.some((h) => h.format === 'puz')) {
      hints.push({ format: 'puz', confidence: 'medium' });
    }

    // But could also be text encoded as Buffer
    const textContent = content.toString('utf-8');
    const trimmed = textContent.trim();

    if (
      trimmed.startsWith('ipuz({') ||
      (trimmed.startsWith('{') && trimmed.includes('"version"'))
    ) {
      if (!hints.some((h) => h.format === 'ipuz')) {
        hints.push({ format: 'ipuz', confidence: 'medium' });
      }
    }

    if (
      textContent.includes('<?xml') ||
      textContent.includes('<crossword') ||
      textContent.includes('<puzzle')
    ) {
      if (!hints.some((h) => h.format === 'jpz')) {
        hints.push({ format: 'jpz', confidence: 'medium' });
      }
    }

    const lines = textContent.split('\n');
    const hasXdHeaders = lines.some((line) =>
      /^(Title|Author|Editor|Copyright|Date|Rebus|Notepad|Notes?):/i.test(line),
    );
    if (hasXdHeaders) {
      if (!hints.some((h) => h.format === 'xd')) {
        hints.push({ format: 'xd', confidence: 'medium' });
      }
    }
  }

  // Sort by confidence (high first)
  hints.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
  });

  return hints;
}

export function getOrderedFormatsToTry(content: string | Buffer, filename?: string): FormatType[] {
  const hints = detectFormatFromContent(content, filename);
  const formats: FormatType[] = [];

  // Add hinted formats first
  for (const hint of hints) {
    if (!formats.includes(hint.format)) {
      formats.push(hint.format);
    }
  }

  // Add remaining formats
  const allFormats: FormatType[] = ['ipuz', 'puz', 'jpz', 'xd'];
  for (const format of allFormats) {
    if (!formats.includes(format)) {
      formats.push(format);
    }
  }

  return formats;
}
