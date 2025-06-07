/**
 * Unified tree traversal system - Pure semantic XNode implementation
 * All legacy DOM references removed, createElement replaced with semantic equivalents
 */
import { LoggerFactory } from "./logger";
const logger = LoggerFactory.create();

import { XNode, XNodeType, createCollection, cloneNode } from './xnode';
import { PipelineContext } from './context';
import { NodeHooks } from './hooks';

/**
 * Context information available during tree traversal
 */
export interface TraversalContext {
  path: number[];
  depth: number;
  parent?: XNode;
  index?: number;
  pipelineContext: PipelineContext;
}

/**
 * Visitor interface for tree traversal operations
 */
export interface TreeVisitor<T> {
  /**
   * Visit a single node and return a result
   */
  visit(node: XNode, context: TraversalContext): T;
  
  /**
   * Combine results from parent and children (optional)
   * If not provided, only the visit result is used
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
  order: TraversalOrder;
  hooks?: NodeHooks;
  context: PipelineContext;
}

/**
 * Unified tree traversal function - THE ONLY tree walking algorithm
 * 
 * This single function handles all tree walking needs:
 * - Pre-order, post-order, or both
 * - Automatic hook execution
 * - Error handling and logging
 * - Path tracking for branch operations
 * 
 * Pure semantic XNode implementation
 */
export function traverseTree<T>(
  node: XNode,
  visitor: TreeVisitor<T>,
  options: TraversalOptions
): T {
  const { order, hooks, context } = options;
  
  try {
    logger.debug('Starting unified semantic tree traversal', {
      rootNode: node.name,
      rootType: node.type,
      order,
      hasHooks: !!(hooks && (hooks.beforeTransform || hooks.afterTransform))
    });
    
    const result = traverseNodeRecursive(node, visitor, options, {
      path: [],
      depth: 0,
      pipelineContext: context
    });
    
    logger.debug('Unified semantic tree traversal completed successfully');
    return result;
    
  } catch (err) {
    logger.error('Error during unified semantic tree traversal:', err);
    throw err;
  }
}

/**
 * Recursive traversal implementation
 */
function traverseNodeRecursive<T>(
  node: XNode,
  visitor: TreeVisitor<T>,
  options: TraversalOptions,
  traversalContext: TraversalContext
): T {
  const { order, hooks } = options;
  
  let currentNode = node;
  let preResult: T | undefined;
  let postResult: T | undefined;
  
  try {
    // Apply beforeTransform hook if present
    if (hooks?.beforeTransform) {
      try {
        const beforeResult = hooks.beforeTransform(currentNode);
        if (beforeResult && typeof beforeResult === 'object' && typeof beforeResult.name === 'string') {
          currentNode = beforeResult;
        }
      } catch (err) {
        logger.warn(`Error in beforeTransform hook at path [${traversalContext.path.join(',')}]:`, err);
      }
    }
    
    // Pre-order visit
    if (order === 'pre' || order === 'both') {
      preResult = visitor.visit(currentNode, traversalContext);
    }
    
    // Traverse children
    const childResults: T[] = [];
    if (currentNode.children && currentNode.children.length > 0) {
      for (let i = 0; i < currentNode.children.length; i++) {
        const child = currentNode.children[i];
        const childContext: TraversalContext = {
          path: [...traversalContext.path, i],
          depth: traversalContext.depth + 1,
          parent: currentNode,
          index: i,
          pipelineContext: traversalContext.pipelineContext
        };
        
        const childResult = traverseNodeRecursive(child, visitor, options, childContext);
        childResults.push(childResult);
      }
    }
    
    // Post-order visit
    if (order === 'post' || order === 'both') {
      postResult = visitor.visit(currentNode, traversalContext);
    }
    
    // Combine results if visitor provides combineResults
    let finalResult: T;
    if (visitor.combineResults) {
      const mainResult = postResult !== undefined ? postResult : preResult!;
      finalResult = visitor.combineResults(mainResult, childResults);
    } else {
      finalResult = postResult !== undefined ? postResult : preResult!;
    }
    
    // Apply afterTransform hook if present
    if (hooks?.afterTransform) {
      try {
        // Note: hooks work on XNode, but visitor might return different type
        // Only apply if the result is an XNode
        if (finalResult && typeof finalResult === 'object' && typeof (finalResult as any).name === 'string') {
          const afterResult = hooks.afterTransform(finalResult as any);
          if (afterResult && typeof afterResult === 'object' && typeof afterResult.name === 'string') {
            finalResult = afterResult as T;
          }
        }
      } catch (err) {
        logger.warn(`Error in afterTransform hook at path [${traversalContext.path.join(',')}]:`, err);
      }
    }
    
    return finalResult;
    
  } catch (err) {
    logger.warn(`Error processing semantic node '${currentNode.name}' (${currentNode.type}) at path [${traversalContext.path.join(',')}]:`, err);
    // Return the original result as fallback
    return preResult || postResult || visitor.visit(node, traversalContext);
  }
}

/**
 * A transform function that processes an XNode
 */
export type Transform = (node: XNode) => XNode;

/**
 * Compose multiple transforms into a single transform
 * Transforms are applied in order (left to right)
 */
export function compose(...transforms: Transform[]): Transform {
  return (node: XNode): XNode => {
    return transforms.reduce((result, transform) => {
      try {
        return transform(result);
      } catch (err) {
        // If transform fails, return original node
        logger.warn(`Transform error on semantic node '${result.name}' (${result.type}):`, err);
        return result;
      }
    }, node);
  };
}

/**
 * Create a container node for results (semantic collection)
 */
export function createResultsContainer(rootName: string | undefined = 'results'): XNode {
  const finalName = rootName || 'results';
  return createCollection(finalName);
}

/**
 * Collect nodes matching predicate along with their paths in the tree
 * Uses unified traversal system
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
        logger.warn(`Error evaluating predicate on semantic node: ${node.name} (${node.type})`, err);
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
 * Replace a single node at a specific path in the tree
 */
export function replaceNodeAtPath(root: XNode, replacementNode: XNode, path: number[]): void {
  if (path.length === 0) return; // Can't replace root
  
  const parentPath = path.slice(0, -1);
  const nodeIndex = path[path.length - 1];
  
  const parent = getNodeAtPath(root, parentPath);
  if (parent?.children && nodeIndex < parent.children.length) {
    // Set correct parent reference
    replacementNode.parent = parent;
    // Replace the node at this position
    parent.children[nodeIndex] = replacementNode;
  }
}

/**
 * Remove a single node at a specific path in the tree
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