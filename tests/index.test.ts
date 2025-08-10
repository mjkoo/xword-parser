import { describe, it, expect } from 'vitest';
import { parseXword, XwordParseError } from '../src';

describe('parseXword', () => {
  it('should throw an error for not implemented functionality', () => {
    expect(() => parseXword('test data')).toThrow('Not implemented yet');
  });
});

describe('XwordParseError', () => {
  it('should create an error with the correct name', () => {
    const error = new XwordParseError('Test error');
    expect(error.name).toBe('XwordParseError');
    expect(error.message).toBe('Test error');
  });
});