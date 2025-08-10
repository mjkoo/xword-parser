export type Direction = 'across' | 'down';

export interface ParserOptions {
  strict?: boolean;
  encoding?: BufferEncoding;
}

export class XwordParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XwordParseError';
  }
}