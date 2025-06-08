/**
 * XNode Adapter - Lossless semantic tree serialization with extension registration
 * 
 * Design Intent:
 * - Provide perfect fidelity XNode serialization and deserialization
 * - Enable lossless round-trip conversions for any source format
 * - Self-register extension methods with comprehensive configuration defaults
 * - Support data archival, processing pipelines, and format bridging
 * - Maintain all semantic information, metadata, and processing hints
 */

import { ExtensionContext } from '../../core/extension';
import { ValidationError, ProcessingError } from '../../core/error';
import { XJFN } from '../../XJFN';
import { XNodeToSerializedAdapter, SerializedToXNodeAdapter, SerializedXNode } from './adapter';
import { DEFAULT_XNODE_CONFIG } from './config';

// Export configuration, adapters, and types for external use
export type { XNodeConfig } from './config';
export { DEFAULT_XNODE_CONFIG } from './config';
export { XNodeToSerializedAdapter, SerializedToXNodeAdapter } from './adapter';
export type { SerializedXNode } from './adapter';

/**
 * Parse serialized XNode JSON into XNode tree representation
 * 
 * @param serialized SerializedXNode object or JSON string to parse
 * @throws ValidationError if input is invalid
 * @throws ProcessingError if deserialization fails
 */
export function fromXNode(this: ExtensionContext, serialized: SerializedXNode | string): void {
  let parsed: SerializedXNode;
  
  // Handle string input by parsing it first
  if (typeof serialized === 'string') {
    try {
      parsed = JSON.parse(serialized);
    } catch (error) {
      throw new ValidationError(`Invalid XNode JSON string: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else if (typeof serialized === 'object' && serialized !== null) {
    parsed = serialized;
  } else {
    throw new ValidationError('fromXNode() requires a SerializedXNode object or JSON string');
  }
  
  const adapter = new SerializedToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, parsed);
  
  // Log successful conversion with metadata
  this.context.logger.debug('XNode deserialized successfully', {
    sourceType: this.context.getMetadata('xnode', 'sourceType'),
    hasSerializationMetadata: this.context.getMetadata('xnode', 'hasSerializationMetadata'),
    deserializedNodes: this.context.getMetadata('xnode', 'deserializedNodes'),
    restoredFormat: this.context.getMetadata('xnode', 'restoredFormat')
  });
}

/**
 * Convert XNode tree to serialized XNode object representation
 * 
 * @returns SerializedXNode object with complete semantic preservation
 * @throws ValidationError if no source XNode is set
 */
export function toXNode(this: ExtensionContext): SerializedXNode {
  this.validateSource();
  
  const adapter = new XNodeToSerializedAdapter();
  const result = this.executeAdapter(adapter, this.xnode!);
  
  // Log successful conversion with metadata
  this.context.logger.debug('XNode serialized successfully', {
    rootType: this.context.getMetadata('xnode', 'rootType'),
    serializedNodes: this.context.getMetadata('xnode', 'serializedNodes'),
    hasMetadata: this.context.getMetadata('xnode', 'hasMetadata'),
    maxDepth: this.context.getMetadata('xnode', 'maxDepth')
  });
  
  return result;
}

/**
 * Convert XNode tree to serialized XNode JSON string representation
 * 
 * @param indent Optional indentation for pretty printing (uses config default if not specified)
 * @returns JSON string with complete semantic preservation
 * @throws ValidationError if no source XNode is set
 */
export function toXNodeString(this: ExtensionContext, indent?: number): string {
  this.validateSource();
  
  const serialized = this.executeAdapter(new XNodeToSerializedAdapter(), this.xnode!);
  const indentValue = indent !== undefined ? indent : 
    (this.context.config.formatting.pretty ? this.context.config.formatting.indent : 0);
  
  try {
    const result = JSON.stringify(serialized, null, indentValue);
    
    this.context.logger.debug('XNode JSON string generated successfully', {
      outputLength: result.length,
      indented: indentValue > 0,
      hasMetadata: !!serialized._xnode
    });
    
    return result;
  } catch (error) {
    throw new ProcessingError(`XNode string generation failed: ${error instanceof Error ? error.message : String(error)}`, serialized);
  }
}

/**
 * Get XNode-specific metadata from the current conversion context
 * 
 * @param key Optional specific metadata key to retrieve
 * @returns XNode metadata object or specific value
 */
export function getXNodeMetadata(this: ExtensionContext, key?: string): any {
  this.validateSource();
  return this.context.getMetadata('xnode', key);
}

/**
 * Check if the current XNode tree has serialization metadata
 * 
 * @returns true if XNode contains serialization metadata
 */
export function hasXNodeMetadata(this: ExtensionContext): boolean {
  this.validateSource();
  return this.context.getMetadata('xnode', 'hasMetadata') === true;
}

/**
 * Get the original format that this XNode was converted from
 * 
 * @returns string indicating the original format (xml, json, etc.) or undefined
 */
export function getOriginalFormat(this: ExtensionContext): string | undefined {
  this.validateSource();
  return this.context.getMetadata('xnode', 'restoredFormat');
}

/**
 * Get the maximum tree depth of the current XNode structure
 * 
 * @returns number indicating the maximum depth of the tree
 */
export function getXNodeDepth(this: ExtensionContext): number {
  this.validateSource();
  return this.context.getMetadata('xnode', 'maxDepth') || 0;
}

/**
 * Get the total number of nodes in the XNode tree
 * 
 * @returns number of nodes in the tree
 */
export function getXNodeCount(this: ExtensionContext): number {
  this.validateSource();
  return this.context.getMetadata('xnode', 'serializedNodes') || this.context.getMetadata('xnode', 'deserializedNodes') || 0;
}

/**
 * Validate the current XNode tree structure
 * 
 * @param strict Optional flag for strict validation (default: true)
 * @returns true if structure is valid
 * @throws ValidationError if structure is invalid
 */
export function validateXNode(this: ExtensionContext, strict: boolean = true): boolean {
  this.validateSource();
  
  try {
    const adapter = new XNodeToSerializedAdapter();
    
    // Temporarily enable validation for this check
    const originalConfig = this.context.config.xnode;
    this.context.mergeConfig({
      xnode: {
        ...originalConfig,
        validateOnSerialize: true,
        strictTypeValidation: strict
      }
    });
    
    // Attempt serialization with validation
    adapter.execute(this.xnode!, this.context);
    
    // Restore original config
    this.context.mergeConfig({ xnode: originalConfig });
    
    this.context.logger.debug('XNode structure validation passed');
    return true;
  } catch (error) {
    this.context.logger.error('XNode structure validation failed', error);
    throw new ValidationError(`XNode structure validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Create a deep copy of the current XNode tree using serialization
 * 
 * @returns New XJFN instance with a deep copy of the current XNode tree
 */
export function cloneXNode(this: ExtensionContext): XJFN {
  this.validateSource();
  
  try {
    // Serialize and immediately deserialize for deep copy
    const serialized = this.executeAdapter(new XNodeToSerializedAdapter(), this.xnode!);
    const newInstance = new XJFN(this.context.config);
    newInstance.xnode = this.executeAdapter(new SerializedToXNodeAdapter(), serialized);
    
    this.context.logger.debug('XNode cloned successfully via serialization');
    return newInstance;
  } catch (error) {
    throw new ProcessingError(`XNode cloning failed: ${error instanceof Error ? error.message : String(error)}`, this.xnode);
  }
}

/**
 * Configure XNode serialization options for current instance
 * 
 * @param includeMetadata Whether to include serialization metadata
 * @param preserveSourceHints Whether to preserve original format hints
 * @param validate Whether to validate during serialization
 */
export function withXNodeOptions(this: ExtensionContext, includeMetadata: boolean = true, preserveSourceHints: boolean = true, validate: boolean = false): void {
  const updates = {
    xnode: {
      ...this.context.config.xnode,
      includeMetadata,
      preserveSourceHints,
      validateOnSerialize: validate
    }
  };
  
  this.context.mergeConfig(updates);
  
  this.context.logger.debug('XNode serialization options updated', {
    includeMetadata,
    preserveSourceHints,
    validate
  });
}

// Register XNode extensions with comprehensive default configuration
XJFN.registerExtension('fromXNode', { method: fromXNode, isTerminal: false }, {
  xnode: DEFAULT_XNODE_CONFIG
});

XJFN.registerExtension('toXNode', { method: toXNode, isTerminal: true });
XJFN.registerExtension('toXNodeString', { method: toXNodeString, isTerminal: true });
XJFN.registerExtension('getXNodeMetadata', { method: getXNodeMetadata, isTerminal: true });
XJFN.registerExtension('hasXNodeMetadata', { method: hasXNodeMetadata, isTerminal: true });
XJFN.registerExtension('getOriginalFormat', { method: getOriginalFormat, isTerminal: true });
XJFN.registerExtension('getXNodeDepth', { method: getXNodeDepth, isTerminal: true });
XJFN.registerExtension('getXNodeCount', { method: getXNodeCount, isTerminal: true });
XJFN.registerExtension('validateXNode', { method: validateXNode, isTerminal: true });
XJFN.registerExtension('cloneXNode', { method: cloneXNode, isTerminal: true });
XJFN.registerExtension('withXNodeOptions', { method: withXNodeOptions, isTerminal: false });