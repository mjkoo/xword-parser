import { describe, it, expect } from 'vitest';
import { parse, XwordParseError } from './index';

describe('parse', () => {
  it('should throw an error for not implemented functionality', () => {
    expect(() => parse('test data')).toThrow('Not implemented yet');
  });
});

describe('XwordParseError', () => {
  it('should create an error with the correct name', () => {
    const error = new XwordParseError('Test error');
    expect(error.name).toBe('XwordParseError');
    expect(error.message).toBe('Test error');
  });
});