/**
 * Configuration system tests for XJFN core
 */

import {
  Configuration,
  DEFAULT_CONFIG,
  mergeGlobalDefaults,
  createConfig,
  getGlobalDefaults,
  resetGlobalDefaults,
  validateConfig
} from '../../src/core/config';

describe('DEFAULT_CONFIG', () => {
  test('should have correct default values', () => {
    expect(DEFAULT_CONFIG.preserveComments).toBe(true);
    expect(DEFAULT_CONFIG.preserveInstructions).toBe(true);
    expect(DEFAULT_CONFIG.preserveWhitespace).toBe(false);
    expect(DEFAULT_CONFIG.formatting.indent).toBe(2);
    expect(DEFAULT_CONFIG.formatting.pretty).toBe(true);
    expect(DEFAULT_CONFIG.fragmentRoot).toBe('results');
  });
});

describe('Global defaults management', () => {
  beforeEach(() => {
    resetGlobalDefaults();
  });
  
  afterEach(() => {
    resetGlobalDefaults();
  });
  
  test('getGlobalDefaults should return copy of defaults', () => {
    const defaults1 = getGlobalDefaults();
    const defaults2 = getGlobalDefaults();
    
    expect(defaults1).toEqual(DEFAULT_CONFIG);
    expect(defaults1).not.toBe(defaults2); // Different objects
  });
  
  test('mergeGlobalDefaults should merge extension defaults', () => {
    const xmlDefaults = {
      xml: {
        preserveNamespaces: true,
        declaration: true,
        encoding: 'UTF-8'
      }
    };
    
    mergeGlobalDefaults(xmlDefaults);
    
    const globals = getGlobalDefaults();
    expect(globals.xml).toEqual(xmlDefaults.xml);
    expect(globals.preserveComments).toBe(true); // Core defaults preserved
  });
  
  test('mergeGlobalDefaults should handle multiple extensions', () => {
    mergeGlobalDefaults({
      xml: { preserveNamespaces: true }
    });
    
    mergeGlobalDefaults({
      json: { attributePrefix: '@' }
    });
    
    const globals = getGlobalDefaults();
    expect(globals.xml.preserveNamespaces).toBe(true);
    expect(globals.json.attributePrefix).toBe('@');
  });
  
  test('resetGlobalDefaults should restore original defaults', () => {
    mergeGlobalDefaults({
      xml: { preserveNamespaces: true }
    });
    
    resetGlobalDefaults();
    
    const globals = getGlobalDefaults();
    expect(globals).toEqual(DEFAULT_CONFIG);
    expect(globals.xml).toBeUndefined();
  });
});

describe('createConfig', () => {
  beforeEach(() => {
    resetGlobalDefaults();
  });
  
  afterEach(() => {
    resetGlobalDefaults();
  });
  
  test('should return global defaults when no overrides', () => {
    const config = createConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });
  
  test('should return global defaults when empty overrides', () => {
    const config = createConfig({});
    expect(config).toEqual(DEFAULT_CONFIG);
  });
  
  test('should merge simple overrides', () => {
    const config = createConfig({
      preserveComments: false,
      fragmentRoot: 'custom'
    });
    
    expect(config.preserveComments).toBe(false);
    expect(config.fragmentRoot).toBe('custom');
    expect(config.preserveInstructions).toBe(true); // Default preserved
  });
  
  test('should deep merge nested objects', () => {
    const config = createConfig({
      formatting: {
        indent: 4
        // pretty not specified - should keep default
      }
    });
    
    expect(config.formatting.indent).toBe(4);
    expect(config.formatting.pretty).toBe(true); // Default preserved
  });
  
  test('should merge with extension defaults', () => {
    mergeGlobalDefaults({
      xml: { preserveNamespaces: true, declaration: true }
    });
    
    const config = createConfig({
      xml: { declaration: false }
    });
    
    expect(config.xml.preserveNamespaces).toBe(true); // From global defaults
    expect(config.xml.declaration).toBe(false); // Override
  });
  
  test('should not mutate global defaults', () => {
    const originalDefaults = getGlobalDefaults();
    
    createConfig({
      preserveComments: false
    });
    
    const afterDefaults = getGlobalDefaults();
    expect(afterDefaults).toEqual(originalDefaults);
  });
});

describe('validateConfig', () => {
  test('should pass for valid core configuration', () => {
    expect(() => validateConfig(DEFAULT_CONFIG)).not.toThrow();
  });
  
  test('should throw for invalid preserveComments', () => {
    const config = { ...DEFAULT_CONFIG, preserveComments: 'true' as any };
    expect(() => validateConfig(config)).toThrow('preserveComments must be a boolean');
  });
  
  test('should throw for invalid preserveInstructions', () => {
    const config = { ...DEFAULT_CONFIG, preserveInstructions: 1 as any };
    expect(() => validateConfig(config)).toThrow('preserveInstructions must be a boolean');
  });
  
  test('should throw for invalid preserveWhitespace', () => {
    const config = { ...DEFAULT_CONFIG, preserveWhitespace: 'false' as any };
    expect(() => validateConfig(config)).toThrow('preserveWhitespace must be a boolean');
  });
  
  test('should throw for missing formatting object', () => {
    const config = { ...DEFAULT_CONFIG, formatting: null as any };
    expect(() => validateConfig(config)).toThrow('formatting must be an object');
  });
  
  test('should throw for invalid formatting.indent', () => {
    const config = { 
      ...DEFAULT_CONFIG, 
      formatting: { ...DEFAULT_CONFIG.formatting, indent: 'two' as any } 
    };
    expect(() => validateConfig(config)).toThrow('formatting.indent must be a non-negative number');
  });
  
  test('should throw for negative formatting.indent', () => {
    const config = { 
      ...DEFAULT_CONFIG, 
      formatting: { ...DEFAULT_CONFIG.formatting, indent: -1 } 
    };
    expect(() => validateConfig(config)).toThrow('formatting.indent must be a non-negative number');
  });
  
  test('should throw for invalid formatting.pretty', () => {
    const config = { 
      ...DEFAULT_CONFIG, 
      formatting: { ...DEFAULT_CONFIG.formatting, pretty: 'yes' as any } 
    };
    expect(() => validateConfig(config)).toThrow('formatting.pretty must be a boolean');
  });
  
  test('should throw for invalid fragmentRoot', () => {
    const config = { ...DEFAULT_CONFIG, fragmentRoot: 123 as any };
    expect(() => validateConfig(config)).toThrow('fragmentRoot must be a non-empty string');
  });
  
  test('should throw for empty fragmentRoot', () => {
    const config = { ...DEFAULT_CONFIG, fragmentRoot: '   ' };
    expect(() => validateConfig(config)).toThrow('fragmentRoot must be a non-empty string');
  });
  
  test('should allow extension properties without validation', () => {
    const config = { 
      ...DEFAULT_CONFIG, 
      xml: { preserveNamespaces: true },
      json: { attributePrefix: '@' }
    };
    expect(() => validateConfig(config)).not.toThrow();
  });
});

describe('Deep merge functionality', () => {
  beforeEach(() => {
    resetGlobalDefaults();
  });
  
  afterEach(() => {
    resetGlobalDefaults();
  });
  
  test('should handle array values', () => {
    mergeGlobalDefaults({
      xml: { forceArrays: ['item', 'entry'] }
    });
    
    const config = createConfig({
      xml: { forceArrays: ['product'] }
    });
    
    // Arrays should be replaced, not merged
    expect(config.xml.forceArrays).toEqual(['product']);
  });
  
  test('should handle null values', () => {
    const config = createConfig({
      formatting: null as any
    });
    
    // null should replace the object
    expect(config.formatting).toBeNull();
  });
  
  test('should handle nested object merging', () => {
    mergeGlobalDefaults({
      adapter: {
        xml: { preserveNamespaces: true },
        json: { attributePrefix: '@' }
      }
    });
    
    const config = createConfig({
      adapter: {
        xml: { declaration: false }
        // json config should be preserved
      }
    });
    
    expect(config.adapter.xml.preserveNamespaces).toBe(true);
    expect(config.adapter.xml.declaration).toBe(false);
    expect(config.adapter.json.attributePrefix).toBe('@');
  });
});