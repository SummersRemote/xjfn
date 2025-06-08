/**
 * JSON Adapter - Configurable JSON format conversion with extension registration
 * 
 * Design Intent:
 * - Provide flexible JSON to XNode and XNode to JSON conversion
 * - Self-register extension methods with comprehensive configuration defaults
 * - Enable configurable attribute handling, array strategies, and type preservation
 * - Focus on readable, practical JSON for APIs and human consumption
 * - Support both object input and JSON string parsing
 */

import { ExtensionContext } from '../../core/extension';
import { ValidationError, ProcessingError } from '../../core/error';
import { XJFN } from '../../XJFN';
import { JsonToXNodeAdapter, XNodeToJsonAdapter } from './adapter';
import { DEFAULT_JSON_CONFIG } from './config';

// Export configuration and adapters for external use
export type { JsonConfig } from './config';
export { DEFAULT_JSON_CONFIG } from './config';
export { JsonToXNodeAdapter, XNodeToJsonAdapter } from './adapter';

/**
 * Parse JSON input into XNode tree representation
 * 
 * @param json JSON object, array, primitive, or string to parse
 * @throws ValidationError if input is invalid
 * @throws ProcessingError if JSON parsing fails
 */
export function fromJson(this: ExtensionContext, json: any): void {
  // Handle string input by parsing it first
  if (typeof json === 'string') {
    try {
      json = JSON.parse(json);
    } catch (error) {
      throw new ValidationError(`Invalid JSON string: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  const adapter = new JsonToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, json);
  
  // Log successful conversion with metadata
  this.context.logger.debug('JSON parsed successfully', {
    originalType: this.context.getMetadata('json', 'originalType'),
    isArray: this.context.getMetadata('json', 'isArray'),
    hasAttributes: this.context.getMetadata('json', 'hasAttributes'),
    conversionStrategy: this.context.getMetadata('json', 'conversionStrategy')
  });
}

/**
 * Convert XNode tree to JSON object representation
 * 
 * @returns JSON object/array/primitive per configuration
 * @throws ValidationError if no source XNode is set
 */
export function toJson(this: ExtensionContext): any {
  this.validateSource();
  
  const adapter = new XNodeToJsonAdapter();
  const result = this.executeAdapter(adapter, this.xnode!);
  
  // Log successful conversion with metadata
  this.context.logger.debug('JSON generated successfully', {
    rootType: this.context.getMetadata('jsonOutput', 'rootType'),
    resultType: this.context.getMetadata('jsonOutput', 'resultType'),
    isArray: this.context.getMetadata('jsonOutput', 'isArray'),
    conversionMode: this.context.getMetadata('jsonOutput', 'conversionMode')
  });
  
  return result;
}

/**
 * Convert XNode tree to JSON string representation
 * 
 * @param indent Optional indentation for pretty printing (uses config default if not specified)
 * @returns JSON string with optional formatting
 * @throws ValidationError if no source XNode is set
 */
export function toJsonString(this: ExtensionContext, indent?: number): string {
  this.validateSource();
  
  const json = this.executeAdapter(new XNodeToJsonAdapter(), this.xnode!);
  const indentValue = indent !== undefined ? indent : 
    (this.context.config.formatting.pretty ? this.context.config.formatting.indent : 0);
  
  try {
    const result = JSON.stringify(json, null, indentValue);
    
    this.context.logger.debug('JSON string generated successfully', {
      outputLength: result.length,
      indented: indentValue > 0
    });
    
    return result;
  } catch (error) {
    throw new ProcessingError(`JSON string generation failed: ${error instanceof Error ? error.message : String(error)}`, json);
  }
}

/**
 * Get JSON-specific metadata from the current conversion context
 * 
 * @param key Optional specific metadata key to retrieve
 * @returns JSON metadata object or specific value
 */
export function getJsonMetadata(this: ExtensionContext, key?: string): any {
  this.validateSource();
  return this.context.getMetadata('json', key);
}

/**
 * Get JSON output metadata from the current conversion context
 * 
 * @param key Optional specific metadata key to retrieve
 * @returns JSON output metadata object or specific value
 */
export function getJsonOutputMetadata(this: ExtensionContext, key?: string): any {
  this.validateSource();
  return this.context.getMetadata('jsonOutput', key);
}

/**
 * Check if the current XNode tree originated from JSON with attributes
 * 
 * @returns true if source JSON contained attribute-style properties
 */
export function hasJsonAttributes(this: ExtensionContext): boolean {
  this.validateSource();
  return this.context.getMetadata('json', 'hasAttributes') === true;
}

/**
 * Check if the current XNode tree originated from a JSON array
 * 
 * @returns true if source JSON was an array at the root level
 */
export function isJsonArray(this: ExtensionContext): boolean {
  this.validateSource();
  return this.context.getMetadata('json', 'isArray') === true;
}

/**
 * Get the original JSON type information
 * 
 * @returns string indicating the original JSON root type
 */
export function getJsonType(this: ExtensionContext): string {
  this.validateSource();
  return this.context.getMetadata('json', 'originalType') || 'unknown';
}

/**
 * Configure JSON array handling strategy for current instance
 * 
 * @param strategy Array handling strategy to use
 * @param forceArrays Optional list of element names to always treat as arrays
 */
export function withJsonArrayStrategy(this: ExtensionContext, strategy: 'multiple' | 'always' | 'never' | 'smart', forceArrays?: string[]): void {
  const updates: any = {
    json: {
      ...this.context.config.json,
      arrayStrategy: strategy
    }
  };
  
  if (forceArrays) {
    updates.json.forceArrays = forceArrays;
  }
  
  this.context.mergeConfig(updates);
  
  this.context.logger.debug('JSON array strategy updated', {
    strategy,
    forceArrays: forceArrays || this.context.config.json.forceArrays
  });
}

/**
 * Configure JSON attribute handling for current instance
 * 
 * @param prefix Attribute prefix to use (e.g., '@', '$', '_')
 * @param strategy How to handle attributes in JSON output
 */
export function withJsonAttributes(this: ExtensionContext, prefix: string, strategy: 'prefix' | 'property' | 'merge' | 'ignore' = 'prefix'): void {
  const updates = {
    json: {
      ...this.context.config.json,
      attributePrefix: prefix,
      attributeStrategy: strategy
    }
  };
  
  this.context.mergeConfig(updates);
  
  this.context.logger.debug('JSON attribute handling updated', {
    prefix,
    strategy
  });
}

// Register JSON extensions with comprehensive default configuration
XJFN.registerExtension('fromJson', { method: fromJson, isTerminal: false }, {
  json: DEFAULT_JSON_CONFIG
});

XJFN.registerExtension('toJson', { method: toJson, isTerminal: true });
XJFN.registerExtension('toJsonString', { method: toJsonString, isTerminal: true });
XJFN.registerExtension('getJsonMetadata', { method: getJsonMetadata, isTerminal: true });
XJFN.registerExtension('getJsonOutputMetadata', { method: getJsonOutputMetadata, isTerminal: true });
XJFN.registerExtension('hasJsonAttributes', { method: hasJsonAttributes, isTerminal: true });
XJFN.registerExtension('isJsonArray', { method: isJsonArray, isTerminal: true });
XJFN.registerExtension('getJsonType', { method: getJsonType, isTerminal: true });
XJFN.registerExtension('withJsonArrayStrategy', { method: withJsonArrayStrategy, isTerminal: false });
XJFN.registerExtension('withJsonAttributes', { method: withJsonAttributes, isTerminal: false });