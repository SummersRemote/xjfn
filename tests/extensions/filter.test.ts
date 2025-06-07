/**
 * Tests for filter() functional operation
 * 
 * Tests hierarchical filtering while maintaining tree structure.
 * Parents are kept if they have matching children.
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

// Import extension to register methods
import '../../src/extensions/functional';

describe('filter() operation', () => {
  let xjfn: XJFN;

  beforeEach(() => {
    xjfn = new XJFN();
  });

  // Helper to create test tree structure
  function createTestTree(): XNode {
    const root = createCollection('root');
    
    const book1 = createRecord('book');
    addChild(book1, createField('title', 'Guide'));
    addChild(book1, createField('price', '29.99'));
    addChild(book1, createField('active', 'true'));
    
    const book2 = createRecord('book'); 
    addChild(book2, createField('title', 'Manual'));
    addChild(book2, createField('price', '19.99'));
    addChild(book2, createField('active', 'false'));
    
    const author = createRecord('author');
    addChild(author, createField('name', 'John Doe'));
    addChild(author, createField('bio', 'Writer'));
    
    addChild(root, book1);
    addChild(root, book2);
    addChild(root, author);
    
    return root;
  }

  describe('basic filtering', () => {
    it('should filter by node type', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.filter(node => node.type === XNodeType.FIELD);
      
      expect(xjfn.xnode).toBeTruthy();
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      
      // Should preserve hierarchy - books and author should still exist
      // because they contain matching field children
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(3); // 2 books + 1 author
      
      // Each book should have only field children
      const firstBook = children[0];
      expect(firstBook.type).toBe(XNodeType.RECORD);
      expect(firstBook.children?.every(child => child.type === XNodeType.FIELD)).toBe(true);
    });

    it('should filter by node name', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.filter(node => node.name === 'book');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2);
      expect(children.every(child => child.name === 'book')).toBe(true);
    });

    it('should filter by node value', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.filter(node => node.value === 'true');
      
      // Should keep the root, book1, and the active field
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(1); // Only book1 has a 'true' value field
      
      const book = children[0];
      expect(book.children?.some(child => child.value === 'true')).toBe(true);
    });
  });

  describe('hierarchical preservation', () => {
    it('should keep parents with matching children', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Filter for title fields only
      xjfn.filter(node => node.name === 'title');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(2); // Both books should be kept
      
      // Each book should only have title field
      children.forEach(book => {
        expect(book.children?.length).toBe(1);
        expect(book.children?.[0].name).toBe('title');
      });
    });

    it('should remove parents with no matching children', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Filter for something that doesn't exist
      xjfn.filter(node => node.name === 'nonexistent');
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(0);
    });

    it('should keep parents that match even without matching children', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      // Filter for records (parents) - they should be kept even if children don't match
      xjfn.filter(node => node.type === XNodeType.RECORD);
      
      const children = xjfn.xnode!.children || [];
      expect(children.length).toBe(3); // All 3 records should be kept
      
      // But their children should be empty since fields don't match
      children.forEach(record => {
        expect(record.children?.length || 0).toBe(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty tree', () => {
      const emptyTree = createCollection('empty');
      xjfn.xnode = emptyTree;
      
      xjfn.filter(node => true);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.children?.length || 0).toBe(0);
    });

    it('should create empty result when nothing matches', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      xjfn.filter(node => false);
      
      expect(xjfn.xnode!.type).toBe(XNodeType.COLLECTION);
      expect(xjfn.xnode!.name).toBe('results'); // Default fragmentRoot
      expect(xjfn.xnode!.children?.length || 0).toBe(0);
    });

    it('should handle single node tree', () => {
      const singleNode = createField('single', 'value');
      xjfn.xnode = singleNode;
      
      xjfn.filter(node => node.name === 'single');
      
      expect(xjfn.xnode!.name).toBe('single');
      expect(xjfn.xnode!.value).toBe('value');
    });
  });

  describe('error handling', () => {
    it('should throw if no source is set', () => {
      expect(() => {
        xjfn.filter(node => true);
      }).toThrow('No source set');
    });

    it('should propagate predicate errors (fail fast)', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        xjfn.filter(node => {
          throw new Error('Predicate error');
        });
      }).toThrow('Predicate error');
    });

    it('should validate predicate is a function', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      expect(() => {
        (xjfn as any).filter('not a function');
      }).toThrow();
    });
  });

  describe('chaining', () => {
    it('should return XJFN instance for chaining', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn.filter(node => true);
      
      expect(result).toBe(xjfn);
      expect(result).toBeInstanceOf(XJFN);
    });

    it('should chain with other operations', () => {
      const tree = createTestTree();
      xjfn.xnode = tree;
      
      const result = xjfn
        .filter(node => node.type === XNodeType.FIELD)
        .filter(node => node.name !== 'bio');
      
      expect(result).toBe(xjfn);
      
      // Should have filtered out bio field
      const allNodes: XNode[] = [];
      function collectNodes(node: XNode) {
        allNodes.push(node);
        if (node.children) {
          node.children.forEach(collectNodes);
        }
      }
      collectNodes(xjfn.xnode!);
      
      expect(allNodes.find(node => node.name === 'bio')).toBeUndefined();
    });
  });
});