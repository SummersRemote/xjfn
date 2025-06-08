/**
 * Transform Functions - Pure transform functions for XNode data transformation
 * 
 * Design Intent:
 * - Pure functions with no side effects
 * - Composable through functional composition
 * - Support both node values and attributes
 * - Fail fast on errors in composition
 * - Lightweight and type-safe
 */

import { XNode } from '../core/xnode';

/**
 * Transform function type - pure function that transforms XNode to XNode
 * 
 * @param node Input XNode
 * @returns Transformed XNode (new instance)
 */
export type Transform = (node: XNode) => XNode;

/**
 * Transform targeting options - controls what gets transformed
 */
export interface TransformTarget {
  /**
   * Transform node.value (default: true)
   */
  transformValue?: boolean;
  
  /**
   * Transform node.attributes (default: true)
   */
  transformAttributes?: boolean;
}

/**
 * Functional composition of multiple transforms
 * 
 * Applies transforms left-to-right, fail-fast on any error.
 * Each transform receives the result of the previous transform.
 * 
 * @param transforms Array of transform functions to compose
 * @returns Single composed transform function
 * @throws Error if any transform in the chain fails
 * 
 * @example
 * ```typescript
 * // Compose multiple transforms
 * const cleanAndParsePrice = compose(
 *   regex(/[^\d.]/g, ''),        // Remove non-numeric chars
 *   toNumber({ precision: 2 }),   // Convert to number with 2 decimals
 *   node => ({ ...node, processed: true }) // Add metadata
 * );
 * 
 * // Use with map()
 * xjfn.fromXml(xml)
 *   .filter(node => node.name === 'price')
 *   .map(cleanAndParsePrice)
 *   .toJson();
 * ```
 */
export function compose(...transforms: Transform[]): Transform {
  if (transforms.length === 0) {
    return (node: XNode): XNode => node;
  }
  
  if (transforms.length === 1) {
    return transforms[0];
  }
  
  return (node: XNode): XNode => {
    return transforms.reduce((result, transform) => {
      // Fail fast - let any errors propagate immediately
      return transform(result);
    }, node);
  };
}

// Export transform implementations
export { toNumber } from './number';
export type { NumberTransformOptions } from './number';

export { toBoolean } from './boolean';
export type { BooleanTransformOptions } from './boolean';

export {
  regex
} from './regex';

/**
 * Transform Functions Usage Guide
 * 
 * All transform functions are pure - they take an XNode and return a new XNode
 * without modifying the original. They follow consistent patterns:
 * 
 * @example Basic Usage
 * ```typescript
 * import { toNumber, toBoolean, regex, compose } from 'xjfn/transforms';
 * 
 * // Transform only values (default behavior)
 * .map(toNumber())
 * 
 * // Transform only attributes
 * .map(toNumber({ transformValue: false, transformAttributes: true }))
 * 
 * // Transform both (explicit)
 * .map(toNumber({ transformValue: true, transformAttributes: true }))
 * 
 * // Compose multiple transforms
 * .map(compose(
 *   regex(/^\s+|\s+$/g, ''),    // Trim whitespace
 *   toNumber({ precision: 2 })   // Convert to number
 * ))
 * ```
 * 
 * @example Advanced Composition
 * ```typescript
 * // Create reusable transform pipelines
 * const cleanPrice = compose(
 *   regex(/[$,]/g, ''),           // Remove currency symbols
 *   toNumber({ precision: 2 })    // Parse as currency
 * );
 * 
 * const parseBoolean = toBoolean({
 *   trueValues: ['yes', 'on', '1'],
 *   falseValues: ['no', 'off', '0']
 * });
 * 
 * // Apply to specific nodes
 * xjfn.fromXml(data)
 *   .filter(node => node.name === 'price')
 *   .map(cleanPrice)
 *   .filter(node => ['active', 'enabled'].includes(node.name))
 *   .map(parseBoolean)
 *   .toJson();
 * ```
 * 
 * @example Error Handling
 * ```typescript
 * // Compose fails fast - any error stops the chain
 * try {
 *   const result = compose(
 *     regex(/invalid[/g, ''),     // Invalid regex - will throw
 *     toNumber()
 *   )(node);
 * } catch (error) {
 *   // Handle transformation error
 *   console.error('Transform failed:', error.message);
 * }
 * ```
 * 
 * Key Principles:
 * - Pure functions: no side effects, predictable results
 * - Immutable: always return new XNode instances
 * - Composable: use compose() to chain multiple transforms
 * - Fail fast: errors propagate immediately for debugging
 * - Type safe: full TypeScript support with proper interfaces
 */