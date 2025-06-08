/**
 * Semantic XNode system - Format-neutral tree representation
 * 
 * Design Intent:
 * - Semantic types that represent data meaning, not format structure
 * - Rich attribute support with namespaces and labels
 * - Type-safe operations and utilities
 * - Parent/child relationship management
 * - Consistent interface for all data formats
 */

/**
 * Primitive value types supported in XNode values
 */
export type Primitive = string | number | boolean | null;

/**
 * Semantic node types for universal data representation
 */
export enum XNodeType {
  COLLECTION = "collection",    // Arrays, lists, containers
  RECORD = "record",           // Objects, elements, structured data  
  FIELD = "field",             // Properties, simple elements with values
  VALUE = "value",             // Standalone primitive values
  ATTRIBUTES = "attributes",   // Metadata container (special type)
  COMMENT = "comment",         // Documentation and comments
  INSTRUCTION = "instruction", // Processing instructions, directives
  DATA = "data"               // Raw data, CDATA, binary content
}

/**
 * Structured attribute with namespace and label support
 */
export interface XNodeAttribute {
  name: string;
  value: Primitive;
  namespace?: string;  // Full namespace URI (e.g., "http://www.w3.org/XML/1998/namespace")
  label?: string;      // Display label or namespace prefix (e.g., "xml" for xml:lang)
}

/**
 * Format-neutral XNode interface for universal data representation
 */
export interface XNode {
  type: XNodeType;
  name: string;
  value?: Primitive;        // Primitive data - as received from source format
  children?: XNode[];       // Child nodes for hierarchical structure
  attributes?: XNodeAttribute[]; // Structured attributes with namespace support
  parent?: XNode;          // Parent reference (excluded from serialization)
  
  // Semantic properties for rich data representation
  namespace?: string;      // Full namespace URI
  label?: string;          // Display label or namespace prefix
  id?: string;             // Unique identifier for references
}

// --- Creation Functions ---

/**
 * Create a collection node (arrays, lists, containers)
 * 
 * @param name Name of the collection
 * @returns New collection XNode
 */
export function createCollection(name: string): XNode {
  return {
    type: XNodeType.COLLECTION,
    name,
    children: []
  };
}

/**
 * Create a record node (objects, elements, structured data)
 * 
 * @param name Name of the record
 * @returns New record XNode
 */
export function createRecord(name: string): XNode {
  return {
    type: XNodeType.RECORD,
    name,
    children: []
  };
}

/**
 * Create a field node (properties, simple elements with values)
 * 
 * @param name Name of the field
 * @param value Optional primitive value
 * @returns New field XNode
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
 * 
 * @param name Name of the value
 * @param value Primitive value
 * @returns New value XNode
 */
export function createValue(name: string, value: Primitive): XNode {
  return {
    type: XNodeType.VALUE,
    name,
    value
  };
}

/**
 * Create an attributes container node (metadata)
 * 
 * @param name Name of the attributes container
 * @param value Optional primitive value
 * @returns New attributes XNode
 */
export function createAttributesContainer(name: string, value?: Primitive): XNode {
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
 * 
 * @param content Comment content
 * @returns New comment XNode
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
 * 
 * @param target Instruction target
 * @param data Optional instruction data
 * @returns New instruction XNode
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
 * 
 * @param name Name of the data node
 * @param content Data content
 * @returns New data XNode
 */
export function createData(name: string, content: string): XNode {
  return {
    type: XNodeType.DATA,
    name,
    value: content
  };
}

// --- Node Manipulation ---

/**
 * Add a child node to a parent node
 * 
 * @param parent Parent node
 * @param child Child node to add
 * @returns The parent node (for chaining)
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
 * 
 * @param node Node to add attribute to
 * @param name Attribute name
 * @param value Attribute value
 * @param options Optional namespace and label
 * @returns The node (for chaining)
 */
export function addAttribute(
  node: XNode, 
  name: string, 
  value: Primitive,
  options?: {
    namespace?: string;  // Full namespace URI
    label?: string;      // Display label or namespace prefix
  }
): XNode {
  if (!node.attributes) {
    node.attributes = [];
  }
  
  const attr: XNodeAttribute = {
    name,
    value
  };
  
  if (options?.namespace) {
    attr.namespace = options.namespace;
  }
  
  if (options?.label) {
    attr.label = options.label;
  }
  
  node.attributes.push(attr);
  return node;
}

/**
 * Clone an XNode with optional deep flag
 * 
 * @param node Node to clone
 * @param deep Whether to deep clone children and attributes
 * @returns Cloned node
 */
export function cloneNode(node: XNode, deep: boolean = false): XNode {
  if (!deep) {
    // Shallow clone - exclude parent, children, and attributes
    const clone: XNode = {
      type: node.type,
      name: node.name
    };
    
    if (node.value !== undefined) {
      clone.value = node.value;
    }
    if (node.namespace !== undefined) {
      clone.namespace = node.namespace;
    }
    if (node.label !== undefined) {
      clone.label = node.label;
    }
    if (node.id !== undefined) {
      clone.id = node.id;
    }
    
    return clone;
  }
  
  // Deep clone
  const clone: XNode = {
    type: node.type,
    name: node.name
  };
  
  if (node.value !== undefined) {
    clone.value = node.value;
  }
  if (node.namespace !== undefined) {
    clone.namespace = node.namespace;
  }
  if (node.label !== undefined) {
    clone.label = node.label;
  }
  if (node.id !== undefined) {
    clone.id = node.id;
  }
  
  // Clone attributes if present
  if (node.attributes) {
    clone.attributes = node.attributes.map(attr => ({ ...attr }));
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

// --- Attribute Operations ---

/**
 * Find attribute by name and optional namespace
 * 
 * @param node Node to search
 * @param name Attribute name
 * @param namespace Optional namespace to match
 * @returns Found attribute or undefined
 */
export function getAttribute(
  node: XNode, 
  name: string, 
  namespace?: string
): XNodeAttribute | undefined {
  return node.attributes?.find(attr => 
    attr.name === name && 
    (namespace === undefined || attr.namespace === namespace)
  );
}

/**
 * Get attribute value by name and optional namespace
 * 
 * @param node Node to search
 * @param name Attribute name
 * @param namespace Optional namespace to match
 * @returns Attribute value or undefined
 */
export function getAttributeValue(
  node: XNode, 
  name: string, 
  namespace?: string
): Primitive | undefined {
  return getAttribute(node, name, namespace)?.value;
}

/**
 * Filter attributes by predicate
 * 
 * @param node Node to search
 * @param predicate Filter function
 * @returns Array of matching attributes
 */
export function filterAttributes(
  node: XNode, 
  predicate: (attr: XNodeAttribute) => boolean
): XNodeAttribute[] {
  return node.attributes?.filter(predicate) || [];
}

/**
 * Update an existing attribute value
 * 
 * @param node Node containing the attribute
 * @param name Attribute name
 * @param newValue New attribute value
 * @param namespace Optional namespace to match
 * @returns The node (for chaining)
 */
export function updateAttribute(
  node: XNode, 
  name: string, 
  newValue: Primitive,
  namespace?: string
): XNode {
  const attr = getAttribute(node, name, namespace);
  if (attr) {
    attr.value = newValue;
  }
  return node;
}

// --- Utility Functions ---

/**
 * Get the text content of a node and its children
 * 
 * @param node Node to get text from
 * @returns Combined text content
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
 * 
 * @param node Node to set text content for
 * @param text Text content to set
 * @returns The node (for chaining)
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
 * Check if node has attributes
 * 
 * @param node Node to check
 * @returns true if node has attributes
 */
export function hasAttributes(node: XNode): boolean {
  return node.attributes !== undefined && node.attributes.length > 0;
}

/**
 * Check if node has children
 * 
 * @param node Node to check
 * @returns true if node has children
 */
export function hasChildren(node: XNode): boolean {
  return node.children !== undefined && node.children.length > 0;
}

// --- Type Guards ---

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

export function isAttributesContainer(node: XNode): boolean {
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
 * 
 * @param node Node to check
 * @returns true if node is a primitive container
 */
export function isPrimitive(node: XNode): boolean {
  return node.type === XNodeType.VALUE || 
         node.type === XNodeType.FIELD || 
         node.type === XNodeType.ATTRIBUTES;
}

/**
 * Check if node is a container type
 * 
 * @param node Node to check
 * @returns true if node is a container
 */
export function isContainer(node: XNode): boolean {
  return node.type === XNodeType.COLLECTION || node.type === XNodeType.RECORD;
}

// --- Child Node Utilities ---

/**
 * Get all child nodes of a specific type
 * 
 * @param node Parent node
 * @param type XNode type to filter by
 * @returns Array of matching child nodes
 */
export function getChildrenByType(node: XNode, type: XNodeType): XNode[] {
  return node.children?.filter(child => child.type === type) || [];
}

/**
 * Get all child nodes with a specific name
 * 
 * @param node Parent node
 * @param name Name to filter by
 * @returns Array of matching child nodes
 */
export function getChildrenByName(node: XNode, name: string): XNode[] {
  return node.children?.filter(child => child.name === name) || [];
}

/**
 * Get first child node with specific name and optional type
 * 
 * @param node Parent node
 * @param name Child name to find
 * @param type Optional type to match
 * @returns First matching child or undefined
 */
export function getChild(node: XNode, name: string, type?: XNodeType): XNode | undefined {
  return node.children?.find(child => 
    child.name === name && (type === undefined || child.type === type)
  );
}