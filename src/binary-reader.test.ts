import { describe, it, expect } from 'vitest';
import { BinaryReader } from './binary-reader';
import { BinaryParseError } from './errors';

describe('BinaryReader', () => {
  describe('constructor', () => {
    it('should accept Buffer input and read data correctly', () => {
      const buffer = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
      const reader = new BinaryReader(buffer);
      expect(reader.length).toBe(5);
      expect(reader.position).toBe(0);

      // Verify we can actually read the data
      expect(reader.readUInt8()).toBe(0x01);
      expect(reader.readUInt16LE()).toBe(0x0302); // 0x02 + (0x03 << 8)
      expect(reader.readBytes(2)).toEqual(Buffer.from([0x04, 0x05]));
      expect(reader.position).toBe(5);

      // Verify the buffer property returns the original buffer
      expect(reader.buffer).toEqual(buffer);
    });

    it('should accept ArrayBuffer input', () => {
      const arrayBuffer = new ArrayBuffer(3);
      const view = new Uint8Array(arrayBuffer);
      view[0] = 0x01;
      view[1] = 0x02;
      view[2] = 0x03;
      const reader = new BinaryReader(arrayBuffer);
      expect(reader.length).toBe(3);
      expect(reader.position).toBe(0);
    });

    it('should accept Uint8Array input and read data correctly', () => {
      const uint8Array = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const reader = new BinaryReader(uint8Array);
      expect(reader.length).toBe(4);
      expect(reader.position).toBe(0);

      // Verify we can actually read the data
      expect(reader.readUInt8()).toBe(0x01);
      expect(reader.readUInt16LE()).toBe(0x0302); // 0x02 + (0x03 << 8)
      expect(reader.readUInt8()).toBe(0x04);
      expect(reader.position).toBe(4);
    });
  });

  describe('readUInt8', () => {
    it('should read single byte and advance offset', () => {
      const reader = new BinaryReader(Buffer.from([0x42, 0x99]));
      expect(reader.readUInt8()).toBe(0x42);
      expect(reader.position).toBe(1);
      expect(reader.readUInt8()).toBe(0x99);
      expect(reader.position).toBe(2);
    });

    it('should throw error when reading beyond buffer', () => {
      const reader = new BinaryReader(Buffer.from([0x42]));
      reader.readUInt8(); // Read the only byte
      expect(() => reader.readUInt8()).toThrow(BinaryParseError);
      expect(() => reader.readUInt8()).toThrow('Cannot read byte at offset 1: buffer too short');
    });

    it('should throw error on empty buffer', () => {
      const reader = new BinaryReader(Buffer.from([]));
      expect(() => reader.readUInt8()).toThrow(BinaryParseError);
      expect(() => reader.readUInt8()).toThrow('Cannot read byte at offset 0: buffer too short');
    });
  });

  describe('readUInt16LE', () => {
    it('should read 16-bit little-endian value and advance offset', () => {
      const reader = new BinaryReader(Buffer.from([0x34, 0x12, 0x78, 0x56]));
      expect(reader.readUInt16LE()).toBe(0x1234);
      expect(reader.position).toBe(2);
      expect(reader.readUInt16LE()).toBe(0x5678);
      expect(reader.position).toBe(4);
    });

    it('should throw error when buffer has only 1 byte', () => {
      const reader = new BinaryReader(Buffer.from([0x42]));
      expect(() => reader.readUInt16LE()).toThrow(BinaryParseError);
      expect(() => reader.readUInt16LE()).toThrow(
        'Cannot read 16-bit value at offset 0: buffer too short',
      );
    });

    it('should throw error when reading beyond buffer', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02, 0x03]));
      reader.readUInt16LE(); // Read first 2 bytes
      expect(() => reader.readUInt16LE()).toThrow(BinaryParseError);
      expect(() => reader.readUInt16LE()).toThrow(
        'Cannot read 16-bit value at offset 2: buffer too short',
      );
    });
  });

  describe('readBytes', () => {
    it('should read specified number of bytes', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]));
      const bytes = reader.readBytes(3);
      expect(bytes).toEqual(Buffer.from([0x01, 0x02, 0x03]));
      expect(reader.position).toBe(3);
    });

    it('should read zero bytes', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02]));
      const bytes = reader.readBytes(0);
      expect(bytes.length).toBe(0);
      expect(reader.position).toBe(0);
    });

    it('should throw error when reading beyond buffer', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02]));
      expect(() => reader.readBytes(3)).toThrow(BinaryParseError);
      expect(() => reader.readBytes(3)).toThrow(
        'Cannot read 3 bytes at offset 0: buffer too short',
      );
    });
  });

  describe('readString', () => {
    it('should read string with null trimming by default', () => {
      const buffer = Buffer.from('hello\x00world\x00', 'latin1');
      const reader = new BinaryReader(buffer);
      const str = reader.readString(12);
      expect(str).toBe('hello');
      expect(reader.position).toBe(12);
    });

    it('should read string without null trimming when trimNull is false', () => {
      const buffer = Buffer.from('hello\x00world\x00', 'latin1');
      const reader = new BinaryReader(buffer);
      const str = reader.readString(12, false);
      expect(str).toBe('hello\x00world\x00');
      expect(reader.position).toBe(12);
    });

    it('should read string with no null bytes', () => {
      const buffer = Buffer.from('hello', 'latin1');
      const reader = new BinaryReader(buffer);
      const str = reader.readString(5);
      expect(str).toBe('hello');
    });

    it('should handle different encodings', () => {
      const buffer = Buffer.from('hello', 'utf8');
      const reader = new BinaryReader(buffer);
      const str = reader.readString(5, true, 'utf8');
      expect(str).toBe('hello');
    });

    it('should throw error when reading beyond buffer', () => {
      const reader = new BinaryReader(Buffer.from('hi'));
      expect(() => reader.readString(3)).toThrow(BinaryParseError);
      expect(() => reader.readString(3)).toThrow(
        'Cannot read 3 bytes at offset 0: buffer too short',
      );
    });
  });

  describe('readNullTerminatedString', () => {
    it('should read until null terminator', () => {
      const buffer = Buffer.from('hello\x00world', 'latin1');
      const reader = new BinaryReader(buffer);
      const str = reader.readNullTerminatedString();
      expect(str).toBe('hello');
      expect(reader.position).toBe(6); // Including null terminator
    });

    it('should read empty string when null is first', () => {
      const buffer = Buffer.from('\x00hello', 'latin1');
      const reader = new BinaryReader(buffer);
      const str = reader.readNullTerminatedString();
      expect(str).toBe('');
      expect(reader.position).toBe(1);
    });

    it('should handle different encodings', () => {
      const buffer = Buffer.from('hello\x00', 'utf8');
      const reader = new BinaryReader(buffer);
      const str = reader.readNullTerminatedString('utf8');
      expect(str).toBe('hello');
    });

    it('should throw error when no null terminator found', () => {
      const buffer = Buffer.from('hello', 'latin1');
      const reader = new BinaryReader(buffer);
      expect(() => reader.readNullTerminatedString()).toThrow(BinaryParseError);

      // Reset position to test the error message
      reader.seek(0);
      expect(() => reader.readNullTerminatedString()).toThrow(
        'Cannot read null-terminated string at offset 0: buffer ended without null terminator',
      );
    });
  });

  describe('seek', () => {
    it('should move to specified position', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02, 0x03, 0x04]));
      reader.seek(2);
      expect(reader.position).toBe(2);
      expect(reader.readUInt8()).toBe(0x03);
    });

    it('should allow seeking to start', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02]));
      reader.readUInt8();
      reader.seek(0);
      expect(reader.position).toBe(0);
    });

    it('should allow seeking to end', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02]));
      reader.seek(2);
      expect(reader.position).toBe(2);
      expect(reader.hasMore()).toBe(false);
    });

    it('should throw error for negative position', () => {
      const reader = new BinaryReader(Buffer.from([0x01]));
      expect(() => reader.seek(-1)).toThrow(BinaryParseError);
      expect(() => reader.seek(-1)).toThrow('Cannot seek to position -1: out of bounds');
    });

    it('should throw error for position beyond buffer', () => {
      const reader = new BinaryReader(Buffer.from([0x01]));
      expect(() => reader.seek(2)).toThrow(BinaryParseError);
      expect(() => reader.seek(2)).toThrow('Cannot seek to position 2: out of bounds');
    });
  });

  describe('utility methods', () => {
    it('should correctly report hasMore', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02]));
      expect(reader.hasMore()).toBe(true);
      reader.readUInt8();
      expect(reader.hasMore()).toBe(true);
      reader.readUInt8();
      expect(reader.hasMore()).toBe(false);
    });

    it('should correctly report remaining bytes', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02, 0x03]));
      expect(reader.remaining).toBe(3);
      reader.readUInt8();
      expect(reader.remaining).toBe(2);
      reader.readBytes(2);
      expect(reader.remaining).toBe(0);
    });

    it('should provide access to underlying buffer', () => {
      const originalBuffer = Buffer.from([0x01, 0x02]);
      const reader = new BinaryReader(originalBuffer);
      expect(reader.buffer).toEqual(originalBuffer);
    });
  });

  describe('edge cases', () => {
    it('should handle reading at exact buffer boundary', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02]));
      const bytes = reader.readBytes(2);
      expect(bytes).toEqual(Buffer.from([0x01, 0x02]));
      expect(reader.hasMore()).toBe(false);
    });

    it('should handle multiple sequential reads', () => {
      const reader = new BinaryReader(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
      expect(reader.readUInt8()).toBe(0x01);
      expect(reader.readUInt16LE()).toBe(0x0302);
      expect(reader.readBytes(2)).toEqual(Buffer.from([0x04, 0x05]));
      expect(reader.readUInt8()).toBe(0x06);
      expect(reader.hasMore()).toBe(false);
    });

    it('should handle seek and read combinations', () => {
      const reader = new BinaryReader(Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]));
      reader.seek(1);
      expect(reader.readUInt8()).toBe(0x01);
      reader.seek(3);
      expect(reader.readUInt8()).toBe(0x03);
      reader.seek(0);
      expect(reader.readUInt8()).toBe(0x00);
    });
  });
});
