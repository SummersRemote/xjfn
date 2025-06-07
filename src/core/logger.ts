/**
 * Logging system for XJFN - Simple, configurable logging with consistent interface
 * 
 * Design Intent:
 * - Configurable log levels (DEBUG, INFO, WARN, ERROR, NONE)
 * - Context-aware logging with optional structured data
 * - Factory pattern for consistent logger creation
 * - Simple implementation without external dependencies
 */

/**
 * Log levels supported by the logger
 */
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO", 
  WARN = "WARN",
  ERROR = "ERROR",
  NONE = "NONE",
}

/**
 * Logger factory for creating and configuring loggers
 */
export class LoggerFactory {
  private static defaultLevel: LogLevel = LogLevel.ERROR;

  /**
   * Set the default log level for all new loggers
   * 
   * @param level The minimum log level to output
   */
  static setDefaultLevel(level: LogLevel): void {
    this.defaultLevel = level;
  }

  /**
   * Get the current default log level
   * 
   * @returns The current default log level
   */
  static getDefaultLevel(): LogLevel {
    return this.defaultLevel;
  }

  /**
   * Create a new logger with optional context
   * 
   * @param context Context string to include in log messages (e.g., 'XJFN', 'XMLAdapter')
   * @returns A new Logger instance
   */
  static create(context: string = ""): Logger {
    return new Logger(context);
  }
}

/**
 * Logger implementation with context and structured data support
 */
export class Logger {
  constructor(private context: string = "") {}

  /**
   * Log a debug message (lowest priority)
   * 
   * @param message Debug message
   * @param data Optional structured data to include
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log an info message
   * 
   * @param message Info message
   * @param data Optional structured data to include
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log a warning message
   * 
   * @param message Warning message
   * @param data Optional structured data to include
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log an error message (highest priority)
   * 
   * @param message Error message
   * @param data Optional structured data to include
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Internal log method that handles level checking and formatting
   * 
   * @param level Log level for this message
   * @param message Log message
   * @param data Optional structured data
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const prefix = [`[${timestamp}]`];

      if (this.context) {
        prefix.push(`[${this.context}]`);
      }

      prefix.push(`[${level}]`, message);
      const output = prefix.join(" ");
      
      // Output to console with structured data if provided
      if (data !== undefined) {
        console.log(output, data);
      } else {
        console.log(output);
      }
    }
  }

  /**
   * Check if a message at the given level should be logged
   * 
   * @param level Level to check
   * @returns true if the message should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const current = LoggerFactory.getDefaultLevel();
    
    if (current === LogLevel.NONE) {
      return false;
    }
    
    const order = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return order.indexOf(level) >= order.indexOf(current);
  }
}