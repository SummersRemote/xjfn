/**
 * XJFN - Main class with unified extension registration and execution system
 * 
 * Design Intent:
 * - Single entry point for all XJFN functionality
 * - Unified extension registration for both terminal and non-terminal methods
 * - Automatic configuration defaults merging from extensions
 * - Clear separation between core state and extension logic
 * - Fail-fast error handling with consistent logging
 */

import { Configuration, createConfig, mergeGlobalDefaults } from './core/config';
import { PipelineContext } from './core/context';
import { XNode } from './core/xnode';
import { ExtensionContext, ExtensionImplementation, BranchContext } from './core/extension';
import { AdapterExecutor, Adapter } from './core/adapter';
import { ValidationError } from './core/error';
import { Logger, LoggerFactory } from './core/logger';

/**
 * Extension configuration defaults - keys become config property names
 */
export type ExtensionConfigDefaults = Record<string, any>;

/**
 * Main XJFN class providing extension registration and fluent API
 * 
 * This class serves as:
 * - Extension registration host
 * - Pipeline execution coordinator  
 * - Fluent API provider through registered methods
 * - Configuration and metadata manager
 */
export class XJFN implements ExtensionContext {
  // --- Instance Properties ---
  
  /**
   * Current XNode being processed (null if no source set)
   */
  public xnode: XNode | null = null;
  
  /**
   * Branch context for branch/merge operations (null if not in branch)
   */
  public branchContext: BranchContext | null = null;
  
  /**
   * Pipeline context providing configuration, logging, and metadata
   */
  public context: PipelineContext;
  
  // --- Constructor ---
  
  /**
   * Create a new XJFN instance with optional configuration
   * 
   * @param config Optional configuration overrides
   * 
   * @example
   * ```typescript
   * // Basic instance
   * const xjfn = new XJFN();
   * 
   * // With custom configuration
   * const xjfn = new XJFN({
   *   preserveComments: false,
   *   formatting: { indent: 4, pretty: false },
   *   xml: { declaration: false }
   * });
   * ```
   */
  constructor(config?: Partial<Configuration>) {
    this.context = new PipelineContext(createConfig(config));
    
    this.context.logger.debug('Created XJFN instance', {
      hasCustomConfig: !!config,
      configKeys: config ? Object.keys(config) : []
    });
  }
  
  // --- Static Extension Registration ---
  
  /**
   * Register an extension method with automatic configuration defaults merging
   * 
   * This single method handles both terminal and non-terminal extensions:
   * - Terminal methods: Return values directly (toJson, toXml, etc.)
   * - Non-terminal methods: Return this for chaining (fromXml, map, filter, etc.)
   * 
   * @param name Extension method name
   * @param implementation Extension implementation with method and terminal flag
   * @param configDefaults Optional configuration defaults to merge globally
   * 
   * @example
   * ```typescript
   * // Terminal extension (returns value)
   * XJFN.registerExtension('toYaml', {
   *   method: function(this: ExtensionContext): string {
   *     this.validateSource();
   *     const adapter = new XNodeToYamlAdapter();
   *     return this.executeAdapter(adapter, this.xnode!);
   *   },
   *   isTerminal: true
   * }, {
   *   yaml: { indent: 2, flowLevel: -1 }
   * });
   * 
   * // Non-terminal extension (returns this)
   * XJFN.registerExtension('fromCsv', {
   *   method: function(this: ExtensionContext, csv: string): void {
   *     const adapter = new CsvToXNodeAdapter();
   *     this.xnode = this.executeAdapter(adapter, csv);
   *   },
   *   isTerminal: false
   * }, {
   *   csv: { delimiter: ',', headers: true }
   * });
   * ```
   */
  public static registerExtension(
    name: string,
    implementation: ExtensionImplementation,
    configDefaults?: ExtensionConfigDefaults
  ): void {
    const logger = LoggerFactory.create('XJFN.Registration');
    
    try {
      // Validate registration parameters
      this.validateRegistration(name, implementation);
      
      logger.debug('Registering extension', { 
        name,
        isTerminal: implementation.isTerminal,
        hasConfigDefaults: !!configDefaults,
        configKeys: configDefaults ? Object.keys(configDefaults) : []
      });
      
      // Merge extension config defaults into global defaults
      if (configDefaults && Object.keys(configDefaults).length > 0) {
        mergeGlobalDefaults(configDefaults);
        logger.debug('Merged extension config defaults', {
          extensionName: name,
          configKeys: Object.keys(configDefaults)
        });
      }
      
      // Register method on XJFN prototype
      this.registerMethod(name, implementation, logger);
      
      logger.debug('Extension registered successfully', { name });
      
    } catch (error) {
      logger.error(`Failed to register extension '${name}'`, error);
      throw error;
    }
  }
  
  /**
   * Validate extension registration parameters
   * 
   * @param name Extension name
   * @param implementation Extension implementation
   * @throws ValidationError if parameters are invalid
   */
  private static validateRegistration(name: string, implementation: ExtensionImplementation): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Extension name must be a non-empty string');
    }
    
    if (!implementation || typeof implementation !== 'object') {
      throw new ValidationError('Extension implementation must be an object');
    }
    
    if (typeof implementation.method !== 'function') {
      throw new ValidationError('Extension implementation.method must be a function');
    }
    
    if (typeof implementation.isTerminal !== 'boolean') {
      throw new ValidationError('Extension implementation.isTerminal must be a boolean');
    }
    
    // Check if method already exists
    if ((XJFN.prototype as any)[name]) {
      throw new ValidationError(`Extension method '${name}' is already registered`);
    }
  }
  
  /**
   * Register method on XJFN prototype with appropriate wrapper
   * 
   * @param name Method name
   * @param implementation Implementation details
   * @param logger Logger for debug output
   */
  private static registerMethod(
    name: string, 
    implementation: ExtensionImplementation,
    logger: Logger
  ): void {
    if (implementation.isTerminal) {
      // Terminal methods return values directly
      (XJFN.prototype as any)[name] = function(this: XJFN, ...args: any[]): any {
        this.context.logOperation(`extension-${name}`, { 
          isTerminal: true,
          argCount: args.length,
          hasSource: !!this.xnode
        });
        
        try {
          const result = implementation.method.apply(this, args);
          this.context.logger.debug(`Terminal extension '${name}' completed`);
          return result;
        } catch (error) {
          this.context.logError(`extension-${name}`, error as Error);
          throw error;
        }
      };
      
    } else {
      // Non-terminal methods return this for chaining
      (XJFN.prototype as any)[name] = function(this: XJFN, ...args: any[]): XJFN {
        this.context.logOperation(`extension-${name}`, { 
          isTerminal: false,
          argCount: args.length,
          hasSource: !!this.xnode
        });
        
        try {
          implementation.method.apply(this, args);
          this.context.logger.debug(`Non-terminal extension '${name}' completed`);
          return this;
        } catch (error) {
          this.context.logError(`extension-${name}`, error as Error);
          throw error;
        }
      };
    }
    
    logger.debug(`Method '${name}' added to XJFN prototype`, {
      isTerminal: implementation.isTerminal
    });
  }
  
  // --- ExtensionContext Implementation ---
  
  /**
   * Validate that a source has been set before transformation
   * 
   * @throws ValidationError if no source has been set
   * 
   * @example
   * ```typescript
   * export function toJson(this: ExtensionContext): any {
   *   this.validateSource(); // Throws if fromXml/fromJson not called first
   *   // ... conversion logic
   * }
   * ```
   */
  public validateSource(): void {
    if (!this.xnode) {
      throw new ValidationError(
        'No source set: call fromXml(), fromJson(), or fromXNode() before transformation'
      );
    }
  }
  
  /**
   * Execute an adapter with consistent error handling and logging
   * 
   * @param adapter Adapter to execute
   * @param input Input for the adapter
   * @returns Adapter output
   * @throws ProcessingError if adapter fails
   * 
   * @example
   * ```typescript
   * export function fromXml(this: ExtensionContext, xml: string): void {
   *   const adapter = new XmlToXNodeAdapter();
   *   this.xnode = this.executeAdapter(adapter, xml);
   * }
   * ```
   */
  public executeAdapter<TInput, TOutput>(adapter: Adapter<TInput, TOutput>, input: TInput): TOutput {
    return AdapterExecutor.execute(adapter, input, this.context);
  }
  
  // --- Utility Methods for Testing/Debugging ---
  
  /**
   * Get current global configuration defaults (primarily for testing/debugging)
   * 
   * @returns Copy of current global defaults
   */
  public static getGlobalDefaults(): Configuration {
    const { getGlobalDefaults } = require('./core/config');
    return getGlobalDefaults();
  }
  
  /**
   * Reset global defaults to core defaults only (for testing)
   * 
   * This removes all extension defaults and restores the original core configuration
   */
  public static resetDefaults(): void {
    const { resetGlobalDefaults } = require('./core/config');
    resetGlobalDefaults();
    
    const logger = LoggerFactory.create('XJFN.Reset');
    logger.debug('Global defaults reset to core configuration');
  }
  
  /**
   * Get list of registered extension methods (for debugging)
   * 
   * @returns Array of registered method names
   */
  public static getRegisteredMethods(): string[] {
    const proto = XJFN.prototype as any;
    const methods: string[] = [];
    
    for (const prop in proto) {
      if (typeof proto[prop] === 'function' && prop !== 'constructor') {
        methods.push(prop);
      }
    }
    
    return methods.sort();
  }
  
  // --- Legacy Utility Methods (for compatibility) ---
  
  /**
   * Clone an XNode using pipeline context cloning
   * 
   * @param node Node to clone
   * @param deep Whether to clone deeply
   * @returns Cloned node
   */
  public cloneNode(node: XNode, deep: boolean = false): XNode {
    return this.context.cloneNode(node, deep);
  }
  
  /**
   * Deep clone a value using JSON serialization
   * 
   * @param obj Object to clone
   * @returns Deep clone of the object
   */
  public deepClone<T>(obj: T): T {
    if (obj === undefined || obj === null) {
      return obj;
    }
    return JSON.parse(JSON.stringify(obj));
  }
  
  /**
   * Deep merge two objects with collision handling
   * 
   * @param target Target object
   * @param source Source object to merge into target
   * @returns New object with merged properties (doesn't modify inputs)
   */
  public deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    if (!source || typeof source !== 'object' || source === null) {
      return this.deepClone(target);
    }

    if (!target || typeof target !== 'object' || target === null) {
      return this.deepClone(source) as T;
    }

    const result = this.deepClone(target);

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
        (result[key as keyof T] as any) = this.deepMerge(
          targetValue as Record<string, any>,
          sourceValue as Record<string, any>
        );
      } else {
        // Otherwise just replace the value
        (result[key as keyof T] as any) = this.deepClone(sourceValue);
      }
    });

    return result;
  }
}

// --- Export for Default Import ---

export default XJFN;

/**
 * Usage Examples and Patterns
 * 
 * @example Basic Usage
 * ```typescript
 * import XJFN from 'xjfn';
 * 
 * // Simple conversion
 * const result = new XJFN()
 *   .fromXml('<books><book>Guide</book></books>')
 *   .toJson();
 * ```
 * 
 * @example Extension Registration
 * ```typescript
 * // Register a new format adapter
 * XJFN.registerExtension('fromCsv', {
 *   method: function(this: ExtensionContext, csv: string): void {
 *     const adapter = new CsvToXNodeAdapter();
 *     this.xnode = this.executeAdapter(adapter, csv);
 *   },
 *   isTerminal: false
 * }, {
 *   csv: { delimiter: ',', headers: true, skipEmpty: true }
 * });
 * 
 * // Register a transformation method
 * XJFN.registerExtension('withValidation', {
 *   method: function(this: ExtensionContext, schema: any): void {
 *     this.validateSource();
 *     this.context.setMetadata('validation', 'schema', schema);
 *   },
 *   isTerminal: false
 * });
 * ```
 * 
 * @example Advanced Configuration
 * ```typescript
 * const processor = new XJFN({
 *   preserveComments: false,
 *   formatting: { indent: 4, pretty: false },
 *   xml: { declaration: false, encoding: 'UTF-16' },
 *   json: { attributePrefix: '$', nullAsEmpty: true }
 * });
 * 
 * const result = processor
 *   .fromXml(xmlData)
 *   .map(toNumber({ precision: 2 }))
 *   .filter(node => node.name !== 'deprecated')
 *   .toJsonString(2);
 * ```
 * 
 * @example Metadata Usage
 * ```typescript
 * const xjfn = new XJFN()
 *   .fromXml(complexXml);
 * 
 * // Check source characteristics
 * if (xjfn.context.hasMetadata('xml', 'hasNamespaces')) {
 *   console.log('XML has namespaces - using namespace-aware processing');
 * }
 * 
 * const result = xjfn.toJson();
 * ```
 */