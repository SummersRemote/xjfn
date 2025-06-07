/**
 * Boolean Transform - Convert string values and attributes to booleans
 * 
 * Design Intent:
 * - Pure function that transforms string values to booleans
 * - Configurable true/false value arrays
 * - Always case-insensitive matching for consistency
 * - Graceful handling of non-matching values (returns original)
 * - Transforms both node values and attributes by default
 */

import { XNode, XNodeAttribute, Primitive } from '../core/xnode';
import { Transform, TransformTarget } from './index';

/**
 * Options for boolean transformation
 */
export interface BooleanTransformOptions extends TransformTarget {
  /**
   * Values to consider as true (default: ['true', 'yes', '1', 'on'])
   */
  trueValues?: string[];
  
  /**
   * Values to consider as false (default: ['false', 'no', '0', 'off'])
   */
  falseValues?: string[];
}

/**
 * Default values for boolean conversion
 */
const DEFAULT_TRUE_VALUES = ['true', 'yes', '1', 'on'];
const DEFAULT_FALSE_VALUES = ['false', 'no', '0', 'off'];

/**
 * Create a transform that converts string values and/or attributes to booleans
 * 
 * @param options Boolean transformation configuration
 * @returns Transform function for use with map()
 * 
 * @example
 * ```typescript
 * // Basic boolean conversion
 * .map(toBoolean())
 * 
 * // Custom true/false values
 * .map(toBoolean({
 *   trueValues: ['yes', 'y', 'enabled'],
 *   falseValues: ['no', 'n', 'disabled']
 * }))
 * 
 * // Only transform values, not attributes
 * .map(toBoolean({ transformAttributes: false }))
 * 
 * // Only transform attributes
 * .map(toBoolean({ 
 *   transformValue: false, 
 *   transformAttributes: true 
 * }))
 * 
 * // Binary-style conversion
 * .map(toBoolean({
 *   trueValues: ['1', 'true'],
 *   falseValues: ['0', 'false']
 * }))
 * ```
 */
export function toBoolean(options: BooleanTransformOptions = {}): Transform {
  const config = {
    transformValue: true,
    transformAttributes: true,
    trueValues: DEFAULT_TRUE_VALUES,
    falseValues: DEFAULT_FALSE_VALUES,
    ...options
  };
  
  // Normalize values to lowercase for case-insensitive comparison
  const normalizedTrueValues = config.trueValues.map(v => v.toLowerCase());
  const normalizedFalseValues = config.falseValues.map(v => v.toLowerCase());
  
  return (node: XNode): XNode => {
    let result = { ...node };

    // Transform node value if enabled
    if (config.transformValue && node.value !== undefined) {
      const converted = convertToBoolean(node.value, normalizedTrueValues, normalizedFalseValues);
      if (converted !== null) {
        result.value = converted;
      }
    }

    // Transform attributes if enabled
    if (config.transformAttributes && node.attributes) {
      result.attributes = node.attributes.map(attr => {
        const converted = convertToBoolean(attr.value, normalizedTrueValues, normalizedFalseValues);
        return converted !== null ? { ...attr, value: converted } : attr;
      });
    }

    return result;
  };
}

/**
 * Convert a primitive value to boolean
 * 
 * @param value Value to convert
 * @param trueValues Array of normalized (lowercase) true values
 * @param falseValues Array of normalized (lowercase) false values
 * @returns Converted boolean or null if conversion failed/not applicable
 */
function convertToBoolean(
  value: Primitive,
  trueValues: string[],
  falseValues: string[]
): boolean | null {
  // If already a boolean, return as-is
  if (typeof value === 'boolean') {
    return value;
  }

  // Only convert strings
  if (typeof value !== 'string') {
    return null;
  }
  
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  
  // Check for true values
  if (trueValues.includes(normalized)) {
    return true;
  }
  
  // Check for false values
  if (falseValues.includes(normalized)) {
    return false;
  }
  
  // No match found
  return null;
}