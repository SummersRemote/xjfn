/**
 * Configuration extensions - Core configuration only
 * Adapter-specific configurations are handled in their respective adapters
 */
import { LoggerFactory, LogLevel } from "../core/logger";
const logger = LoggerFactory.create();

import { XJX } from "../XJX";
import { Configuration } from "../core/config";
import { NonTerminalExtensionContext } from "../core/extension";

/**
 * Implementation for setting core configuration options
 */
export function withConfig(this: NonTerminalExtensionContext, config: Partial<Configuration>): void {
  try {
    // API boundary validation using pipeline context
    this.pipeline.validateInput(config !== null && typeof config === 'object', "Configuration must be an object");
    
    // Skip if empty config object
    if (Object.keys(config).length === 0) {
      logger.debug('Empty configuration provided, skipping merge');
      return;
    }
    
    // Core preservation settings that affect parsing
    const CORE_PRESERVATION_SETTINGS = [
      "preserveComments", 
      "preserveInstructions", 
      "preserveWhitespace"
    ];
    
    if (this.xnode !== null) {
      // Source has already been set, check for core preservation setting changes
      const currentConfig = this.pipeline.config.get();
      
      // Check core preservation settings
      const changedSettings = CORE_PRESERVATION_SETTINGS.filter(setting => {
        return config[setting as keyof Configuration] !== undefined && 
               config[setting as keyof Configuration] !== currentConfig[setting as keyof Configuration];
      });
      
      if (changedSettings.length > 0) {
        throw new Error(
          `Cannot change core preservation settings (${changedSettings.join(', ')}) after source is set. ` +
          `These settings must be configured in the XJX constructor or via withConfig() before setting a source.`
        );
      }
    }
    
    // Apply configuration using pipeline configuration manager
    this.pipeline.config = this.pipeline.config.merge(config);
    
    // Log core configuration only
    const finalConfig = this.pipeline.config.get();
    logger.debug('Successfully applied core configuration', {
      preserveComments: finalConfig.preserveComments,
      preserveInstructions: finalConfig.preserveInstructions,
      preserveWhitespace: finalConfig.preserveWhitespace,
      highFidelity: finalConfig.highFidelity,
      formattingIndent: finalConfig.formatting.indent,
      formattingPretty: finalConfig.formatting.pretty,
      fragmentRoot: typeof finalConfig.fragmentRoot === 'string' ? finalConfig.fragmentRoot : 'custom-xnode'
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
export function withLogLevel(this: NonTerminalExtensionContext, level: LogLevel | string): void {
  try {
    // API boundary validation using pipeline context
    this.pipeline.validateInput(level !== undefined && level !== null, "Log level must be provided");
    
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
    
    logger.info(`Log level set to ${logLevel} via pipeline context`);
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`Failed to set log level: ${String(err)}`);
  }
}

// Register the extensions with XJX
XJX.registerNonTerminalExtension("withConfig", withConfig);
XJX.registerNonTerminalExtension("withLogLevel", withLogLevel);