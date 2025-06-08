/**
 * JSON Adapter Implementation - Configurable JSON to XNode conversion
 * 
 * Design Intent:
 * - Focus on compact, readable JSON representation for APIs and web interfaces
 * - Highly configurable attribute and value handling for different use cases
 * - Intelligent array detection with multiple strategies
 * - Type preservation and simplification options for practical use
 * - Metadata tracking for conversion intelligence and round-trip hints
 */

import { Adapter } from '../../core/adapter';
import { XNode, XNodeType, createRecord, createCollection, createField, addChild, addAttribute } from '../../core/xnode';
import { PipelineContext } from '../../core/context';
import { ValidationError, ProcessingError } from '../../core/error';
import { JsonConfig } from './config';

/**
 * JSON Object to XNode Conversion Adapter
 * 
 * Converts JSON object/array/primitive input to semantic XNode tree representation
 * with configurable handling strategies and intelligent type detection
 */
export class JsonToXNodeAdapter implements Adapter<any, XNode> {
  name = 'json-to-xnode';
  
  validate(json: any, context: PipelineContext): void {
    if (json === undefined) {
      throw new ValidationError('JSON input cannot be undefined');
    }
    
    // Allow null, but warn about it
    if (json === null) {
      context.logger.warn('JSON input is null - will create empty value node');
    }
  }
  
  execute(json: any, context: PipelineContext): XNode {
    const config = context.config.json as JsonConfig;
    
    try {
      // Store metadata about the original JSON
      context.setMetadata('json', 'originalType', typeof json);
      context.setMetadata('json', 'isArray', Array.isArray(json));
      context.setMetadata('json', 'isNull', json === null);
      context.setMetadata('json', 'hasAttributes', this.hasAttributeProperties(json, config));
      context.setMetadata('json', 'conversionStrategy', this.determineConversionStrategy(json));
      
      return this.convertJsonValueToXNode(json, 'root', config, context);
    } catch (error) {
      throw new ProcessingError(`JSON conversion failed: ${error instanceof Error ? error.message : String(error)}`, json);
    }
  }
  
  private hasAttributeProperties(obj: any, config: JsonConfig): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.keys(obj).some(key => key.startsWith(config.attributePrefix));
  }
  
  private determineConversionStrategy(json: any): string {
    if (Array.isArray(json)) return 'array-root';
    if (typeof json === 'object' && json !== null) return 'object-root';
    if (typeof json === 'string') return 'string-primitive';
    if (typeof json === 'number') return 'number-primitive';
    if (typeof json === 'boolean') return 'boolean-primitive';
    if (json === null) return 'null-primitive';
    return 'unknown';
  }
  
  private convertJsonValueToXNode(value: any, name: string, config: JsonConfig, context: PipelineContext): XNode {
    // Handle null values
    if (value === null) {
      if (config.preserveNull) {
        return createField(name, null);
      } else {
        return createField(name, '');
      }
    }
    
    // Handle undefined values
    if (value === undefined) {
      if (config.preserveUndefined) {
        return createField(name, undefined);
      } else {
        return createField(name, '');
      }
    }
    
    // Handle primitives with type preservation
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return createField(name, value);
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return this.convertJsonArrayToXNode(value, name, config, context);
    }
    
    // Handle objects
    if (typeof value === 'object') {
      return this.convertJsonObjectToXNode(value, name, config, context);
    }
    
    // Fallback for unknown types
    context.logger.warn(`Unknown JSON value type for key "${name}": ${typeof value}`);
    return createField(name, String(value));
  }
  
  private convertJsonArrayToXNode(array: any[], name: string, config: JsonConfig, context: PipelineContext): XNode {
    const collection = createCollection(name);
    
    array.forEach((item, index) => {
      const itemName = config.defaultItemName;
      const itemNode = this.convertJsonValueToXNode(item, itemName, config, context);
      
      // Add order metadata if preserving order
      if (config.preserveOrder) {
        addAttribute(itemNode, config.orderProperty, index);
      }
      
      addChild(collection, itemNode);
    });
    
    return collection;
  }
  
  private convertJsonObjectToXNode(obj: Record<string, any>, name: string, config: JsonConfig, context: PipelineContext): XNode {
    const node = createRecord(name);
    
    // Separate attributes, values, and children based on configuration
    const attributes: Array<{ name: string, value: any }> = [];
    const children: Array<{ name: string, value: any }> = [];
    let textValue: any = undefined;
    Object.entries(obj).forEach(([key, value], index) => {
      // Handle type metadata
      if (key === config.typeProperty && config.preserveTypes) {
        // Don't process type metadata as regular content
        return;
      }
      
      // Handle order metadata
      if (key === config.orderProperty && config.preserveOrder) {
        // Don't process order metadata as regular content
        return;
      }
      
      // Handle attributes
      if (key.startsWith(config.attributePrefix) && config.attributeStrategy !== 'ignore') {
        const attrName = key.substring(config.attributePrefix.length);
        attributes.push({ name: attrName, value });
        return;
      }
      
      // Handle text content
      if ((key === config.valueProperty || key === config.textContentKey) && config.valueStrategy !== 'merge') {
        textValue = value;
        return;
      }
      
      // Handle as child element
      children.push({ name: key, value });
      
      // Add order if preserving
      if (config.preserveOrder) {
        addAttribute(node, `${config.orderProperty}_${key}`, index);
      }
    });
    
    // Add attributes
    attributes.forEach(({ name, value }) => {
      const processedValue = this.processAttributeValue(value, config);
      addAttribute(node, name, processedValue);
    });
    
    // Add text value if present
    if (textValue !== undefined) {
      node.value = this.processPrimitiveValue(textValue, config);
    }
    
    // Add children with array strategy handling
    this.addChildrenWithArrayStrategy(node, children, config, context);
    
    return node;
  }
  
  private addChildrenWithArrayStrategy(node: XNode, children: Array<{ name: string, value: any }>, config: JsonConfig, context: PipelineContext): void {
    // Group children by name to apply array strategy
    const childGroups = children.reduce((groups, child) => {
      if (!groups[child.name]) groups[child.name] = [];
      groups[child.name].push(child.value);
      return groups;
    }, {} as Record<string, any[]>);
    
    Object.entries(childGroups).forEach(([name, values]) => {
      const shouldTreatAsArray = this.shouldTreatAsArray(name, values, config);
      
      if (shouldTreatAsArray) {
        // Add each value as a separate child with the same name
        values.forEach(value => {
          const childNode = this.convertJsonValueToXNode(value, name, config, context);
          addChild(node, childNode);
        });
      } else {
        // Single value - use the first one (or only one)
        const value = values.length === 1 ? values[0] : values;
        const childNode = this.convertJsonValueToXNode(value, name, config, context);
        addChild(node, childNode);
      }
    });
  }
  
  private shouldTreatAsArray(name: string, values: any[], config: JsonConfig): boolean {
    switch (config.arrayStrategy) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'multiple':
        return values.length > 1 || config.forceArrays.includes(name);
      case 'smart':
        // Smart strategy: multiple values, forced arrays, or original was array
        return values.length > 1 || config.forceArrays.includes(name) || 
               (values.length === 1 && Array.isArray(values[0]));
      default:
        return values.length > 1;
    }
  }
  
  private processAttributeValue(value: any, config: JsonConfig): any {
    return this.processPrimitiveValue(value, config);
  }
  
  private processPrimitiveValue(value: any, config: JsonConfig): any {
    if (value === null) {
      return config.preserveNull ? null : '';
    }
    
    if (value === undefined) {
      return config.preserveUndefined ? undefined : '';
    }
    
    if (typeof value === 'string') {
      // Try to preserve numbers and booleans if configured
      if (config.preserveNumbers && this.isNumericString(value)) {
        const num = Number(value);
        return isNaN(num) ? value : num;
      }
      if (config.preserveBooleans && this.isBooleanString(value)) {
        return value.toLowerCase() === 'true';
      }
    }
    
    return value;
  }
  
  private isNumericString(str: string): boolean {
    if (!str.trim()) return false;
    return !isNaN(Number(str)) && !isNaN(parseFloat(str));
  }
  
  private isBooleanString(str: string): boolean {
    const lower = str.toLowerCase().trim();
    return lower === 'true' || lower === 'false';
  }
}

/**
 * XNode to JSON Object Conversion Adapter
 * 
 * Converts XNode tree representation to JSON object/array output
 * with configurable formatting and intelligent structure handling
 */
export class XNodeToJsonAdapter implements Adapter<XNode, any> {
  name = 'xnode-to-json';
  
  execute(xnode: XNode, context: PipelineContext): any {
    const config = context.config.json as JsonConfig;
    
    // Store metadata about the conversion
    context.setMetadata('jsonOutput', 'rootType', xnode.type);
    context.setMetadata('jsonOutput', 'hasNamespaces', !!xnode.namespace);
    context.setMetadata('jsonOutput', 'conversionMode', this.determineConversionMode(xnode));
    
    const result = this.convertXNodeToJsonValue(xnode, config, context);
    
    // Store final metadata
    context.setMetadata('jsonOutput', 'resultType', typeof result);
    context.setMetadata('jsonOutput', 'isArray', Array.isArray(result));
    context.setMetadata('jsonOutput', 'generatedAt', new Date().toISOString());
    
    return result;
  }
  
  private determineConversionMode(xnode: XNode): string {
    if (xnode.type === XNodeType.COLLECTION) return 'collection-root';
    if (xnode.type === XNodeType.RECORD) return 'record-root';
    if (xnode.type === XNodeType.FIELD || xnode.type === XNodeType.VALUE) return 'primitive-root';
    return 'unknown';
  }
  
  private convertXNodeToJsonValue(xnode: XNode, config: JsonConfig, context: PipelineContext): any {
    switch (xnode.type) {
      case XNodeType.FIELD:
      case XNodeType.VALUE:
        return this.processPrimitiveValue(xnode.value, config);
        
      case XNodeType.COLLECTION:
        return this.convertCollectionToJson(xnode, config, context);
        
      case XNodeType.RECORD:
        return this.convertRecordToJson(xnode, config, context);
        
      case XNodeType.COMMENT:
        return config.ignoreComments ? undefined : { _comment: xnode.value };
        
      case XNodeType.INSTRUCTION:
        return config.ignoreInstructions ? undefined : { _instruction: { target: xnode.name, data: xnode.value } };
        
      case XNodeType.DATA:
        return config.ignoreCData ? xnode.value : { _cdata: xnode.value };
        
      default:
        context.logger.warn(`Unsupported XNode type for JSON conversion: ${xnode.type}`);
        return xnode.value;
    }
  }
  
  private convertCollectionToJson(xnode: XNode, config: JsonConfig, context: PipelineContext): any {
    if (!xnode.children || xnode.children.length === 0) {
      return [];
    }
    
    const items = xnode.children
      .map(child => this.convertXNodeToJsonValue(child, config, context))
      .filter(item => item !== undefined);
    
    return items;
  }
  
  private convertRecordToJson(xnode: XNode, config: JsonConfig, context: PipelineContext): any {
    const result: any = {};
    
    // Add type metadata if preserving types
    if (config.preserveTypes) {
      result[config.typeProperty] = xnode.type;
    }
    
    // Add namespace information if not ignoring and present
    if (!config.ignoreNamespaces && xnode.namespace) {
      result._namespace = xnode.namespace;
      if (xnode.label) {
        result._namespacePrefix = xnode.label;
      }
    }
    
    // Add attributes with prefix strategy
    if (xnode.attributes && config.attributeStrategy !== 'ignore') {
      xnode.attributes.forEach(attr => {
        const key = config.attributeStrategy === 'prefix' ? 
          `${config.attributePrefix}${attr.name}` : attr.name;
        result[key] = this.processPrimitiveValue(attr.value, config);
      });
    }
    
    // Handle children and text content
    const childGroups = this.groupChildrenByName(xnode.children || []);
    
    Object.entries(childGroups).forEach(([name, children]) => {
      const validChildren = children.filter(child => {
        // Filter out ignored node types
        if (config.ignoreComments && child.type === XNodeType.COMMENT) return false;
        if (config.ignoreInstructions && child.type === XNodeType.INSTRUCTION) return false;
        return true;
      });
      
      if (validChildren.length === 0) return;
      
      if (validChildren.length === 1 && !this.shouldForceArray(name, config)) {
        // Single child
        const converted = this.convertXNodeToJsonValue(validChildren[0], config, context);
        if (converted !== undefined) {
          result[name] = converted;
        }
      } else {
        // Multiple children or forced array
        const converted = validChildren
          .map(child => this.convertXNodeToJsonValue(child, config, context))
          .filter(val => val !== undefined);
        if (converted.length > 0) {
          result[name] = converted;
        }
      }
    });
    
    // Add text value if present
    if (xnode.value !== undefined) {
      if (Object.keys(result).length === 0) {
        // No other content, return the value directly
        return this.processPrimitiveValue(xnode.value, config);
      } else {
        // Mixed content - use value property
        result[config.valueProperty] = this.processPrimitiveValue(xnode.value, config);
      }
    }
    
    // Handle compact empty elements
    if (config.compactEmptyElements && Object.keys(result).length === 0) {
      return null;
    }
    
    return result;
  }
  
  private groupChildrenByName(children: XNode[]): Record<string, XNode[]> {
    return children.reduce((groups, child) => {
      const name = child.name;
      if (!groups[name]) groups[name] = [];
      groups[name].push(child);
      return groups;
    }, {} as Record<string, XNode[]>);
  }
  
  private shouldForceArray(name: string, config: JsonConfig): boolean {
    return config.arrayStrategy === 'always' || config.forceArrays.includes(name);
  }
  
  private processPrimitiveValue(value: any, config: JsonConfig): any {
    if (value === null) {
      return config.preserveNull ? null : '';
    }
    
    if (value === undefined) {
      return config.preserveUndefined ? undefined : null;
    }
    
    return value;
  }
}