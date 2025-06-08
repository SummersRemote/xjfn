/**
 * Configuration extensions - Core configuration only
 * Adapter-specific configurations are handled in their respective adapters
 */
import { LoggerFactory, LogLevel } from "../core/logger";
const logger = LoggerFactory.create();

import { Configuration } from "../core/config";
import { ExtensionContext } from "../core/extension";

/**
 * Implementation for setting core configuration options
 */
export function withConfig(this: ExtensionContext, config: Partial<Configuration>): void {
  try {
    // API boundary validation
    if (config === null || typeof config !== 'object') {
      throw new Error("Configuration must be an object");
    }
    
    // Skip if empty config object
    if (Object.keys(config).length === 0) {
      logger.debug('Empty configuration provided, skipping merge');
      return;
    }
    
    // Apply configuration using context config
    this.context.config = { ...this.context.config, ...config };
    
    logger.debug('Successfully applied core configuration', {
      configKeys: Object.keys(config)
    });
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Failed to apply configuration: ${String(err)}`);
  }
}

/**
 * Implementation for setting the log level using unified pipeline context
 */
export function withLogLevel(this: ExtensionContext, level: LogLevel | string): void {
  try {
    // API boundary validation
    if (level === undefined || level === null) {
      throw new Error("Log level must be provided");
    }
    
    // Handle string input for level
    let logLevel: LogLevel;
    
    if (typeof level === 'string') {
      // Convert string to LogLevel enum
      const normalizedLevel = level.toUpperCase();
      
      switch (normalizedLevel) {
        case 'DEBUG':
          logLevel = LogLevel.DEBUG;
          break;
        case 'INFO':
          logLevel = LogLevel.INFO;
          break;
        case 'WARN':
          logLevel = LogLevel.WARN;
          break;
        case 'ERROR':
          logLevel = LogLevel.ERROR;
          break;
        case 'NONE':
          logLevel = LogLevel.NONE;
          break;
        default:
          throw new Error(`Invalid log level: ${level}. Valid values are: debug, info, warn, error, none`);
      }
    } else {
      // Level is already a LogLevel enum value
      logLevel = level;
    }
    
   // Set the default log level
   LoggerFactory.setDefaultLevel(logLevel);
    
    logger.info(`Log level set to ${logLevel}`);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Failed to set log level: ${String(err)}`);
  }
}

// Extensions are registered via import in index.ts