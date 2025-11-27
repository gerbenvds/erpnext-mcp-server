/**
 * Logging utility module
 * Provides structured logging with configurable levels
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class Logger {
  private level: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  static fromEnv(): Logger {
    const level = process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO;
    return new Logger(level);
  }
  
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  error(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  }
  
  warn(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  }
  
  info(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.INFO) {
      // Use stderr for MCP servers since stdout is used for protocol
      console.error(`[INFO] ${message}`, ...meta);
    }
  }
  
  debug(message: string, ...meta: unknown[]): void {
    if (this.level >= LogLevel.DEBUG) {
      console.error(`[DEBUG] ${message}`, ...meta);
    }
  }
}

