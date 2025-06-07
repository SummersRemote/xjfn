/**
 * Number Transform - Convert string values and attributes to numbers
 * 
 * Design Intent:
 * - Pure function that transforms string values to numbers
 * - Configurable parsing with precision and separators
 * - Support for integers, decimals, and scientific notation
 * - Graceful handling of non-convertible values (returns original)
 * - Transforms both node values and attributes by default
 */

import { XNode, XNodeAttribute, Primitive } from '../core/xnode';
import { Transform, TransformTarget } from './index';

/**
 * Options for number transformation
 */
export interface NumberTransformOptions extends TransformTarget {
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
}

/**
 * Create a transform that converts string values and/or attributes to numbers
 * 
 * @param options Number transformation configuration
 * @returns Transform function for use with map()
 * 
 * @example
 * ```typescript
 * // Basic number conversion
 * .map(toNumber())
 * 
 * // Convert with precision (currency)
 * .map(toNumber({ precision: 2 }))
 * 
 * // European number format
 * .map(toNumber({ 
 *   decimalSeparator: ',', 
 *   thousandsSeparator: '.' 
 * }))
 * 
 * // Only transform values, not attributes
 * .map(toNumber({ transformAttributes: false }))
 * 
 * // Only integers and decimals, no scientific notation
 * .map(toNumber({ scientific: false }))
 * ```
 */
export function toNumber(options: NumberTransformOptions = {}): Transform {
  const config = {
    transformValue: true,
    transformAttributes: true,
    precision: undefined,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    integers: true,
    decimals: true,
    scientific: true,
    ...options
  };

  return (node: XNode): XNode => {
    let result = { ...node };

    // Transform node value if enabled
    if (config.transformValue && node.value !== undefined) {
      const converted = convertToNumber(node.value, config);
      if (converted !== null) {
        result.value = converted;
      }
    }

    // Transform attributes if enabled
    if (config.transformAttributes && node.attributes) {
      result.attributes = node.attributes.map(attr => {
        const converted = convertToNumber(attr.value, config);
        return converted !== null ? { ...attr, value: converted } : attr;
      });
    }

    return result;
  };
}

/**
 * Convert a primitive value to number
 * 
 * @param value Value to convert
 * @param config Conversion configuration
 * @returns Converted number or null if conversion failed/not applicable
 */
function convertToNumber(
  value: Primitive,
  config: {
    precision?: number;
    decimalSeparator: string;
    thousandsSeparator: string;
    integers: boolean;
    decimals: boolean;
    scientific: boolean;
  }
): number | null {
  // If already a number, apply precision if specified
  if (typeof value === 'number') {
    return config.precision !== undefined 
      ? Number(value.toFixed(config.precision))
      : value;
  }

  // Only convert strings
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Try parsing the number
  return parseNumberString(trimmed, config);
}

/**
 * Parse a number string with custom separators and options
 * 
 * @param str String to parse
 * @param config Parsing configuration
 * @returns Parsed number or null if parsing failed
 */
function parseNumberString(
  str: string,
  config: {
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
  } = config;

  // Quick path for simple configuration without separators in the string
  if (isSimpleConfig(config) && !str.includes(',') && !str.includes(' ')) {
    const parsed = Number(str);
    if (!isNaN(parsed)) {
      return precision !== undefined
        ? Number(parsed.toFixed(precision))
        : parsed;
    }
    return null;
  }

  // Handle separator conflicts intelligently
  let effectiveThousandsSeparator = thousandsSeparator;
  if (decimalSeparator === thousandsSeparator) {
    // If separators conflict, assume no thousands separator for this parsing
    effectiveThousandsSeparator = '';
  }

  // Build regex patterns based on configuration
  const patterns: string[] = [];
  const escapedDecimal = escapeRegex(decimalSeparator);
  const escapedThousands = escapeRegex(effectiveThousandsSeparator);

  // Integer pattern
  if (integers) {
    if (effectiveThousandsSeparator) {
      patterns.push(`-?(?:\\d{1,3}(?:${escapedThousands}\\d{3})*|\\d+)`);
    } else {
      patterns.push(`-?\\d+`);
    }
  }

  // Decimal pattern
  if (decimals) {
    if (effectiveThousandsSeparator) {
      patterns.push(
        `-?(?:\\d{1,3}(?:${escapedThousands}\\d{3})*|\\d*)${escapedDecimal}\\d+`
      );
    } else {
      patterns.push(`-?\\d*${escapedDecimal}\\d+`);
    }
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

  // Test if string matches any pattern
  const fullPattern = `^(${patterns.join("|")})$`;
  const regex = new RegExp(fullPattern);

  if (!regex.test(str)) {
    return null;
  }

  // Normalize for JavaScript parsing
  let normalized = str;

  // Remove thousands separators first
  if (effectiveThousandsSeparator) {
    const sepRegex = new RegExp(escapeRegex(effectiveThousandsSeparator), 'g');
    normalized = normalized.replace(sepRegex, '');
  }

  // Replace decimal separator with standard '.'
  if (decimalSeparator !== '.') {
    const decRegex = new RegExp(escapeRegex(decimalSeparator), 'g');
    normalized = normalized.replace(decRegex, '.');
  }

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) {
    return null;
  }

  // Apply precision if specified
  return precision !== undefined 
    ? Number(parsed.toFixed(precision))
    : parsed;
}

/**
 * Check if using simple configuration for optimization
 */
function isSimpleConfig(config: {
  decimalSeparator: string;
  thousandsSeparator: string;
  integers: boolean;
  decimals: boolean;
  scientific: boolean;
}): boolean {
  return (
    config.integers === true &&
    config.decimals === true &&
    config.scientific === true &&
    config.decimalSeparator === '.' &&
    config.thousandsSeparator === ','
  );
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}