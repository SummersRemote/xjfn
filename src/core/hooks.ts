import { Configuration } from "./config";
import { ValidationError } from "./error";
import { XNode } from "./xnode";

/**
 * Source operation hooks (for fromXml, fromJson, fromXnode)
 */

export interface SourceHooks<TInput> {
  /**
   * Applied before parsing source - receives raw input, can preprocess
   */
  beforeTransform?: (source: TInput) => TInput | void | undefined;

  /**
   * Applied after parsing - receives parsed XNode, can add metadata
   */
  afterTransform?: (xnode: XNode) => XNode | void | undefined;
}
/**
 * Output operation hooks (for toXml, toJson, toXnode)
 */

export interface OutputHooks<TOutput> {
  /**
   * Applied before conversion - receives XNode, can modify structure
   */
  beforeTransform?: (xnode: XNode) => XNode | void | undefined;

  /**
   * Applied after conversion - receives final output, can wrap/enrich
   */
  afterTransform?: (output: TOutput) => TOutput | void | undefined;
}
/**
 * Node operation hooks (for map and node transformations)
 */

export interface NodeHooks {
  /**
   * Applied before node transformation
   */
  beforeTransform?: (node: XNode) => XNode | void | undefined;

  /**
   * Applied after node transformation
   */
  afterTransform?: (node: XNode) => XNode | void | undefined;
}
/**
 * Pipeline-level hooks for cross-cutting concerns
 */

export interface PipelineHooks {
  /**
   * Called before each pipeline step
   */
  beforeStep?: (stepName: string, input: any) => void;

  /**
   * Called after each pipeline step
   */
  afterStep?: (stepName: string, output: any) => void;
}

/**
 * Validation function for API boundaries
 */

export function validateInput(condition: boolean, message: string): void {
  if (!condition) {
    throw new ValidationError(message);
  }
}
