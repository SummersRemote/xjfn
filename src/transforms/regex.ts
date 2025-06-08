/**
 * Regex Transform - Apply regular expression replacements to string values and attributes
 * 
 * Design Intent:
 * - Pure function that applies regex replacements to strings
 * - Support for RegExp objects and string patterns
 * - Clear error handling for invalid patterns (fail fast)
 * - Only transforms string values (leaves other types unchanged)
 * - Transforms both node values and attributes by default
 */

import { XNode } from '../core/xnode';
import { Transform, TransformTarget } from './index';

/**
 * Create a transform that applies regex replacement to string values and/or attributes
 * 
 * @param pattern Regular expression pattern (RegExp object or string)
 * @param replacement Replacement string (can use capture groups like $1, $2)
 * @param options Transform targeting options
 * @returns Transform function for use with map()
 * @throws Error if pattern is invalid
 * 
 * @example
 * ```typescript
 * // Remove all whitespace
 * .map(regex(/\s+/g, ''))
 * 
 * // Clean currency symbols
 * .map(regex(/[$,]/g, ''))
 * 
 * // Replace with capture groups
 * .map(regex(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1'))
 * 
 * // String pattern (treated as literal)
 * .map(regex('hello', 'hi'))
 * 
 * // Global string pattern
 * .map(regex(/hello/g, 'hi'))
 * 
 * // Only transform attributes
 * .map(regex(/\s+/g, '', { 
 *   transformValue: false, 
 *   transformAttributes: true 
 * }))
 * ```
 */
export function regex(
  pattern: RegExp | string, 
  replacement: string,
  options: TransformTarget = {}
): Transform {
  const config = {
    transformValue: true,
    transformAttributes: true,
    ...options
  };
  
  // Create RegExp object from input pattern
  const regexp = createRegExp(pattern);
  
  return (node: XNode): XNode => {
    let result = { ...node };

    // Transform node value if enabled
    if (config.transformValue && typeof node.value === 'string') {
      result.value = node.value.replace(regexp, replacement);
    }

    // Transform attributes if enabled
    if (config.transformAttributes && node.attributes) {
      result.attributes = node.attributes.map(attr => {
        if (typeof attr.value === 'string') {
          return { ...attr, value: attr.value.replace(regexp, replacement) };
        }
        return attr;
      });
    }

    return result;
  };
}

/**
 * Create RegExp object from pattern input
 * 
 * @param pattern RegExp object or string pattern
 * @returns RegExp object ready for use
 * @throws Error if pattern is invalid
 */
function createRegExp(pattern: RegExp | string): RegExp {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  
  if (typeof pattern === 'string') {
    // Check if string looks like a regex pattern with flags (/pattern/flags)
    const regexMatch = pattern.match(/^\/(.+)\/([gimuy]*)$/);
    
    if (regexMatch) {
      // Parse as regex pattern with flags
      try {
        return new RegExp(regexMatch[1], regexMatch[2]);
      } catch (error) {
        throw new Error(`Invalid regex pattern: ${pattern} - ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      // Treat as literal string (escape special regex characters)
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(escaped, 'g');
    }
  }
  
  throw new Error(`Pattern must be a RegExp object or string, got: ${typeof pattern}`);
}