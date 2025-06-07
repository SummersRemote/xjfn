/**
 * Simplified pipeline execution framework - Enterprise features removed
 * Phases 1 & 2: Error recovery, performance tracking, health monitoring removed
 */
import { LoggerFactory } from "./logger";
const logger = LoggerFactory.create();

import { PipelineContext } from "./context";
import { XNode } from "./xnode";
import { SourceHooks, OutputHooks, NodeHooks } from "./hooks";

/**
 * Simplified pipeline stage interface
 * REMOVED: errorPolicy, optimizationHints, StageMetrics
 */
export interface PipelineStage<TInput, TOutput> {
  readonly name: string;
  readonly inputType?: string;
  readonly outputType?: string;
  
  // Optional validation before execution
  validate?(input: TInput, context: PipelineContext): void;
  
  // Main execution logic
  execute(input: TInput, context: PipelineContext): TOutput;
  
  // Optional error handling
  onError?(error: Error, input: TInput, context: PipelineContext): TOutput | null;
}

/**
 * Unified converter interface extending PipelineStage
 */
export interface Adapter<TInput, TOutput> extends PipelineStage<TInput, TOutput> {
  readonly name: string;
  readonly inputType: string;
  readonly outputType: string;
}

/**
 * Simplified pipeline execution engine
 */
export class Pipeline {
  
  /**
   * Execute a source operation (input -> XNode) with basic error handling
   */
  static executeSource<T>(
    stage: Adapter<T, XNode>,
    input: T,
    context: PipelineContext,
    hooks?: SourceHooks<T>
  ): XNode {
    return this.executePipelineStage(
      stage,
      input,
      context,
      (processedInput) => {
        // Execute pipeline beforeStep hook
        context.executeHooks(context.hooks, stage.name, processedInput);
        
        // Process input with beforeTransform hook
        if (hooks?.beforeTransform) {
          try {
            const beforeResult = hooks.beforeTransform(processedInput);
            if (beforeResult !== undefined && beforeResult !== null) {
              processedInput = beforeResult;
              logger.debug(`Applied beforeTransform hook in ${stage.name}`);
            }
          } catch (err) {
            logger.warn(`Error in ${stage.name} beforeTransform hook:`, err);
          }
        }
        
        // Validate input if stage provides validation
        if (stage.validate) {
          stage.validate(processedInput, context);
        }
        
        // Execute main conversion
        let result = stage.execute(processedInput, context);
        
        // Process output with afterTransform hook
        if (hooks?.afterTransform) {
          try {
            const afterResult = hooks.afterTransform(result);
            if (afterResult && typeof afterResult === 'object' && typeof afterResult.name === 'string') {
              result = afterResult;
              logger.debug(`Applied afterTransform hook in ${stage.name}`);
            }
          } catch (err) {
            logger.warn(`Error in ${stage.name} afterTransform hook:`, err);
          }
        }
        
        // Execute pipeline afterStep hook
        context.executeHooks(context.hooks, stage.name, result);
        
        return result;
      }
    );
  }
  
  /**
   * Execute an output operation (XNode -> output) with basic error handling
   */
  static executeOutput<T>(
    stage: Adapter<XNode, T>,
    input: XNode,
    context: PipelineContext,
    hooks?: OutputHooks<T>
  ): T {
    return this.executePipelineStage(
      stage,
      input,
      context,
      (processedInput) => {
        // Execute pipeline beforeStep hook
        context.executeHooks(context.hooks, stage.name, processedInput);
        
        // Process input with beforeTransform hook
        if (hooks?.beforeTransform) {
          try {
            const beforeResult = hooks.beforeTransform(processedInput);
            if (beforeResult && typeof beforeResult === 'object' && typeof beforeResult.name === 'string') {
              processedInput = beforeResult;
              logger.debug(`Applied beforeTransform hook in ${stage.name}`);
            }
          } catch (err) {
            logger.warn(`Error in ${stage.name} beforeTransform hook:`, err);
          }
        }
        
        // Validate input if stage provides validation
        if (stage.validate) {
          stage.validate(processedInput, context);
        }
        
        // Execute main conversion
        let result = stage.execute(processedInput, context);
        
        // Process output with afterTransform hook
        if (hooks?.afterTransform) {
          try {
            const afterResult = hooks.afterTransform(result);
            if (afterResult !== undefined && afterResult !== null) {
              result = afterResult;
              logger.debug(`Applied afterTransform hook in ${stage.name}`);
            }
          } catch (err) {
            logger.warn(`Error in ${stage.name} afterTransform hook:`, err);
          }
        }
        
        // Execute pipeline afterStep hook
        context.executeHooks(context.hooks, stage.name, result);
        
        return result;
      }
    );
  }
  
  /**
   * Execute a transform operation (XNode -> XNode) with basic error handling
   */
  static executeTransform(
    stage: PipelineStage<XNode, XNode>,
    input: XNode,
    context: PipelineContext,
    hooks?: NodeHooks
  ): XNode {
    return this.executePipelineStage(
      stage,
      input,
      context,
      (processedInput) => {
        // Execute pipeline beforeStep hook
        context.executeHooks(context.hooks, stage.name, processedInput);
        
        // Process input with beforeTransform hook
        if (hooks?.beforeTransform) {
          try {
            const beforeResult = hooks.beforeTransform(processedInput);
            if (beforeResult && typeof beforeResult === 'object' && typeof beforeResult.name === 'string') {
              processedInput = beforeResult;
              logger.debug(`Applied beforeTransform hook in ${stage.name}`);
            }
          } catch (err) {
            logger.warn(`Error in ${stage.name} beforeTransform hook:`, err);
          }
        }
        
        // Validate input if stage provides validation
        if (stage.validate) {
          stage.validate(processedInput, context);
        }
        
        // Execute main transformation
        let result = stage.execute(processedInput, context);
        
        // Process output with afterTransform hook
        if (hooks?.afterTransform) {
          try {
            const afterResult = hooks.afterTransform(result);
            if (afterResult && typeof afterResult === 'object' && typeof afterResult.name === 'string') {
              result = afterResult;
              logger.debug(`Applied afterTransform hook in ${stage.name}`);
            }
          } catch (err) {
            logger.warn(`Error in ${stage.name} afterTransform hook:`, err);
          }
        }
        
        // Execute pipeline afterStep hook
        context.executeHooks(context.hooks, stage.name, result);
        
        return result;
      }
    );
  }
  
  /**
   * Simplified stage execution with basic error handling only
   */
  private static executePipelineStage<TInput, TOutput>(
    stage: PipelineStage<TInput, TOutput>,
    input: TInput,
    context: PipelineContext,
    executor: (input: TInput) => TOutput
  ): TOutput {
    try {
      context.logger.debug(`Executing stage: ${stage.name}`);
      const result = executor(input);
      context.logger.debug(`Completed stage: ${stage.name}`);
      return result;
    } catch (error) {
      context.logger.error(`Error in stage ${stage.name}:`, error);
      
      // Try stage-specific error handler
      if (stage.onError) {
        try {
          const recovered = stage.onError(error as Error, input, context);
          if (recovered !== null) {
            context.logger.warn(`Stage ${stage.name} recovered from error using onError handler`);
            return recovered;
          }
        } catch (recoveryError) {
          context.logger.error(`Error recovery failed for ${stage.name}:`, recoveryError);
        }
      }
      
      // No recovery available, throw original error
      throw error;
    }
  }
}