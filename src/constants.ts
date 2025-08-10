/**
 * Shared constants for all parsers
 */

// Maximum grid dimensions to prevent excessive memory usage
// Most crosswords are 15x15 to 21x21, with Sunday puzzles typically 21x21
// 100x100 provides plenty of headroom while preventing abuse
export const MAX_GRID_WIDTH = 100;
export const MAX_GRID_HEIGHT = 100;
