/**
 * Tests for map() functional operation
 * 
 * Tests transformation of every node using transform functions.
 * Should maintain tree structure while applying transforms.
 */

import { XJFN } from '../../src/XJFN';
import { 
  XNode, 
  XNodeType, 
  createCollection, 
  createRecord, 
  createField, 
  addChild 
} from '../../src/core/xnode';
import { Transform } from '../../src/transforms';

// Import extensions to register methods
import '../../src/extensions/functional';
import '../../src/transforms'; // For transform functions

describe('map() operation', () => {
  let xjfn: XJFN;

  beforeEach(() => {
    xjfn = new XJFN();
  });

  // Helper to create test tree with numeric and string values
  function createTestTree(): XNode {
    const root = createCollection('products');
    
    const product1 = createRecord('product');
    addChild(product1, createField('name', 'Widget'));
    addChild(product1, createField('price', '29.99'));
    addChild(product1, createField('quantity', '10'));
    addChild(product1, createField('active', 'true'));
    
    const product2 = createRecord('product');
    addChild(product2, createField('name', 'Gadget'));
    addChild(product2, createField('price', '19.50'));
    addChild(product2, createField('quantity', '5'));
    addChild(product2, createField('active', 'false'));
    
    addChild(root, product1);
    addChild(root, product2);
    
    return root;
  }

  // Simple transform that adds metadata
  const addProcessedFlag: Transform = (node: XNode): XNode => ({
    ...node,
    id: 'processed'
  });

  // Transform that converts string numbers to actual numbers
  const parseNumbers: Transform = (node: XNode): XNode => {
    if (typeof node.value === 'string' && !isNaN(Number(node.value))) {
      return { ...node, value: Number(node.value) };
    }
    return node;
  };

  // Transform that uppercases string values
  const uppercaseStrings: Transform = (node: XNode): XNode => {
    if (typeof node.value === 'string' && isNaN(Number(node.value))) {
      return { ...node, value: node.value.toUpperCase() };
    }
    return node;
  };

  describe('basic transformation', () => {
    it('should apply transform to every node', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.map(addProcessedFlag);
      
      // Check that every node has the processed flag
      function checkAllNodes(node: XNode): void {
        expect(node.id).toBe('processed');
        if (node.children) {
          node.children.forEach(checkAllNodes);
        }
      }
      
      checkAllNodes(xjfn.xnode!);
    });

    it('should preserve tree structure', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const originalStructure = JSON.stringify(tree, (key, value) => {
        if (key === 'parent') return undefined; // Exclude parent refs
        return value;
      });
      
      xjfn.map(addProcessedFlag);
      
      const newStructure = JSON.stringify(xjfn.xnode!, (key, value) => {
        if (key === 'parent' || key === 'id') return undefined; // Exclude parent refs and new id
        return value;
      });
      
      expect(newStructure).toBe(originalStructure);
    });

    it('should apply value transformations', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.map(parseNumbers);
      
      // Check that numeric strings were converted to numbers
      const allNodes: XNode[] = [];
      function collectNodes(node: XNode) {
        allNodes.push(node);
        if (node.children) {
          node.children.forEach(collectNodes);
        }
      }
      collectNodes(xjfn.xnode!);
      
      const priceNodes = allNodes.filter(node => node.name === 'price');
      expect(priceNodes.length).toBe(2);
      expect(typeof priceNodes[0].value).toBe('number');
      expect(typeof priceNodes[1].value).toBe('number');
      expect(priceNodes[0].value).toBe(29.99);
      expect(priceNodes[1].value).toBe(19.50);
    });
  });

  describe('transform composition', () => {
    it('should work with multiple map calls', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .map(parseNumbers)
        .map(uppercaseStrings)
        .map(addProcessedFlag);
      
      const allNodes: XNode[] = [];
      function collectNodes(node: XNode) {
        allNodes.push(node);
        if (node.children) {
          node.children.forEach(collectNodes);
        }
      }
      collectNodes(xjfn.xnode!);
      
      // Check numbers were parsed
      const priceNodes = allNodes.filter(node => node.name === 'price');
      expect(typeof priceNodes[0].value).toBe('number');
      
      // Check strings were uppercased
      const nameNodes = allNodes.filter(node => node.name === 'name');
      expect(nameNodes[0].value).toBe('WIDGET');
      expect(nameNodes[1].value).toBe('GADGET');
      
      // Check all have processed flag
      allNodes.forEach(node => {
        expect(node.id).toBe('processed');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty tree', () => {
      const emptyTree = createCollection('empty');
      xjfn.xnode = emptyTree;
      
      xjfn.map(addProcessedFlag);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.id).toBe('processed');
      expect(xjfn.xnode!.children?.length || 0).toBe(0);
    });

    it('should handle single node tree', () => {
      const singleNode = createField('test', 'value');
      xjfn.xnode = singleNode;
      
      xjfn.map(uppercaseStrings);
      
      expect(xjfn.xnode!.value).toBe('VALUE');
      expect(xjfn.xnode!.name).toBe('test');
    });

    it('should handle identity transform', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const originalJson = JSON.stringify(tree, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      });
      
      xjfn.map(node => node); // Identity transform
      
      const newJson = JSON.stringify(xjfn.xnode!, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      });
      
      expect(newJson).toBe(originalJson);
    });
  });

  describe('error handling', () => {
    it('should throw if no source is set', () => {
      expect(() => {
        xjfn.map(addProcessedFlag);
      }).toThrow('No source set');
    });

    it('should propagate transform errors (fail fast)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const errorTransform: Transform = (node: XNode): XNode => {
        throw new Error('Transform error');
      };
      
      expect(() => {
        xjfn.map(errorTransform);
      }).toThrow('Transform error');
    });

    it('should validate transform is a function', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        (xjfn as any).map('not a function');
      }).toThrow();
    });
  });

  describe('parent relationships', () => {
    it('should maintain correct parent relationships', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.map(addProcessedFlag);
      
      // Check parent relationships are correct
      function checkParents(node: XNode, expectedParent?: XNode): void {
        if (expectedParent) {
          expect(node.parent).toBe(expectedParent);
        }
        
        if (node.children) {
          node.children.forEach(child => checkParents(child, node));
        }
      }
      
      checkParents(xjfn.xnode!);
    });
  });

  describe('chaining', () => {
    it('should return XJFN instance for chaining', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn.map(addProcessedFlag);
      
      expect(result).toBe(xjfn);
      expect(result).toBeInstanceOf(XJFN);
    });

    it('should chain with other operations', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn
        .map(parseNumbers)
        .filter(node => typeof node.value !== 'string' || node.value !== 'false');
      
      expect(result).toBe(xjfn);
      
      // Should have filtered out the 'false' string value
      const allNodes: XNode[] = [];
      function collectNodes(node: XNode) {
        allNodes.push(node);
        if (node.children) {
          node.children.forEach(collectNodes);
        }
      }
      collectNodes(xjfn.xnode!);
      
      expect(allNodes.find(node => node.value === 'false')).toBeUndefined();
    });
  });
});