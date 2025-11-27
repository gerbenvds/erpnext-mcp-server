import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Config } from './config.js';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw error if ERPNEXT_URL is not set', () => {
    delete process.env.ERPNEXT_URL;
    expect(() => new Config()).toThrow('ERPNEXT_URL environment variable is required');
  });

  it('should throw error if URL does not include protocol', () => {
    process.env.ERPNEXT_URL = 'example.com';
    expect(() => new Config()).toThrow('must include protocol');
  });

  it('should throw error if only API key is provided', () => {
    process.env.ERPNEXT_URL = 'https://example.com';
    process.env.ERPNEXT_API_KEY = 'key123';
    delete process.env.ERPNEXT_API_SECRET;
    expect(() => new Config()).toThrow('Both ERPNEXT_API_KEY and ERPNEXT_API_SECRET must be provided');
  });

  it('should throw error if only API secret is provided', () => {
    process.env.ERPNEXT_URL = 'https://example.com';
    delete process.env.ERPNEXT_API_KEY;
    process.env.ERPNEXT_API_SECRET = 'secret123';
    expect(() => new Config()).toThrow('Both ERPNEXT_API_KEY and ERPNEXT_API_SECRET must be provided');
  });

  it('should create config with valid URL only', () => {
    process.env.ERPNEXT_URL = 'https://example.com';
    delete process.env.ERPNEXT_API_KEY;
    delete process.env.ERPNEXT_API_SECRET;
    
    const config = new Config();
    expect(config.getERPNextUrl()).toBe('https://example.com');
    expect(config.getERPNextApiKey()).toBeUndefined();
    expect(config.getERPNextApiSecret()).toBeUndefined();
    expect(config.hasApiKeyAuth()).toBe(false);
  });

  it('should create config with URL and API credentials', () => {
    process.env.ERPNEXT_URL = 'https://example.com';
    process.env.ERPNEXT_API_KEY = 'key123';
    process.env.ERPNEXT_API_SECRET = 'secret123';
    
    const config = new Config();
    expect(config.getERPNextUrl()).toBe('https://example.com');
    expect(config.getERPNextApiKey()).toBe('key123');
    expect(config.getERPNextApiSecret()).toBe('secret123');
    expect(config.hasApiKeyAuth()).toBe(true);
  });

  it('should remove trailing slash from URL', () => {
    process.env.ERPNEXT_URL = 'https://example.com/';
    delete process.env.ERPNEXT_API_KEY;
    delete process.env.ERPNEXT_API_SECRET;
    
    const config = new Config();
    expect(config.getERPNextUrl()).toBe('https://example.com');
  });
});

