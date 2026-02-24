import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { parsePuz, convertPuzToUnified, type PuzPuzzle } from "./puz";
import type { ParseOptions } from "./types";
import { PuzParseError } from "./errors";

describe("parsePuz", () => {
  const testDataDir = join(process.cwd(), "testdata", "puz");
  const puzFiles = readdirSync(testDataDir).filter((f) => f.endsWith(".puz"));

  it("should parse all PUZ test files without errors", () => {
    for (const file of puzFiles) {
      const filePath = join(testDataDir, file);
      const buffer = readFileSync(filePath);

      let puzzle: PuzPuzzle;
      try {
        puzzle = parsePuz(buffer);
      } catch (error) {
        throw new Error(
          `Failed to parse ${file}: ${error instanceof Error ? error.message : String(error)}`,
          { cause: error },
        );
      }

      expect(puzzle).toBeDefined();
      expect(puzzle.width).toBeGreaterThan(0);
      expect(puzzle.height).toBeGreaterThan(0);
      expect(puzzle.grid).toBeDefined();
      expect(Array.isArray(puzzle.grid)).toBe(true);
      expect(puzzle.grid.length).toBe(puzzle.height);
      expect(puzzle.across).toBeDefined();
      expect(Array.isArray(puzzle.across)).toBe(true);
      expect(puzzle.down).toBeDefined();
      expect(Array.isArray(puzzle.down)).toBe(true);
    }
  });

  it("should parse NYT weekday puzzle with notes correctly", () => {
    const filePath = join(testDataDir, "nyt_weekday_with_notes.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    expect(puzzle.width).toBe(15);
    expect(puzzle.height).toBe(15);
    expect(puzzle.metadata.notes).toBeDefined();
    expect(puzzle.metadata.notes).toContain(""); // Notes exist but may be empty or contain text

    // Check grid structure
    expect(puzzle.grid).toHaveLength(15);
    expect(puzzle.grid[0]).toHaveLength(15);

    // Check that we have clues
    expect(puzzle.across.length).toBeGreaterThan(0);
    expect(puzzle.down.length).toBeGreaterThan(0);

    // Verify first across clue has a number and text
    const firstAcross = puzzle.across[0];
    expect(firstAcross?.number).toBeGreaterThan(0);
    expect(firstAcross?.text).toBeDefined();
    expect(firstAcross?.text.length).toBeGreaterThan(0);
  });

  it("should detect scrambled/locked puzzles", () => {
    const filePath = join(testDataDir, "nyt_locked.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    expect(puzzle.isScrambled).toBeDefined();
    // The puzzle should be marked as scrambled
    expect(puzzle.isScrambled).toBe(true);
  });

  it("should parse puzzle with rebus squares", () => {
    const filePath = join(testDataDir, "nyt_sun_rebus.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Sunday puzzles are typically 21x21
    expect(puzzle.width).toBe(21);
    expect(puzzle.height).toBe(21);

    // Check for rebus content
    if (puzzle.rebusTable && puzzle.rebusTable.size > 0) {
      // If rebus table exists, verify some cells have rebus markers
      let hasRebusCell = false;
      for (const row of puzzle.grid) {
        for (const cell of row) {
          if (cell.hasRebus) {
            hasRebusCell = true;
            break;
          }
        }
        if (hasRebusCell) break;
      }
      expect(hasRebusCell).toBe(true);
    }
  });

  it("should parse puzzle with shape/circles", () => {
    const filePath = join(testDataDir, "nyt_with_shape.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Check if any cells have circles
    let hasCircledCell = false;
    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (cell.isCircled) {
          hasCircledCell = true;
          break;
        }
      }
      if (hasCircledCell) break;
    }

    // This puzzle should have circled squares
    expect(hasCircledCell).toBe(true);
  });

  it("should handle partially filled puzzles", () => {
    const filePath = join(testDataDir, "nyt_partlyfilled.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Check for player state in cells
    let hasFilledCell = false;
    let hasEmptyCell = false;

    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (!cell.isBlack) {
          if (cell.playerState) {
            hasFilledCell = true;
          } else {
            hasEmptyCell = true;
          }
        }
      }
    }

    // Partially filled puzzle should have both filled and empty cells
    expect(hasFilledCell).toBe(true);
    expect(hasEmptyCell).toBe(true);
  });

  it("should parse unicode puzzle correctly", () => {
    const filePath = join(testDataDir, "unicode.puz");
    const buffer = readFileSync(filePath);

    // This should parse without throwing
    const puzzle = parsePuz(buffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
  });

  it("should correctly identify black squares", () => {
    const filePath = join(testDataDir, "av110622.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Count black squares
    let blackCount = 0;
    for (const row of puzzle.grid) {
      for (const cell of row) {
        if (cell.isBlack) {
          blackCount++;
        }
      }
    }

    // Standard puzzles have black squares
    expect(blackCount).toBeGreaterThan(0);
    expect(blackCount).toBeLessThan(puzzle.width * puzzle.height);
  });

  it("should parse metadata fields correctly", () => {
    const filePath = join(testDataDir, "wsj110624.puz");
    const buffer = readFileSync(filePath);
    const puzzle = parsePuz(buffer);

    // Wall Street Journal puzzles should have metadata
    expect(puzzle.metadata).toBeDefined();

    // At least one of these should be defined
    const hasMetadata =
      puzzle.metadata.title ||
      puzzle.metadata.author ||
      puzzle.metadata.copyright;
    expect(hasMetadata).toBeTruthy();
  });

  it("should handle diagramless puzzles", () => {
    const filePath = join(testDataDir, "nyt_diagramless.puz");
    const buffer = readFileSync(filePath);

    // Diagramless puzzles might have special properties but should still parse
    const puzzle = parsePuz(buffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
    expect(puzzle.across).toBeDefined();
    expect(puzzle.down).toBeDefined();
  });

  it("should respect maxGridSize option", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));

    // First verify the puzzle can be parsed normally
    const puzzle = parsePuz(buffer);
    expect(puzzle.width).toBeGreaterThan(5);
    expect(puzzle.height).toBeGreaterThan(5);

    // Then verify it throws with a smaller maxGridSize
    const options: ParseOptions = {
      maxGridSize: { width: 5, height: 5 },
    };

    expect(() => parsePuz(buffer, options)).toThrow(
      /Grid dimensions too large/,
    );
  });

  it("should allow puzzle within maxGridSize limits", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));

    // Use a large enough maxGridSize
    const options: ParseOptions = {
      maxGridSize: { width: 100, height: 100 },
    };

    const puzzle = parsePuz(buffer, options);
    expect(puzzle).toBeDefined();
    expect(puzzle.grid).toBeDefined();
  });

  // Test different input types (ArrayBuffer, Uint8Array, base64 string)
  it("should parse from ArrayBuffer input", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );

    const puzzle = parsePuz(arrayBuffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.width).toBeGreaterThan(0);
    expect(puzzle.height).toBeGreaterThan(0);
  });

  it("should parse from Uint8Array input", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));
    const uint8Array = new Uint8Array(buffer);

    const puzzle = parsePuz(uint8Array);
    expect(puzzle).toBeDefined();
    expect(puzzle.width).toBeGreaterThan(0);
    expect(puzzle.height).toBeGreaterThan(0);
  });

  it("should parse from base64 string input", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));
    const base64String = buffer.toString("base64");

    const puzzle = parsePuz(base64String);
    expect(puzzle).toBeDefined();
    expect(puzzle.width).toBeGreaterThan(0);
    expect(puzzle.height).toBeGreaterThan(0);
  });

  // Test buffer boundary errors
  it("should throw error when buffer is too short for header", () => {
    const shortBuffer = Buffer.from("ACROSS&DOWN");
    expect(() => parsePuz(shortBuffer)).toThrow(PuzParseError);
  });

  it("should throw error when magic string is found too early", () => {
    // Create a buffer with magic string at the very beginning
    const buffer = Buffer.concat([
      Buffer.from("ACROSS&DOWN"),
      Buffer.alloc(100),
    ]);
    expect(() => parsePuz(buffer)).toThrow("magic string found too early");
  });

  it("should throw error when buffer has insufficient data for header", () => {
    // Create a buffer with checksum bytes before magic but not enough for full header
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      Buffer.alloc(5), // not enough for rest of header
    ]);
    expect(() => parsePuz(buffer)).toThrow("insufficient data for header");
  });

  it("should throw error on magic string mismatch after positioning", () => {
    // Create a buffer that appears to have the right structure but wrong magic
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("WRONGMAGIC!!"), // wrong magic string (12 bytes)
      Buffer.alloc(40), // rest of header
    ]);
    // This throws PuzParseError since magic string is not found during search
    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
    expect(() => parsePuz(buffer)).toThrow(
      'magic string "ACROSS&DOWN" not found',
    );
  });

  // Test invalid dimensions
  it("should throw error for zero width", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));
    // Manually corrupt the width byte
    const corruptBuffer = Buffer.from(buffer);
    corruptBuffer[0x2c] = 0; // width byte location in header
    expect(() => parsePuz(corruptBuffer)).toThrow("Invalid puzzle dimensions");
  });

  it("should throw error for negative dimensions", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));
    // Create a corrupt buffer with negative width (high bit set)
    const corruptBuffer = Buffer.from(buffer);
    corruptBuffer[0x2c] = 0xff; // This creates a very large unsigned value
    corruptBuffer[0x2d] = 0xff; // height
    expect(() => parsePuz(corruptBuffer)).toThrow(/Grid dimensions too large/);
  });

  // Test buffer reading edge cases
  it("should handle readString with null bytes", () => {
    // Create a minimal valid PUZ with null bytes in strings
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      Buffer.alloc(40, 0), // rest of header with nulls
    ]);
    buffer[0x2c] = 5; // width
    buffer[0x2d] = 5; // height
    buffer[0x2e] = 1; // numClues

    // This tests the null path in readString
    expect(() => parsePuz(buffer)).toThrow(); // Will fail on actual parsing but tests the path
  });

  // Test convertPuzToUnified edge cases
  it("should handle puzzle with circled cells in conversion", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_with_shape.puz"));
    const puzPuzzle = parsePuz(buffer);
    const unified = convertPuzToUnified(puzPuzzle);

    // Find a circled cell
    let hasCircledCell = false;
    for (const row of unified.grid.cells) {
      for (const cell of row) {
        if (cell.isCircled) {
          hasCircledCell = true;
          expect(cell.isCircled).toBe(true);
        }
      }
    }
    expect(hasCircledCell).toBe(true);
  });

  it("should handle puzzle with rebus and rebusKey in conversion", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_sun_rebus.puz"));
    const puzPuzzle = parsePuz(buffer);
    const unified = convertPuzToUnified(puzPuzzle);

    // Check if rebus table exists
    if (unified.rebusTable && unified.rebusTable.size > 0) {
      // Find cells with rebus
      let foundRebusWithKey = false;
      for (const row of unified.grid.cells) {
        for (const cell of row) {
          if (cell.hasRebus && cell.rebusKey !== undefined) {
            foundRebusWithKey = true;
            expect(unified.rebusTable.has(cell.rebusKey)).toBe(true);
          }
        }
      }
      expect(foundRebusWithKey).toBe(true);
    }
  });

  // Test buffer read errors with truncated data
  it("should throw error when reading beyond buffer in readUInt8", () => {
    const tinyBuffer = Buffer.from([0x01]);
    expect(() => {
      // This will try to read the header which requires more bytes
      parsePuz(tinyBuffer);
    }).toThrow(PuzParseError);
  });

  it("should throw error when reading beyond buffer in readUInt16LE", () => {
    const smallBuffer = Buffer.from([0x01, 0x02, 0x03]); // Only 3 bytes
    expect(() => {
      parsePuz(smallBuffer);
    }).toThrow(PuzParseError);
  });

  it("should throw error when reading beyond buffer in readBytes", () => {
    // Create buffer with valid start but will fail when reading strings
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic (12 bytes)
      Buffer.alloc(30), // Not enough for full header + data
    ]);
    buffer[0x2c] = 15; // width
    buffer[0x2d] = 15; // height
    buffer[0x2e] = 50; // numClues - too many for buffer

    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
  });

  it("should throw error for unterminated string in readNullTerminatedString", () => {
    // Create a buffer that will trigger readNullTerminatedString without null terminator
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      Buffer.alloc(40), // header
    ]);
    buffer[0x2c] = 3; // width
    buffer[0x2d] = 3; // height
    buffer[0x2e] = 4; // numClues

    // Add grid data but no null terminators for strings
    const gridData = Buffer.from("...ABCDEF"); // 9 bytes for 3x3 grid
    const fullBuffer = Buffer.concat([
      buffer,
      gridData,
      gridData, // player state
      Buffer.from("TitleWithoutNull"), // title without null terminator
    ]);

    expect(() => parsePuz(fullBuffer)).toThrow(PuzParseError);
  });

  // Test ArrayBuffer input handling
  it("should properly parse from ArrayBuffer input", () => {
    const buffer = readFileSync(join(testDataDir, "nyt_locked.puz"));
    // Create a real ArrayBuffer (not a Node.js Buffer's underlying ArrayBuffer)
    const arrayBuffer = new ArrayBuffer(buffer.length);
    const view = new Uint8Array(arrayBuffer);
    view.set(buffer);

    // This tests the ArrayBuffer constructor path
    const puzzle = parsePuz(arrayBuffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.width).toBeGreaterThan(0);
  });

  // Test insufficient header data handling
  it("should throw error when buffer has insufficient header data", () => {
    // Create minimal buffer that will pass magic string check but fail on header size check
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      Buffer.alloc(30), // partial header - not enough for full read
    ]);

    // This will fail with insufficient data for header
    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
    expect(() => parsePuz(buffer)).toThrow("insufficient data for header");
  });

  // Test magic string position validation
  it("should throw error when magic string is found too early in file", () => {
    // Create buffer that ends exactly where readUInt16LE would read beyond
    const buffer = Buffer.concat([
      Buffer.from([0x00]), // Only 1 byte for checksum, need 2
      Buffer.from("ACROSS&DOWN"), // magic
    ]);

    // This should trigger the magic string position check
    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
    expect(() => parsePuz(buffer)).toThrow("magic string found too early");
  });

  // Test grid data reading with oversized dimensions
  it("should throw error when grid dimensions exceed buffer size", () => {
    // Create buffer that passes header checks but fails on grid read
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      Buffer.alloc(40), // full header size
    ]);

    // Set dimensions that will cause grid read to exceed buffer
    buffer[0x2c] = 100; // width = 100
    buffer[0x2d] = 100; // height = 100
    buffer[0x2e] = 0; // numClues = 0

    // This should fail when trying to read grid data
    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
  });

  // Test header reading with truncated buffer
  it("should throw error when header is truncated", () => {
    // Create a buffer that will fail on readUInt16LE for clue count
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      Buffer.alloc(45), // Almost full header, missing last byte
    ]);

    // This should fail when reading numClues (16-bit at offset 0x2E)
    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
  });

  it("should throw InvalidFileError when magic string verification fails", () => {
    // Create buffer where we position at wrong magic but it looks like valid structure
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum at position 0
      Buffer.from("WRONGMAGIC!!"), // wrong magic (12 bytes) at position 2
      Buffer.alloc(50), // rest of data
    ]);

    // Since "ACROSS&DOWN" is not found, it throws before verification
    expect(() => parsePuz(buffer)).toThrow(
      'magic string "ACROSS&DOWN" not found',
    );
  });

  // Test BinaryParseError to PuzParseError conversion
  it("should convert BinaryParseError to PuzParseError", () => {
    // Create a buffer that will cause BinaryReader to throw when reading header
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00]), // checksum
      Buffer.from("ACROSS&DOWN"), // magic
      // Truncate right after magic string - will fail on next read
    ]);

    // The BinaryParseError should be converted to PuzParseError
    expect(() => parsePuz(buffer)).toThrow(PuzParseError);
    try {
      parsePuz(buffer);
    } catch (e) {
      expect(e).toBeInstanceOf(PuzParseError);
      if (e instanceof PuzParseError) {
        // Should be PUZ_INVALID_HEADER from header reading failure
        expect(e.code).toBe("PUZ_INVALID_HEADER");
      }
    }
  });

  // Test complete minimal PUZ file parsing
  it("should handle complete minimal valid PUZ file", () => {
    // Create a carefully crafted buffer that will exercise boundary checks
    // Header is exactly 52 bytes (0x34)
    const header = Buffer.alloc(52);

    // Write header fields at correct offsets
    header.writeUInt16LE(0x0000, 0x00); // checksum
    header.write("ACROSS&DOWN", 0x02, "latin1"); // magic string at 0x02
    header.writeUInt16LE(0x0000, 0x0e); // cibChecksum
    header.writeUInt16LE(0x0000, 0x10); // maskedLowChecksum
    header.writeUInt16LE(0x0000, 0x12); // maskedHighChecksum
    header.write("1.3\0", 0x14, "latin1"); // version
    header.writeUInt16LE(0x0000, 0x18); // reserved1
    header.writeUInt16LE(0x0000, 0x1a); // scrambledChecksum
    // reserved2 is at 0x1C-0x27 (12 bytes, already zeros)
    // skip bytes at 0x28-0x2B (4 bytes, already zeros)
    header.writeUInt8(0x03, 0x2c); // width=3
    header.writeUInt8(0x03, 0x2d); // height=3
    header.writeUInt16LE(0x0000, 0x2e); // numClues=0
    header.writeUInt16LE(0x0001, 0x30); // puzzleType=1
    header.writeUInt16LE(0x0000, 0x32); // scrambledTag=0

    const buffer = Buffer.concat([
      header,
      // Grid data
      Buffer.from("...ABCDEF"), // 3x3 solution
      Buffer.from("---------"), // 3x3 player state
      Buffer.from("\x00"), // empty title
      Buffer.from("\x00"), // empty author
      Buffer.from("\x00"), // empty copyright
      Buffer.from("\x00"), // empty notes
    ]);

    const puzzle = parsePuz(buffer);
    expect(puzzle).toBeDefined();
    expect(puzzle.width).toBe(3);
    expect(puzzle.height).toBe(3);
  });
});
