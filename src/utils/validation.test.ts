import { describe, it, expect } from 'vitest';
import { 
  validateIdentifier, 
  validateObject, 
  validatePositiveInt,
  validateStringArray 
} from './validation.js';

describe('validateIdentifier', () => {
  it('should return trimmed string for valid identifier', () => {
    expect(validateIdentifier('Customer', 'doctype')).toBe('Customer');
    expect(validateIdentifier('  Sales Order  ', 'doctype')).toBe('Sales Order');
    expect(validateIdentifier('Item-001', 'name')).toBe('Item-001');
    expect(validateIdentifier('Test_Item', 'name')).toBe('Test_Item');
  });

  it('should throw error for null or undefined', () => {
    expect(() => validateIdentifier(null, 'doctype')).toThrow('doctype is required');
    expect(() => validateIdentifier(undefined, 'doctype')).toThrow('doctype is required');
  });

  it('should throw error for empty string', () => {
    expect(() => validateIdentifier('', 'doctype')).toThrow('doctype cannot be empty');
    expect(() => validateIdentifier('   ', 'doctype')).toThrow('doctype cannot be empty');
  });

  it('should throw error for string exceeding max length', () => {
    const longString = 'a'.repeat(141);
    expect(() => validateIdentifier(longString, 'doctype')).toThrow('exceeds maximum length');
  });

  it('should throw error for invalid characters', () => {
    expect(() => validateIdentifier('Customer<script>', 'doctype')).toThrow('invalid characters');
    expect(() => validateIdentifier('Item/Test', 'doctype')).toThrow('invalid characters');
    expect(() => validateIdentifier('Test@123', 'name')).toThrow('invalid characters');
  });
});

describe('validateObject', () => {
  it('should return object for valid object', () => {
    const obj = { name: 'Test', value: 123 };
    expect(validateObject(obj, 'data')).toEqual(obj);
  });

  it('should throw error for null or undefined', () => {
    expect(() => validateObject(null, 'data')).toThrow('data is required');
    expect(() => validateObject(undefined, 'data')).toThrow('data is required');
  });

  it('should throw error for array', () => {
    expect(() => validateObject([], 'data')).toThrow('data must be an object');
    expect(() => validateObject([1, 2, 3], 'data')).toThrow('data must be an object');
  });

  it('should throw error for non-object types', () => {
    expect(() => validateObject('string', 'data')).toThrow('data must be an object');
    expect(() => validateObject(123, 'data')).toThrow('data must be an object');
  });
});

describe('validatePositiveInt', () => {
  it('should return undefined for null or undefined', () => {
    expect(validatePositiveInt(null, 'limit')).toBeUndefined();
    expect(validatePositiveInt(undefined, 'limit')).toBeUndefined();
  });

  it('should return number for valid positive integer', () => {
    expect(validatePositiveInt(10, 'limit')).toBe(10);
    expect(validatePositiveInt(1, 'limit')).toBe(1);
    expect(validatePositiveInt('50', 'limit')).toBe(50);
  });

  it('should throw error for zero', () => {
    expect(() => validatePositiveInt(0, 'limit')).toThrow('must be a positive integer');
  });

  it('should throw error for negative numbers', () => {
    expect(() => validatePositiveInt(-5, 'limit')).toThrow('must be a positive integer');
  });

  it('should throw error for non-integer numbers', () => {
    expect(() => validatePositiveInt(3.5, 'limit')).toThrow('must be a positive integer');
  });
});

describe('validateStringArray', () => {
  it('should return undefined for null or undefined', () => {
    expect(validateStringArray(null, 'fields')).toBeUndefined();
    expect(validateStringArray(undefined, 'fields')).toBeUndefined();
  });

  it('should return array of strings for valid array', () => {
    expect(validateStringArray(['a', 'b', 'c'], 'fields')).toEqual(['a', 'b', 'c']);
    expect(validateStringArray([], 'fields')).toEqual([]);
  });

  it('should convert non-string items to strings', () => {
    expect(validateStringArray([1, 2, 3], 'fields')).toEqual(['1', '2', '3']);
  });

  it('should throw error for non-array', () => {
    expect(() => validateStringArray('string', 'fields')).toThrow('fields must be an array');
    expect(() => validateStringArray({}, 'fields')).toThrow('fields must be an array');
  });
});

