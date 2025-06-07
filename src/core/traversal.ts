/**
 * Tree traversal utilities for XJFN - Unified traversal algorithm and path operations
 * 
 * Design Intent:
 * - Single traversal algorithm for all tree walking needs
 * - Pre-order, post-order, or both traversal modes
 * - Path-based node manipulation for branch/merge operations
 * - Visitor pattern for flexible tree processing
 * - Consistent error handling and logging
 */

import { XNode } from './xnode';
import { PipelineContext } from './context';

/**
 * Context information available during tree traversal
 */
export interface TraversalContext {
  /**
   * Path from root to current node (array of child indices)
   */
  path: number[];
  
  /**
   * Depth in the tree (0 = root)
   */
  depth: number;
  
  /**
   * Parent node (undefined for root)
   */
  parent?: XNode;
  
  /**
   * Index in parent's children array (undefined for root)
   */
  index?: number;
  
  /**
   * Pipeline context for configuration and logging
   */
  pipelineContext: PipelineContext;
}

/**
 * Visitor interface for tree traversal operations
 * 
 * @template T Return type for visit operations
 */
export interface TreeVisitor<T> {
  /**
   * Visit a single node and return a result
   * 
   * @param node Node being visited
   * @param context Traversal context with path, depth, etc.
   * @returns Result value for this node
   */
  visit(node: XNode, context: TraversalContext): T;
  
  /**
   * Combine results from parent and children (optional)
   * 
   * If not provided, only the visit result is used.
   * If provided, allows aggregating results from child visits.
   * 
   * @param parent Result from visiting the parent node
   * @param children Results from visiting child nodes
   * @returns Combined result
   */
  combineResults?(parent: T, children: T[]): T;
}

/**
 * Traversal order options
 */
export type TraversalOrder = 'pre' | 'post' | 'both';

/**
 * Options for tree traversal
 */
export interface TraversalOptions {
  /**
   * Traversal order
   * - 'pre': Visit parent before children
   * - 'post': Visit children before parent
   * - 'both': Visit parent before AND after children
   */
  order: TraversalOrder;
  
  /**
   * Pipeline context for configuration and logging
   */
  context: PipelineContext;
}

/**
 * Unified tree traversal function - THE ONLY tree walking algorithm
 * 
 * This single function handles all tree walking needs:
 * - Pre-order, post-order, or both
 * - Automatic error handling and logging
 * - Path tracking for branch operations
 * - Visitor pattern for flexible processing
 * 
 * @param node Root node to start traversal from
 * @param visitor Visitor to process each node
 * @param options Traversal configuration
 * @returns Result from visiting the root node
 * 
 * @example
 * ```typescript
 * // Count all nodes in tree
 * const count = traverseTree(root, {
 *   visit: () => 1,
 *   combineResults: (parent, children) => parent + children.reduce((sum, c) => sum + c, 0)
 * }, { order: 'post', context });
 * 
 * // Collect all field nodes
 * const fields: XNode[] = [];
 * traverseTree(root, {
 *   visit: (node) => {
 *     if (node.type === XNodeType.FIELD) fields.push(node);
 *   }
 * }, { order: 'pre', context });
 * ```
 */
export function traverseTree<T>(
  node: XNode,
  visitor: TreeVisitor<T>,
  options: TraversalOptions
): T {
  const { order, context } = options;
  
  try {
    context.logger.debug('Starting tree traversal', {
      rootNode: node.name,
      rootType: node.type,
      order
    });
    
    const result = traverseNodeRecursive(node, visitor, options, {
      path: [],
      depth: 0,
      pipelineContext: context
    });
    
    context.logger.debug('Tree traversal completed successfully');
    return result;
    
  } catch (err) {
    context.logError('tree-traversal', err as Error);
    throw err;
  }
}

/**
 * Recursive traversal implementation
 * 
 * @param node Current node
 * @param visitor Visitor to process nodes
 * @param options Traversal options
 * @param traversalContext Current traversal context
 * @returns Result from visiting this node
 */
function traverseNodeRecursive<T>(
  node: XNode,
  visitor: TreeVisitor<T>,
  options: TraversalOptions,
  traversalContext: TraversalContext
): T {
  const { order } = options;
  
  let preResult: T | undefined;
  let postResult: T | undefined;
  
  try {
    // Pre-order visit
    if (order === 'pre' || order === 'both') {
      preResult = visitor.visit(node, traversalContext);
    }
    
    // Traverse children
    const childResults: T[] = [];
    if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        const childContext: TraversalContext = {
          path: [...traversalContext.path, i],
          depth: traversalContext.depth + 1,
          parent: node,
          index: i,
          pipelineContext: traversalContext.pipelineContext
        };
        
        const childResult = traverseNodeRecursive(child, visitor, options, childContext);
        childResults.push(childResult);
      }
    }
    
    // Post-order visit
    if (order === 'post' || order === 'both') {
      postResult = visitor.visit(node, traversalContext);
    }
    
    // Combine results if visitor provides combineResults
    let finalResult: T;
    if (visitor.combineResults) {
      const mainResult = postResult !== undefined ? postResult : preResult!;
      finalResult = visitor.combineResults(mainResult, childResults);
    } else {
      finalResult = postResult !== undefined ? postResult : preResult!;
    }
    
    return finalResult;
    
  } catch (err) {
    traversalContext.pipelineContext.logger.warn(
      `Error processing node '${node.name}' at path [${traversalContext.path.join(',')}]:`, 
      err
    );
    // Return result from successful visit or re-throw
    if (preResult !== undefined) return preResult;
    if (postResult !== undefined) return postResult;
    throw err;
  }
}

// --- Path Manipulation Utilities ---

/**
 * Replace a node at a specific path in the tree
 * 
 * @param root Root node of the tree
 * @param replacement Node to replace with
 * @param path Path to the node to replace (array of child indices)
 * 
 * @example
 * ```typescript
 * // Replace node at path [0, 2, 1]
 * replaceNodeAtPath(root, newNode, [0, 2, 1]);
 * ```
 */
export function replaceNodeAtPath(root: XNode, replacement: XNode, path: number[]): void {
  if (path.length === 0) return; // Can't replace root
  
  const parentPath = path.slice(0, -1);
  const nodeIndex = path[path.length - 1];
  
  const parent = getNodeAtPath(root, parentPath);
  if (parent?.children && nodeIndex < parent.children.length) {
    // Set correct parent reference
    replacement.parent = parent;
    // Replace the node at this position
    parent.children[nodeIndex] = replacement;
  }
}

/**
 * Remove a node at a specific path in the tree
 * 
 * @param root Root node of the tree
 * @param path Path to the node to remove (array of child indices)
 * 
 * @example
 * ```typescript
 * // Remove node at path [0, 2, 1]
 * removeNodeAtPath(root, [0, 2, 1]);
 * ```
 */
export function removeNodeAtPath(root: XNode, path: number[]): void {
  if (path.length === 0) return; // Can't remove root
  
  const parentPath = path.slice(0, -1);
  const nodeIndex = path[path.length - 1];
  
  const parent = getNodeAtPath(root, parentPath);
  if (parent?.children && nodeIndex < parent.children.length) {
    parent.children.splice(nodeIndex, 1);
  }
}

/**
 * Get a node at a specific path in the tree
 * 
 * @param root Root node of the tree
 * @param path Path to the node (array of child indices)
 * @returns Node at the path, or null if path is invalid
 * 
 * @example
 * ```typescript
 * // Get node at path [0, 2, 1]
 * const node = getNodeAtPath(root, [0, 2, 1]);
 * ```
 */
export function getNodeAtPath(root: XNode, path: number[]): XNode | null {
  let current = root;
  
  for (const index of path) {
    if (!current.children || index >= current.children.length) {
      return null;
    }
    current = current.children[index];
  }
  
  return current;
}

/**
 * Collect nodes matching predicate along with their paths in the tree
 * 
 * @param root Root node to search from
 * @param predicate Function to test each node
 * @param context Pipeline context for logging
 * @returns Object containing matching nodes, their indices, and paths
 * 
 * @example
 * ```typescript
 * // Find all field nodes with their paths
 * const result = collectNodesWithPaths(
 *   root, 
 *   node => node.type === XNodeType.FIELD,
 *   context
 * );
 * console.log(result.nodes.length, 'field nodes found');
 * ```
 */
export function collectNodesWithPaths(
  root: XNode,
  predicate: (node: XNode) => boolean,
  context: PipelineContext
): { nodes: XNode[], indices: number[], paths: number[][] } {
  const results: XNode[] = [];
  const indices: number[] = [];
  const paths: number[][] = [];
  
  const visitor: TreeVisitor<void> = {
    visit: (node, traversalContext) => {
      try {
        if (predicate(node)) {
          results.push(node);
          indices.push(results.length - 1);
          paths.push([...traversalContext.path]);
        }
      } catch (err) {
        context.logger.warn(`Error evaluating predicate on node: ${node.name}`, err);
      }
    }
  };
  
  traverseTree(root, visitor, {
    order: 'pre',
    context
  });
  
  return { nodes: results, indices, paths };
}

/**
 * Create a result container node for filtered/selected results
 * 
 * @param rootName Name for the result container
 * @returns New collection node
 */
export function createResultsContainer(rootName: string): XNode {
  return {
    type: 'collection' as any, // Importing from xnode would create circular dependency
    name: rootName,
    children: []
  };
}