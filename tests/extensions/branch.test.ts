/**
 * Tests for branch() functional operation
 * 
 * Tests creation of isolated scope containing matching nodes.
 * Branch extracts nodes for focused operations while preserving original tree.
 */

import { XJFN } from '../../src/XJFN';
import { 
  XNode, 
  XNodeType, 
  createCollection, 
  createRecord, 
  createField, 
  addChild,
  addAttribute 
} from '../../src/core/xnode';

// Import extension to register methods
import '../../src/extensions/functional';

describe('branch() operation', () => {
  let xjfn: XJFN;

  beforeEach(() => {
    xjfn = new XJFN();
  });

  // Helper to create test tree structure
  function createTestTree(): XNode {
    const root = createCollection('products');
    
    const product1 = createRecord('product');
    addAttribute(product1, 'id', '1');
    addChild(product1, createField('name', 'Widget'));
    addChild(product1, createField('price', '29.99'));
    addChild(product1, createField('active', 'true'));
    
    const product2 = createRecord('product');
    addAttribute(product2, 'id', '2');
    addChild(product2, createField('name', 'Gadget'));
    addChild(product2, createField('price', '19.99'));
    addChild(product2, createField('active', 'false'));
    
    const category = createRecord('category');
    addChild(category, createField('name', 'electronics'));
    addChild(category, createField('description', 'Electronic products'));
    
    addChild(root, product1);
    addChild(root, product2);
    addChild(root, category);
    
    return root;
  }

  describe('basic branching', () => {
    it('should create branch with matching nodes', () => {
      const tree = createTestTree();
      const originalTree = JSON.parse(JSON.stringify(tree, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      }));
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.name === 'price');
      
      // Should create branch context
      expect(xjfn.branchContext).toBeTruthy();
      expect(xjfn.branchContext!.parentNode).toBe(tree);
      expect(xjfn.branchContext!.selectedNodes.length).toBe(2);
      expect(xjfn.branchContext!.originalPaths.length).toBe(2);
      
      // Branch collection should contain cloned price nodes
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.name).toBe('results');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      expect(children.every(child => child.name === 'price')).toBe(true);
      
      // Original tree should be unchanged
      const currentOriginal = JSON.parse(JSON.stringify(tree, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      }));
      expect(currentOriginal).toEqual(originalTree);
    });

    it('should create branch with record nodes', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.name === 'product');
      
      expect(xjfn.branchContext!.selectedNodes.length).toBe(2);
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      expect(children.every(child => child.name === 'product')).toBe(true);
      
      // Each product should have its children
      children.forEach(product => {
        expect(product.children?.length).toBe(3); // name, price, active
      });
    });

    it('should store correct paths for matching nodes', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.name === 'price');
      
      const paths = xjfn.branchContext!.originalPaths;
      expect(paths.length).toBe(2);
      
      // Paths should point to price fields: [0,1] and [1,1] (product index, field index)
      expect(paths[0]).toEqual([0, 1]); // First product, second field (price)
      expect(paths[1]).toEqual([1, 1]); // Second product, second field (price)
    });
  });

  describe('empty branches', () => {
    it('should handle no matching nodes', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.name === 'nonexistent');
      
      expect(xjfn.branchContext).toBeTruthy();
      expect(xjfn.branchContext!.selectedNodes.length).toBe(0);
      expect(xjfn.branchContext!.originalPaths.length).toBe(0);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.children?.length || 0).toBe(0);
    });

    it('should handle empty tree', () => {
      const emptyTree = createCollection('empty');
      xjfn.xnode = emptyTree;
      
      xjfn.branch(node => true);
      
      expect(xjfn.branchContext).toBeTruthy();
      expect(xjfn.branchContext!.selectedNodes.length).toBe(1); // The empty collection itself
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('empty');
    });
  });

  describe('branch isolation', () => {
    it('should create independent copies in branch', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.name === 'price');
      
      // Modify branch nodes
      const children = xjfn.xnode!.children || [];
      children[0].value = 'modified';
      
      // Original nodes should be unchanged
      const originalPriceNodes: XNode[] = [];
      function findPriceNodes(node: XNode): void {
        if (node.name === 'price') {
          originalPriceNodes.push(node);
        }
        if (node.children) {
          node.children.forEach(findPriceNodes);
        }
      }
      findPriceNodes(tree);
      
      expect(originalPriceNodes[0].value).not.toBe('modified');
      expect(originalPriceNodes[0].value).toBe('29.99');
    });

    it('should allow operations on branch', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, processed: true }));
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      expect(children.every(child => (child as any).processed === true)).toBe(true);
      
      // Branch context should still exist
      expect(xjfn.branchContext).toBeTruthy();
    });
  });

  describe('nested branching prevention', () => {
    it('should prevent nested branches', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.name === 'product');
      
      expect(() => {
        xjfn.branch(node => node.name === 'price');
      }).toThrow('Cannot create nested branches. Call merge() first');
    });

    it('should allow new branch after merge', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'product')
        .merge();
      
      expect(xjfn.branchContext).toBe(null);
      
      // Should allow new branch now
      expect(() => {
        xjfn.branch(node => node.name === 'price');
      }).not.toThrow();
      
      expect(xjfn.branchContext).toBeTruthy();
    });
  });

  describe('complex branching scenarios', () => {
    it('should branch by type', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => node.type === XNodeType.FIELD);
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(8); // All field nodes
      expect(children.every(child => child.type === XNodeType.FIELD)).toBe(true);
    });

    it('should branch by attribute', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => {
        if (!node.attributes) return false;
        const idAttr = node.attributes.find(attr => attr.name === 'id');
        return idAttr ? idAttr.value === '1' : false;
      });
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('product');
      
      const idAttr = children[0].attributes!.find(attr => attr.name === 'id');
      expect(idAttr!.value).toBe('1');
    });

    it('should branch by value content', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.branch(node => 
        typeof node.value === 'string' && 
        node.value.includes('.')
      );
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // Two price fields with decimal values
      expect(children.every(child => child.name === 'price')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw if no source is set', () => {
      expect(() => {
        xjfn.branch(node => true);
      }).toThrow('No source set');
    });

    it('should propagate predicate errors (fail fast)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        xjfn.branch(node => {
          throw new Error('Predicate error');
        });
      }).toThrow('Predicate error');
    });

    it('should validate predicate is a function', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        (xjfn as any).branch('not a function');
      }).toThrow();
    });
  });

  describe('chaining', () => {
    it('should return XJFN instance for chaining', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn.branch(node => true);
      
      expect(result).toBe(xjfn);
      expect(result).toBeInstanceOf(XJFN);
    });

    it('should maintain branch context through chaining', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, processed: true }))
        .filter(node => node.value !== '19.99');
      
      expect(xjfn.branchContext).toBeTruthy();
      expect(xjfn.branchContext!.selectedNodes.length).toBe(2); // Original count preserved
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(1); // One filtered out
      expect(children[0].value).toBe('29.99');
    });
  });

  describe('custom fragmentRoot', () => {
    it('should use custom fragmentRoot for branch collection', () => {
      const customXjfn = new XJFN({
        fragmentRoot: 'branch_scope'
      });
      
      const tree = createTestTree();
      customXjfn.xnode = tree;
      
      customXjfn.branch(node => node.name === 'price');
      
      expect(customXjfn.xnode!.name).toBe('branch_scope');
      expect(customXjfn.xnode!.type).toBe(XNodeType.COLLECTION);
    });
  });
});