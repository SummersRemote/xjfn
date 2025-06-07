/**
 * Configuration system for XJFN - Format-neutral core with extension defaults
 * 
 * Design Intent:
 * - Core config is minimal and format-neutral
 * - Extensions add their own config sections
 * - Simple object merging (no wrapper classes)
 * - Global defaults managed automatically
 * - Clear separation of concerns
 */

/**
 * Core configuration interface for XJFN base properties
 */
export interface Configuration {
  // Core format-neutral settings
  preserveComments: boolean;       // Keep comment nodes during conversion (default: true)
  preserveInstructions: boolean;   // Keep processing instruction nodes (default: true)
  preserveWhitespace: boolean;     // Keep whitespace-only text nodes (default: false)
  
  // Output formatting (applies to all formats)
  formatting: {
    indent: number;                // Number of spaces for indentation (default: 2)
    pretty: boolean;               // Enable pretty-printing with indentation (default: true)
  };
  
  // Functional operations
  fragmentRoot: string;            // Root element name for fragmented results (default: 'results')
  
  // Extension-specific configurations (added by extensions when registered)
  // Example: xml: { preserveNamespaces: true, declaration: true }
  // Example: json: { attributePrefix: '@', arrayStrategy: 'multiple' }
  // Example: xnode: { validateOnDeserialize: true, compactFormat: false }
  [extensionName: string]: any;
}

/**
 * Default core configuration - format-neutral
 */
export const DEFAULT_CONFIG: Configuration = {
  preserveComments: true,
  preserveInstructions: true,
  preserveWhitespace: false,
  formatting: {
    indent: 2,
    pretty: true
  },
  fragmentRoot: 'results'
};

/**
 * Global defaults that include extension defaults
 * Extensions merge their defaults into this when they register
 */
let globalDefaults: Configuration = { ...DEFAULT_CONFIG };

/**
 * Merge extension-specific configuration defaults into global defaults
 * 
 * Used by extension registration to add their default configuration
 * 
 * @param extensionDefaults Extension configuration defaults
 * 
 * @example
 * ```typescript
 * // XML adapter registering defaults
 * mergeGlobalDefaults({
 *   xml: {
 *     preserveNamespaces: true,
 *     declaration: true,
 *     encoding: 'UTF-8'
 *   }
 * });
 * ```
 */
export function mergeGlobalDefaults(extensionDefaults: Record<string, any>): void {
  globalDefaults = { ...globalDefaults, ...extensionDefaults };
}

/**
 * Create configuration with optional overrides
 * 
 * @param overrides Partial configuration to override defaults
 * @returns Complete configuration with defaults applied
 * 
 * @example
 * ```typescript
 * // Create config with custom formatting
 * const config = createConfig({
 *   formatting: { indent: 4, pretty: false },
 *   xml: { declaration: false }
 * });
 * ```
 */
export function createConfig(overrides?: Partial<Configuration>): Configuration {
  if (!overrides || Object.keys(overrides).length === 0) {
    return { ...globalDefaults };
  }
  
  // Deep merge to handle nested objects like formatting
  return deepMerge(globalDefaults, overrides);
}

/**
 * Get current global defaults (primarily for testing/debugging)
 * 
 * @returns Copy of current global defaults
 */
export function getGlobalDefaults(): Configuration {
  return { ...globalDefaults };
}

/**
 * Reset global defaults to core defaults only (for testing)
 * 
 * This removes all extension defaults and restores the original core configuration
 */
export function resetGlobalDefaults(): void {
  globalDefaults = { ...DEFAULT_CONFIG };
}

/**
 * Validate core configuration properties
 * 
 * @param config Configuration to validate
 * @throws Error if configuration is invalid
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
  
  // Validate formatting
  if (!config.formatting || typeof config.formatting !== 'object') {
    throw new Error('formatting must be an object');
  }
  
  if (typeof config.formatting.indent !== 'number' || config.formatting.indent < 0) {
    throw new Error('formatting.indent must be a non-negative number');
  }
  
  if (typeof config.formatting.pretty !== 'boolean') {
    throw new Error('formatting.pretty must be a boolean');
  }
  
  // Validate fragmentRoot
  if (typeof config.fragmentRoot !== 'string' || !config.fragmentRoot.trim()) {
    throw new Error('fragmentRoot must be a non-empty string');
  }
}

// --- Helper Functions ---

/**
 * Deep merge two configuration objects
 * 
 * @param target Target configuration
 * @param source Source configuration to merge
 * @returns New merged configuration
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  if (!source || typeof source !== 'object' || source === null) {
    return { ...target };
  }
  
  if (!target || typeof target !== 'object' || target === null) {
    return { ...source } as T;
  }
  
  const result = { ...target };
  
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key as keyof Partial<T>];
    const targetValue = result[key as keyof T];
    
    // If both values are objects (not arrays), recursively merge them
    if (
      sourceValue !== null &&
      targetValue !== null &&
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(sourceValue) &&
      !Array.isArray(targetValue)
    ) {
      (result[key as keyof T] as any) = deepMerge(
        targetValue as Record<string, any>,
        sourceValue as Record<string, any>
      );
    } else {
      // Otherwise just replace the value
      (result[key as keyof T] as any) = sourceValue;
    }
  });
  
  return result;
}