/**
 * Extension system for the XJX library - Updated with Unified Context
 */
import { XNode } from './xnode';
import { PipelineContext } from './context';
import { Adapter, PipelineStage } from './pipeline';
import { SourceHooks, OutputHooks, NodeHooks } from './hooks';

/**
 * Branch context interface for tracking branch state
 */
export interface BranchContext {
  parentNodes: XNode[];           // Original parent context
  originalIndices: number[];      // Original positions of branched nodes
  branchedNodes: XNode[];        // Originally selected subset
  nodePaths: number[][];          // Exact paths to branched nodes in the tree
}

/**
 * Unified extension context - replaces separate Terminal/NonTerminal contexts
 * All extensions now use the same context with standardized operations
 */
export interface UnifiedExtensionContext {
  // Core state
  xnode: XNode | null;
  branchContext: BranchContext | null;
  
  // Unified pipeline context
  pipeline: PipelineContext;
  
  // Standard operations available to all extensions
  validateSource(): void;
  executeSource<T>(converter: Adapter<T, XNode>, input: T, hooks?: SourceHooks<T>): void;
  executeOutput<T>(converter: Adapter<XNode, T>, hooks?: OutputHooks<T>): T;
  executeTransform(operation: PipelineStage<XNode, XNode>, hooks?: NodeHooks): void;
}

/**
 * Terminal extension context - same as unified context
 * Extensions that return values (toXml, toJson, etc.)
 */
export interface TerminalExtensionContext extends UnifiedExtensionContext {}

/**
 * Non-terminal extension context - same as unified context  
 * Extensions that return this for chaining (fromXml, map, filter, etc.)
 */
export interface NonTerminalExtensionContext extends UnifiedExtensionContext {}

/**
 * Extension registration utilities
 */
export class Extension {
  /**
   * Register a terminal extension method (returns a value)
   * @param name Extension name (e.g., 'toXml')
   * @param method Implementation function
   * 
   * @example
   * ```
   * Extension.registerTerminal('toYaml', function(this: TerminalExtensionContext): string {
   *   // Implementation...
   *   return yamlString;
   * });
   * ```
   */
  static registerTerminal(name: string, method: (this: TerminalExtensionContext, ...args: any[]) => any): void {
    // This method is for documentation purposes
    // The actual implementation is in the XJX class
    throw new Error('Use XJX.registerTerminalExtension instead');
  }

  /**
   * Register a non-terminal extension method (returns this for chaining)
   * @param name Extension name (e.g., 'withConfig')
   * @param method Implementation function
   * 
   * @example
   * ```
   * Extension.registerNonTerminal('withFormat', function(this: NonTerminalExtensionContext, format: string): void {
   *   // Implementation...
   * });
   * ```
   */
  static registerNonTerminal(name: string, method: (this: NonTerminalExtensionContext, ...args: any[]) => void): void {
    // This method is for documentation purposes
    // The actual implementation is in the XJX class
    throw new Error('Use XJX.registerNonTerminalExtension instead');
  }
}