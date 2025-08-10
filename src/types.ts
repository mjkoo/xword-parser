export type Direction = 'across' | 'down';

export class XwordParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'XwordParseError';
  }
}