/**
 * Generic binary reader for parsing binary file formats
 */

import { BinaryParseError } from "./errors";

/**
 * A utility class for reading binary data from buffers with automatic offset tracking.
 */
export class BinaryReader {
  private _buffer: Buffer;
  private _offset: number;

  constructor(data: Buffer | ArrayBuffer | Uint8Array) {
    if (data instanceof ArrayBuffer) {
      this._buffer = Buffer.from(data);
    } else if (data instanceof Uint8Array) {
      this._buffer = Buffer.from(data);
    } else {
      this._buffer = data;
    }
    this._offset = 0;
  }

  /**
   * Read an unsigned 8-bit integer and advance the offset
   */
  readUInt8(): number {
    if (this._offset + 1 > this._buffer.length) {
      throw new BinaryParseError(
        `Cannot read byte at offset ${this._offset}: buffer too short (length: ${this._buffer.length})`,
      );
    }
    const value = this._buffer.readUInt8(this._offset);
    this._offset += 1;
    return value;
  }

  /**
   * Read an unsigned 16-bit integer (little-endian) and advance the offset
   */
  readUInt16LE(): number {
    if (this._offset + 2 > this._buffer.length) {
      throw new BinaryParseError(
        `Cannot read 16-bit value at offset ${this._offset}: buffer too short (length: ${this._buffer.length})`,
      );
    }
    const value = this._buffer.readUInt16LE(this._offset);
    this._offset += 2;
    return value;
  }

  /**
   * Read a specified number of bytes and advance the offset
   */
  readBytes(length: number): Buffer {
    if (this._offset + length > this._buffer.length) {
      throw new BinaryParseError(
        `Cannot read ${length} bytes at offset ${this._offset}: buffer too short (length: ${this._buffer.length})`,
      );
    }
    const value = this._buffer.slice(this._offset, this._offset + length);
    this._offset += length;
    return value;
  }

  /**
   * Read a string of specified length with optional null trimming
   * @param length Number of bytes to read
   * @param trimNull Whether to trim at first null byte (default: true)
   * @param encoding Character encoding (default: 'latin1')
   */
  readString(
    length: number,
    trimNull: boolean = true,
    encoding: BufferEncoding = "latin1",
  ): string {
    const bytes = this.readBytes(length);
    if (trimNull) {
      // Remove trailing nulls
      let end = bytes.indexOf(0);
      if (end === -1) end = length;
      return bytes.toString(encoding, 0, end);
    }
    return bytes.toString(encoding);
  }

  /**
   * Read a null-terminated string and advance past the null terminator
   * @param encoding Character encoding (default: 'latin1')
   */
  readNullTerminatedString(encoding: BufferEncoding = "latin1"): string {
    const start = this._offset;
    while (
      this._offset < this._buffer.length &&
      this._buffer[this._offset] !== 0
    ) {
      this._offset++;
    }
    if (this._offset >= this._buffer.length) {
      throw new BinaryParseError(
        `Cannot read null-terminated string at offset ${start}: buffer ended without null terminator`,
      );
    }
    const str = this._buffer.toString(encoding, start, this._offset);
    this._offset++; // Skip null terminator
    return str;
  }

  /**
   * Move the read position to a specific offset
   */
  seek(position: number): void {
    if (position < 0 || position > this._buffer.length) {
      throw new BinaryParseError(
        `Cannot seek to position ${position}: out of bounds (buffer length: ${this._buffer.length})`,
      );
    }
    this._offset = position;
  }

  /**
   * Get the current read position
   */
  get position(): number {
    return this._offset;
  }

  /**
   * Get the total length of the buffer
   */
  get length(): number {
    return this._buffer.length;
  }

  /**
   * Get the underlying buffer
   */
  get buffer(): Buffer {
    return this._buffer;
  }

  /**
   * Check if there's more data to read
   */
  hasMore(): boolean {
    return this._offset < this._buffer.length;
  }

  /**
   * Get the number of bytes remaining to read
   */
  get remaining(): number {
    return this._buffer.length - this._offset;
  }
}
