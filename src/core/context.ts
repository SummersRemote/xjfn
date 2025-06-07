/**
 * Pipeline context system for XJFN - Simple context with namespaced metadata
 * 
 * Design Intent:
 * - Single context class for all operations (no interface/implementation split)
 * - Simple configuration management (no wrapper classes)
 * - Basic logging integration
 * - Namespaced metadata storage for extension coordination
 * - Fail-fast validation
 * 
 * Metadata System:
 * - Extensions store data under their own namespace to avoid conflicts
 * - Useful for cross-extension communication and round-trip preservation
 * - Examples: xml.hasNamespaces, json.originalType, xnode.serializedAt
 * - Enables intelligent processing decisions based on source characteristics
 */

import { Configuration } from './config';
import { Logger, LoggerFactory } from './logger';
import { ValidationError } from './error';
import { XNode, cloneNode } from './xnode';

/**
 * Pipeline context providing execution environment and services
 */
export class PipelineContext {
  public config: Configuration;
  public logger: Logger;
  public metadata: Record<string, Record<string, any>>; // Namespaced metadata storage
  
  constructor(config: Configuration) {
    this.config = config;
    this.logger = LoggerFactory.create('XJFN');
    this.metadata = {}; // Initialize empty metadata
  }
  
  // --- Node Operations ---
  
  /**
   * Clone an XNode with simple deep/shallow flag
   * 
   * @param node Node to clone
   * @param deep Whether to deep clone children and attributes
   * @returns Cloned node
   */
  cloneNode(node: XNode, deep: boolean = false): XNode {
    return cloneNode(node, deep);
  }
  
  // --- Validation ---
  
  /**
   * Fail-fast input validation with consistent error handling
   * 
   * @param condition Condition to check
   * @param message Error message if condition fails
   * @throws ValidationError if condition is false
   */
  validateInput(condition: boolean, message: string): void {
    if (!condition) {
      this.logger.error(`Validation failed: ${message}`);
      throw new ValidationError(message);
    }
  }
  
  // --- Configuration Management ---
  
  /**
   * Update configuration (for withConfig() extension)
   * 
   * @param updates Partial configuration updates to merge
   */
  mergeConfig(updates: Partial<Configuration>): void {
    this.config = { ...this.config, ...updates };
    this.logger.debug('Configuration updated', updates);
  }
  
  // --- Namespaced Metadata Management ---
  
  /**
   * Set metadata value for a specific namespace and key
   * 
   * @param namespace Namespace (e.g., 'xml', 'json', 'xnode')
   * @param key Metadata key
   * @param value Metadata value
   * 
   * @example
   * ```typescript
   * context.setMetadata('xml', 'hasNamespaces', true);
   * context.setMetadata('json', 'originalType', 'array');
   * ```
   */
  setMetadata(namespace: string, key: string, value: any): void {
    if (!this.metadata[namespace]) {
      this.metadata[namespace] = {};
    }
    this.metadata[namespace][key] = value;
    this.logger.debug(`Metadata set: ${namespace}.${key}`, value);
  }
  
  /**
   * Get metadata value(s) for a namespace
   * 
   * @param namespace Namespace to get metadata from
   * @param key Optional specific key to get (if omitted, returns all namespace metadata)
   * @returns Metadata value or namespace object
   * 
   * @example
   * ```typescript
   * const hasNamespaces = context.getMetadata('xml', 'hasNamespaces');
   * const allXmlMetadata = context.getMetadata('xml');
   * ```
   */
  getMetadata(namespace: string, key?: string): any {
    if (!key) {
      return this.metadata[namespace] || {};
    }
    return this.metadata[namespace]?.[key];
  }
  
  /**
   * Check if metadata exists for a namespace/key
   * 
   * @param namespace Namespace to check
   * @param key Optional specific key to check (if omitted, checks if namespace has any metadata)
   * @returns true if metadata exists
   * 
   * @example
   * ```typescript
   * if (context.hasMetadata('xml', 'hasNamespaces')) {
   *   // Use namespace-aware processing
   * }
   * ```
   */
  hasMetadata(namespace: string, key?: string): boolean {
    if (!key) {
      return !!this.metadata[namespace] && Object.keys(this.metadata[namespace]).length > 0;
    }
    return !!this.metadata[namespace]?.[key];
  }
  
  /**
   * Clear metadata for a namespace or specific key
   * 
   * @param namespace Namespace to clear
   * @param key Optional specific key to clear (if omitted, clears all namespace metadata)
   * 
   * @example
   * ```typescript
   * context.clearMetadata('xml', 'hasNamespaces'); // Clear specific key
   * context.clearMetadata('xml'); // Clear all xml metadata
   * ```
   */
  clearMetadata(namespace: string, key?: string): void {
    if (!key) {
      delete this.metadata[namespace];
      this.logger.debug(`Cleared all metadata for namespace: ${namespace}`);
    } else if (this.metadata[namespace]) {
      delete this.metadata[namespace][key];
      this.logger.debug(`Cleared metadata: ${namespace}.${key}`);
    }
  }
  
  // --- Logging Helpers ---
  
  /**
   * Log an operation with optional details
   * 
   * @param operation Operation name
   * @param details Optional structured details
   * 
   * @example
   * ```typescript
   * context.logOperation('xml-parse', { elementCount: 42, hasNamespaces: true });
   * ```
   */
  logOperation(operation: string, details?: any): void {
    this.logger.debug(`Operation: ${operation}`, details);
  }
  
  /**
   * Log an error for an operation
   * 
   * @param operation Operation name where error occurred
   * @param error Error that occurred
   * 
   * @example
   * ```typescript
   * context.logError('xml-parse', new Error('Invalid XML syntax'));
   * ```
   */
  logError(operation: string, error: Error): void {
    this.logger.error(`Error in ${operation}:`, error);
  }
}