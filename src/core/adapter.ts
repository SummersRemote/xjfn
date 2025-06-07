/**
 * Adapter system for XJFN - Simple conversion pattern for all formats
 * 
 * Design Intent:
 * - Single interface for input->XNode and XNode->output conversion
 * - Fail-fast validation with clear error messages
 * - Adapters are self-contained and format-specific
 * - Simple execution pattern with logging
 * - No complex error recovery (fail fast principle)
 */

import { PipelineContext } from './context';
import { ProcessingError } from './error';

/**
 * Adapter interface for format conversions
 * 
 * @template TInput Input type (e.g., string for XML, any for JSON)
 * @template TOutput Output type (e.g., XNode, string, any)
 */
export interface Adapter<TInput, TOutput> {
  /**
   * Adapter name for logging and debugging
   */
  name: string;
  
  /**
   * Main conversion method
   * 
   * @param input Input data to convert
   * @param context Pipeline context with config, logging, and metadata
   * @returns Converted output data
   * @throws ProcessingError if conversion fails
   */
  execute(input: TInput, context: PipelineContext): TOutput;
  
  /**
   * Optional input validation (fail fast)
   * 
   * @param input Input data to validate
   * @param context Pipeline context for validation utilities
   * @throws ValidationError if input is invalid
   */
  validate?(input: TInput, context: PipelineContext): void;
}

/**
 * Adapter executor with consistent error handling and logging
 */
export class AdapterExecutor {
  /**
   * Execute an adapter with consistent error handling and logging
   * 
   * @param adapter Adapter to execute
   * @param input Input data
   * @param context Pipeline context
   * @returns Adapter output
   * @throws ProcessingError if adapter fails
   * 
   * @example
   * ```typescript
   * const xmlAdapter = new XmlToXNodeAdapter();
   * const xnode = AdapterExecutor.execute(xmlAdapter, xmlString, context);
   * ```
   */
  static execute<TInput, TOutput>(
    adapter: Adapter<TInput, TOutput>,
    input: TInput,
    context: PipelineContext
  ): TOutput {
    context.logOperation(`adapter-${adapter.name}`, { 
      inputType: typeof input,
      hasValidation: !!adapter.validate 
    });
    
    try {
      // Fail-fast validation
      if (adapter.validate) {
        adapter.validate(input, context);
      }
      
      // Execute conversion
      const result = adapter.execute(input, context);
      
      context.logger.debug(`Adapter ${adapter.name} completed successfully`);
      return result;
      
    } catch (error) {
      const errorMessage = `Adapter ${adapter.name} failed: ${error instanceof Error ? error.message : String(error)}`;
      context.logError(`adapter-${adapter.name}`, error as Error);
      
      // Always fail fast - no error recovery
      throw new ProcessingError(errorMessage, { 
        adapter: adapter.name, 
        input: this.getSafeInputPreview(input)
      });
    }
  }
  
  /**
   * Get a safe preview of input for error reporting
   * 
   * @param input Input to create preview from
   * @returns Safe string representation of input
   */
  private static getSafeInputPreview(input: any): any {
    if (typeof input === 'string') {
      // Truncate long strings for error reporting
      return input.length > 100 ? input.substring(0, 100) + '...' : input;
    }
    
    if (typeof input === 'object' && input !== null) {
      // For objects, just include type info
      if (Array.isArray(input)) {
        return `Array(${input.length})`;
      }
      return `Object(${Object.keys(input).length} keys)`;
    }
    
    return input;
  }
}

/**
 * Base adapter class with common functionality
 * 
 * Adapters can extend this class for consistent behavior, but it's not required.
 * The Adapter interface is the only requirement.
 */
export abstract class BaseAdapter<TInput, TOutput> implements Adapter<TInput, TOutput> {
  abstract name: string;
  
  /**
   * Default validation - override in subclasses for specific validation
   * 
   * @param input Input to validate
   * @param context Pipeline context
   */
  validate(input: TInput, context: PipelineContext): void {
    context.validateInput(input !== null && input !== undefined, `${this.name}: Input cannot be null or undefined`);
  }
  
  /**
   * Abstract execute method - must be implemented by subclasses
   * 
   * @param input Input data
   * @param context Pipeline context
   * @returns Converted output
   */
  abstract execute(input: TInput, context: PipelineContext): TOutput;
}