/**
 * Number node transform - Converts string node values and/or attributes to numbers
 */
import { XNode, XNodeType, createAttributes } from '../core/xnode';
import { Transform } from "../core/tree-utils";

/**
 * Options for number node transform
 */
export interface NumberTransformOptions {
  /**
   * Number of decimal places to round to (default: undefined = no rounding)
   */
  precision?: number;

  /**
   * Character used as decimal separator (default: '.')
   */
  decimalSeparator?: string;

  /**
   * Character used as thousands separator (default: ',')
   */
  thousandsSeparator?: string;

  /**
   * Whether to parse integers (default: true)
   */
  integers?: boolean;

  /**
   * Whether to parse decimals (default: true)
   */
  decimals?: boolean;

  /**
   * Whether to parse scientific notation (default: true)
   */
  scientific?: boolean;

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
 * Create a node transformer that converts string values and/or attributes to numbers
 *
 * @example
 * ```typescript
 * // Transform only node values (current behavior)
 * xjx.fromXml(xml).map(toNumber()).toJson();
 * 
 * // Transform only attributes
 * xjx.fromXml(xml).map(toNumber({ transformAttr: true, transformVal: false })).toJson();
 * 
 * // Transform both values and attributes
 * xjx.fromXml(xml).map(toNumber({ transformAttr: true, transformVal: true })).toJson();
 * 
 * // Transform attributes with precision
 * xjx.fromXml(xml)
 *    .filter(node => ['price', 'total'].includes(node.name))
 *    .map(toNumber({ transformAttr: true, precision: 2 }))
 *    .toJson();
 * ```
 *
 * @param options Number transform options
 * @returns A node transformer function for use with map()
 */
export function toNumber(options: NumberTransformOptions = {}): Transform {
  const {
    precision,
    decimalSeparator = ".",
    thousandsSeparator = ",",
    integers = true,
    decimals = true,
    scientific = true,
    transformAttr = false,
    transformVal = true
  } = options;

  const parseOptions = {
    precision,
    decimalSeparator,
    thousandsSeparator,
    integers,
    decimals,
    scientific,
  };

  return (node: XNode): XNode => {
    let result = { ...node };

    // Transform node value if enabled
    if (transformVal && node.value !== undefined) {
      const transformedValue = transformNumberValue(node.value, parseOptions);
      if (transformedValue !== null) {
        result.value = transformedValue;
      }
    }

    // Transform attributes if enabled (semantic approach)
    if (transformAttr && node.attributes) {
      const transformedAttributes: XNode[] = [];
      
      for (const attr of node.attributes) {
        if (attr.type === XNodeType.ATTRIBUTES) {
          const transformedValue = transformNumberValue(attr.value, parseOptions);
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

/**
 * Transform a single value to number
 */
function transformNumberValue(
  value: any,
  options: {
    precision?: number;
    decimalSeparator: string;
    thousandsSeparator: string;
    integers: boolean;
    decimals: boolean;
    scientific: boolean;
  }
): number | null {
  // If already a number, just apply precision if specified
  if (typeof value === "number") {
    const finalValue = options.precision !== undefined 
      ? Number(value.toFixed(options.precision)) 
      : value;
    return finalValue;
  }

  // Convert to string for parsing
  const strValue = String(value).trim();
  if (!strValue) {
    return null;
  }

  // Try parsing the number
  const parsedNumber = parseNumberString(strValue, options);
  return parsedNumber;
}

/**
 * Parse a number string with custom separators and options
 */
function parseNumberString(
  strValue: string,
  options: {
    precision?: number;
    decimalSeparator: string;
    thousandsSeparator: string;
    integers: boolean;
    decimals: boolean;
    scientific: boolean;
  }
): number | null {
  const {
    precision,
    decimalSeparator,
    thousandsSeparator,
    integers,
    decimals,
    scientific,
  } = options;

  // Quick check for simple configuration
  if (isSimpleConfig(options)) {
    const parsed = Number(strValue);
    if (!isNaN(parsed)) {
      return precision !== undefined
        ? Number(parsed.toFixed(precision))
        : parsed;
    }
    return null;
  }

  // Build regex pattern based on configuration
  const patterns: string[] = [];
  const escapedDecimal = escapeRegex(decimalSeparator);
  const escapedThousands = escapeRegex(thousandsSeparator);

  // Integer pattern
  if (integers) {
    patterns.push(`-?(?:\\d{1,3}(?:${escapedThousands}\\d{3})*|\\d+)`);
  }

  // Decimal pattern
  if (decimals) {
    patterns.push(
      `-?(?:\\d{1,3}(?:${escapedThousands}\\d{3})*|\\d*)${escapedDecimal}\\d+`
    );
  }

  // Scientific notation pattern
  if (scientific) {
    patterns.push(
      `-?(?:\\d+(?:${escapedDecimal}\\d+)?|\\d*${escapedDecimal}\\d+)[eE][+-]?\\d+`
    );
  }

  if (patterns.length === 0) {
    return null;
  }

  const fullPattern = `^(${patterns.join("|")})$`;
  const regex = new RegExp(fullPattern);

  if (!regex.test(strValue)) {
    return null;
  }

  // Normalize for JavaScript parsing
  let normalized = strValue;

  // Remove thousands separators
  if (thousandsSeparator) {
    const sepRegex = new RegExp(escapeRegex(thousandsSeparator), "g");
    normalized = normalized.replace(sepRegex, "");
  }

  // Replace decimal separator
  if (decimalSeparator !== ".") {
    const decRegex = new RegExp(escapeRegex(decimalSeparator), "g");
    normalized = normalized.replace(decRegex, ".");
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) {
    return null;
  }

  // Apply precision if specified
  if (precision !== undefined) {
    return Number(parsed.toFixed(precision));
  }

  return parsed;
}

/**
 * Check if using simple configuration for optimization
 */
function isSimpleConfig(options: {
  decimalSeparator: string;
  thousandsSeparator: string;
  integers: boolean;
  decimals: boolean;
  scientific: boolean;
}): boolean {
  return (
    options.integers === true &&
    options.decimals === true &&
    options.scientific === true &&
    options.decimalSeparator === "." &&
    options.thousandsSeparator === ","
  );
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}