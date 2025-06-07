/**
 * Extension system for XJFN - Unified context and registration pattern
 * 
 * Design Intent:
 * - Single context interface for all extensions (terminal and non-terminal)
 * - Explicit registration on import
 * - Adapter-based format conversion
 * - Simple configuration merging
 * - Clear separation between core operations and format specifics
 */

import { XNode } from './xnode';
import { PipelineContext } from './context';
import { Adapter, AdapterExecutor } from './adapter';
import { ValidationError } from './error';

/**
 * Branch context for tracking branch state during branch/merge operations
 */
export interface BranchContext {
  parentNode: XNode;           // Original document root
  selectedNodes: XNode[];      // Nodes that were branched
  originalPaths: number[][];   // Paths to original locations
}

/**
 * Single extension context - used by all extensions (terminal and non-terminal)
 * 
 * This unified interface provides all the operations that extensions need,
 * whether they return values (terminal) or return this for chaining (non-terminal).
 */
export interface ExtensionContext {
  /**
   * Current XNode being processed (null if no source set)
   */
  xnode: XNode | null;
  
  /**
   * Branch context for branch/merge operations (null if not in branch)
   */
  branchContext: BranchContext | null;
  
  /**
   * Pipeline context providing configuration, logging, and metadata
   */
  context: PipelineContext;
  
  // --- Core Operations ---
  
  /**
   * Validate that a source has been set before transformation
   * 
   * @throws ValidationError if no source has been set
   * 
   * @example
   * ```typescript
   * export function toJson(this: ExtensionContext): any {
   *   this.validateSource(); // Ensure fromXml/fromJson was called first
   *   // ... conversion logic
   * }
   * ```
   */
  validateSource(): void;
  
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
  executeAdapter<TInput, TOutput>(adapter: Adapter<TInput, TOutput>, input: TInput): TOutput;
}

/**
 * Extension implementation interface for registration
 * 
 * Defines the structure needed to register an extension method
 */
export interface ExtensionImplementation {
  /**
   * The extension method implementation
   * 
   * @param this Extension context providing access to xnode, context, etc.
   * @param args Method arguments
   * @returns Method result (any type for terminal methods, void for non-terminal)
   */
  method: (this: ExtensionContext, ...args: any[]) => any;
  
  /**
   * Whether this extension is terminal (returns a value) or non-terminal (returns this)
   * 
   * - true: Terminal method (e.g., toJson, toXml) - returns a value
   * - false: Non-terminal method (e.g., fromXml, map, filter) - returns this for chaining
   */
  isTerminal: boolean;
}

/**
 * Extension registration utilities and documentation
 */
export class Extension {
  /**
   * Register a terminal extension method (returns a value)
   * 
   * This is a documentation method - actual registration happens in the main XJFN class
   * 
   * @param name Extension name (e.g., 'toXml')
   * @param method Implementation function
   * 
   * @example
   * ```typescript
   * export function toYaml(this: ExtensionContext): string {
   *   this.validateSource();
   *   const adapter = new XNodeToYamlAdapter();
   *   return this.executeAdapter(adapter, this.xnode!);
   * }
   * 
   * Extension.registerTerminal('toYaml', toYaml);
   * ```
   */
  static registerTerminal(name: string, method: (this: ExtensionContext, ...args: any[]) => any): void {
    throw new Error('Use XJFN.registerExtension instead');
  }

  /**
   * Register a non-terminal extension method (returns this for chaining)
   * 
   * This is a documentation method - actual registration happens in the main XJFN class
   * 
   * @param name Extension name (e.g., 'withConfig')
   * @param method Implementation function
   * 
   * @example
   * ```typescript
   * export function withFormat(this: ExtensionContext, format: string): void {
   *   this.context.setMetadata('output', 'format', format);
   * }
   * 
   * Extension.registerNonTerminal('withFormat', withFormat);
   * ```
   */
  static registerNonTerminal(name: string, method: (this: ExtensionContext, ...args: any[]) => void): void {
    throw new Error('Use XJFN.registerExtension instead');
  }
}

/**
 * Base implementation of ExtensionContext
 * 
 * This class can be used by the main XJFN class to provide extension context
 */
export class BaseExtensionContext implements ExtensionContext {
  constructor(
    public xnode: XNode | null,
    public branchContext: BranchContext | null,
    public context: PipelineContext
  ) {}
  
  /**
   * Validate that a source has been set before transformation
   * 
   * @throws ValidationError if no source has been set
   */
  validateSource(): void {
    if (!this.xnode) {
      throw new ValidationError('No source set: call fromXml(), fromJson(), or fromXNode() before transformation');
    }
  }
  
  /**
   * Execute an adapter with consistent error handling and logging
   * 
   * @param adapter Adapter to execute
   * @param input Input for the adapter
   * @returns Adapter output
   */
  executeAdapter<TInput, TOutput>(adapter: Adapter<TInput, TOutput>, input: TInput): TOutput {
    return AdapterExecutor.execute(adapter, input, this.context);
  }
}