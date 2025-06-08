/**
 * Pipeline-based Functional Operations for XJFN
 * 
 * Integrated with existing ExtensionContext for compatibility
 */

import { ExtensionContext, BranchContext } from '../core/extension';
import { XNode, XNodeType, createCollection, addChild } from '../core/xnode';
import { Transform } from '../transforms';
import { ValidationError } from '../core/error';
import { XJFN } from '../XJFN';

// --- Simple Pipeline Stage Interface ---

interface PipelineStage<TInput, TOutput> {
  name: string;
  execute(input: TInput, context: any): TOutput;
}

// --- Utility Functions ---

function cloneNodeSimple(node: XNode, deep: boolean = false): XNode {
  const cloned = { ...node };
  delete cloned.parent; // Remove parent to avoid circular references
  
  if (deep && node.children) {
    cloned.children = node.children.map(child => {
      const childClone = cloneNodeSimple(child, true);
      childClone.parent = cloned; // Set parent reference
      return childClone;
    });
  }
  
  return cloned;
}

function setNodeAtPath(root: XNode, replacement: XNode, path: number[]): void {
  if (path.length === 0) return; // Can't replace root this way
  
  let current = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current.children || path[i] >= current.children.length) return;
    current = current.children[path[i]];
  }
  
  const finalIndex = path[path.length - 1];
  if (current.children && finalIndex < current.children.length) {
    replacement.parent = current;
    current.children[finalIndex] = replacement;
  }
}

function removeNodeAtPath(root: XNode, path: number[]): void {
  if (path.length === 0) return; // Can't remove root this way
  
  let current = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current.children || path[i] >= current.children.length) return;
    current = current.children[path[i]];
  }
  
  const finalIndex = path[path.length - 1];
  if (current.children && finalIndex < current.children.length) {
    current.children.splice(finalIndex, 1);
  }
}

// --- Pipeline Stages ---

const filterStage: PipelineStage<{tree: XNode, predicate: (node: XNode) => boolean}, XNode> = {
  name: 'filter',
  execute: ({ tree, predicate }, context) => {
    const filterNode = (node: XNode): XNode | null => {
      const nodeMatches = predicate(node);
      
      const filteredChildren: XNode[] = [];
      if (node.children) {
        for (const child of node.children) {
          const filteredChild = filterNode(child);
          if (filteredChild) {
            filteredChildren.push(filteredChild);
          }
        }
      }
      
      if (nodeMatches || filteredChildren.length > 0) {
        const result = cloneNodeSimple(node, false);
        result.children = filteredChildren;
        
        filteredChildren.forEach(child => {
          child.parent = result;
        });
        
        return result;
      }
      
      return null;
    };
    
    const result = filterNode(tree);
    
    // If root was filtered out but we have children, create results container
    if (!result) {
      return createCollection(context.config.fragmentRoot || 'results');
    }
    
    // If root didn't match but has filtered children, create results container with those children
    if (!predicate(tree) && result.children && result.children.length > 0) {
      const resultsContainer = createCollection(context.config.fragmentRoot || 'results');
      result.children.forEach(child => {
        child.parent = resultsContainer;
        if (!resultsContainer.children) resultsContainer.children = [];
        resultsContainer.children.push(child);
      });
      return resultsContainer;
    }
    
    return result;
  }
};

const mapStage: PipelineStage<{tree: XNode, transform: Transform}, XNode> = {
  name: 'map',
  execute: ({ tree, transform }, context) => {
    const mapNode = (node: XNode): XNode => {
      const transformed = transform(node);
      
      let children: XNode[] = [];
      
      // If transform explicitly provided children different from original, use them
      if (transformed.children && transformed.children !== node.children) {
        children = transformed.children;
      } else if (node.children && node.children.length > 0) {
        // Recursively map original children (ignore any inherited children from spread)
        children = node.children.map(mapNode);
      }
      
      // Only set children if we actually have children or the original node had children
      if (children.length > 0 || (node.children && node.children.length > 0)) {
        transformed.children = children;
        children.forEach(child => {
          child.parent = transformed;
        });
      } else {
        // Remove children property if original didn't have it and transform didn't add any
        delete transformed.children;
      }
      
      return transformed;
    };
    
    return mapNode(tree);
  }
};

const selectStage: PipelineStage<{tree: XNode, predicate: (node: XNode) => boolean}, XNode> = {
  name: 'select',
  execute: ({ tree, predicate }, context) => {
    const collection = createCollection(context.config.fragmentRoot || 'results');
    
    const collectMatching = (node: XNode) => {
      if (predicate(node)) {
        const cloned = cloneNodeSimple(node, true);
        addChild(collection, cloned);
      }
      
      if (node.children) {
        node.children.forEach(collectMatching);
      }
    };
    
    collectMatching(tree);
    return collection;
  }
};

const branchStage: PipelineStage<{tree: XNode, predicate: (node: XNode) => boolean}, {collection: XNode, paths: number[][]}> = {
  name: 'branch',
  execute: ({ tree, predicate }, context) => {
    const collection = createCollection(context.config.fragmentRoot || 'results');
    const paths: number[][] = [];
    
    const collectWithPaths = (node: XNode, path: number[]) => {
      if (predicate(node)) {
        const cloned = cloneNodeSimple(node, true);
        addChild(collection, cloned);
        paths.push([...path]);
      }
      
      if (node.children) {
        node.children.forEach((child, index) => {
          collectWithPaths(child, [...path, index]);
        });
      }
    };
    
    collectWithPaths(tree, []);
    return { collection, paths };
  }
};

const mergeStage: PipelineStage<{original: XNode, modified: XNode[], paths: number[][]}, XNode> = {
  name: 'merge',
  execute: ({ original, modified, paths }, context) => {
    if (paths.length === 0) return original;
    
    const result = cloneNodeSimple(original, true);
    
    // Sort paths by depth (deepest first) to avoid index shifting issues
    const pathNodePairs = paths
      .map((path, index) => ({ path, node: modified[index] || null }))
      .sort((a, b) => 
        b.path.length - a.path.length || 
        (b.path[b.path.length - 1] || 0) - (a.path[a.path.length - 1] || 0)
      );
    
    for (const { path, node } of pathNodePairs) {
      if (node && path.length === 0) {
        // Special case: replacing entire root node
        return node;
      } else if (node && path.length > 0) {
        // Replace node at path
        setNodeAtPath(result, node, path);
      } else if (!node && path.length > 0) {
        // Node was removed (filtered out) - remove from original
        removeNodeAtPath(result, path);
      }
    }
    
    return result;
  }
};

const reduceStage: PipelineStage<{tree: XNode, reducer: (acc: any, node: XNode) => any, initial: any}, any> = {
  name: 'reduce',
  execute: ({ tree, reducer, initial }, context) => {
    let accumulator = initial;
    
    const visitNode = (node: XNode) => {
      accumulator = reducer(accumulator, node);
      
      if (node.children) {
        node.children.forEach(visitNode);
      }
    };
    
    visitNode(tree);
    return accumulator;
  }
};

// --- Pipeline Execution Helper ---

function executeStage<TInput, TOutput>(
  stage: PipelineStage<TInput, TOutput>,
  input: TInput,
  context: any
): TOutput {
  try {
    context.logger?.debug(`Executing pipeline stage: ${stage.name}`);
    const result = stage.execute(input, context);
    context.logger?.debug(`Completed pipeline stage: ${stage.name}`);
    return result;
  } catch (error) {
    context.logger?.error(`Error in pipeline stage ${stage.name}:`, error);
    throw error;
  }
}

// --- Extension Methods ---

export function filter(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  if (typeof predicate !== 'function') {
    throw new ValidationError('Filter predicate must be a function');
  }
  
  this.validateSource();
  
  this.xnode = executeStage(filterStage, {
    tree: this.xnode!,
    predicate
  }, this.context);
}

export function map(this: ExtensionContext, transform: Transform): void {
  if (typeof transform !== 'function') {
    throw new ValidationError('Map transform must be a function');
  }
  
  this.validateSource();
  
  this.xnode = executeStage(mapStage, {
    tree: this.xnode!,
    transform
  }, this.context);
}

export function select(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  if (typeof predicate !== 'function') {
    throw new ValidationError('Select predicate must be a function');
  }
  
  this.validateSource();
  
  this.xnode = executeStage(selectStage, {
    tree: this.xnode!,
    predicate
  }, this.context);
}

export function branch(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  if (typeof predicate !== 'function') {
    throw new ValidationError('Branch predicate must be a function');
  }
  
  this.validateSource();
  
  if (this.branchContext) {
    throw new Error('Cannot create nested branches. Call merge() first to close the current branch.');
  }
  
  const result = executeStage(branchStage, {
    tree: this.xnode!,
    predicate
  }, this.context);
  
  // Convert to existing BranchContext format
  this.branchContext = {
    parentNode: this.xnode!,
    selectedNodes: result.collection.children || [],
    originalPaths: result.paths
  };
  
  this.xnode = result.collection;
}

export function merge(this: ExtensionContext): void {
  if (!this.branchContext) {
    return; // No-op if no active branch
  }
  
  const currentBranchNodes = this.xnode?.children || [];
  
  this.xnode = executeStage(mergeStage, {
    original: this.branchContext.parentNode,
    modified: currentBranchNodes,
    paths: this.branchContext.originalPaths
  }, this.context);
  
  this.branchContext = null;
}

export function reduce<T>(
  this: ExtensionContext,
  reducer: (accumulator: T, node: XNode) => T,
  initialValue: T
): T {
  if (typeof reducer !== 'function') {
    throw new ValidationError('Reduce reducer must be a function');
  }
  
  this.validateSource();
  
  return executeStage(reduceStage, {
    tree: this.xnode!,
    reducer,
    initial: initialValue
  }, this.context);
}

// --- Extension Registration ---

XJFN.registerExtension('filter', { method: filter, isTerminal: false });
XJFN.registerExtension('map', { method: map, isTerminal: false });
XJFN.registerExtension('select', { method: select, isTerminal: false });
XJFN.registerExtension('branch', { method: branch, isTerminal: false });
XJFN.registerExtension('merge', { method: merge, isTerminal: false });
XJFN.registerExtension('reduce', { method: reduce, isTerminal: true });