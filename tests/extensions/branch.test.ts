/**
 * Branch Operation Tests - Tests for branch/merge functionality
 */

// IMPORTANT: Import to register functional extensions
import '../../src/extensions/functional';

import { XJFN } from '../../src/XJFN';
import { XNode, XNodeType, createRecord, createField, addChild } from '../../src/core/xnode';
import { ValidationError } from '../../src/core/error';
// Import extension to register methods
import '../../src/extensions/functional';

describe('branch() operation', () => {
  let xjfn: XJFN;
  let sampleData: XNode;

  beforeEach(() => {
    xjfn = new XJFN();
    
    // Create sample test data
    sampleData = createRecord('root');
    
    const item1 = createField('item', 'value1');
    const item2 = createField('price', '10.99');
    const item3 = createField('item', 'value2');
    const item4 = createField('description', 'test item');
    
    addChild(sampleData, item1);
    addChild(sampleData, item2);
    addChild(sampleData, item3);
    addChild(sampleData, item4);
    
    // Set the source using fromXNode (bypassing XML/JSON parsing)
    (xjfn as any).xnode = sampleData;
  });

  describe('basic functionality', () => {
    it('should create branch with matching nodes', () => {
      xjfn.branch(node => node.name === 'item');
      
      expect(xjfn.xnode).toBeDefined();
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.children).toHaveLength(2);
      expect(xjfn.branchContext).toBeDefined();
      expect(xjfn.branchContext!.selectedNodes).toHaveLength(2);
    });

    it('should create empty branch when no nodes match', () => {
      xjfn.branch(node => node.name === 'nonexistent');
      
      expect(xjfn.xnode).toBeDefined();
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.children).toHaveLength(0);
      expect(xjfn.branchContext).toBeDefined();
      expect(xjfn.branchContext!.selectedNodes).toHaveLength(0);
    });

    it('should maintain original document structure', () => {
      const originalRoot = xjfn.xnode;
      
      xjfn.branch(node => node.name === 'price');
      
      // Original should be preserved in branch context
      expect(xjfn.branchContext!.parentNode).toBe(originalRoot);
      expect(xjfn.branchContext!.parentNode.children).toHaveLength(4);
    });
  });

  describe('branch context management', () => {
    it('should store correct paths for branched nodes', () => {
      xjfn.branch(node => node.name === 'item');
      
      expect(xjfn.branchContext!.originalPaths).toEqual([
        [0], // First item at index 0
        [2]  // Second item at index 2
      ]);
    });

    it('should clone nodes in branch to avoid mutation', () => {
      xjfn.branch(node => node.name === 'price');
      
      const branchedNode = xjfn.xnode!.children![0];
      const originalNode = xjfn.branchContext!.selectedNodes[0];
      
      // Should be different instances
      expect(branchedNode).not.toBe(originalNode);
      
      // But have same content
      expect(branchedNode.name).toBe(originalNode.name);
      expect(branchedNode.value).toBe(originalNode.value);
    });
  });

  describe('chaining with other operations', () => {
    it('should support map operations in branch', () => {
      xjfn.branch(node => node.name === 'price')
        .map(node => ({ ...node, value: parseFloat(node.value as string) }));
      
      const branchedNode = xjfn.xnode!.children![0];
      expect(branchedNode.value).toBe(10.99);
      expect(typeof branchedNode.value).toBe('number');
    });

    it('should support filter operations in branch', () => {
      xjfn.branch(node => node.name === 'item' || node.name === 'price')
        .filter(node => node.name === 'item');
      
      expect(xjfn.xnode!.children).toHaveLength(2);
      expect(xjfn.xnode!.children![0].name).toBe('item');
      expect(xjfn.xnode!.children![1].name).toBe('item');
    });
  });

  describe('merge functionality', () => {
    it('should merge changes back to original document', () => {
      xjfn.branch(node => node.name === 'price')
        .map(node => ({ ...node, value: parseFloat(node.value as string) }))
        .merge();
      
      // Should be back to original document
      expect(xjfn.branchContext).toBeNull();
      expect(xjfn.xnode!.children).toHaveLength(4);
      
      // Price should be transformed
      const priceNode = xjfn.xnode!.children![1];
      expect(priceNode.name).toBe('price');
      expect(priceNode.value).toBe(10.99);
      expect(typeof priceNode.value).toBe('number');
    });

    it('should handle node removal in branch', () => {
      xjfn.branch(node => node.name === 'price')
        .filter(node => false) // Remove all
        .merge();
      
      // Price node should be removed from original
      expect(xjfn.xnode!.children).toHaveLength(3);
      expect(xjfn.xnode!.children!.every(child => child.name !== 'price')).toBe(true);
    });

    it('should be no-op when no active branch', () => {
      const originalNode = xjfn.xnode;
      
      xjfn.merge(); // Should not throw, should be no-op
      
      expect(xjfn.xnode).toBe(originalNode);
      expect(xjfn.branchContext).toBeNull();
    });
  });

  describe('nested branching prevention', () => {
    it('should prevent nested branching', () => {
      xjfn.branch(node => node.name === 'item');
      
      expect(() => {
        xjfn.branch(node => node.name === 'price');
      }).toThrow('Cannot create nested branches. Call merge() first to close the current branch.');
    });

    it('should allow new branch after merge', () => {
      xjfn.branch(node => node.name === 'item')
        .merge();
      
      // Should now allow new branch
      expect(() => {
        xjfn.branch(node => node.name === 'price');
      }).not.toThrow();
      
      expect(xjfn.branchContext).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should validate source is set', () => {
      const emptyXjfn = new XJFN();
      
      expect(() => {
        emptyXjfn.branch(node => true);
      }).toThrow(ValidationError);
      expect(() => {
        emptyXjfn.branch(node => true);
      }).toThrow('No source set: call fromXml(), fromJson(), or fromXNode() before transformation');
    });

    it('should propagate predicate errors (fail fast)', () => {
      expect(() => {
        xjfn.branch(node => {
          throw new Error('Predicate error');
        });
      }).toThrow('Predicate error');
    });

    it('should validate predicate is a function', () => {
      expect(() => {
        (xjfn as any).branch('not a function');
      }).toThrow(ValidationError);
      expect(() => {
        (xjfn as any).branch('not a function');
      }).toThrow('Branch predicate must be a function');
    });

    it('should validate predicate parameter types', () => {
      expect(() => {
        (xjfn as any).branch(null);
      }).toThrow(ValidationError);
      
      expect(() => {
        (xjfn as any).branch(undefined);
      }).toThrow(ValidationError);
      
      expect(() => {
        (xjfn as any).branch(123);
      }).toThrow(ValidationError);
      
      expect(() => {
        (xjfn as any).branch({});
      }).toThrow(ValidationError);
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple branch/merge cycles', () => {
      // First branch/merge cycle
      xjfn.branch(node => node.name === 'price')
        .map(node => ({ ...node, value: parseFloat(node.value as string) }))
        .merge();
      
      // Second branch/merge cycle
      xjfn.branch(node => node.name === 'item')
        .map(node => ({ ...node, value: (node.value ?? '').toString().toUpperCase()}))
        .merge();
      
      const items = xjfn.xnode!.children!.filter(child => child.name === 'item');
      expect(items).toHaveLength(2);
      expect(items[0].value).toBe('VALUE1');
      expect(items[1].value).toBe('VALUE2');
      
      const price = xjfn.xnode!.children!.find(child => child.name === 'price');
      expect(price!.value).toBe(10.99);
      expect(typeof price!.value).toBe('number');
    });

    it('should preserve node relationships after merge', () => {
      xjfn.branch(node => node.name === 'item')
        .map(node => ({ ...node, processed: true } as any))
        .merge();
      
      // Check parent relationships are correct
      xjfn.xnode!.children!.forEach(child => {
        expect(child.parent).toBe(xjfn.xnode);
      });
    });
  });
});