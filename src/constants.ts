/**
 * Shared constants for all parsers
 */

// Maximum grid dimensions to prevent excessive memory usage
// Most crosswords are 15x15 to 21x21, with Sunday puzzles typically 21x21
// 100x100 provides plenty of headroom while preventing abuse
export const MAX_GRID_WIDTH = 100;
export const MAX_GRID_HEIGHT = 100;

// PUZ format constants
export const PUZ_MAGIC_STRING = "ACROSS&DOWN";
export const PUZ_HEADER_SIZE = 52;

// PUZ header offsets
export const PUZ_CHECKSUM_OFFSET = 0x00;
export const PUZ_FILE_MAGIC_OFFSET = 0x02;
export const PUZ_HEADER_CHECKSUM_OFFSET = 0x0e;
export const PUZ_VERSION_OFFSET = 0x14;
export const PUZ_WIDTH_OFFSET = 0x2c;
export const PUZ_HEIGHT_OFFSET = 0x2d;
export const PUZ_NUM_CLUES_OFFSET = 0x2e;
export const PUZ_SCRAMBLED_TAG_OFFSET = 0x32;

// PUZ section types
export const PUZ_SECTION_GEXT = "GEXT";
export const PUZ_SECTION_LTIM = "LTIM";
export const PUZ_SECTION_RTBL = "RTBL";
export const PUZ_SECTION_RUSR = "RUSR";
export const PUZ_SECTION_GRBS = "GRBS";

// PUZ flags
export const PUZ_CIRCLED_CELL_FLAG = 0x80;
