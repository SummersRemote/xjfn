// --- Simple Logger ---

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

export class LoggerFactory {
  private static defaultLevel: LogLevel = LogLevel.ERROR;

  static setDefaultLevel(level: LogLevel): void {
    this.defaultLevel = level;
  }

  static getDefaultLevel(): LogLevel {
    return this.defaultLevel;
  }

  static create(context: string = ""): Logger {
    return new Logger(context);
  }

}

export class Logger {
  constructor(private context: string = "") {}

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.shouldLog(level)) {
      const timestamp = new Date().toISOString();
      const prefix = [`[${timestamp}]`];

      if (this.context) {
        prefix.push(`[${this.context}]`);
      }

      prefix.push(`[${level}]`, message);
      const output = prefix.join(" ");
      data !== undefined ? console.log(output, data) : console.log(output);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const current = LoggerFactory.getDefaultLevel();
    const order = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return current !== LogLevel.NONE && order.indexOf(level) >= order.indexOf(current);
  }
}