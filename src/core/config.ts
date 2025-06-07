/**
 * Core configuration system - Format-neutral base configuration
 * Adapter-specific configurations are self-contained in their respective adapters
 */
import { LoggerFactory } from "./logger";
const logger = LoggerFactory.create();

import { deepClone, deepMerge } from "./common";
import { XNode } from "./xnode";

/**
 * Core configuration interface for XJX base properties
 */
export interface Configuration {
  // Core preservation settings (cross-format)
  preserveComments: boolean;
  preserveInstructions: boolean;
  preserveWhitespace: boolean;

  // High-fidelity mode (verbose data structure mode)
  highFidelity: boolean;

  // Output formatting (cross-format)
  formatting: {
    indent: number;
    pretty: boolean;
  };

  // Fragment root name for functional operations
  fragmentRoot: string | XNode;
}

/**
 * Default core configuration - Format-neutral
 */
export const DEFAULT_CONFIG: Configuration = {
  // Core settings
  preserveComments: true,
  preserveInstructions: true,
  preserveWhitespace: false,
  
  // High-fidelity verbose mode
  highFidelity: false,

  // Output formatting
  formatting: {
    indent: 2,
    pretty: true
  },

  // Fragment root name for functional operations
  fragmentRoot: "results"
};

/**
 * Get a fresh copy of the default configuration
 */
export function getDefaultConfig(): Configuration {
  return deepClone(DEFAULT_CONFIG);
}

/**
 * Merge configurations with deep merge for consistency
 */
export function mergeConfig(
  baseConfig: Configuration,
  overrideConfig: Partial<Configuration> = {}
): Configuration {
  return deepMerge(baseConfig, overrideConfig);
}

/**
 * Create or update configuration with smart defaults
 */
export function createConfig(
  config: Partial<Configuration> = {},
  baseConfig?: Configuration
): Configuration {
  // Use provided base or get default
  const base = baseConfig || getDefaultConfig();

  // Skip merge if empty config (optimization)
  if (!config || Object.keys(config).length === 0) {
    logger.debug("Empty configuration provided, skipping merge");
    return base;
  }

  // Merge and return
  const result = mergeConfig(base, config);

  logger.debug("Successfully created/updated core configuration", {
    preserveComments: result.preserveComments,
    preserveInstructions: result.preserveInstructions,
    preserveWhitespace: result.preserveWhitespace,
    highFidelity: result.highFidelity,
    formattingIndent: result.formatting.indent,
    formattingPretty: result.formatting.pretty,
    fragmentRoot: typeof result.fragmentRoot === 'string' ? result.fragmentRoot : 'custom-xnode',
    totalProperties: Object.keys(result).length
  });

  return result;
}

/**
 * Validate core configuration for consistency and correctness
 */
export function validateConfig(config: Configuration): void {
  // Validate core settings
  if (typeof config.preserveComments !== 'boolean') {
    throw new Error('preserveComments must be a boolean');
  }

  if (typeof config.preserveInstructions !== 'boolean') {
    throw new Error('preserveInstructions must be a boolean');
  }

  if (typeof config.preserveWhitespace !== 'boolean') {
    throw new Error('preserveWhitespace must be a boolean');
  }

  if (typeof config.highFidelity !== 'boolean') {
    throw new Error('highFidelity must be a boolean');
  }

  // Validate formatting
  if (typeof config.formatting.indent !== 'number' || config.formatting.indent < 0) {
    throw new Error('formatting.indent must be a non-negative number');
  }

  if (typeof config.formatting.pretty !== 'boolean') {
    throw new Error('formatting.pretty must be a boolean');
  }

  // Validate fragmentRoot
  if (typeof config.fragmentRoot !== 'string' && 
      (typeof config.fragmentRoot !== 'object' || !config.fragmentRoot.name)) {
    throw new Error('fragmentRoot must be a string or XNode with name property');
  }
}