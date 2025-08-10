import { InvalidFileError } from './errors';

export interface XdMetadata {
  title?: string;
  author?: string;
  editor?: string;
  copyright?: string;
  date?: string;
  rebus?: string;
  [key: string]: string | undefined;
}

export interface XdClue {
  number: string;
  clue: string;
  answer: string;
  metadata?: Record<string, string>;
}

export interface XdPuzzle {
  metadata: XdMetadata;
  grid: string[][];
  across: XdClue[];
  down: XdClue[];
  notes?: string;
}

function parseMetadata(lines: string[]): XdMetadata {
  const metadata: XdMetadata = {};
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim();
    const value = line.substring(colonIndex + 1).trim();
    
    if (key && value) {
      // Convert first character to lowercase to match TypeScript conventions
      const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
      metadata[normalizedKey] = value;
    }
  }
  
  return metadata;
}

function parseGrid(lines: string[]): string[][] {
  return lines.map(line => {
    const cells: string[] = [];
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char !== undefined) {
        cells.push(char);
      }
    }
    return cells;
  });
}

function parseClues(lines: string[]): { across: XdClue[], down: XdClue[] } {
  const across: XdClue[] = [];
  const down: XdClue[] = [];
  
  for (const line of lines) {
    if (line.length === 0) continue;
    
    const match = line.match(/^([AD])(\d+)\.\s+(.+?)(?:\s+~\s+(.+))?$/);
    if (match) {
      const [, direction, number, clue, answer] = match;
      
      const clueObj: XdClue = {
        number: number ?? '',
        clue: clue?.trim() ?? '',
        answer: answer?.trim() ?? ''
      };
      
      if (direction === 'A') {
        across.push(clueObj);
      } else {
        down.push(clueObj);
      }
    }
  }
  
  return { across, down };
}


function splitIntoSections(content: string): { metadata: string[], grid: string[], clues: string[], notes: string[] } {
  const lines = content.split('\n');
  const sections: string[][] = [];
  let currentSection: string[] = [];
  let blankLineCount = 0;
  
  for (const line of lines) {
    if (line.trim() === '') {
      blankLineCount++;
      if (blankLineCount >= 2 && currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
        blankLineCount = 0;
      }
    } else {
      if (blankLineCount === 1 && currentSection.length > 0) {
        sections.push(currentSection);
        currentSection = [];
      }
      blankLineCount = 0;
      currentSection.push(line);
    }
  }
  
  if (currentSection.length > 0) {
    sections.push(currentSection);
  }
  
  const result = {
    metadata: [] as string[],
    grid: [] as string[],
    clues: [] as string[],
    notes: [] as string[]
  };
  
  let sectionIndex = 0;
  
  if (sections.length > sectionIndex) {
    const section = sections[sectionIndex];
    if (section && section.some(line => line.includes(':'))) {
      result.metadata = section;
      sectionIndex++;
    }
  }
  
  if (sections.length > sectionIndex) {
    const section = sections[sectionIndex];
    if (section && section.every(line => 
      /^[A-Za-z0-9#._]+$/.test(line) && line.length > 0
    )) {
      result.grid = section;
      sectionIndex++;
    }
  }
  
  while (sections.length > sectionIndex) {
    const section = sections[sectionIndex];
    if (section && section.some(line => /^[AD]\d+\./.test(line))) {
      result.clues.push(...section);
      sectionIndex++;
    } else {
      break;
    }
  }
  
  if (sections.length > sectionIndex) {
    for (let i = sectionIndex; i < sections.length; i++) {
      const section = sections[i];
      if (section) {
        result.notes.push(...section);
      }
    }
  }
  
  return result;
}

export function parseXd(content: string): XdPuzzle {
  const sections = splitIntoSections(content);
  
  if (sections.grid.length === 0) {
    throw new InvalidFileError('XD', 'no grid section found');
  }
  
  const metadata = parseMetadata(sections.metadata);
  const grid = parseGrid(sections.grid);
  const { across, down } = parseClues(sections.clues);
  
  const puzzle: XdPuzzle = {
    metadata,
    grid,
    across,
    down
  };
  
  if (sections.notes.length > 0) {
    puzzle.notes = sections.notes.join('\n').trim();
  }
  
  return puzzle;
}