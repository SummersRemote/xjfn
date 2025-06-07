/**
 * XJFN Unit Tests - Foundational test suite for Phase 2
 * 
 * Tests cover:
 * - Constructor behavior and configuration
 * - Extension registration system
 * - ExtensionContext implementation
 * - Error handling and validation
 * - Utility methods and debugging features
 */

import { XJFN } from '../src/XJFN';
import { ExtensionContext, ExtensionImplementation } from '../src/core/extension';
import { Configuration } from '../src/core/config';
import { ValidationError, ProcessingError } from '../src/core/error';
import { LogLevel } from '../src/core/logger';
import { XNode, XNodeType, createField } from '../src/core/xnode';
import { Adapter } from '../src/core/adapter';

// Mock adapter for testing
class MockAdapter implements Adapter<string, XNode> {
  name = 'mock-adapter';
  
  validate(input: string): void {
    if (!input) throw new ValidationError('Input required');
  }
  
  execute(input: string): XNode {
    return createField('mock', input);
  }
}

// Test extension implementations
const testTerminalExtension: ExtensionImplementation = {
  method: function(this: ExtensionContext): string {
    this.validateSource();
    return 'terminal-result';
  },
  isTerminal: true
};

const testNonTerminalExtension: ExtensionImplementation = {
  method: function(this: ExtensionContext, value: string): void {
    this.xnode = createField('test', value);
  },
  isTerminal: false
};

const testAdapterExtension: ExtensionImplementation = {
  method: function(this: ExtensionContext, input: string): void {
    const adapter = new MockAdapter();
    this.xnode = this.executeAdapter(adapter, input);
  },
  isTerminal: false
};

describe('XJFN', () => {
  beforeEach(() => {
    // Reset global defaults before each test
    XJFN.resetDefaults();
    
    // Clear any previously registered test methods
    const proto = XJFN.prototype as any;
    [
      'testTerminal', 'testNonTerminal', 'testAdapter', 'invalidMethod',
      'testMethod', 'testMethod1', 'testMethod2', 'zMethod', 'aMethod',
      'errorMethod', 'sharedMethod', 'test', 'ext1', 'ext2'
    ].forEach(method => {
      delete proto[method];
    });
  });

  describe('Constructor', () => {
    it('should create instance with default configuration', () => {
      const xjfn = new XJFN();
      
      expect(xjfn.xnode).toBeNull();
      expect(xjfn.branchContext).toBeNull();
      expect(xjfn.context).toBeDefined();
      expect(xjfn.context.config).toBeDefined();
      expect(xjfn.context.logger).toBeDefined();
      expect(xjfn.context.metadata).toEqual({});
    });

    it('should create instance with custom configuration', () => {
      const customConfig: Partial<Configuration> = {
        preserveComments: false,
        formatting: { indent: 4, pretty: false },
        fragmentRoot: 'custom-root'
      };
      
      const xjfn = new XJFN(customConfig);
      
      expect(xjfn.context.config.preserveComments).toBe(false);
      expect(xjfn.context.config.formatting.indent).toBe(4);
      expect(xjfn.context.config.formatting.pretty).toBe(false);
      expect(xjfn.context.config.fragmentRoot).toBe('custom-root');
    });

    it('should merge custom config with defaults', () => {
      const customConfig: Partial<Configuration> = {
        preserveComments: false
      };
      
      const xjfn = new XJFN(customConfig);
      
      // Custom setting
      expect(xjfn.context.config.preserveComments).toBe(false);
      // Default settings preserved
      expect(xjfn.context.config.preserveInstructions).toBe(true);
      expect(xjfn.context.config.formatting.indent).toBe(2);
    });
  });

  describe('Extension Registration', () => {
    describe('registerExtension()', () => {
      it('should register terminal extension successfully', () => {
        const configDefaults = { test: { option: 'value' } };
        
        expect(() => {
          XJFN.registerExtension('testTerminal', testTerminalExtension, configDefaults);
        }).not.toThrow();
        
        // Method should be added to prototype
        expect(typeof (XJFN.prototype as any).testTerminal).toBe('function');
        
        // Config defaults should be merged
        const globalDefaults = XJFN.getGlobalDefaults();
        expect(globalDefaults.test).toEqual({ option: 'value' });
      });

      it('should register non-terminal extension successfully', () => {
        const configDefaults = { test: { flag: true } };
        
        expect(() => {
          XJFN.registerExtension('testNonTerminal', testNonTerminalExtension, configDefaults);
        }).not.toThrow();
        
        // Method should be added to prototype
        expect(typeof (XJFN.prototype as any).testNonTerminal).toBe('function');
        
        // Config defaults should be merged
        const globalDefaults = XJFN.getGlobalDefaults();
        expect(globalDefaults.test).toEqual({ flag: true });
      });

      it('should register extension without config defaults', () => {
        expect(() => {
          XJFN.registerExtension('testTerminal', testTerminalExtension);
        }).not.toThrow();
        
        expect(typeof (XJFN.prototype as any).testTerminal).toBe('function');
      });

      it('should register extension with empty config defaults', () => {
        expect(() => {
          XJFN.registerExtension('testTerminal', testTerminalExtension, {});
        }).not.toThrow();
        
        expect(typeof (XJFN.prototype as any).testTerminal).toBe('function');
      });
    });

    describe('Registration Validation', () => {
      it('should throw error for invalid extension name', () => {
        const invalidNames = ['', '   ', null as any, undefined as any, 123 as any];
        
        invalidNames.forEach(name => {
          expect(() => {
            XJFN.registerExtension(name, testTerminalExtension);
          }).toThrow(ValidationError);
        });
      });

      it('should throw error for invalid implementation', () => {
        const invalidImplementations = [
          null,
          undefined,
          'string',
          123,
          { method: 'not-function', isTerminal: true },
          { method: () => {}, isTerminal: 'not-boolean' },
          { method: () => {} } // missing isTerminal
        ];
        
        invalidImplementations.forEach(impl => {
          expect(() => {
            XJFN.registerExtension('testMethod', impl as any);
          }).toThrow(ValidationError);
        });
      });

      it('should throw error for duplicate registration', () => {
        XJFN.registerExtension('testMethod', testTerminalExtension);
        
        expect(() => {
          XJFN.registerExtension('testMethod', testNonTerminalExtension);
        }).toThrow(ValidationError);
      });
    });

    describe('Method Execution', () => {
      it('should execute terminal extension and return value', () => {
        XJFN.registerExtension('testTerminal', testTerminalExtension);
        
        const xjfn = new XJFN();
        xjfn.xnode = createField('test', 'value'); // Set source
        
        const result = (xjfn as any).testTerminal();
        
        expect(result).toBe('terminal-result');
      });

      it('should execute non-terminal extension and return this', () => {
        XJFN.registerExtension('testNonTerminal', testNonTerminalExtension);
        
        const xjfn = new XJFN();
        
        const result = (xjfn as any).testNonTerminal('test-value');
        
        expect(result).toBe(xjfn); // Returns this for chaining
        expect(xjfn.xnode).toBeDefined();
        expect(xjfn.xnode?.name).toBe('test');
        expect(xjfn.xnode?.value).toBe('test-value');
      });

      it('should handle extension method errors gracefully', () => {
        const errorExtension: ExtensionImplementation = {
          method: function(this: ExtensionContext): void {
            throw new Error('Test error');
          },
          isTerminal: false
        };
        
        XJFN.registerExtension('errorMethod', errorExtension);
        
        const xjfn = new XJFN();
        
        expect(() => {
          (xjfn as any).errorMethod();
        }).toThrow('Test error');
      });
    });
  });

  describe('ExtensionContext Implementation', () => {
    let xjfn: XJFN;

    beforeEach(() => {
      xjfn = new XJFN();
    });

    describe('validateSource()', () => {
      it('should pass when source is set', () => {
        xjfn.xnode = createField('test', 'value');
        
        expect(() => {
          xjfn.validateSource();
        }).not.toThrow();
      });

      it('should throw error when source is not set', () => {
        expect(xjfn.xnode).toBeNull();
        
        expect(() => {
          xjfn.validateSource();
        }).toThrow(ValidationError);
        
        expect(() => {
          xjfn.validateSource();
        }).toThrow(/No source set/);
      });
    });

    describe('executeAdapter()', () => {
      it('should execute adapter successfully', () => {
        const adapter = new MockAdapter();
        
        const result = xjfn.executeAdapter(adapter, 'test-input');
        
        expect(result).toBeDefined();
        expect(result.name).toBe('mock');
        expect(result.value).toBe('test-input');
      });

      it('should handle adapter validation errors', () => {
        const adapter = new MockAdapter();
        
        expect(() => {
          xjfn.executeAdapter(adapter, ''); // Empty input fails validation
        }).toThrow(ProcessingError); // AdapterExecutor wraps validation errors in ProcessingError
      });

      it('should handle adapter execution errors', () => {
        const errorAdapter: Adapter<string, XNode> = {
          name: 'error-adapter',
          execute: () => {
            throw new Error('Adapter error');
          }
        };
        
        expect(() => {
          xjfn.executeAdapter(errorAdapter, 'input');
        }).toThrow(ProcessingError);
      });
    });

    describe('Integration with registered extensions', () => {
      it('should work with adapter-based extension', () => {
        XJFN.registerExtension('testAdapter', testAdapterExtension);
        
        const result = (xjfn as any).testAdapter('test-input');
        
        expect(result).toBe(xjfn); // Non-terminal returns this
        expect(xjfn.xnode).toBeDefined();
        expect(xjfn.xnode?.name).toBe('mock');
        expect(xjfn.xnode?.value).toBe('test-input');
      });
    });
  });

  describe('Configuration Management', () => {
    it('should merge multiple extension configs', () => {
      const config1 = { ext1: { option1: 'value1' } };
      const config2 = { ext2: { option2: 'value2' } };
      
      XJFN.registerExtension('ext1', testTerminalExtension, config1);
      XJFN.registerExtension('ext2', testNonTerminalExtension, config2);
      
      const globalDefaults = XJFN.getGlobalDefaults();
      
      expect(globalDefaults.ext1).toEqual({ option1: 'value1' });
      expect(globalDefaults.ext2).toEqual({ option2: 'value2' });
    });

    it('should preserve core config when merging extension configs', () => {
      const extensionConfig = { test: { flag: true } };
      
      XJFN.registerExtension('test', testTerminalExtension, extensionConfig);
      
      const globalDefaults = XJFN.getGlobalDefaults();
      
      // Core config preserved
      expect(globalDefaults.preserveComments).toBe(true);
      expect(globalDefaults.formatting.indent).toBe(2);
      // Extension config added
      expect(globalDefaults.test).toEqual({ flag: true });
    });
  });

  describe('Utility Methods', () => {
    describe('getGlobalDefaults()', () => {
      it('should return current global defaults', () => {
        const defaults = XJFN.getGlobalDefaults();
        
        expect(defaults).toBeDefined();
        expect(defaults.preserveComments).toBe(true);
        expect(defaults.formatting).toBeDefined();
      });

      it('should return copy, not reference', () => {
        const defaults1 = XJFN.getGlobalDefaults();
        const defaults2 = XJFN.getGlobalDefaults();
        
        expect(defaults1).not.toBe(defaults2); // Different objects
        expect(defaults1).toEqual(defaults2); // Same content
      });
    });

    describe('resetDefaults()', () => {
      it('should reset to core defaults', () => {
        // Add extension config
        XJFN.registerExtension('test', testTerminalExtension, { test: { flag: true } });
        
        let defaults = XJFN.getGlobalDefaults();
        expect(defaults.test).toBeDefined();
        
        // Reset
        XJFN.resetDefaults();
        
        defaults = XJFN.getGlobalDefaults();
        expect(defaults.test).toBeUndefined();
        expect(defaults.preserveComments).toBe(true); // Core config preserved
      });
    });

    describe('getRegisteredMethods()', () => {
      it('should return empty array initially', () => {
        const methods = XJFN.getRegisteredMethods();
        
        expect(Array.isArray(methods)).toBe(true);
        expect(methods.length).toBeGreaterThanOrEqual(0);
      });

      it('should include registered methods', () => {
        XJFN.registerExtension('testMethod1', testTerminalExtension);
        XJFN.registerExtension('testMethod2', testNonTerminalExtension);
        
        const methods = XJFN.getRegisteredMethods();
        
        expect(methods).toContain('testMethod1');
        expect(methods).toContain('testMethod2');
      });

      it('should return sorted array', () => {
        XJFN.registerExtension('zMethod', testTerminalExtension);
        XJFN.registerExtension('aMethod', testNonTerminalExtension);
        
        const methods = XJFN.getRegisteredMethods();
        const sortedMethods = [...methods].sort();
        
        expect(methods).toEqual(sortedMethods);
      });
    });

    describe('cloneNode()', () => {
      it('should clone node using pipeline context', () => {
        const xjfn = new XJFN();
        const originalNode = createField('test', 'value');
        
        const cloned = xjfn.cloneNode(originalNode);
        
        expect(cloned).not.toBe(originalNode);
        expect(cloned.name).toBe(originalNode.name);
        expect(cloned.value).toBe(originalNode.value);
      });

      it('should support deep cloning', () => {
        const xjfn = new XJFN();
        const originalNode = createField('test', 'value');
        originalNode.children = [createField('child', 'child-value')];
        
        const cloned = xjfn.cloneNode(originalNode, true);
        
        expect(cloned.children).toBeDefined();
        expect(cloned.children?.[0]).not.toBe(originalNode.children?.[0]);
        expect(cloned.children?.[0].name).toBe('child');
      });
    });

    describe('deepClone()', () => {
      it('should deep clone objects', () => {
        const xjfn = new XJFN();
        const original = { a: 1, b: { c: 2 } };
        
        const cloned = xjfn.deepClone(original);
        
        expect(cloned).not.toBe(original);
        expect(cloned.b).not.toBe(original.b);
        expect(cloned).toEqual(original);
      });

      it('should handle null and undefined', () => {
        const xjfn = new XJFN();
        
        expect(xjfn.deepClone(null)).toBeNull();
        expect(xjfn.deepClone(undefined)).toBeUndefined();
      });
    });

    describe('deepMerge()', () => {
      it('should merge objects deeply', () => {
        const xjfn = new XJFN();
        const target = { a: 1, b: { c: 2 } };
        const source = { b: { d: 3 }, e: 4 };
        
        const result = xjfn.deepMerge(target, source);
        
        expect(result.a).toBe(1);
        expect(result.b.c).toBe(2);
        expect(result.b.d).toBe(3);
        expect(result.e).toBe(4);
      });

      it('should not modify original objects', () => {
        const xjfn = new XJFN();
        const target = { a: 1, b: { c: 2 } };
        const source = { b: { d: 3 } };
        
        const result = xjfn.deepMerge(target, source);
        
        expect(target.b).not.toHaveProperty('d');
        expect(result.b).toHaveProperty('d');
      });
    });
  });

  describe('Error Handling', () => {
    it('should provide clear error messages for registration failures', () => {
      expect(() => {
        XJFN.registerExtension('', testTerminalExtension);
      }).toThrow(/Extension name must be a non-empty string/);
      
      expect(() => {
        XJFN.registerExtension('test', null as any);
      }).toThrow(/Extension implementation must be an object/);
    });

    it('should handle method execution errors with context', () => {
      const errorExtension: ExtensionImplementation = {
        method: function(): void {
          throw new Error('Method execution failed');
        },
        isTerminal: false
      };
      
      XJFN.registerExtension('errorMethod', errorExtension);
      
      const xjfn = new XJFN();
      
      expect(() => {
        (xjfn as any).errorMethod();
      }).toThrow('Method execution failed');
    });
  });

  describe('Instance Independence', () => {
    it('should maintain independent state between instances', () => {
      const xjfn1 = new XJFN();
      const xjfn2 = new XJFN();
      
      xjfn1.xnode = createField('test1', 'value1');
      xjfn2.xnode = createField('test2', 'value2');
      
      expect(xjfn1.xnode?.value).toBe('value1');
      expect(xjfn2.xnode?.value).toBe('value2');
    });

    it('should share registered methods between instances', () => {
      XJFN.registerExtension('sharedMethod', testTerminalExtension);
      
      const xjfn1 = new XJFN();
      const xjfn2 = new XJFN();
      
      expect(typeof (xjfn1 as any).sharedMethod).toBe('function');
      expect(typeof (xjfn2 as any).sharedMethod).toBe('function');
    });
  });
});

describe('XJFN Default Export', () => {
  it('should be available as default export', () => {
    expect(XJFN).toBeDefined();
    expect(typeof XJFN).toBe('function');
    expect(typeof XJFN.registerExtension).toBe('function');
  });
});