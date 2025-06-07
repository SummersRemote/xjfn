/**
 * XNode system tests for XJFN core
 */

import {
  XNode,
  XNodeType,
  Primitive,
  XNodeAttribute,
  createCollection,
  createRecord,
  createField,
  createValue,
  createAttributesContainer,
  createComment,
  createInstruction,
  createData,
  addChild,
  addAttribute,
  cloneNode,
  getAttribute,
  getAttributeValue,
  filterAttributes,
  updateAttribute,
  getTextContent,
  setTextContent,
  hasAttributes,
  hasChildren,
  isCollection,
  isRecord,
  isField,
  isValue,
  isAttributesContainer,
  isComment,
  isInstruction,
  isData,
  isPrimitive,
  isContainer,
  getChildrenByType,
  getChildrenByName,
  getChild
} from '../../src/core/xnode';

describe('XNodeType enum', () => {
  test('should have correct string values', () => {
    expect(XNodeType.COLLECTION).toBe('collection');
    expect(XNodeType.RECORD).toBe('record');
    expect(XNodeType.FIELD).toBe('field');
    expect(XNodeType.VALUE).toBe('value');
    expect(XNodeType.ATTRIBUTES).toBe('attributes');
    expect(XNodeType.COMMENT).toBe('comment');
    expect(XNodeType.INSTRUCTION).toBe('instruction');
    expect(XNodeType.DATA).toBe('data');
  });
});

describe('Node creation functions', () => {
  test('createCollection should create collection node', () => {
    const node = createCollection('items');
    
    expect(node.type).toBe(XNodeType.COLLECTION);
    expect(node.name).toBe('items');
    expect(node.children).toEqual([]);
    expect(node.value).toBeUndefined();
  });
  
  test('createRecord should create record node', () => {
    const node = createRecord('user');
    
    expect(node.type).toBe(XNodeType.RECORD);
    expect(node.name).toBe('user');
    expect(node.children).toEqual([]);
    expect(node.value).toBeUndefined();
  });
  
  test('createField should create field node', () => {
    const node = createField('name', 'John');
    
    expect(node.type).toBe(XNodeType.FIELD);
    expect(node.name).toBe('name');
    expect(node.value).toBe('John');
  });
  
  test('createField should create field without value', () => {
    const node = createField('name');
    
    expect(node.type).toBe(XNodeType.FIELD);
    expect(node.name).toBe('name');
    expect(node.value).toBeUndefined();
  });
  
  test('createValue should create value node', () => {
    const node = createValue('count', 42);
    
    expect(node.type).toBe(XNodeType.VALUE);
    expect(node.name).toBe('count');
    expect(node.value).toBe(42);
  });
  
  test('createAttributesContainer should create attributes node', () => {
    const node = createAttributesContainer('attrs');
    
    expect(node.type).toBe(XNodeType.ATTRIBUTES);
    expect(node.name).toBe('attrs');
    expect(node.value).toBeUndefined();
  });
  
  test('createComment should create comment node', () => {
    const node = createComment('This is a comment');
    
    expect(node.type).toBe(XNodeType.COMMENT);
    expect(node.name).toBe('#comment');
    expect(node.value).toBe('This is a comment');
  });
  
  test('createInstruction should create instruction node', () => {
    const node = createInstruction('xml-stylesheet', 'type="text/xsl" href="style.xsl"');
    
    expect(node.type).toBe(XNodeType.INSTRUCTION);
    expect(node.name).toBe('xml-stylesheet');
    expect(node.value).toBe('type="text/xsl" href="style.xsl"');
  });
  
  test('createData should create data node', () => {
    const node = createData('cdata', 'Some raw data');
    
    expect(node.type).toBe(XNodeType.DATA);
    expect(node.name).toBe('cdata');
    expect(node.value).toBe('Some raw data');
  });
});

describe('Node manipulation', () => {
  test('addChild should add child and set parent reference', () => {
    const parent = createRecord('parent');
    const child = createField('child', 'value');
    
    addChild(parent, child);
    
    expect(parent.children).toHaveLength(1);
    expect(parent.children![0]).toBe(child);
    expect(child.parent).toBe(parent);
  });
  
  test('addChild should initialize children array if not present', () => {
    const parent = createRecord('parent');
    delete parent.children; // Remove children array
    
    const child = createField('child', 'value');
    addChild(parent, child);
    
    expect(parent.children).toHaveLength(1);
    expect(parent.children![0]).toBe(child);
  });
  
  test('addAttribute should add simple attribute', () => {
    const node = createRecord('element');
    
    addAttribute(node, 'id', '123');
    
    expect(node.attributes).toHaveLength(1);
    expect(node.attributes![0]).toEqual({
      name: 'id',
      value: '123',
      namespace: undefined,
      label: undefined
    });
  });
  
  test('addAttribute should add attribute with namespace and label', () => {
    const node = createRecord('element');
    
    addAttribute(node, 'lang', 'en', {
      namespace: 'http://www.w3.org/XML/1998/namespace',
      label: 'xml'
    });
    
    expect(node.attributes).toHaveLength(1);
    expect(node.attributes![0]).toEqual({
      name: 'lang',
      value: 'en',
      namespace: 'http://www.w3.org/XML/1998/namespace',
      label: 'xml'
    });
  });
});

describe('Node cloning', () => {
  test('cloneNode shallow should clone without children and attributes', () => {
    const original = createRecord('original');
    original.namespace = 'http://example.com';
    original.id = 'test-id';
    addChild(original, createField('child', 'value'));
    addAttribute(original, 'attr', 'value');
    
    const clone = cloneNode(original, false);
    
    expect(clone.type).toBe(original.type);
    expect(clone.name).toBe(original.name);
    expect(clone.namespace).toBe(original.namespace);
    expect(clone.id).toBe(original.id);
    expect(clone.children).toBeUndefined();
    expect(clone.attributes).toBeUndefined();
    expect(clone.parent).toBeUndefined();
  });
  
  test('cloneNode deep should clone with children and attributes', () => {
    const original = createRecord('original');
    const child = createField('child', 'value');
    addChild(original, child);
    addAttribute(original, 'attr', 'value');
    
    const clone = cloneNode(original, true);
    
    expect(clone.children).toHaveLength(1);
    expect(clone.children![0].name).toBe('child');
    expect(clone.children![0].parent).toBe(clone);
    expect(clone.children![0]).not.toBe(child); // Different object
    
    expect(clone.attributes).toHaveLength(1);
    expect(clone.attributes![0].name).toBe('attr');
    expect(clone.attributes![0]).not.toBe(original.attributes![0]); // Different object
  });
});

describe('Attribute operations', () => {
  let node: XNode;
  
  beforeEach(() => {
    node = createRecord('element');
    addAttribute(node, 'id', '123');
    addAttribute(node, 'class', 'button');
    addAttribute(node, 'lang', 'en', {
      namespace: 'http://www.w3.org/XML/1998/namespace',
      label: 'xml'
    });
  });
  
  test('getAttribute should find attribute by name', () => {
    const attr = getAttribute(node, 'id');
    
    expect(attr).toBeDefined();
    expect(attr!.name).toBe('id');
    expect(attr!.value).toBe('123');
  });
  
  test('getAttribute should find attribute by name and namespace', () => {
    const attr = getAttribute(node, 'lang', 'http://www.w3.org/XML/1998/namespace');
    
    expect(attr).toBeDefined();
    expect(attr!.name).toBe('lang');
    expect(attr!.value).toBe('en');
  });
  
  test('getAttribute should return undefined for non-existent attribute', () => {
    const attr = getAttribute(node, 'nonexistent');
    expect(attr).toBeUndefined();
  });
  
  test('getAttributeValue should return attribute value', () => {
    const value = getAttributeValue(node, 'id');
    expect(value).toBe('123');
  });
  
  test('getAttributeValue should return undefined for non-existent attribute', () => {
    const value = getAttributeValue(node, 'nonexistent');
    expect(value).toBeUndefined();
  });
  
  test('filterAttributes should filter by predicate', () => {
    const filtered = filterAttributes(node, attr => attr.name.startsWith('c'));
    
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('class');
  });
  
  test('updateAttribute should update existing attribute', () => {
    updateAttribute(node, 'id', '456');
    
    const value = getAttributeValue(node, 'id');
    expect(value).toBe('456');
  });
  
  test('updateAttribute should not create new attribute if not found', () => {
    updateAttribute(node, 'nonexistent', 'value');
    
    const attr = getAttribute(node, 'nonexistent');
    expect(attr).toBeUndefined();
  });
});

describe('Text content operations', () => {
  test('getTextContent should return value for VALUE node', () => {
    const node = createValue('text', 'Hello world');
    expect(getTextContent(node)).toBe('Hello world');
  });
  
  test('getTextContent should return value for FIELD node', () => {
    const node = createField('name', 'John');
    expect(getTextContent(node)).toBe('John');
  });
  
  test('getTextContent should combine children text content', () => {
    const parent = createRecord('parent');
    addChild(parent, createValue('text1', 'Hello '));
    addChild(parent, createValue('text2', 'world'));
    
    expect(getTextContent(parent)).toBe('Hello world');
  });
  
  test('setTextContent should set value for VALUE node', () => {
    const node = createValue('text', 'old');
    setTextContent(node, 'new');
    
    expect(node.value).toBe('new');
  });
  
  test('setTextContent should replace children for RECORD node', () => {
    const node = createRecord('element');
    addChild(node, createField('old', 'value'));
    
    setTextContent(node, 'new text');
    
    expect(node.children).toHaveLength(1);
    expect(node.children![0].name).toBe('#text');
    expect(node.children![0].value).toBe('new text');
  });
});

describe('Utility functions', () => {
  test('hasAttributes should return correct boolean', () => {
    const withAttrs = createRecord('element');
    addAttribute(withAttrs, 'id', '123');
    
    const withoutAttrs = createRecord('element');
    
    expect(hasAttributes(withAttrs)).toBe(true);
    expect(hasAttributes(withoutAttrs)).toBe(false);
  });
  
  test('hasChildren should return correct boolean', () => {
    const withChildren = createRecord('parent');
    addChild(withChildren, createField('child', 'value'));
    
    const withoutChildren = createRecord('parent');
    
    expect(hasChildren(withChildren)).toBe(true);
    expect(hasChildren(withoutChildren)).toBe(false);
  });
});

describe('Type guards', () => {
  test('type guards should correctly identify node types', () => {
    const collection = createCollection('items');
    const record = createRecord('user');
    const field = createField('name', 'value');
    const value = createValue('count', 42);
    const attrs = createAttributesContainer('attrs');
    const comment = createComment('comment');
    const instruction = createInstruction('target', 'data');
    const data = createData('cdata', 'content');
    
    expect(isCollection(collection)).toBe(true);
    expect(isRecord(record)).toBe(true);
    expect(isField(field)).toBe(true);
    expect(isValue(value)).toBe(true);
    expect(isAttributesContainer(attrs)).toBe(true);
    expect(isComment(comment)).toBe(true);
    expect(isInstruction(instruction)).toBe(true);
    expect(isData(data)).toBe(true);
    
    // Cross-check
    expect(isCollection(record)).toBe(false);
    expect(isRecord(field)).toBe(false);
  });
  
  test('isPrimitive should identify primitive containers', () => {
    const value = createValue('count', 42);
    const field = createField('name', 'value');
    const attrs = createAttributesContainer('attrs');
    const record = createRecord('user');
    
    expect(isPrimitive(value)).toBe(true);
    expect(isPrimitive(field)).toBe(true);
    expect(isPrimitive(attrs)).toBe(true);
    expect(isPrimitive(record)).toBe(false);
  });
  
  test('isContainer should identify container types', () => {
    const collection = createCollection('items');
    const record = createRecord('user');
    const field = createField('name', 'value');
    
    expect(isContainer(collection)).toBe(true);
    expect(isContainer(record)).toBe(true);
    expect(isContainer(field)).toBe(false);
  });
});

describe('Child node utilities', () => {
  let parent: XNode;
  
  beforeEach(() => {
    parent = createRecord('parent');
    addChild(parent, createField('name', 'John'));
    addChild(parent, createField('age', '30'));
    addChild(parent, createValue('count', 42));
    addChild(parent, createField('name', 'Jane')); // Duplicate name
  });
  
  test('getChildrenByType should filter by type', () => {
    const fields = getChildrenByType(parent, XNodeType.FIELD);
    const values = getChildrenByType(parent, XNodeType.VALUE);
    
    expect(fields).toHaveLength(3);
    expect(values).toHaveLength(1);
    expect(values[0].name).toBe('count');
  });
  
  test('getChildrenByName should filter by name', () => {
    const names = getChildrenByName(parent, 'name');
    
    expect(names).toHaveLength(2);
    expect(names[0].value).toBe('John');
    expect(names[1].value).toBe('Jane');
  });
  
  test('getChild should find first child by name', () => {
    const child = getChild(parent, 'name');
    
    expect(child).toBeDefined();
    expect(child!.value).toBe('John'); // First one
  });
  
  test('getChild should find child by name and type', () => {
    const child = getChild(parent, 'count', XNodeType.VALUE);
    
    expect(child).toBeDefined();
    expect(child!.value).toBe(42);
  });
  
  test('getChild should return undefined if not found', () => {
    const child = getChild(parent, 'nonexistent');
    expect(child).toBeUndefined();
  });
});