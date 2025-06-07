/**
 * Regex node transform - Apply regular expression replacements to string node values and/or attributes
 */
import { XNode, XNodeType, createAttributes } from '../core/xnode';
import { Transform } from "../core/tree-utils";

/**
 * Detect if a string is a regular expression pattern
 * Matches patterns like: /pattern/flags
 * 
 * @param pattern String to check
 * @returns Object with the parsed regex and flags if it's a regex pattern, null otherwise
 */
function parseRegexPattern(pattern: string): { source: string, flags: string } | null {
  const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
  if (match) {
    return {
      source: match[1],
      flags: match[2]
    };
  }
  return null;
}

/**
 * Create a node transformer that applies regex replacement to string values and/or attributes
 * 
 * @example
 * ```typescript
 * // Transform only node values (current behavior)
 * xjx.fromXml(xml).map(regex('hello', 'hi')).toJson();
 * 
 * // Transform only attributes
 * xjx.fromXml(xml).map(regex(/\d+/, 'NUMBER', { transformAttr: true, transformVal: false })).toJson();
 * 
 * // Transform both values and attributes
 * xjx.fromXml(xml).map(regex('/hello/gi', 'hi', { transformAttr: true, transformVal: true })).toJson();
 * 
 * // Clean currency symbols from price attributes
 * xjx.fromXml(xml)
 *    .filter(node => ['price', 'total'].includes(node.name))
 *    .map(regex(/[$,]/g, '', { transformAttr: true }))
 *    .toJson();
 * ```
 * 
 * @param pattern Regular expression pattern (string or RegExp)
 * @param replacement Replacement string (can use capture groups)
 * @param options Transform options for targeting attributes and/or values
 * @returns A node transformer function for use with map()
 */
export function regex(
  pattern: RegExp | string, 
  replacement: string,
  options: {
    transformAttr?: boolean;
    transformVal?: boolean;
  } = {}
): Transform {
  
  const {
    transformAttr = false,
    transformVal = true
  } = options;
  
  // Create RegExp object based on input type
  let re: RegExp;
  
  if (pattern instanceof RegExp) {
    re = pattern;
  } else if (typeof pattern === 'string') {
    const parsed = parseRegexPattern(pattern);
    if (parsed) {
      re = new RegExp(parsed.source, parsed.flags);
    } else {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      re = new RegExp(escaped, 'g');
    }
  } else {
    throw new Error('Pattern must be a string or RegExp');
  }
  
  return (node: XNode): XNode => {
    let result = { ...node };

    // Transform node value if enabled
    if (transformVal && node.value !== undefined && typeof node.value === 'string') {
      result.value = node.value.replace(re, replacement);
    }

    // Transform attributes if enabled (semantic approach)
    if (transformAttr && node.attributes) {
      const transformedAttributes: XNode[] = [];
      
      for (const attr of node.attributes) {
        if (attr.type === XNodeType.ATTRIBUTES && typeof attr.value === 'string') {
          transformedAttributes.push({
            ...attr,
            value: attr.value.replace(re, replacement)
          });
        } else {
          transformedAttributes.push(attr);
        }
      }
      
      result.attributes = transformedAttributes;
    }

    return result;
  };
}


