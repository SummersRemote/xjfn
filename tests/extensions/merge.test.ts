/**
 * Tests for merge() functional operation
 * 
 * Tests applying branch changes back to parent document.
 * Merge completes the branch/merge cycle by restoring modified nodes.
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

describe('merge() operation', () => {
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

  // Helper to collect all nodes with specific name
  function findNodesByName(root: XNode, name: string): XNode[] {
    const nodes: XNode[] = [];
    function search(node: XNode): void {
      if (node.name === name) {
        nodes.push(node);
      }
      if (node.children) {
        node.children.forEach(search);
      }
    }
    search(root);
    return nodes;
  }

  describe('basic merging', () => {
    it('should merge modified branch back to parent', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, value: Number(node.value) }))
        .merge();
      
      // Branch context should be cleared
      expect(xjfn.branchContext).toBe(null);
      
      // Should be back to full tree
      expect(xjfn.xnode!.name).toBe('products');
      expect(xjfn.xnode!.children?.length).toBe(3);
      
      // Price values should be converted to numbers
      const priceNodes = findNodesByName(xjfn.xnode!, 'price');
      expect(priceNodes.length).toBe(2);
      expect(typeof priceNodes[0].value).toBe('number');
      expect(typeof priceNodes[1].value).toBe('number');
      expect(priceNodes[0].value).toBe(29.99);
      expect(priceNodes[1].value).toBe(19.99);
    });

    it('should merge filtered branch (removes nodes)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .filter(node => Number(node.value) > 25)
        .merge();
      
      // Should have removed one price node
      const priceNodes = findNodesByName(xjfn.xnode!, 'price');
      expect(priceNodes.length).toBe(1);
      expect(priceNodes[0].value).toBe('29.99');
      
      // Tree structure should be preserved
      expect(xjfn.xnode!.children?.length).toBe(3);
      
      // Product 2 should have only 2 children now (name and active, no price)
      const products = findNodesByName(xjfn.xnode!, 'product');
      const product2 = products.find(p => {
        const idAttr = p.attributes?.find(attr => attr.name === 'id');
        return idAttr?.value === '2';
      });
      expect(product2!.children?.length).toBe(2); // name and active only
    });

    it('should merge completely filtered branch (removes all)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .filter(node => false) // Remove all
        .merge();
      
      // Should have no price nodes
      const priceNodes = findNodesByName(xjfn.xnode!, 'price');
      expect(priceNodes.length).toBe(0);
      
      // Products should have only 2 children each (name and active)
      const products = findNodesByName(xjfn.xnode!, 'product');
      expect(products.length).toBe(2);
      products.forEach(product => {
        expect(product.children?.length).toBe(2);
        expect(product.children?.find(child => child.name === 'price')).toBeUndefined();
      });
    });

    it('should preserve non-branched parts of tree', () => {
      const tree = createTestTree();
      const originalCategory = findNodesByName(tree, 'category')[0];
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, processed: true }))
        .merge();
      
      // Category should be unchanged
      const category = findNodesByName(xjfn.xnode!, 'category')[0];
      expect(category.children?.length).toBe(originalCategory.children?.length);
      
      const categoryFields = category.children || [];
      expect(categoryFields.find(field => field.name === 'name')?.value).toBe('electronics');
      expect(categoryFields.find(field => field.name === 'description')?.value).toBe('Electronic products');
    });
  });

  describe('complex merge scenarios', () => {
    it('should merge branch with added metadata', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'product')
        .map(node => ({ ...node, lastModified: '2024-01-01' }))
        .merge();
      
      const products = findNodesByName(xjfn.xnode!, 'product');
      expect(products.length).toBe(2);
      products.forEach(product => {
        expect((product as any).lastModified).toBe('2024-01-01');
      });
    });

    it('should merge branch with deep modifications', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'product')
        .map(node => {
          if (node.children) {
            const modifiedChildren = node.children.map(child => 
              child.name === 'name' 
                ? { ...child, value: (child.value as string).toUpperCase() }
                : child
            );
            return { ...node, children: modifiedChildren };
          }
          return node;
        })
        .merge();
      
      const nameNodes = findNodesByName(xjfn.xnode!, 'name');
      const productNames = nameNodes.filter(node => {
        // Find names that are children of products
        let parent = node.parent;
        while (parent) {
          if (parent.name === 'product') return true;
          parent = parent.parent;
        }
        return false;
      });
      
      expect(productNames.length).toBe(2);
      expect(productNames[0].value).toBe('WIDGET');
      expect(productNames[1].value).toBe('GADGET');
      
      // Category name should be unchanged
      const categoryNames = nameNodes.filter(node => {
        let parent = node.parent;
        while (parent) {
          if (parent.name === 'category') return true;
          parent = parent.parent;
        }
        return false;
      });
      expect(categoryNames[0].value).toBe('electronics');
    });

    it('should handle multiple branch/merge cycles', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // First cycle: modify prices
      xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, value: Number(node.value) * 1.1 }))
        .merge();
      
      // Second cycle: modify names
      xjfn
        .branch(node => node.name === 'name' && node.parent?.name === 'product')
        .map(node => ({ ...node, value: `Updated ${node.value}` }))
        .merge();
      
      const priceNodes = findNodesByName(xjfn.xnode!, 'price');
      expect(priceNodes[0].value).toBeCloseTo(32.989); // 29.99 * 1.1
      expect(priceNodes[1].value).toBeCloseTo(21.989); // 19.99 * 1.1
      
      const productNames = findNodesByName(xjfn.xnode!, 'name').filter(node => 
        node.parent?.name === 'product'
      );
      expect(productNames[0].value).toBe('Updated Widget');
      expect(productNames[1].value).toBe('Updated Gadget');
    });
  });

  describe('edge cases', () => {
    it('should handle empty branch merge', () => {
      const tree = createTestTree();
      const originalTreeJson = JSON.stringify(tree, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      });
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'nonexistent')
        .merge();
      
      // Tree should be unchanged
      const newTreeJson = JSON.stringify(xjfn.xnode!, (key, value) => {
        if (key === 'parent') return undefined;
        return value;
      });
      expect(newTreeJson).toBe(originalTreeJson);
      expect(xjfn.branchContext).toBe(null);
    });

    it('should handle single node tree', () => {
      const singleNode = createField('test', 'value');
      xjfn.xnode = singleNode;
      
      xjfn
        .branch(node => node.name === 'test')
        .map(node => ({ ...node, value: 'modified' }))
        .merge();
      
      expect(xjfn.xnode!.name).toBe('test');
      expect(xjfn.xnode!.value).toBe('modified');
      expect(xjfn.branchContext).toBe(null);
    });

    it('should no-op when no branch exists', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // No branch created, just call merge
      xjfn.merge();
      
      expect(xjfn.branchContext).toBe(null);
      expect(xjfn.xnode).toBe(tree); // Should be unchanged
    });
  });

  describe('path handling', () => {
    it('should handle deep path replacements correctly', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Branch on deeply nested field
      xjfn
        .branch(node => node.name === 'active')
        .map(node => ({ ...node, value: node.value === 'true' ? false : true }))
        .merge();
      
      const activeNodes = findNodesByName(xjfn.xnode!, 'active');
      expect(activeNodes.length).toBe(2);
      expect(activeNodes[0].value).toBe(false); // was 'true'
      expect(activeNodes[1].value).toBe(true);  // was 'false'
    });

    it('should handle path ordering correctly', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Branch multiple nodes at different depths
      xjfn
        .branch(node => node.name === 'price' || node.name === 'product')
        .map(node => ({ ...node, processed: true }))
        .merge();
      
      // Both products and their price fields should be processed
      const products = findNodesByName(xjfn.xnode!, 'product');
      const prices = findNodesByName(xjfn.xnode!, 'price');
      
      expect(products.every(p => (p as any).processed === true)).toBe(true);
      expect(prices.every(p => (p as any).processed === true)).toBe(true);
    });
  });

  describe('parent relationships', () => {
    it('should maintain correct parent relationships after merge', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, processed: true }))
        .merge();
      
      // Check all parent relationships are correct
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
      
      const result = xjfn
        .branch(node => node.name === 'price')
        .merge();
      
      expect(result).toBe(xjfn);
      expect(result).toBeInstanceOf(XJFN);
    });

    it('should chain operations after merge', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn
        .branch(node => node.name === 'price')
        .map(node => ({ ...node, value: Number(node.value) }))
        .merge()
        .filter(node => node.type !== XNodeType.COLLECTION || node.name !== 'products');
      
      expect(result).toBe(xjfn);
      
      // Should have filtered out the root collection
      expect(xjfn.xnode!.name).toBe('results');
      expect(xjfn.xnode!.children?.length || 0).toBe(0);
    });
  });
});