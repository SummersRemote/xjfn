/**
 * Core Functional Operations - Tree manipulation with unified traversal system
 * 
 * Design Intent:
 * - All operations use single traverseTree algorithm for consistency
 * - API boundary parameter validation with clear error messages
 * - Fail-fast error handling - let predicate/transform errors propagate
 * - Simple branch/merge without nesting support
 * - Pure functional approach with immutable operations
 * - Clear separation between selection and transformation
 */

import { ExtensionContext, BranchContext } from '../core/extension';
import { XNode, createCollection, addChild, cloneNode } from '../core/xnode';
import { Transform } from '../transforms';
import { 
  traverseTree, 
  TreeVisitor, 
  TraversalContext,
  collectNodesWithPaths,
  replaceNodeAtPath,
  removeNodeAtPath 
} from '../core/traversal';
import { ValidationError } from '../core/error';
import { XJFN } from '../XJFN';

// --- Filter Operation ---

/**
 * Filter nodes by predicate while maintaining hierarchy
 * 
 * Removes nodes that don't match the predicate but preserves the tree structure.
 * Parent nodes are kept if they have matching children, even if the parent itself doesn't match.
 * 
 * @param this Extension context
 * @param predicate Function to test each node - return true to keep, false to remove
 * @throws ValidationError if predicate is not a function
 * @throws Error if predicate fails (fail fast)
 * 
 * @example
 * ```typescript
 * // Keep only field nodes
 * xjfn.fromXml(xml)
 *   .filter(node => node.type === XNodeType.FIELD)
 *   .toJson();
 * 
 * // Remove deprecated elements
 * xjfn.fromXml(xml)
 *   .filter(node => !node.name.includes('deprecated'))
 *   .toXml();
 * 
 * // Filter by attribute value
 * xjfn.fromXml(xml)
 *   .filter(node => {
 *     const active = getAttribute(node, 'active');
 *     return !active || active.value !== 'false';
 *   })
 *   .toJson();
 * ```
 */
export function filter(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  // API boundary validation
  if (typeof predicate !== 'function') {
    throw new ValidationError('Filter predicate must be a function');
  }
  
  this.validateSource();
  this.context.logOperation('filter');
  
  // Recursive filter implementation for clarity
  const filterNode = (node: XNode): XNode | null => {
    // Let predicate errors propagate (fail fast)
    const nodeMatches = predicate(node);
    
    // Process children first
    const filteredChildren: XNode[] = [];
    if (node.children) {
      for (const child of node.children) {
        const filteredChild = filterNode(child);
        if (filteredChild) {
          filteredChildren.push(filteredChild);
        }
      }
    }
    
    // Keep node if it matches OR has matching children
    if (nodeMatches || filteredChildren.length > 0) {
      const result = this.context.cloneNode(node, false);
      
      if (filteredChildren.length > 0) {
        result.children = filteredChildren;
        filteredChildren.forEach(child => {
          child.parent = result;
        });
      } else {
        result.children = [];
      }
      
      return result;
    }
    
    return null;
  };
  
  const result = filterNode(this.xnode!);
  
  // If nothing matches, create empty results container
  this.xnode = result || createCollection(this.context.config.fragmentRoot);
}

// --- Map Operation ---

/**
 * Transform every node in the tree using a transform function
 * 
 * Applies the transform function to each node in the tree, maintaining the tree structure.
 * Transform functions are pure and return new XNode instances.
 * 
 * @param this Extension context
 * @param transform Pure function that transforms XNode to XNode
 * @throws ValidationError if transform is not a function
 * @throws Error if transform fails (fail fast)
 * 
 * @example
 * ```typescript
 * // Apply number transformation to all nodes
 * xjfn.fromXml(xml)
 *   .map(toNumber({ precision: 2 }))
 *   .toJson();
 * 
 * // Compose multiple transforms
 * xjfn.fromXml(xml)
 *   .map(compose(
 *     regex(/[^\d.]/g, ''),    // Clean non-numeric
 *     toNumber({ precision: 2 }) // Convert to number
 *   ))
 *   .toJson();
 * 
 * // Custom inline transform
 * xjfn.fromXml(xml)
 *   .map(node => ({ ...node, processed: true }))
 *   .toJson();
 * ```
 */
export function map(this: ExtensionContext, transform: Transform): void {
  // API boundary validation
  if (typeof transform !== 'function') {
    throw new ValidationError('Map transform must be a function');
  }
  
  this.validateSource();
  this.context.logOperation('map');
  
  const visitor: TreeVisitor<XNode> = {
    visit: (node: XNode, ctx: TraversalContext): XNode => {
      // Let transform errors propagate (fail fast)
      return transform(node);
    },
    
    combineResults: (parent: XNode, children: XNode[]): XNode => {
      const result = { ...parent };
      
      if (children.length > 0) {
        result.children = children;
        children.forEach(child => child.parent = result);
      }
      
      return result;
    }
  };
  
  this.xnode = traverseTree(this.xnode!, visitor, { 
    order: 'both', 
    context: this.context 
  });
}

// --- Select Operation ---

/**
 * Collect nodes matching predicate into flat collection (no hierarchy)
 * 
 * Unlike filter(), select() creates a flat collection of matching nodes,
 * losing the original tree hierarchy. Useful for extracting specific nodes.
 * 
 * @param this Extension context
 * @param predicate Function to test each node - return true to select
 * @throws ValidationError if predicate is not a function
 * @throws Error if predicate fails (fail fast)
 * 
 * @example
 * ```typescript
 * // Select all price fields
 * xjfn.fromXml(xml)
 *   .select(node => node.name === 'price')
 *   .toJson();
 * 
 * // Select nodes with specific attributes
 * xjfn.fromXml(xml)
 *   .select(node => hasAttributes(node) && getAttribute(node, 'id'))
 *   .toJson();
 * 
 * // Select by type and value
 * xjfn.fromXml(xml)
 *   .select(node => node.type === XNodeType.FIELD && node.value !== null)
 *   .toJson();
 * ```
 */
export function select(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  // API boundary validation
  if (typeof predicate !== 'function') {
    throw new ValidationError('Select predicate must be a function');
  }
  
  this.validateSource();
  this.context.logOperation('select');
  
  const selectedNodes: XNode[] = [];
  
  const visitor: TreeVisitor<void> = {
    visit: (node: XNode, ctx: TraversalContext): void => {
      // Let predicate errors propagate (fail fast)
      if (predicate(node)) {
        selectedNodes.push(this.context.cloneNode(node, true));
      }
    }
  };
  
  traverseTree(this.xnode!, visitor, { 
    order: 'pre', 
    context: this.context 
  });
  
  // Create flat collection of selected nodes
  const collection = createCollection(this.context.config.fragmentRoot);
  selectedNodes.forEach(node => addChild(collection, node));
  
  this.xnode = collection;
}

// --- Branch Operation ---

/**
 * Create isolated scope containing nodes matching predicate
 * 
 * Extracts matching nodes into a separate scope for focused operations.
 * Original document structure is preserved. Use merge() to apply changes back.
 * Nested branching is not supported - call merge() before creating another branch.
 * 
 * @param this Extension context
 * @param predicate Function to test each node - return true to branch
 * @throws ValidationError if predicate is not a function
 * @throws Error if already in a branch or if predicate fails (fail fast)
 * 
 * @example
 * ```typescript
 * // Branch price nodes for transformation
 * xjfn.fromXml(xml)
 *   .branch(node => node.name === 'price')
 *     .map(toNumber({ precision: 2 }))
 *   .merge()
 *   .toJson();
 * 
 * // Branch and filter in isolation
 * xjfn.fromXml(xml)
 *   .branch(node => node.type === XNodeType.FIELD)
 *     .filter(node => node.value !== null)
 *     .map(toBoolean())
 *   .merge()
 *   .toXml();
 * ```
 */
export function branch(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  // API boundary validation
  if (typeof predicate !== 'function') {
    throw new ValidationError('Branch predicate must be a function');
  }
  
  this.validateSource();
  this.context.logOperation('branch');
  
  // Fail fast: No nested branching
  if (this.branchContext) {
    throw new Error('Cannot create nested branches. Call merge() first to close the current branch.');
  }
  
  const rootNode = this.xnode!;
  
  // Collect matching nodes with their paths - let predicate errors propagate
  const { nodes, paths } = collectNodesWithPaths(rootNode, predicate, this.context);
  
  if (nodes.length === 0) {
    // No nodes matched - create empty branch
    this.branchContext = {
      parentNode: rootNode,
      selectedNodes: [],
      originalPaths: []
    };
    
    this.xnode = createCollection(this.context.config.fragmentRoot);
  } else {
    // Store branch context with original information
    this.branchContext = {
      parentNode: rootNode,
      selectedNodes: nodes,
      originalPaths: paths
    };
    
    // Create branch collection with cloned matching nodes
    const branchCollection = createCollection(this.context.config.fragmentRoot);
    
    nodes.forEach(node => {
      const clonedNode = this.context.cloneNode(node, true);
      addChild(branchCollection, clonedNode);
    });
    
    this.xnode = branchCollection;
  }
}

// --- Merge Operation ---

/**
 * Apply branch changes back to parent document
 * 
 * Merges the current branch scope back into the original document tree.
 * Changes made to branched nodes are applied at their original locations.
 * If no active branch exists, this is a no-op.
 * 
 * @param this Extension context
 * 
 * @example
 * ```typescript
 * // Complete branch/merge cycle
 * xjfn.fromXml(xml)
 *   .branch(node => node.name === 'price')
 *     .map(toNumber({ precision: 2 }))
 *     .filter(node => node.value > 0)
 *   .merge()  // Apply changes back to original tree
 *   .toJson();
 * 
 * // Branch can be empty after filtering
 * xjfn.fromXml(xml)
 *   .branch(node => node.name === 'deprecated')
 *     .filter(node => false)  // Remove all
 *   .merge()  // Removes deprecated nodes from original
 *   .toXml();
 * ```
 */
export function merge(this: ExtensionContext): void {
  // No-op if no active branch
  if (!this.branchContext) {
    this.context.logger.debug('No active branch to merge - operation ignored');
    return;
  }
  
  this.context.logOperation('merge');
  
  const { parentNode, originalPaths } = this.branchContext;
  const branchNodes = this.xnode?.children || [];
  
  // Clone parent for modification (deep clone to avoid affecting original)
  const mergedParent = this.context.cloneNode(parentNode, true);
  
  // Replace nodes at original paths
  // Process from deepest paths first to avoid index shifting issues
  const pathNodePairs = originalPaths
    .map((path, index) => ({ path, node: branchNodes[index] || null }))
    .sort((a, b) => 
      b.path.length - a.path.length || 
      b.path[b.path.length - 1] - a.path[a.path.length - 1]
    );
  
  for (const { path, node } of pathNodePairs) {
    if (node && path.length > 0) {
      // Node exists in branch - replace original
      replaceNodeAtPath(mergedParent, node, path);
    } else if (!node && path.length > 0) {
      // Node was removed from branch (filtered out) - remove from original
      removeNodeAtPath(mergedParent, path);
    }
  }
  
  // Clear branch context and restore merged parent
  this.branchContext = null;
  this.xnode = mergedParent;
}

// --- Reduce Operation (Terminal) ---

/**
 * Accumulate tree data into a single value
 * 
 * Processes every node in the tree with a reducer function to produce a single result.
 * This is a terminal operation that returns a value instead of this.
 * 
 * @param this Extension context
 * @param reducer Function that accumulates values (accumulator, node) => newAccumulator
 * @param initialValue Starting value for accumulation
 * @returns Final accumulated value
 * @throws ValidationError if reducer is not a function
 * @throws Error if reducer fails (fail fast)
 * 
 * @example
 * ```typescript
 * // Count all nodes
 * const nodeCount = xjfn.fromXml(xml)
 *   .reduce((count, node) => count + 1, 0);
 * 
 * // Sum all numeric values
 * const total = xjfn.fromXml(xml)
 *   .filter(node => typeof node.value === 'number')
 *   .reduce((sum, node) => sum + (node.value as number), 0);
 * 
 * // Collect all field names
 * const fieldNames = xjfn.fromXml(xml)
 *   .filter(node => node.type === XNodeType.FIELD)
 *   .reduce((names, node) => [...names, node.name], [] as string[]);
 * 
 * // Build summary object
 * const summary = xjfn.fromXml(xml)
 *   .reduce((acc, node) => {
 *     acc.totalNodes++;
 *     if (node.value !== undefined) acc.valuesFound++;
 *     return acc;
 *   }, { totalNodes: 0, valuesFound: 0 });
 * ```
 */
export function reduce<T>(
  this: ExtensionContext,
  reducer: (accumulator: T, node: XNode) => T,
  initialValue: T
): T {
  // API boundary validation
  if (typeof reducer !== 'function') {
    throw new ValidationError('Reduce reducer must be a function');
  }
  
  this.validateSource();
  this.context.logOperation('reduce');
  
  let accumulator = initialValue;
  
  const visitor: TreeVisitor<void> = {
    visit: (node: XNode, ctx: TraversalContext): void => {
      // Let reducer errors propagate (fail fast)
      accumulator = reducer(accumulator, node);
    }
  };
  
  traverseTree(this.xnode!, visitor, { 
    order: 'pre', 
    context: this.context 
  });
  
  return accumulator;
}

// --- Extension Registration ---

/**
 * Register all functional operations with XJFN
 * 
 * Non-terminal operations (return this for chaining):
 * - filter, map, select, branch, merge
 * 
 * Terminal operations (return value):
 * - reduce
 */

// Non-terminal operations (return this for chaining)
XJFN.registerExtension('filter', { 
  method: filter, 
  isTerminal: false 
});

XJFN.registerExtension('map', { 
  method: map, 
  isTerminal: false 
});

XJFN.registerExtension('select', { 
  method: select, 
  isTerminal: false 
});

XJFN.registerExtension('branch', { 
  method: branch, 
  isTerminal: false 
});

XJFN.registerExtension('merge', { 
  method: merge, 
  isTerminal: false 
});

// Terminal operation (returns value)
XJFN.registerExtension('reduce', { 
  method: reduce, 
  isTerminal: true 
});