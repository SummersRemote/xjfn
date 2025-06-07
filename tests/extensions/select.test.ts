/**
 * Tests for select() functional operation
 * 
 * Tests flat collection of matching nodes without hierarchy.
 * Unlike filter(), select() loses the original tree structure.
 */

import { XJFN } from '../../src/XJFN';
import { 
  XNode, 
  XNodeType, 
  createCollection, 
  createRecord, 
  createField, 
  addChild,
  hasAttributes,
  addAttribute 
} from '../../src/core/xnode';

// Import extension to register methods
import '../../src/extensions/functional';

describe('select() operation', () => {
  let xjfn: XJFN;

  beforeEach(() => {
    xjfn = new XJFN();
  });

  // Helper to create test tree structure
  function createTestTree(): XNode {
    const root = createCollection('library');
    
    const book1 = createRecord('book');
    addAttribute(book1, 'id', '1');
    addChild(book1, createField('title', 'Guide'));
    addChild(book1, createField('price', '29.99'));
    addChild(book1, createField('category', 'technical'));
    
    const book2 = createRecord('book');
    addAttribute(book2, 'id', '2');
    addChild(book2, createField('title', 'Manual'));
    addChild(book2, createField('price', '19.99'));
    addChild(book2, createField('category', 'reference'));
    
    const author = createRecord('author');
    addAttribute(author, 'id', '100');
    addChild(author, createField('name', 'John Doe'));
    addChild(author, createField('bio', 'Technical writer'));
    
    const category = createRecord('category');
    addChild(category, createField('name', 'technical'));
    addChild(category, createField('description', 'Technical books'));
    
    addChild(root, book1);
    addChild(root, book2);
    addChild(root, author);
    addChild(root, category);
    
    return root;
  }

  describe('basic selection', () => {
    it('should select nodes by type', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.type === XNodeType.FIELD);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.name).toBe('results'); // Default fragmentRoot
      
      const children = xjfn.xnode!.children || [];
      // Actual field count: book1(3) + book2(3) + author(2) + category(2) = 10 fields
      expect(children.length).toBe(10);
      expect(children.every(child => child.type === XNodeType.FIELD)).toBe(true);
    });

    it('should select nodes by name', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.name === 'book');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      expect(children.every(child => child.name === 'book')).toBe(true);
      
      // Should have attributes preserved
      children.forEach(book => {
        expect(hasAttributes(book)).toBe(true);
      });
    });

    it('should select nodes by value', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.value === 'technical');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // category field and name field
      expect(children.every(child => child.value === 'technical')).toBe(true);
    });

    it('should select nodes with attributes', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => hasAttributes(node));
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(3); // 2 books + 1 author
      expect(children.every(child => hasAttributes(child))).toBe(true);
    });

    it('should select by name matching specific fields', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.name === 'title');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // Two title fields
      expect(children.every(child => child.name === 'title')).toBe(true);
      expect(children[0].value).toBe('Guide');
      expect(children[1].value).toBe('Manual');
    });
  });

  describe('flat collection behavior', () => {
    it('should lose hierarchical structure', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.name === 'title');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      
      // Selected nodes should not have parents in the result
      children.forEach(child => {
        expect(child.parent).toBeTruthy(); // Parent is the results collection
        expect(child.parent!.name).toBe('results');
      });
    });

    it('should create independent copies of nodes', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Select all price fields
      xjfn.select(node => node.name === 'price');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      
      // Modify one of the selected nodes
      children[0].value = 'modified';
      
      // Original tree should be unchanged
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
    });

    it('should preserve all node properties', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.name === 'book');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      
      // Check that all properties are preserved
      children.forEach(book => {
        expect(book.type).toBe(XNodeType.RECORD);
        expect(book.name).toBe('book');
        expect(hasAttributes(book)).toBe(true);
        expect(book.children).toBeTruthy();
        expect(book.children!.length).toBe(3); // title, price, category
      });
    });
  });

  describe('complex selections', () => {
    it('should select by complex predicate', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Select fields with numeric values
      xjfn.select(node => 
        node.type === XNodeType.FIELD && 
        typeof node.value === 'string' && 
        !isNaN(Number(node.value))
      );
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // Two price fields
      expect(children.every(child => child.name === 'price')).toBe(true);
    });

    it('should select by attribute value', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => {
        if (!hasAttributes(node)) return false;
        const idAttr = node.attributes!.find(attr => attr.name === 'id');
        return idAttr ? Number(idAttr.value) < 50 : false;
      });
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // Two books with id < 50
      expect(children.every(child => child.name === 'book')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty tree', () => {
      const emptyTree = createCollection('empty');
      xjfn.xnode = emptyTree;
      
      xjfn.select(node => true);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.name).toBe('results');
      expect(xjfn.xnode!.children?.length || 0).toBe(1); // Just the empty collection itself
    });

    it('should create empty result when nothing matches', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => false);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.name).toBe('results');
      expect(xjfn.xnode!.children?.length || 0).toBe(0);
    });

    it('should handle single node tree', () => {
      const singleNode = createField('single', 'value');
      xjfn.xnode = singleNode;
      
      xjfn.select(node => node.name === 'single');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('single');
      expect(children[0].value).toBe('value');
    });

    it('should handle selecting root node', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.select(node => node.name === 'library');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(1);
      expect(children[0].name).toBe('library');
      expect(children[0].type).toBe(XNodeType.COLLECTION);
    });
  });

  describe('error handling', () => {
    it('should throw if no source is set', () => {
      expect(() => {
        xjfn.select(node => true);
      }).toThrow('No source set');
    });

    it('should propagate predicate errors (fail fast)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        xjfn.select(node => {
          throw new Error('Predicate error');
        });
      }).toThrow('Predicate error');
    });

    it('should validate predicate is a function', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        (xjfn as any).select('not a function');
      }).toThrow();
    });
  });

  describe('chaining', () => {
    it('should return XJFN instance for chaining', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn.select(node => true);
      
      expect(result).toBe(xjfn);
      expect(result).toBeInstanceOf(XJFN);
    });

    it('should chain with other operations', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Select all fields, then filter by name to get only title fields
      const result = xjfn
        .select(node => node.type === XNodeType.FIELD)
        .filter(node => node.name === 'title');
      
      expect(result).toBe(xjfn);
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // Two title fields
      expect(children.every(child => child.name === 'title')).toBe(true);
    });

    it('should work with map after select', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Select price fields and add metadata
      xjfn
        .select(node => node.name === 'price')
        .map(node => ({ ...node, processed: true }));
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      expect(children.every(child => (child as any).processed === true)).toBe(true);
    });
  });

  describe('custom fragmentRoot', () => {
    it('should use custom fragmentRoot from config', () => {
      const customXjfn = new XJFN({
        fragmentRoot: 'selected_items'
      });
      
      const tree = createTestTree();
      customXjfn.xnode = tree;
      
      customXjfn.select(node => node.name === 'book');
      
      expect(customXjfn.xnode!.name).toBe('selected_items');
      expect(customXjfn.xnode!.type).toBe(XNodeType.COLLECTION);
    });
  });
});