export function parse(_data: string | Buffer | ArrayBuffer): XwordPuzzle {
  throw new Error('Not implemented yet');
}

export interface XwordPuzzle {
  title?: string;
  author?: string;
  copyright?: string;
  grid: Grid;
  clues: Clues;
}

export interface Grid {
  width: number;
  height: number;
  cells: Cell[][];
}

export interface Cell {
  solution?: string;
  number?: number;
  isBlack: boolean;
}

export interface Clues {
  across: Clue[];
  down: Clue[];
}

export interface Clue {
  number: number;
  text: string;
}

export * from './types';
export * from './ipuz';