/**
 * Unit tests for core/traversal.ts - Tree traversal utilities
 */

import {
  traverseTree,
  replaceNodeAtPath,
  removeNodeAtPath,
  getNodeAtPath,
  collectNodesWithPaths,
  createResultsContainer,
  TreeVisitor,
  TraversalOptions,
  TraversalContext
} from '../../src/core/traversal';
import {
  XNode,
  XNodeType,
  createCollection,
  createRecord,
  createField,
  createValue,
  addChild
} from '../../src/core/xnode';
import { PipelineContext } from '../../src/core/context';
import { createConfig } from '../../src/core/config';

describe('Core Traversal', () => {
  let mockContext: PipelineContext;
  let sampleTree: XNode;

  beforeEach(() => {
    mockContext = new PipelineContext(createConfig());
    
    // Create sample tree structure:
    // root (collection)
    //   ├── item1 (record)
    //   │   ├── name (field): "first"
    //   │   └── value (field): 10
    //   ├── item2 (record)
    //   │   ├── name (field): "second"
    //   │   └── value (field): 20
    //   └── summary (field): "total"
    sampleTree = createCollection('root');
    
    const item1 = createRecord('item1');
    addChild(item1, createField('name', 'first'));
    addChild(item1, createField('value', 10));
    addChild(sampleTree, item1);
    
    const item2 = createRecord('item2');
    addChild(item2, createField('name', 'second'));
    addChild(item2, createField('value', 20));
    addChild(sampleTree, item2);
    
    addChild(sampleTree, createField('summary', 'total'));
  });

  describe('traverseTree', () => {
    it('should traverse tree in pre-order', () => {
      const visitOrder: string[] = [];
      
      const visitor: TreeVisitor<void> = {
        visit: (node: XNode) => {
          visitOrder.push(node.name);
        }
      };
      
      const options: TraversalOptions = {
        order: 'pre',
        context: mockContext
      };
      
      traverseTree(sampleTree, visitor, options);
      
      expect(visitOrder).toEqual([
        'root', 'item1', 'name', 'value', 'item2', 'name', 'value', 'summary'
      ]);
    });

    it('should traverse tree in post-order', () => {
      const visitOrder: string[] = [];
      
      const visitor: TreeVisitor<void> = {
        visit: (node: XNode) => {
          visitOrder.push(node.name);
        }
      };
      
      const options: TraversalOptions = {
        order: 'post',
        context: mockContext
      };
      
      traverseTree(sampleTree, visitor, options);
      
      expect(visitOrder).toEqual([
        'name', 'value', 'item1', 'name', 'value', 'item2', 'summary', 'root'
      ]);
    });

    it('should traverse tree in both orders', () => {
      const visitOrder: string[] = [];
      
      const visitor: TreeVisitor<void> = {
        visit: (node: XNode) => {
          visitOrder.push(node.name);
        }
      };
      
      const options: TraversalOptions = {
        order: 'both',
        context: mockContext
      };
      
      traverseTree(sampleTree, visitor, options);
      
      // Each node should be visited twice (pre and post)
      expect(visitOrder.length).toBe(16); // 8 nodes × 2 visits each
      expect(visitOrder[0]).toBe('root'); // First visit
      expect(visitOrder[visitOrder.length - 1]).toBe('root'); // Last visit
    });

    it('should provide correct traversal context', () => {
      const contexts: TraversalContext[] = [];
      
      const visitor: TreeVisitor<void> = {
        visit: (node: XNode, context: TraversalContext) => {
          contexts.push({ ...context });
        }
      };
      
      const options: TraversalOptions = {
        order: 'pre',
        context: mockContext
      };
      
      traverseTree(sampleTree, visitor, options);
      
      // Check root context
      expect(contexts[0]).toMatchObject({
        path: [],
        depth: 0,
        parent: undefined,
        index: undefined
      });
      
      // Check first child context (item1)
      expect(contexts[1]).toMatchObject({
        path: [0],
        depth: 1,
        parent: sampleTree,
        index: 0
      });
      
      // Check nested child context (item1 -> name)
      expect(contexts[2]).toMatchObject({
        path: [0, 0],
        depth: 2,
        index: 0
      });
    });

    it('should use combineResults when provided', () => {
      const visitor: TreeVisitor<number> = {
        visit: (node: XNode) => {
          return 1; // Each node counts as 1
        },
        combineResults: (parent: number, children: number[]) => {
          return parent + children.reduce((sum, child) => sum + child, 0);
        }
      };
      
      const options: TraversalOptions = {
        order: 'post',
        context: mockContext
      };
      
      const result = traverseTree(sampleTree, visitor, options);
      
      // Should count all nodes in the tree
      expect(result).toBe(8); // root + 2 items + 4 fields + 1 summary
    });

    it('should handle empty tree', () => {
      const emptyNode = createValue('empty', null);
      const visitOrder: string[] = [];
      
      const visitor: TreeVisitor<void> = {
        visit: (node: XNode) => {
          visitOrder.push(node.name);
        }
      };
      
      const options: TraversalOptions = {
        order: 'pre',
        context: mockContext
      };
      
      traverseTree(emptyNode, visitor, options);
      
      expect(visitOrder).toEqual(['empty']);
    });

    it('should handle visitor errors gracefully', () => {
      const visitor: TreeVisitor<void> = {
        visit: (node: XNode) => {
          if (node.name === 'item2') {
            throw new Error('Test error');
          }
        }
      };
      
      const options: TraversalOptions = {
        order: 'pre',
        context: mockContext
      };
      
      // Should not throw - errors are logged and traversal continues
      expect(() => {
        traverseTree(sampleTree, visitor, options);
      }).not.toThrow();
    });
  });

  describe('Path manipulation utilities', () => {
    describe('getNodeAtPath', () => {
      it('should return root for empty path', () => {
        const result = getNodeAtPath(sampleTree, []);
        expect(result).toBe(sampleTree);
      });

      it('should return correct node for valid path', () => {
        const result = getNodeAtPath(sampleTree, [0, 0]); // item1 -> name
        expect(result?.name).toBe('name');
        expect(result?.value).toBe('first');
      });

      it('should return null for invalid path', () => {
        const result = getNodeAtPath(sampleTree, [5, 0]); // Non-existent index
        expect(result).toBeNull();
      });

      it('should return null for path beyond tree depth', () => {
        const result = getNodeAtPath(sampleTree, [0, 0, 0]); // Too deep
        expect(result).toBeNull();
      });
    });

    describe('replaceNodeAtPath', () => {
      it('should replace node at valid path', () => {
        const newNode = createField('newName', 'replaced');
        replaceNodeAtPath(sampleTree, newNode, [0, 0]); // Replace item1 -> name
        
        const result = getNodeAtPath(sampleTree, [0, 0]);
        expect(result?.name).toBe('newName');
        expect(result?.value).toBe('replaced');
        expect(result?.parent?.name).toBe('item1');
      });

      it('should do nothing for empty path', () => {
        const originalName = sampleTree.name;
        const newNode = createField('newRoot', 'test');
        
        replaceNodeAtPath(sampleTree, newNode, []);
        
        expect(sampleTree.name).toBe(originalName);
      });

      it('should do nothing for invalid path', () => {
        const newNode = createField('newNode', 'test');
        const originalNode = getNodeAtPath(sampleTree, [0, 0]);
        
        replaceNodeAtPath(sampleTree, newNode, [5, 0]); // Invalid path
        
        const stillThere = getNodeAtPath(sampleTree, [0, 0]);
        expect(stillThere).toBe(originalNode);
      });
    });

    describe('removeNodeAtPath', () => {
      it('should remove node at valid path', () => {
        const originalLength = sampleTree.children?.length || 0;
        
        removeNodeAtPath(sampleTree, [0]); // Remove item1
        
        expect(sampleTree.children?.length).toBe(originalLength - 1);
        expect(getNodeAtPath(sampleTree, [0])?.name).toBe('item2'); // item2 moved to index 0
      });

      it('should do nothing for empty path', () => {
        const originalName = sampleTree.name;
        
        removeNodeAtPath(sampleTree, []);
        
        expect(sampleTree.name).toBe(originalName);
      });

      it('should do nothing for invalid path', () => {
        const originalLength = sampleTree.children?.length || 0;
        
        removeNodeAtPath(sampleTree, [5]); // Invalid index
        
        expect(sampleTree.children?.length).toBe(originalLength);
      });
    });
  });

  describe('collectNodesWithPaths', () => {
    it('should collect matching nodes with their paths', () => {
      const predicate = (node: XNode) => node.type === XNodeType.FIELD;
      
      const result = collectNodesWithPaths(sampleTree, predicate, mockContext);
      
      expect(result.nodes.length).toBe(5); // 4 fields in items + 1 summary
      expect(result.paths.length).toBe(5);
      expect(result.indices.length).toBe(5);
      
      // Check that paths are correct
      expect(result.paths[0]).toEqual([0, 0]); // item1 -> name
      expect(result.paths[1]).toEqual([0, 1]); // item1 -> value
      expect(result.paths[2]).toEqual([1, 0]); // item2 -> name
      expect(result.paths[3]).toEqual([1, 1]); // item2 -> value
      expect(result.paths[4]).toEqual([2]);    // summary
    });

    it('should return empty arrays when no nodes match', () => {
      const predicate = (node: XNode) => node.name === 'nonexistent';
      
      const result = collectNodesWithPaths(sampleTree, predicate, mockContext);
      
      expect(result.nodes).toEqual([]);
      expect(result.paths).toEqual([]);
      expect(result.indices).toEqual([]);
    });

    it('should handle predicate errors gracefully', () => {
      const predicate = (node: XNode) => {
        if (node.name === 'item2') {
          throw new Error('Predicate error');
        }
        return node.type === XNodeType.FIELD;
      };
      
      const result = collectNodesWithPaths(sampleTree, predicate, mockContext);
      
      // Should still collect other matching nodes despite error
      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('createResultsContainer', () => {
    it('should create collection node with given name', () => {
      const container = createResultsContainer('testResults');
      
      expect(container.type).toBe('collection');
      expect(container.name).toBe('testResults');
      expect(container.children).toEqual([]);
    });
  });
});