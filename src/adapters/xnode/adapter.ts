/**
 * XNode Adapter Implementation - Lossless semantic tree serialization
 * 
 * Design Intent:
 * - Perfect fidelity preservation of all XNode semantics and metadata
 * - Enable lossless round-trip conversions for any source format
 * - Direct JSON serialization of XNode tree structure as high-fidelity format
 * - Maintain all namespace, attribute, and semantic type information
 * - Support data archival, processing pipeline integration, and format bridging
 */

import { Adapter } from '../../core/adapter';
import { XNode, XNodeType, XNodeAttribute } from '../../core/xnode';
import { PipelineContext } from '../../core/context';
import { ValidationError, ProcessingError } from '../../core/error';
import { XNodeConfig } from './config';

/**
 * Serialized XNode format for JSON representation
 * 
 * This interface represents the exact JSON structure used for
 * lossless XNode serialization, preserving all semantic information
 */
export interface SerializedXNode {
  // Core XNode properties
  type: XNodeType;
  name: string;
  value?: any;
  attributes?: XNodeAttribute[];
  children?: SerializedXNode[];
  
  // Semantic properties
  namespace?: string;
  label?: string;
  id?: string;
  
  // Serialization metadata
  _xnode?: {
    version?: string;           // XNode format version
    serializedAt?: string;      // ISO timestamp
    depth?: number;             // Tree depth at this node
    originalFormat?: string;    // Source format hint (xml, json, etc.)
    processingHints?: any;      // Round-trip processing hints
    sourceHints?: any;          // Source format specific hints
  };
  
  // Note: parent is excluded from serialization to avoid circular references
  // It will be reconstructed during deserialization
}

/**
 * XNode to Serialized JSON Conversion Adapter
 * 
 * Converts XNode tree representation to serialized JSON format
 * with complete preservation of all semantic information
 */
export class XNodeToSerializedAdapter implements Adapter<XNode, SerializedXNode> {
  name = 'xnode-to-serialized';
  
  validate(xnode: XNode, _context: PipelineContext): void {
    if (!xnode || typeof xnode !== 'object') {
      throw new ValidationError('XNode input must be a valid XNode object');
    }
    
    if (!xnode.type || !xnode.name) {
      throw new ValidationError('XNode must have valid type and name properties');
    }
    
    if (!Object.values(XNodeType).includes(xnode.type)) {
      throw new ValidationError(`Invalid XNode type: ${xnode.type}`);
    }
  }
  
  execute(xnode: XNode, context: PipelineContext): SerializedXNode {
    const config = context.config.xnode as XNodeConfig;
    
    // Store metadata about serialization
    context.setMetadata('xnode', 'serializedAt', new Date().toISOString());
    context.setMetadata('xnode', 'rootType', xnode.type);
    context.setMetadata('xnode', 'hasNamespace', !!xnode.namespace);
    context.setMetadata('xnode', 'maxDepth', this.calculateMaxDepth(xnode));
    
    // Validate before serialization if configured
    if (config.validateOnSerialize) {
      this.validateXNodeStructure(xnode, config, 0);
    }
    
    // Check for circular references if configured
    if (config.validateCircularRefs) {
      this.checkCircularReferences(xnode, new Set());
    }
    
    const result = this.serializeXNode(xnode, config, context, 0);
    
    // Store final metadata
    context.setMetadata('xnode', 'serializedNodes', this.countNodes(result));
    context.setMetadata('xnode', 'hasMetadata', !!result._xnode);
    
    return result;
  }
  
  private serializeXNode(node: XNode, config: XNodeConfig, context: PipelineContext, depth: number): SerializedXNode {
    // Check depth limit
    if (depth > config.maxDepth) {
      throw new ProcessingError(`Maximum serialization depth exceeded: ${config.maxDepth}`, node);
    }
    
    const serialized: SerializedXNode = {
      type: node.type,
      name: node.name
    };
    
    // Serialize core properties
    if (node.value !== undefined) {
      if (config.preserveUndefined || node.value !== undefined) {
        serialized.value = node.value;
      }
    }
    
    if (node.namespace !== undefined) {
      serialized.namespace = node.namespace;
    }
    
    if (node.label !== undefined) {
      serialized.label = node.label;
    }
    
    if (node.id !== undefined) {
      serialized.id = node.id;
    }
    
    // Serialize attributes
    if (node.attributes && (node.attributes.length > 0 || config.preserveEmptyAttributes)) {
      serialized.attributes = node.attributes.map(attr => ({ ...attr }));
    }
    
    // Serialize children recursively
    if (node.children && (node.children.length > 0 || config.preserveEmptyArrays)) {
      serialized.children = node.children.map(child => 
        this.serializeXNode(child, config, context, depth + 1)
      );
    }
    
    // Add serialization metadata if configured
    if (config.includeMetadata) {
      serialized._xnode = this.createSerializationMetadata(node, config, context, depth);
    }
    
    return serialized;
  }
  
  private createSerializationMetadata(_node: XNode, config: XNodeConfig, context: PipelineContext, depth: number): any {
    const metadata: any = {};
    
    if (config.versionInfo) {
      metadata.version = '1.0';
    }
    
    if (config.timestampSerialization) {
      metadata.serializedAt = new Date().toISOString();
    }
    
    metadata.depth = depth;
    
    // Include source format hints if preserving
    if (config.preserveSourceHints) {
      const xmlMetadata = context.getMetadata('xml');
      const jsonMetadata = context.getMetadata('json');
      
      if (xmlMetadata) {
        metadata.originalFormat = 'xml';
        metadata.sourceHints = {
          hasNamespaces: xmlMetadata.hasNamespaces,
          hasDeclaration: xmlMetadata.hasDeclaration,
          encoding: xmlMetadata.encoding
        };
      } else if (jsonMetadata) {
        metadata.originalFormat = 'json';
        metadata.sourceHints = {
          originalType: jsonMetadata.originalType,
          isArray: jsonMetadata.isArray,
          hasAttributes: jsonMetadata.hasAttributes
        };
      }
    }
    
    // Include processing metadata if configured
    if (config.includeProcessingMetadata) {
      metadata.processingMetadata = {
        allMetadata: context.metadata
      };
    }
    
    return metadata;
  }
  
  private calculateMaxDepth(node: XNode, currentDepth: number = 0): number {
    if (!node.children || node.children.length === 0) {
      return currentDepth;
    }
    
    return Math.max(...node.children.map(child => 
      this.calculateMaxDepth(child, currentDepth + 1)
    ));
  }
  
  private countNodes(serialized: SerializedXNode): number {
    let count = 1;
    if (serialized.children) {
      count += serialized.children.reduce((sum, child) => sum + this.countNodes(child), 0);
    }
    return count;
  }
  
  private validateXNodeStructure(node: XNode, config: XNodeConfig, depth: number): void {
    if (depth > config.maxDepth) {
      throw new ValidationError(`XNode tree exceeds maximum depth: ${config.maxDepth}`);
    }
    
    // Validate required properties
    if (!node.type || !node.name) {
      throw new ValidationError('XNode must have type and name properties');
    }
    
    if (config.strictTypeValidation && !Object.values(XNodeType).includes(node.type)) {
      throw new ValidationError(`Invalid XNode type: ${node.type}`);
    }
    
    // Validate attributes structure
    if (node.attributes) {
      node.attributes.forEach((attr, index) => {
        if (!attr.name || attr.value === undefined) {
          throw new ValidationError(`Invalid attribute at index ${index}: must have name and value`);
        }
      });
    }
    
    // Validate children recursively
    if (node.children) {
      node.children.forEach((child, index) => {
        try {
          this.validateXNodeStructure(child, config, depth + 1);
        } catch (error) {
          throw new ValidationError(`Invalid child at index ${index}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
    
    // Check for custom properties if not allowed
    if (!config.allowCustomProperties) {
      const allowedProps = new Set(['type', 'name', 'value', 'attributes', 'children', 'parent', 'namespace', 'label', 'id']);
      const nodeProps = Object.keys(node);
      const customProps = nodeProps.filter(prop => !allowedProps.has(prop));
      
      if (customProps.length > 0) {
        throw new ValidationError(`Custom properties not allowed: ${customProps.join(', ')}`);
      }
    }
  }
  
  private checkCircularReferences(node: XNode, visited: Set<XNode>): void {
    if (visited.has(node)) {
      throw new ValidationError('Circular reference detected in XNode tree');
    }
    
    visited.add(node);
    
    if (node.children) {
      node.children.forEach(child => this.checkCircularReferences(child, visited));
    }
    
    visited.delete(node);
  }
}

/**
 * Serialized JSON to XNode Conversion Adapter
 * 
 * Converts serialized JSON format back to XNode tree representation
 * with complete restoration of all semantic information
 */
export class SerializedToXNodeAdapter implements Adapter<SerializedXNode, XNode> {
  name = 'serialized-to-xnode';
  
  validate(serialized: SerializedXNode, _context: PipelineContext): void {
    if (!serialized || typeof serialized !== 'object') {
      throw new ValidationError('Serialized XNode must be an object');
    }
    
    if (!serialized.type || !serialized.name) {
      throw new ValidationError('Serialized XNode must have type and name properties');
    }
    
    if (!Object.values(XNodeType).includes(serialized.type)) {
      throw new ValidationError(`Invalid XNode type: ${serialized.type}`);
    }
  }
  
  execute(serialized: SerializedXNode, context: PipelineContext): XNode {
    const config = context.config.xnode as XNodeConfig;
    
    try {
      // Store metadata about deserialization
      context.setMetadata('xnode', 'deserializedAt', new Date().toISOString());
      context.setMetadata('xnode', 'sourceType', serialized.type);
      context.setMetadata('xnode', 'hasSerializationMetadata', !!serialized._xnode);
      
      // Restore source format metadata if present
      if (serialized._xnode?.sourceHints) {
        this.restoreSourceMetadata(serialized._xnode, context);
      }
      
      // Validate structure if configured
      if (config.validateOnDeserialize) {
        this.validateSerializedStructure(serialized, config, 0);
      }
      
      const result = this.deserializeXNode(serialized, config, context);
      
      // Store final metadata
      context.setMetadata('xnode', 'deserializedNodes', this.countSerializedNodes(serialized));
      context.setMetadata('xnode', 'restoredFormat', serialized._xnode?.originalFormat);
      
      return result;
    } catch (error) {
      throw new ProcessingError(`XNode deserialization failed: ${error instanceof Error ? error.message : String(error)}`, serialized);
    }
  }
  
  private deserializeXNode(serialized: SerializedXNode, config: XNodeConfig, context: PipelineContext, parent?: XNode): XNode {
    const node: XNode = {
      type: serialized.type,
      name: serialized.name
    };
    
    if (parent) {
      node.parent = parent;
    }
    
    // Restore core properties
    if (serialized.value !== undefined) {
      node.value = serialized.value;
    }
    
    if (serialized.namespace !== undefined) {
      node.namespace = serialized.namespace;
    }
    
    if (serialized.label !== undefined) {
      node.label = serialized.label;
    }
    
    if (serialized.id !== undefined) {
      node.id = serialized.id;
    }
    
    // Restore attributes
    if (serialized.attributes && serialized.attributes.length > 0) {
      node.attributes = serialized.attributes.map(attr => ({ ...attr }));
    }
    
    // Restore children recursively
    if (serialized.children && serialized.children.length > 0) {
      node.children = serialized.children.map(childSerialized => 
        this.deserializeXNode(childSerialized, config, context, node)
      );
    }
    
    return node;
  }
  
  private restoreSourceMetadata(xnodeMetadata: any, context: PipelineContext): void {
    if (xnodeMetadata.originalFormat === 'xml' && xnodeMetadata.sourceHints) {
      const hints = xnodeMetadata.sourceHints;
      context.setMetadata('xml', 'hasNamespaces', hints.hasNamespaces);
      context.setMetadata('xml', 'hasDeclaration', hints.hasDeclaration);
      context.setMetadata('xml', 'encoding', hints.encoding);
    } else if (xnodeMetadata.originalFormat === 'json' && xnodeMetadata.sourceHints) {
      const hints = xnodeMetadata.sourceHints;
      context.setMetadata('json', 'originalType', hints.originalType);
      context.setMetadata('json', 'isArray', hints.isArray);
      context.setMetadata('json', 'hasAttributes', hints.hasAttributes);
    }
  }
  
  private validateSerializedStructure(serialized: SerializedXNode, config: XNodeConfig, depth: number): void {
    if (depth > config.maxDepth) {
      throw new ValidationError(`Serialized XNode exceeds maximum depth: ${config.maxDepth}`);
    }
    
    // Validate attributes structure
    if (serialized.attributes) {
      serialized.attributes.forEach((attr, index) => {
        if (!attr.name || attr.value === undefined) {
          throw new ValidationError(`Invalid attribute at index ${index}: must have name and value`);
        }
      });
    }
    
    // Validate children recursively
    if (serialized.children) {
      serialized.children.forEach((child, index) => {
        try {
          this.validateSerializedStructure(child, config, depth + 1);
        } catch (error) {
          throw new ValidationError(`Invalid child at index ${index}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
    
    // Validate metadata structure if present
    if (serialized._xnode) {
      if (config.versionInfo && !serialized._xnode.version) {
        // Note: context parameter is not available in this validation method
        console.warn('Serialized XNode missing version information');
      }
    }
  }
  
  private countSerializedNodes(serialized: SerializedXNode): number {
    let count = 1;
    if (serialized.children) {
      count += serialized.children.reduce((sum, child) => sum + this.countSerializedNodes(child), 0);
    }
    return count;
  }
}