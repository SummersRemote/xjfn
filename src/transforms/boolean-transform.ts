/**
 * Boolean node transform - Converts string node values and/or attributes to booleans
 */
import { XNode, XNodeType, createAttributes } from '../core/xnode';
import { Transform } from "../core/tree-utils";

/**
 * Options for boolean node transform
 */
export interface BooleanTransformOptions {
  /**
   * Values to consider as true (default: ['true', 'yes', '1', 'on'])
   */
  trueValues?: string[];
  
  /**
   * Values to consider as false (default: ['false', 'no', '0', 'off'])
   */
  falseValues?: string[];
  
  /**
   * Whether to ignore case when matching (default: true)
   */
  ignoreCase?: boolean;

  /**
   * Whether to transform node attributes (default: false)
   */
  transformAttr?: boolean;

  /**
   * Whether to transform node value (default: true)
   */
  transformVal?: boolean;
}

/**
 * Default values for boolean conversion
 */
const DEFAULT_TRUE_VALUES = ['true', 'yes', '1', 'on'];
const DEFAULT_FALSE_VALUES = ['false', 'no', '0', 'off'];

/**
 * Create a node transformer that converts string values and/or attributes to booleans
 * 
 * @example
 * ```typescript
 * // Transform only node values (current behavior)
 * xjx.fromXml(xml).map(toBoolean()).toJson();
 * 
 * // Transform only attributes
 * xjx.fromXml(xml).map(toBoolean({ transformAttr: true, transformVal: false })).toJson();
 * 
 * // Transform both values and attributes
 * xjx.fromXml(xml).map(toBoolean({ transformAttr: true, transformVal: true })).toJson();
 * 
 * // Custom true/false values for attributes
 * xjx.fromXml(xml)
 *    .filter(node => ['active', 'enabled', 'visible'].includes(node.name))
 *    .map(toBoolean({ 
 *      transformAttr: true,
 *      trueValues: ['yes', 'y', '1'], 
 *      falseValues: ['no', 'n', '0'] 
 *    }))
 *    .toJson();
 * ```
 * 
 * @param options Boolean transform options
 * @returns A node transformer function for use with map()
 */
export function toBoolean(options: BooleanTransformOptions = {}): Transform {
  const {
    trueValues = DEFAULT_TRUE_VALUES,
    falseValues = DEFAULT_FALSE_VALUES,
    ignoreCase = true,
    transformAttr = false,
    transformVal = true
  } = options;
  
  const normalizedTrueValues = ignoreCase 
    ? trueValues.map(v => v.toLowerCase()) 
    : trueValues;
  const normalizedFalseValues = ignoreCase 
    ? falseValues.map(v => v.toLowerCase()) 
    : falseValues;
  
  const transformOptions = {
    normalizedTrueValues,
    normalizedFalseValues,
    ignoreCase
  };
  
  return (node: XNode): XNode => {
    let result = { ...node };

    // Transform node value if enabled
    if (transformVal && node.value !== undefined) {
      const transformedValue = transformBooleanValue(node.value, transformOptions);
      if (transformedValue !== null) {
        result.value = transformedValue;
      }
    }

    // Transform attributes if enabled (semantic approach)
    if (transformAttr && node.attributes) {
      const transformedAttributes: XNode[] = [];
      
      for (const attr of node.attributes) {
        if (attr.type === XNodeType.ATTRIBUTES) {
          const transformedValue = transformBooleanValue(attr.value, transformOptions);
          if (transformedValue !== null) {
            transformedAttributes.push({
              ...attr,
              value: transformedValue
            });
          } else {
            transformedAttributes.push(attr);
          }
        } else {
          transformedAttributes.push(attr);
        }
      }
      
      result.attributes = transformedAttributes;
    }

    return result;
  };
}




function transformBooleanValue(value: any, options: any): boolean | null {
  if (typeof value !== 'string') return null;
  
  const strValue = value.trim();
  if (!strValue) return null;
  
  const compareValue = options.ignoreCase ? strValue.toLowerCase() : strValue;
  
  if (options.normalizedTrueValues.includes(compareValue)) {
    return true;
  }
  
  if (options.normalizedFalseValues.includes(compareValue)) {
    return false;
  }
  
  return null;
}

