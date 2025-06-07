/**
 * Simplified pipeline context system - Enterprise features removed
 * Phases 1 & 2: Core simplification with ~200 lines removed
 */
import { LoggerFactory, Logger } from "./logger";
import { Configuration, createConfig } from "./config";
import { ValidationError } from "./error";
import { XNode, cloneNode } from "./xnode";
import { PipelineHooks } from "./hooks";

/**
 * Clone policy for consistent node cloning across pipeline
 */
export interface ClonePolicy {
  readonly strategy: 'deep' | 'shallow' | 'none';
  readonly preserveParent: boolean;
}

/**
 * Default clone policies for different operations
 */
export const ClonePolicies = {
  BRANCH: { strategy: 'deep', preserveParent: false } as ClonePolicy,
  TRANSFORM: { strategy: 'deep', preserveParent: false } as ClonePolicy,
  OUTPUT: { strategy: 'shallow', preserveParent: true } as ClonePolicy,
  NONE: { strategy: 'none', preserveParent: false } as ClonePolicy
} as const;

/**
 * Configuration manager with validation and merging capabilities
 */
export class ConfigurationManager {
  constructor(private config: Configuration) {}
  
  /**
   * Validate configuration for specific operation
   */
  validate(operation: string): void {
    if (!this.config) {
      throw new ValidationError(`Configuration required for ${operation}`);
    }
  }
  
  /**
   * Create a copy of this configuration manager
   */
  clone(): ConfigurationManager {
    return new ConfigurationManager(createConfig({}, this.config));
  }
  
  /**
   * Merge configuration updates
   */
  merge(updates: Partial<Configuration>): ConfigurationManager {
    return new ConfigurationManager(createConfig(updates, this.config));
  }
  
  /**
   * Get the current configuration
   */
  get(): Configuration {
    return this.config;
  }
}

/**
 * Simplified resource management for basic cleanup only
 * REMOVED: Performance tracking, memory estimation, resource counting, health reporting
 */
export class ResourceManager {
  private documentRefs = new Set<Document>();
  private cleanupCallbacks = new Set<() => void>();
  
  /**
   * Register a DOM document for cleanup
   */
  registerDOMDocument(doc: Document): void {
    this.documentRefs.add(doc);
  }
  
  /**
   * Register an XNode for tracking (simplified - no counting)
   */
  registerXNode(node: XNode): void {
    // Simplified: just register for potential cleanup, no counting
  }
  
  /**
   * Register a cleanup callback
   */
  registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }
  
  /**
   * Clean up all registered resources
   */
  cleanup(): void {
    // Execute cleanup callbacks
    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch (err) {
        // Ignore cleanup errors but log them
        console.warn('Resource cleanup callback error:', err);
      }
    }
    
    // Clear references
    this.documentRefs.clear();
    this.cleanupCallbacks.clear();
  }
  
  /**
   * Simple check if cleanup is needed (based on document count only)
   */
  isCleanupNeeded(): boolean {
    return this.documentRefs.size > 10 || this.cleanupCallbacks.size > 50;
  }
}

/**
 * Simplified pipeline context providing core services only
 * REMOVED: Performance tracking, health monitoring, resource reporting
 */
export interface PipelineContext {
  config: ConfigurationManager;
  logger: Logger;
  resources: ResourceManager;
  hooks?: PipelineHooks;
  
  // Core operations only
  validateInput(condition: boolean, message: string): void;
  cloneNode(node: XNode, policy?: ClonePolicy): XNode;
  executeHooks<T>(hooks: any, stage: string, input: T): T;
}

/**
 * Simplified implementation of PipelineContext
 * REMOVED: Advanced monitoring, performance tracking, optimization features
 */
export class PipelineContextImpl implements PipelineContext {
  public config: ConfigurationManager;
  public logger: Logger;
  public resources: ResourceManager;
  public hooks?: PipelineHooks;
  
  constructor(
    config: Configuration,
    pipelineHooks?: PipelineHooks
  ) {
    this.config = new ConfigurationManager(config);
    this.logger = LoggerFactory.create();
    this.resources = new ResourceManager();
    this.hooks = pipelineHooks;
  }
  
  /**
   * Validate input conditions with consistent error handling
   */
  validateInput(condition: boolean, message: string): void {
    if (!condition) {
      throw new ValidationError(message);
    }
  }
  
  /**
   * Clone XNode with consistent policy application
   */
  cloneNode(node: XNode, policy: ClonePolicy = ClonePolicies.TRANSFORM): XNode {
    let result: XNode;
    
    switch (policy.strategy) {
      case 'deep':
        result = cloneNode(node, true);
        if (!policy.preserveParent) {
          result.parent = undefined;
        }
        this.resources.registerXNode(result);
        break;
        
      case 'shallow':
        result = cloneNode(node, false);
        if (!policy.preserveParent) {
          result.parent = undefined;
        }
        this.resources.registerXNode(result);
        break;
        
      case 'none':
      default:
        result = node;
        break;
    }
    
    return result;
  }
  
  /**
   * Execute hooks with consistent error handling and logging
   */
  executeHooks<T>(hooks: any, stage: string, input: T): T {
    if (!hooks) return input;
    
    try {
      if (hooks.beforeStep) {
        hooks.beforeStep(stage, input);
      }
      
      if (hooks.afterStep) {
        hooks.afterStep(stage, input);
      }
    } catch (err) {
      this.logger.warn(`Error in pipeline hooks for ${stage}:`, err);
    }
    
    return input;
  }
}