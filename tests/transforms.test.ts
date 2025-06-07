/**
 * Transform Functions - Basic Foundational Tests
 * 
 * Tests core functionality of transform functions to ensure they work correctly
 * with the XNode system and follow the expected patterns.
 */

import {
  Transform,
  compose,
  toNumber,
  toBoolean,
  regex
} from '../src/transforms';

import { XNode, XNodeType, createField, createRecord, addAttribute } from '../src/core/xnode';

// --- Test Helpers ---

/**
 * Create a test XNode with value and attributes for testing
 */
function createTestNode(name: string, value?: any): XNode {
  const node = createField(name, value);
  addAttribute(node, 'data-value', '123');
  addAttribute(node, 'enabled', 'true');
  addAttribute(node, 'price', '$29.99');
  return node;
}

// --- Compose Function Tests ---

describe('compose function', () => {
  it('should return identity function for empty array', () => {
    const transform = compose();
    const node = createTestNode('test', 'value');
    const result = transform(node);
    expect(result).toBe(node);
  });

  it('should return single transform for one function', () => {
    const mockTransform: Transform = (node) => ({ ...node, value: 'transformed' });
    const composed = compose(mockTransform);
    const node = createTestNode('test', 'original');
    const result = composed(node);
    expect(result.value).toBe('transformed');
  });

  it('should compose multiple transforms left-to-right', () => {
    const addPrefix: Transform = (node) => ({ ...node, value: `prefix-${node.value}` });
    const addSuffix: Transform = (node) => ({ ...node, value: `${node.value}-suffix` });
    
    const composed = compose(addPrefix, addSuffix);
    const node = createTestNode('test', 'value');
    const result = composed(node);
    
    expect(result.value).toBe('prefix-value-suffix');
  });

  it('should fail fast on transform error', () => {
    const goodTransform: Transform = (node) => ({ ...node, value: 'good' });
    const badTransform: Transform = () => { throw new Error('Transform failed'); };
    
    const composed = compose(goodTransform, badTransform);
    const node = createTestNode('test', 'value');
    
    expect(() => composed(node)).toThrow('Transform failed');
  });
});

// --- Number Transform Tests ---

describe('toNumber transform', () => {
  it('should convert string values to numbers', () => {
    const transform = toNumber();
    const node = createTestNode('price', '29.99');
    const result = transform(node);
    
    expect(result.value).toBe(29.99);
    expect(typeof result.value).toBe('number');
  });

  it('should convert string attributes to numbers by default', () => {
    const transform = toNumber();
    const node = createTestNode('item', 'text');
    const result = transform(node);
    
    const dataValueAttr = result.attributes?.find(attr => attr.name === 'data-value');
    expect(dataValueAttr?.value).toBe(123);
    expect(typeof dataValueAttr?.value).toBe('number');
  });

  it('should apply precision when specified', () => {
    const transform = toNumber({ precision: 2 });
    const node = createTestNode('price', '29.999');
    const result = transform(node);
    
    expect(result.value).toBe(30.00);
  });

  it('should handle custom decimal separators', () => {
    const transform = toNumber({ decimalSeparator: ',' });
    const node = createTestNode('price', '29,99');
    const result = transform(node);
    
    expect(result.value).toBe(29.99);
  });

  it('should handle thousands separators', () => {
    const transform = toNumber({ thousandsSeparator: ',' });
    const node = createTestNode('amount', '1,234.56');
    const result = transform(node);
    
    expect(result.value).toBe(1234.56);
  });

  it('should leave non-convertible values unchanged', () => {
    const transform = toNumber();
    const node = createTestNode('text', 'not a number');
    const result = transform(node);
    
    expect(result.value).toBe('not a number');
  });

  it('should respect transformValue and transformAttributes flags', () => {
    const transform = toNumber({ transformValue: false, transformAttributes: true });
    const node = createTestNode('price', '29.99');
    const result = transform(node);
    
    expect(result.value).toBe('29.99'); // Value unchanged
    
    const dataValueAttr = result.attributes?.find(attr => attr.name === 'data-value');
    expect(dataValueAttr?.value).toBe(123); // Attribute converted
  });

  it('should handle already numeric values', () => {
    const transform = toNumber({ precision: 2 });
    const node = createTestNode('price', 29.999);
    const result = transform(node);
    
    expect(result.value).toBe(30.00);
  });
});

// --- Boolean Transform Tests ---

describe('toBoolean transform', () => {
  it('should convert string values to booleans', () => {
    const transform = toBoolean();
    const trueNode = createTestNode('active', 'true');
    const falseNode = createTestNode('disabled', 'false');
    
    expect(transform(trueNode).value).toBe(true);
    expect(transform(falseNode).value).toBe(false);
  });

  it('should convert string attributes to booleans by default', () => {
    const transform = toBoolean();
    const node = createTestNode('item', 'text');
    const result = transform(node);
    
    const enabledAttr = result.attributes?.find(attr => attr.name === 'enabled');
    expect(enabledAttr?.value).toBe(true);
  });

  it('should be case insensitive', () => {
    const transform = toBoolean();
    const upperNode = createTestNode('active', 'TRUE');
    const mixedNode = createTestNode('active', 'Yes');
    
    expect(transform(upperNode).value).toBe(true);
    expect(transform(mixedNode).value).toBe(true);
  });

  it('should handle custom true/false values', () => {
    const transform = toBoolean({
      trueValues: ['on', 'enabled', '1'],
      falseValues: ['off', 'disabled', '0']
    });
    
    const onNode = createTestNode('status', 'on');
    const offNode = createTestNode('status', 'off');
    
    expect(transform(onNode).value).toBe(true);
    expect(transform(offNode).value).toBe(false);
  });

  it('should leave non-matching values unchanged', () => {
    const transform = toBoolean();
    const node = createTestNode('text', 'maybe');
    const result = transform(node);
    
    expect(result.value).toBe('maybe');
  });

  it('should handle already boolean values', () => {
    const transform = toBoolean();
    const node = createTestNode('active', true);
    const result = transform(node);
    
    expect(result.value).toBe(true);
  });

  it('should respect transformValue and transformAttributes flags', () => {
    const transform = toBoolean({ transformValue: false, transformAttributes: true });
    const node = createTestNode('item', 'true');
    const result = transform(node);
    
    expect(result.value).toBe('true'); // Value unchanged
    
    const enabledAttr = result.attributes?.find(attr => attr.name === 'enabled');
    expect(enabledAttr?.value).toBe(true); // Attribute converted
  });
});

// --- Regex Transform Tests ---

describe('regex transform', () => {
  it('should apply regex replacement to string values', () => {
    const transform = regex(/\s+/g, '');
    const node = createTestNode('text', 'hello world');
    const result = transform(node);
    
    expect(result.value).toBe('helloworld');
  });

  it('should apply regex replacement to string attributes by default', () => {
    const transform = regex(/\$/g, '');
    const node = createTestNode('item', 'text');
    const result = transform(node);
    
    const priceAttr = result.attributes?.find(attr => attr.name === 'price');
    expect(priceAttr?.value).toBe('29.99');
  });

  it('should handle string patterns', () => {
    const transform = regex('hello', 'hi');
    const node = createTestNode('greeting', 'hello world');
    const result = transform(node);
    
    expect(result.value).toBe('hi world');
  });

  it('should handle regex patterns with flags in strings', () => {
    const transform = regex('/hello/gi', 'hi');
    const node = createTestNode('greeting', 'Hello HELLO world');
    const result = transform(node);
    
    expect(result.value).toBe('hi hi world');
  });

  it('should handle capture groups in replacement', () => {
    const transform = regex(/(\d{4})-(\d{2})-(\d{2})/, '$2/$3/$1');
    const node = createTestNode('date', '2024-12-25');
    const result = transform(node);
    
    expect(result.value).toBe('12/25/2024');
  });

  it('should leave non-string values unchanged', () => {
    const transform = regex(/\d+/g, 'X');
    const node = createTestNode('number', 123);
    const result = transform(node);
    
    expect(result.value).toBe(123);
  });

  it('should respect transformValue and transformAttributes flags', () => {
    const transform = regex(/\$/g, '', { transformValue: false, transformAttributes: true });
    const node = createTestNode('item', '$100');
    const result = transform(node);
    
    expect(result.value).toBe('$100'); // Value unchanged
    
    const priceAttr = result.attributes?.find(attr => attr.name === 'price');
    expect(priceAttr?.value).toBe('29.99'); // Attribute transformed
  });

  it('should throw error for invalid regex patterns', () => {
    expect(() => regex('/invalid[/g', '')).toThrow();
  });

  it('should throw error for invalid pattern types', () => {
    expect(() => regex(123 as any, '')).toThrow();
  });
});

// --- Integration Tests ---

describe('transform integration', () => {
  it('should work with composed transforms', () => {
    const cleanAndParse = compose(
      regex(/\$/g, ''),           // Remove dollar signs
      toNumber({ precision: 2 })  // Convert to number with 2 decimals
    );
    
    const node = createTestNode('price', '$29.999');
    const result = cleanAndParse(node);
    
    expect(result.value).toBe(30.00);
    expect(typeof result.value).toBe('number');
  });

  it('should maintain node structure while transforming', () => {
    const transform = toNumber();
    const node = createTestNode('price', '29.99');
    node.namespace = 'test';
    node.id = 'price-1';
    
    const result = transform(node);
    
    expect(result.name).toBe('price');
    expect(result.type).toBe(XNodeType.FIELD);
    expect(result.namespace).toBe('test');
    expect(result.id).toBe('price-1');
    expect(result.value).toBe(29.99);
    expect(result.attributes).toBeDefined();
    expect(result.attributes?.length).toBe(3);
  });

  it('should create new node instances (immutable)', () => {
    const transform = toNumber();
    const original = createTestNode('price', '29.99');
    const result = transform(original);
    
    expect(result).not.toBe(original);
    expect(result.attributes).not.toBe(original.attributes);
    expect(original.value).toBe('29.99'); // Original unchanged
    expect(result.value).toBe(29.99); // Result transformed
  });
});