/**
 * XJX - Main class with ultra-simplified extension registration
 * Eliminates complex registry system in favor of direct config merging
 */
import { LoggerFactory } from "./core/logger";
const logger = LoggerFactory.create();

import { Configuration, createConfig, mergeConfig, getDefaultConfig } from "./core/config";
import { XNode } from "./core/xnode";
import { validate, ValidationError } from "./core/error";
import { 
  UnifiedExtensionContext, 
  TerminalExtensionContext, 
  NonTerminalExtensionContext, 
  BranchContext 
} from "./core/extension";
import { PipelineHooks, SourceHooks, OutputHooks, NodeHooks } from "./core/hooks";
import { PipelineContext, PipelineContextImpl } from "./core/context";
import { Adapter, PipelineStage, Pipeline } from "./core/pipeline";

/**
 * Extension configuration defaults - keys become config property names
 */
export type ExtensionConfigDefaults = Record<string, any>;

/**
 * Global configuration defaults including all registered extension defaults
 */
let globalDefaults: Configuration | null = null;

/**
 * Ultra-Simplified XJX class with minimal extension registration
 * No complex registry - just direct config merging
 */
export class XJX implements UnifiedExtensionContext {
  // Instance properties
  public xnode: XNode | null = null;
  public branchContext: BranchContext | null = null;
  public pipeline: PipelineContext;
  
  /**
   * Create a new XJX instance
   */
  constructor(config?: Partial<Configuration>, pipelineHooks?: PipelineHooks) {
    // Use global defaults that include all extension defaults
    const baseConfig = globalDefaults || getDefaultConfig();
    const finalConfig = config ? mergeConfig(baseConfig, config) : baseConfig;
    
    this.pipeline = new PipelineContextImpl(finalConfig, pipelineHooks);
    
    logger.debug('Created XJX instance with merged extension defaults');
  }
  
  /**
   * Register a terminal extension method with direct configuration defaults
   * @param name Extension name (e.g., 'toCsv')
   * @param method Implementation function
   * @param configDefaults Configuration defaults where keys become config property names
   * 
   * @example
   * XJX.registerTerminalExtension("toCsv", toCsv, {
   *   csv: {
   *     delimiter: ",",
   *     escapeChar: "\"",
   *     includeHeaders: true
   *   }
   * });
   */
  public static registerTerminalExtension(
    name: string, 
    method: (this: TerminalExtensionContext, ...args: any[]) => any,
    configDefaults?: ExtensionConfigDefaults
  ): void {
    try {
      validate(typeof name === "string" && name.length > 0, "Extension name must be a non-empty string");
      validate(typeof method === "function", "Extension method must be a function");
      
      logger.debug('Registering terminal extension', { 
        name,
        hasConfig: !!configDefaults,
        configKeys: configDefaults ? Object.keys(configDefaults) : []
      });
      
      // Merge config defaults into global defaults
      if (configDefaults) {
        this.mergeExtensionDefaults(configDefaults);
      }
      
      // Add method to XJX prototype
      (XJX.prototype as any)[name] = function(...args: any[]): any {
        // Execute pipeline hooks
        this.pipeline.executeHooks(this.pipeline.hooks, name, this.xnode || args[0]);
        
        const result = method.apply(this, args);
        
        this.pipeline.executeHooks(this.pipeline.hooks, name, result);
        return result;
      };
      
      logger.debug('Terminal extension registered', { name });
    } catch (err) {
      logger.error(`Failed to register terminal extension ${name}`, { error: err });
      throw err;
    }
  }

  /**
   * Register a non-terminal extension method with direct configuration defaults
   * @param name Extension name (e.g., 'fromCsv')
   * @param method Implementation function  
   * @param configDefaults Configuration defaults where keys become config property names
   * 
   * @example
   * XJX.registerNonTerminalExtension("fromCsv", fromCsv, {
   *   csv: {
   *     delimiter: ",", 
   *     hasHeaders: true
   *   }
   * });
   */
  public static registerNonTerminalExtension(
    name: string, 
    method: (this: NonTerminalExtensionContext, ...args: any[]) => void,
    configDefaults?: ExtensionConfigDefaults
  ): void {
    try {
      validate(typeof name === "string" && name.length > 0, "Extension name must be a non-empty string");
      validate(typeof method === "function", "Extension method must be a function");
      
      logger.debug('Registering non-terminal extension', { 
        name,
        hasConfig: !!configDefaults,
        configKeys: configDefaults ? Object.keys(configDefaults) : []
      });
      
      // Merge config defaults into global defaults
      if (configDefaults) {
        this.mergeExtensionDefaults(configDefaults);
      }
      
      // Add method to XJX prototype that returns this
      (XJX.prototype as any)[name] = function(...args: any[]): XJX {
        // Execute pipeline hooks
        this.pipeline.executeHooks(this.pipeline.hooks, name, args[0] || this.xnode);
        
        method.apply(this, args);
        
        this.pipeline.executeHooks(this.pipeline.hooks, name, this.xnode);
        return this;
      };
      
      logger.debug('Non-terminal extension registered', { name });
    } catch (err) {
      logger.error(`Failed to register non-terminal extension ${name}`, { error: err });
      throw err;
    }
  }
  
  /**
   * Merge extension defaults into global configuration defaults
   * @param configDefaults Extension configuration defaults
   */
  private static mergeExtensionDefaults(configDefaults: ExtensionConfigDefaults): void {
    // Initialize global defaults if not already done
    if (!globalDefaults) {
      globalDefaults = getDefaultConfig();
    }
    
    // Merge the new extension defaults
    globalDefaults = mergeConfig(globalDefaults, configDefaults);
    
    logger.debug('Merged extension defaults into global config', {
      newConfigKeys: Object.keys(configDefaults)
    });
  }
  
  // --- Utility Methods for Testing/Debugging ---
  
  /**
   * Get current global defaults (primarily for testing/debugging)
   */
  public static getGlobalDefaults(): Configuration {
    return globalDefaults || getDefaultConfig();
  }
  
  /**
   * Reset global defaults (primarily for testing)
   */
  public static resetDefaults(): void {
    globalDefaults = null;
    logger.debug('Reset global defaults');
  }
  
  // --- Standardized Pipeline Operations ---
  
  /**
   * Execute a source operation (input -> XNode) using simplified pipeline
   * @param converter Unified converter to execute
   * @param input Input data
   * @param hooks Optional source hooks
   */
  public executeSource<T>(
    converter: Adapter<T, XNode>, 
    input: T, 
    hooks?: SourceHooks<T>
  ): void {
    this.xnode = Pipeline.executeSource(converter, input, this.pipeline, hooks);
  }
  
  /**
   * Execute an output operation (XNode -> output) using simplified pipeline
   * @param converter Unified converter to execute
   * @param hooks Optional output hooks
   * @returns Converted output
   */
  public executeOutput<T>(
    converter: Adapter<XNode, T>, 
    hooks?: OutputHooks<T>
  ): T {
    this.validateSource();
    return Pipeline.executeOutput(converter, this.xnode as XNode, this.pipeline, hooks);
  }
  
  /**
   * Execute a transform operation (XNode -> XNode) using simplified pipeline
   * @param operation Pipeline stage to execute
   * @param hooks Optional node hooks
   */
  public executeTransform(
    operation: PipelineStage<XNode, XNode>, 
    hooks?: NodeHooks
  ): void {
    this.validateSource();
    this.xnode = Pipeline.executeTransform(operation, this.xnode as XNode, this.pipeline, hooks);
  }
  
  // --- Utility Methods ---
  
  /**
   * Validate that a source has been set before transformation
   * @throws Error if no source has been set
   */
  public validateSource(): void {
    if (!this.xnode) {
      throw new ValidationError('No source set: call fromXml(), fromJson(), or fromXnode() before transformation');
    }
  }
  
  /**
   * Clone an XNode using standardized pipeline cloning
   * @param node Node to clone
   * @param deep Whether to clone deeply
   * @returns Cloned node
   */
  public cloneNode(node: XNode, deep: boolean = false): XNode {
    return this.pipeline.cloneNode(node, { 
      strategy: deep ? 'deep' : 'shallow', 
      preserveParent: false 
    });
  }
  
  /**
   * Deep clone a value (legacy utility - kept for compatibility)
   */
  public deepClone<T>(obj: T): T {
    if (obj === undefined || obj === null) {
      return obj;
    }
    return JSON.parse(JSON.stringify(obj));
  }
  
  /**
   * Deep merge two objects (legacy utility - kept for compatibility)
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
        (result[key as keyof T] as any) = this.deepClone(sourceValue);
      }
    });

    return result;
  }
}

export default XJX;