/**
 * Unit tests for core/extension.ts - Extension system foundation
 */

import {
  ExtensionContext,
  BranchContext,
  ExtensionImplementation,
  BaseExtensionContext,
  Extension
} from '../../src/core/extension';
import {
  XNode,
  XNodeType,
  createRecord,
  createField,
  addChild
} from '../../src/core/xnode';
import { PipelineContext } from '../../src/core/context';
import { createConfig } from '../../src/core/config';
import { Adapter } from '../../src/core/adapter';
import { ValidationError } from '../../src/core/error';

describe('Core Extension System', () => {
  let mockContext: PipelineContext;
  let sampleNode: XNode;
  let mockBranchContext: BranchContext;

  beforeEach(() => {
    mockContext = new PipelineContext(createConfig());
    
    // Create sample XNode
    sampleNode = createRecord('testNode');
    addChild(sampleNode, createField('name', 'test'));
    addChild(sampleNode, createField('value', 42));
    
    // Create sample branch context
    const parentNode = createRecord('parent');
    const selectedNode = createField('selected', 'data');
    
    mockBranchContext = {
      parentNode,
      selectedNodes: [selectedNode],
      originalPaths: [[0]]
    };
  });

  describe('BaseExtensionContext', () => {
    let extensionContext: BaseExtensionContext;

    beforeEach(() => {
      extensionContext = new BaseExtensionContext(sampleNode, mockBranchContext, mockContext);
    });

    describe('constructor', () => {
      it('should initialize with provided values', () => {
        expect(extensionContext.xnode).toBe(sampleNode);
        expect(extensionContext.branchContext).toBe(mockBranchContext);
        expect(extensionContext.context).toBe(mockContext);
      });

      it('should allow null xnode', () => {
        const context = new BaseExtensionContext(null, null, mockContext);
        expect(context.xnode).toBeNull();
        expect(context.branchContext).toBeNull();
        expect(context.context).toBe(mockContext);
      });
    });

    describe('validateSource', () => {
      it('should not throw when xnode is present', () => {
        expect(() => {
          extensionContext.validateSource();
        }).not.toThrow();
      });

      it('should throw ValidationError when xnode is null', () => {
        extensionContext.xnode = null;
        
        expect(() => {
          extensionContext.validateSource();
        }).toThrow(ValidationError);
        
        expect(() => {
          extensionContext.validateSource();
        }).toThrow('No source set: call fromXml(), fromJson(), or fromXNode() before transformation');
      });
    });

    describe('executeAdapter', () => {
      let mockAdapter: Adapter<string, XNode>;

      beforeEach(() => {
        mockAdapter = {
          name: 'test-adapter',
          execute: jest.fn().mockReturnValue(sampleNode),
          validate: jest.fn()
        };
      });

      it('should execute adapter and return result', () => {
        const input = 'test input';
        const result = extensionContext.executeAdapter(mockAdapter, input);
        
        expect(result).toBe(sampleNode);
        expect(mockAdapter.execute).toHaveBeenCalledWith(input, mockContext);
      });

      it('should call adapter validation if present', () => {
        const input = 'test input';
        extensionContext.executeAdapter(mockAdapter, input);
        
        expect(mockAdapter.validate).toHaveBeenCalledWith(input, mockContext);
      });

      it('should work with adapter without validation', () => {
        const adapterWithoutValidation: Adapter<string, XNode> = {
          name: 'no-validation-adapter',
          execute: jest.fn().mockReturnValue(sampleNode)
        };
        
        const input = 'test input';
        const result = extensionContext.executeAdapter(adapterWithoutValidation, input);
        
        expect(result).toBe(sampleNode);
        expect(adapterWithoutValidation.execute).toHaveBeenCalledWith(input, mockContext);
      });

      it('should propagate adapter execution errors', () => {
        const errorAdapter: Adapter<string, XNode> = {
          name: 'error-adapter',
          execute: jest.fn().mockImplementation(() => {
            throw new Error('Adapter failed');
          })
        };
        
        expect(() => {
          extensionContext.executeAdapter(errorAdapter, 'input');
        }).toThrow('Adapter error-adapter failed: Adapter failed');
      });

      it('should propagate adapter validation errors', () => {
        const validateErrorAdapter: Adapter<string, XNode> = {
          name: 'validate-error-adapter',
          execute: jest.fn(),
          validate: jest.fn().mockImplementation(() => {
            throw new ValidationError('Invalid input');
          })
        };
        
        expect(() => {
          extensionContext.executeAdapter(validateErrorAdapter, 'input');
        }).toThrow('Adapter validate-error-adapter failed: Invalid input');
      });
    });
  });

  describe('Extension utility class', () => {
    describe('registerTerminal', () => {
      it('should throw error directing to use XJFN.registerExtension', () => {
        const mockMethod = jest.fn();
        
        expect(() => {
          Extension.registerTerminal('testMethod', mockMethod);
        }).toThrow('Use XJFN.registerExtension instead');
      });
    });

    describe('registerNonTerminal', () => {
      it('should throw error directing to use XJFN.registerExtension', () => {
        const mockMethod = jest.fn();
        
        expect(() => {
          Extension.registerNonTerminal('testMethod', mockMethod);
        }).toThrow('Use XJFN.registerExtension instead');
      });
    });
  });

  describe('Interface Types', () => {
    describe('ExtensionImplementation', () => {
      it('should define terminal implementation correctly', () => {
        const terminalImpl: ExtensionImplementation = {
          method: function(this: ExtensionContext): string {
            this.validateSource();
            return 'result';
          },
          isTerminal: true
        };
        
        expect(terminalImpl.isTerminal).toBe(true);
        expect(typeof terminalImpl.method).toBe('function');
      });

      it('should define non-terminal implementation correctly', () => {
        const nonTerminalImpl: ExtensionImplementation = {
          method: function(this: ExtensionContext): void {
            this.validateSource();
            // Non-terminal methods return void
          },
          isTerminal: false
        };
        
        expect(nonTerminalImpl.isTerminal).toBe(false);
        expect(typeof nonTerminalImpl.method).toBe('function');
      });
    });

    describe('BranchContext', () => {
      it('should contain required properties', () => {
        expect(mockBranchContext.parentNode).toBeDefined();
        expect(mockBranchContext.selectedNodes).toBeDefined();
        expect(mockBranchContext.originalPaths).toBeDefined();
        
        expect(Array.isArray(mockBranchContext.selectedNodes)).toBe(true);
        expect(Array.isArray(mockBranchContext.originalPaths)).toBe(true);
      });

      it('should maintain path structure', () => {
        expect(mockBranchContext.originalPaths[0]).toEqual([0]);
        expect(mockBranchContext.selectedNodes.length).toBe(1);
        expect(mockBranchContext.originalPaths.length).toBe(1);
      });
    });
  });

  describe('ExtensionContext interface compliance', () => {
    it('should implement ExtensionContext interface', () => {
      const context: ExtensionContext = new BaseExtensionContext(sampleNode, mockBranchContext, mockContext);
      
      // Verify all required properties exist
      expect(context.xnode).toBeDefined();
      expect(context.branchContext).toBeDefined();
      expect(context.context).toBeDefined();
      
      // Verify all required methods exist
      expect(typeof context.validateSource).toBe('function');
      expect(typeof context.executeAdapter).toBe('function');
    });

    it('should work in extension method context', () => {
      const extensionMethod = function(this: ExtensionContext, input: string): string {
        this.validateSource();
        
        const mockAdapter: Adapter<string, string> = {
          name: 'test-adapter',
          execute: (input: string) => `processed: ${input}`
        };
        
        return this.executeAdapter(mockAdapter, input);
      };
      
      const context = new BaseExtensionContext(sampleNode, null, mockContext);
      const result = extensionMethod.call(context, 'test input');
      
      expect(result).toBe('processed: test input');
    });

    it('should handle extension method without source', () => {
      const extensionMethod = function(this: ExtensionContext): void {
        this.validateSource();
      };
      
      const context = new BaseExtensionContext(null, null, mockContext);
      
      expect(() => {
        extensionMethod.call(context);
      }).toThrow(ValidationError);
    });
  });
});