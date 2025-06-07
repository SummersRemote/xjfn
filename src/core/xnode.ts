/**
 * Semantic XNode implementation - Format-neutral universal data representation
 * Replaces DOM-based XNode system with semantic types
 */
import { LoggerFactory } from "./logger";
const logger = LoggerFactory.create();

/**
 * Semantic node types for universal data representation
 */
export enum XNodeType {
  COLLECTION = "collection",    // Containers (arrays, documents, result sets)
  RECORD = "record",           // Structured items (objects, rows, elements)
  FIELD = "field",             // Data points (properties, columns, fields)
  VALUE = "value",             // Primitive values (strings, numbers, booleans)
  ATTRIBUTES = "attributes",   // Metadata (always this type regardless of content)
  COMMENT = "comment",         // Documentation (comments, descriptions)
  INSTRUCTION = "instruction", // Processing directives (<?xml?>, pragmas)
  DATA = "data"                // Embedded and raw data types (cdata, encoded, etc)
}

/**
 * Primitive value types supported in XNode values
 */
export type Primitive = string | number | boolean | null;

/**
 * Format-neutral XNode interface for universal data representation
 */
export interface XNode {
  type: XNodeType;
  name: string;
  value?: Primitive;        // Primitive data - as received from source format
  id?: string;              // Unique identifier (for references, keys, etc.)
  ns?: string;              // Namespace URI or scope identifier
  label?: string;           // Display label, namespace prefix, or format hint
  children?: XNode[];       // Child nodes for hierarchical structure
  attributes?: XNode[];     // Metadata nodes (always XNodeType.ATTRIBUTES)
  parent?: XNode;          // Parent reference (excluded from serialization)
}

/**
 * Create a collection node (arrays, documents, result sets)
 */
export function createCollection(name: string): XNode {
  return {
    type: XNodeType.COLLECTION,
    name,
    children: []
  };
}

/**
 * Create a record node (objects, rows, elements)
 */
export function createRecord(name: string): XNode {
  return {
    type: XNodeType.RECORD,
    name,
    children: []
  };
}

/**
 * Create a field node (properties, columns, fields)
 */
export function createField(name: string, value?: Primitive): XNode {
  const node: XNode = {
    type: XNodeType.FIELD,
    name
  };
  if (value !== undefined) {
    node.value = value;
  }
  return node;
}

/**
 * Create a value node (standalone primitive values)
 */
export function createValue(name: string, value: Primitive): XNode {
  return {
    type: XNodeType.VALUE,
    name,
    value
  };
}

/**
 * Create an attributes node (metadata)
 */
export function createAttributes(name: string, value?: Primitive): XNode {
  const node: XNode = {
    type: XNodeType.ATTRIBUTES,
    name
  };
  if (value !== undefined) {
    node.value = value;
  }
  return node;
}

/**
 * Create a comment node (documentation)
 */
export function createComment(content: string): XNode {
  return {
    type: XNodeType.COMMENT,
    name: "#comment",
    value: content
  };
}

/**
 * Create an instruction node (processing directives)
 */
export function createInstruction(target: string, data?: string): XNode {
  const node: XNode = {
    type: XNodeType.INSTRUCTION,
    name: target
  };
  if (data !== undefined) {
    node.value = data;
  }
  return node;
}

/**
 * Create a data node (raw/embedded data)
 */
export function createData(name: string, content: string): XNode {
  return {
    type: XNodeType.DATA,
    name,
    value: content
  };
}

/**
 * Add a child node to a parent node
 */
export function addChild(parent: XNode, child: XNode): XNode {
  if (!parent.children) {
    parent.children = [];
  }
  
  // Set parent reference
  child.parent = parent;
  parent.children.push(child);
  
  return parent;
}

/**
 * Add an attribute to a node
 */
export function addAttribute(node: XNode, name: string, value: Primitive, ns?: string, label?: string): XNode {
  if (!node.attributes) {
    node.attributes = [];
  }
  
  const attr = createAttributes(name, value);
  if (ns) attr.ns = ns;
  if (label) attr.label = label;
  
  node.attributes.push(attr);
  return node;
}

/**
 * Clone an XNode with optional deep flag
 */
export function cloneNode(node: XNode, deep: boolean = false): XNode {
  if (!deep) {
    // Shallow clone
    return {
      ...node,
      parent: undefined,
      children: undefined,
      attributes: undefined
    };
  }
  
  // Deep clone
  const clone: XNode = {
    ...node,
    parent: undefined
  };
  
  // Clone attributes if present
  if (node.attributes) {
    clone.attributes = node.attributes.map(attr => cloneNode(attr, true));
  }
  
  // Clone children if present
  if (node.children) {
    clone.children = node.children.map(child => {
      const childClone = cloneNode(child, true);
      childClone.parent = clone;
      return childClone;
    });
  }
  
  return clone;
}

/**
 * Get the text content of a node and its children
 */
export function getTextContent(node: XNode): string {
  // For value and field nodes, return value directly
  if (node.type === XNodeType.VALUE || node.type === XNodeType.FIELD) {
    return node.value?.toString() || '';
  }
  
  // For data nodes, return the data content
  if (node.type === XNodeType.DATA) {
    return node.value?.toString() || '';
  }
  
  // If node has a direct value, return it (handle null safely)
  if (node.value !== undefined && !node.children) {
    return node.value !== null ? node.value.toString() : '';
  }
  
  // If node has children, combine their text content
  if (node.children) {
    return node.children
      .filter(child => 
        child.type === XNodeType.VALUE || 
        child.type === XNodeType.DATA ||
        child.type === XNodeType.FIELD ||
        child.type === XNodeType.RECORD ||
        child.type === XNodeType.COLLECTION
      )
      .map(child => getTextContent(child))
      .join('');
  }
  
  return '';
}

/**
 * Set the text content of a node
 */
export function setTextContent(node: XNode, text: string): XNode {
  // For value, field, and data nodes, set the value directly
  if (node.type === XNodeType.VALUE || node.type === XNodeType.FIELD || node.type === XNodeType.DATA) {
    node.value = text;
    return node;
  }
  
  // For record and collection nodes, replace children with a single value node
  if (node.type === XNodeType.RECORD || node.type === XNodeType.COLLECTION) {
    const textNode = createValue("#text", text);
    textNode.parent = node;
    node.children = [textNode];
    
    // Clear direct value if it exists
    delete node.value;
    
    return node;
  }
  
  return node;
}

/**
 * Find attribute by name
 */
export function getAttribute(node: XNode, name: string): XNode | undefined {
  return node.attributes?.find(attr => attr.name === name);
}

/**
 * Get attribute value by name
 */
export function getAttributeValue(node: XNode, name: string): Primitive | undefined {
  return getAttribute(node, name)?.value;
}

/**
 * Check if node has attributes
 */
export function hasAttributes(node: XNode): boolean {
  return node.attributes !== undefined && node.attributes.length > 0;
}

/**
 * Check if node has children
 */
export function hasChildren(node: XNode): boolean {
  return node.children !== undefined && node.children.length > 0;
}

/**
 * Get node type name for debugging
 */
export function getNodeTypeName(type: XNodeType): string {
  return type.toUpperCase();
}

/**
 * Type guard functions for semantic types
 */
export function isCollection(node: XNode): boolean {
  return node.type === XNodeType.COLLECTION;
}

export function isRecord(node: XNode): boolean {
  return node.type === XNodeType.RECORD;
}

export function isField(node: XNode): boolean {
  return node.type === XNodeType.FIELD;
}

export function isValue(node: XNode): boolean {
  return node.type === XNodeType.VALUE;
}

export function isAttribute(node: XNode): boolean {
  return node.type === XNodeType.ATTRIBUTES;
}

export function isComment(node: XNode): boolean {
  return node.type === XNodeType.COMMENT;
}

export function isInstruction(node: XNode): boolean {
  return node.type === XNodeType.INSTRUCTION;
}

export function isData(node: XNode): boolean {
  return node.type === XNodeType.DATA;
}

/**
 * Check if node contains primitive data
 */
export function isPrimitive(node: XNode): boolean {
  return node.type === XNodeType.VALUE || 
         node.type === XNodeType.FIELD || 
         node.type === XNodeType.ATTRIBUTES;
}

/**
 * Check if node is a container type
 */
export function isContainer(node: XNode): boolean {
  return node.type === XNodeType.COLLECTION || node.type === XNodeType.RECORD;
}

/**
 * Get all child nodes of a specific type
 */
export function getChildrenByType(node: XNode, type: XNodeType): XNode[] {
  return node.children?.filter(child => child.type === type) || [];
}

/**
 * Get all child nodes with a specific name
 */
export function getChildrenByName(node: XNode, name: string): XNode[] {
  return node.children?.filter(child => child.name === name) || [];
}

/**
 * Get first child node with specific name and type
 */
export function getChild(node: XNode, name: string, type?: XNodeType): XNode | undefined {
  return node.children?.find(child => 
    child.name === name && (type === undefined || child.type === type)
  );
}