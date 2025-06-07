/**
 * Node Transforms module - Pure transform functions for use with map()
 *
 * This module provides node transformer factories that work directly with the map() function.
 * All transforms are pure functions that take an XNode and return a transformed XNode.
 */

// Core transform types and utilities
export {
  Transform,
  compose
} from '../core/tree-utils';

// Number node transform
export {
  toNumber,
  NumberTransformOptions
} from './number-transform';

// Boolean node transform
export {
  toBoolean,
  BooleanTransformOptions
} from './boolean-transform';

// Regex node transform
export {
  regex
} from './regex-transform';

/**
 * Quick reference for the minimal transform system:
 * 
 * All transforms are pure functions: (node: XNode) => XNode
 * 
 * ```typescript
 * // Transform all boolean-like values
 * xjx.fromXml(xml)
 *    .map(toBoolean())
 *    .toJson();
 * 
 * // Transform only specific nodes using explicit filtering
 * xjx.fromXml(xml)
 *    .filter(node => ['price', 'total'].includes(node.name))
 *    .map(toNumber({ precision: 2 }))
 *    .toJson();
 * 
 * // Chain multiple transforms using compose
 * xjx.fromXml(xml)
 *    .filter(node => node.name === 'price')
 *    .map(compose(
 *      regex(/[^\d.]/g, ''),  // Clean currency symbols
 *      toNumber({ precision: 2 })
 *    ))
 *    .toJson();
 * 
 * // Inline custom transforms
 * xjx.fromXml(xml)
 *    .map(node => ({ ...node, processed: true }))
 *    .toJson();
 * 
 * // Create reusable configured transforms
 * const cleanPrice = compose(
 *   regex(/[$,]/g, ''),
 *   toNumber({ precision: 2 })
 * );
 * 
 * const parseBoolean = toBoolean({ 
 *   trueValues: ['yes', '1', 'true'], 
 *   falseValues: ['no', '0', 'false'] 
 * });
 * 
 * xjx.fromXml(xml)
 *    .filter(node => node.name === 'price')
 *    .map(cleanPrice)
 *    .filter(node => ['active', 'enabled'].includes(node.name))
 *    .map(parseBoolean)
 *    .toJson();
 * ```
 * 
 * Key principles of the minimal transform system:
 * - Pure functions: no side effects, predictable results
 * - Explicit filtering: use filter() or select() before transforms
 * - Composable: use compose() to chain multiple transforms
 * - Self-contained: transforms handle their own validation and errors
 */