/**
 * Input validation utilities
 * Provides validation and sanitization for user inputs
 */

const VALID_IDENTIFIER_PATTERN = /^[a-zA-Z0-9_\- ]+$/;
const MAX_IDENTIFIER_LENGTH = 140; // ERPNext default max name length

/**
 * Validates and sanitizes a doctype or document name
 * @throws Error if validation fails
 */
export function validateIdentifier(value: unknown, fieldName: string): string {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  
  const strValue = String(value).trim();
  
  if (strValue.length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  
  if (strValue.length > MAX_IDENTIFIER_LENGTH) {
    throw new Error(`${fieldName} exceeds maximum length of ${MAX_IDENTIFIER_LENGTH} characters`);
  }
  
  if (!VALID_IDENTIFIER_PATTERN.test(strValue)) {
    throw new Error(`${fieldName} contains invalid characters. Only alphanumeric characters, spaces, hyphens, and underscores are allowed.`);
  }
  
  return strValue;
}

/**
 * Validates that a value is a non-null object
 */
export function validateObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (value === undefined || value === null) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }
  
  return value as Record<string, unknown>;
}

/**
 * Validates optional positive integer
 */
export function validatePositiveInt(value: unknown, fieldName: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  
  const numValue = Number(value);
  
  if (!Number.isInteger(numValue) || numValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  
  return numValue;
}

/**
 * Validates optional array of strings
 */
export function validateStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }
  
  return value.map(item => String(item));
}

