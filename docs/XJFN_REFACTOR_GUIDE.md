## Summary

Perfect! The XJFN architecture now provides three complementary format adapters:

**XML Adapter** - Native XML format with full namespace support
**JSON Adapter** - Compact, human-readable JSON for APIs and web interfaces  
**XNode Adapter** - Lossless semantic tree serialization for perfect round-trips

This eliminates the complexity of high-fidelity JSON while providing clear use cases:
- Use JSON adapter for compact, readable output
- Use XNode adapter for perfect preservation and data archival
- Use XML adapter for native XML workflows

The XNode serialization approach is much cleaner - it's just the semantic tree structure as JSON, containing all the information needed to perfectly reconstruct any source format. This provides the best of both worlds: compact JSON when you want it, and perfect fidelity when you need it.

Your insight to separate these concerns makes the library much more intuitive and maintainable!# XJFN Framework Detailed Refactor Plan

## Project Description

**XJFN** (XML/JSON/Format Neutral) is a data transformation library that provides high-fidelity conversions between XML, JSON, and other data formats through a semantic, format-neutral intermediate representation. The library emphasizes simplicity, consistency, and extensibility while maintaining perfect round-trip conversion capabilities.

### Key Features
- **Semantic XNode System**: Format-neutral tree representation preserving all source format semantics
- **Perfect Round-Trip Conversions**: Lossless format conversion through XNode serialization
- **Pluggable Architecture**: Self-contained format adapters with their own configuration
- **Fluent Functional API**: Intuitive tree manipulation operations (map, filter, select, branch/merge)
- **Pure Transform Functions**: Composable, stateless value transformers
- **Intelligent Processing**: Metadata-driven conversion decisions
- **Browser and Node.js Support**: Universal compatibility with DOM abstraction

### Core Use Cases
1. **API Integration**: Clean JSON for web APIs with optional XML round-trip capability
2. **Data Migration**: High-fidelity format conversions preserving all semantics
3. **Configuration Processing**: Transform and validate structured configuration data
4. **Document Processing**: Extract, transform, and restructure document data
5. **Format Bridging**: Enable applications to work with multiple data formats seamlessly

## Refactor Intent

This is a **greenfield implementation** that creates a clean, extensible framework where complexity lives in adapters, not in the core. The refactor eliminates architectural cruft from multiple previous iterations while building on the excellent semantic XNode foundation.

## Architectural Principles & Intent

### Core Design Philosophy
**Intent**: Create a framework where complexity lives in adapters, not in the core. The core should be format-agnostic and focus purely on semantic tree operations.

**Key Principles**:
1. **Separation of Concerns**: Core handles semantic operations, adapters handle format specifics
2. **Explicit Registration**: Extensions register themselves on import, no magic discovery
3. **Fail Fast**: Invalid input causes immediate errors with clear logging
4. **Pure Functions**: Transforms are stateless functions with no side effects
5. **Single Responsibility**: Each component has one clear purpose

### Architecture Layers
```
┌─────────────────────────────────────┐
│ Extensions (XML, JSON, CSV, etc.)   │ ← Format-specific adapters
├─────────────────────────────────────┤
│ Functional Operations (map, filter) │ ← Tree manipulation
├─────────────────────────────────────┤
│ Transform Functions (toNumber, etc) │ ← Pure value transformers
├─────────────────────────────────────┤
│ Core XNode System & Traversal      │ ← Semantic tree representation
├─────────────────────────────────────┤
│ Pipeline Context & Configuration    │ ← Execution environment
└─────────────────────────────────────┘
```

## Phase 1: Core Infrastructure Refactor

### 1.1 Enhanced XNode System
**File**: `src/core/xnode.ts`
**Intent**: Provide rich semantic representation with structured attributes

```typescript
/**
 * Enhanced XNode with structured attributes for better namespace/metadata support
 * 
 * Design Intent:
 * - Attributes are first-class objects, not flat key-value pairs
 * - Support for namespaces, prefixes, and metadata
 * - Type-safe attribute operations
 * - Consistent with semantic node types
 */

export interface XNode {
  type: XNodeType;
  name: string;
  value?: Primitive;
  children?: XNode[];
  attributes?: XNodeAttribute[];  // CHANGE: Structured attributes
  parent?: XNode;
  
  // Semantic properties for rich data representation
  namespace?: string;  // Full namespace URI (e.g., "http://www.w3.org/XML/1998/namespace")
  label?: string;      // Display label or namespace prefix (e.g., "xml" for xml:lang)
  id?: string;         // Unique identifier for references
}

export interface XNodeAttribute {
  name: string;
  value: Primitive;
  namespace?: string;  // Full namespace URI
  label?: string;      // Display label or namespace prefix
}

export enum XNodeType {
  COLLECTION = "collection",    // Arrays, lists, containers
  RECORD = "record",           // Objects, elements, structured data
  FIELD = "field",             // Properties, simple elements with values
  VALUE = "value",             // Standalone primitive values
  ATTRIBUTES = "attributes",   // Metadata container (special type)
  COMMENT = "comment",         // Documentation and comments
  INSTRUCTION = "instruction", // Processing instructions, directives
  DATA = "data"               // Raw data, CDATA, binary content
}

export type Primitive = string | number | boolean | null;

// Enhanced attribute operations with namespace support
export function addAttribute(
  node: XNode, 
  name: string, 
  value: Primitive,
  options?: {
    namespace?: string;  // Full namespace URI
    label?: string;      // Display label or namespace prefix
  }
): XNode {
  if (!node.attributes) node.attributes = [];
  
  node.attributes.push({
    name,
    value,
    namespace: options?.namespace,
    label: options?.label
  });
  
  return node;
}

export function getAttribute(
  node: XNode, 
  name: string, 
  namespace?: string
): XNodeAttribute | undefined {
  return node.attributes?.find(attr => 
    attr.name === name && 
    (namespace === undefined || attr.namespace === namespace)
  );
}

export function getAttributeValue(
  node: XNode, 
  name: string, 
  namespace?: string
): Primitive | undefined {
  return getAttribute(node, name, namespace)?.value;
}

// Attribute filtering and manipulation
export function filterAttributes(
  node: XNode, 
  predicate: (attr: XNodeAttribute) => boolean
): XNodeAttribute[] {
  return node.attributes?.filter(predicate) || [];
}

export function updateAttribute(
  node: XNode, 
  name: string, 
  newValue: Primitive,
  namespace?: string
): XNode {
  const attr = getAttribute(node, name, namespace);
  if (attr) {
    attr.value = newValue;
  }
  return node;
}
```

### 1.2 Simplified Pipeline Context
**File**: `src/core/context.ts`
**Intent**: Single, simple context for all operations - no complex resource management

```typescript
/**
 * Simplified Pipeline Context - Single source of truth for execution environment
 * 
 * Design Intent:
 * - One context class for all operations (no interface/implementation split)
 * - Simple configuration management (no wrapper classes)
 * - Basic logging integration
 * - Namespaced metadata storage for extension coordination
 * - Fail-fast validation
 * 
 * Metadata System:
 * - Extensions store data under their own namespace to avoid conflicts
 * - Useful for cross-extension communication and round-trip preservation
 * - Examples: xml.hasNamespaces, json.originalType, csv.headers
 * - Enables intelligent processing decisions based on source characteristics
 */

import { Configuration } from './config';
import { Logger, LoggerFactory } from './logger';
import { ValidationError } from './error';
import { XNode, cloneNode } from './xnode';

export class PipelineContext {
  public config: Configuration;
  public logger: Logger;
  public metadata: Record<string, Record<string, any>>; // Namespaced metadata storage
  
  constructor(config: Configuration) {
    this.config = config;
    this.logger = LoggerFactory.create('XJX');
    this.metadata = {}; // Initialize empty metadata
  }
  
  // Simple node cloning - just deep/shallow flag
  cloneNode(node: XNode, deep: boolean = false): XNode {
    return cloneNode(node, deep);
  }
  
  // Fail-fast input validation
  validateInput(condition: boolean, message: string): void {
    if (!condition) {
      this.logger.error(`Validation failed: ${message}`);
      throw new ValidationError(message);
    }
  }
  
  // Update configuration (for withConfig())
  mergeConfig(updates: Partial<Configuration>): void {
    this.config = { ...this.config, ...updates };
    this.logger.debug('Configuration updated', updates);
  }
  
  // Namespaced metadata management
  setMetadata(namespace: string, key: string, value: any): void {
    if (!this.metadata[namespace]) {
      this.metadata[namespace] = {};
    }
    this.metadata[namespace][key] = value;
    this.logger.debug(`Metadata set: ${namespace}.${key}`, value);
  }
  
  getMetadata(namespace: string, key?: string): any {
    if (!key) {
      return this.metadata[namespace] || {};
    }
    return this.metadata[namespace]?.[key];
  }
  
  hasMetadata(namespace: string, key?: string): boolean {
    if (!key) {
      return !!this.metadata[namespace] && Object.keys(this.metadata[namespace]).length > 0;
    }
    return !!this.metadata[namespace]?.[key];
  }
  
  clearMetadata(namespace: string, key?: string): void {
    if (!key) {
      delete this.metadata[namespace];
      this.logger.debug(`Cleared all metadata for namespace: ${namespace}`);
    } else if (this.metadata[namespace]) {
      delete this.metadata[namespace][key];
      this.logger.debug(`Cleared metadata: ${namespace}.${key}`);
    }
  }
  
  // Simple logging helpers
  logOperation(operation: string, details?: any): void {
    this.logger.debug(`Operation: ${operation}`, details);
  }
  
  logError(operation: string, error: Error): void {
    this.logger.error(`Error in ${operation}:`, error);
  }
}
```

### 1.3 Unified Extension System
**File**: `src/core/extension.ts`
**Intent**: Single context for all extensions, explicit registration pattern

```typescript
/**
 * Unified Extension System - Single context and registration pattern
 * 
 * Design Intent:
 * - One context interface for all extensions (terminal and non-terminal)
 * - Explicit registration on import
 * - Adapter-based format conversion
 * - Simple configuration merging
 * - Clear separation between core operations and format specifics
 */

import { XNode } from './xnode';
import { PipelineContext } from './context';
import { Adapter } from './adapter';

// Single extension context - used by all extensions
export interface ExtensionContext {
  xnode: XNode | null;
  branchContext: BranchContext | null;
  context: PipelineContext;
  
  // Core operations available to all extensions
  validateSource(): void;
  executeAdapter<TInput, TOutput>(adapter: Adapter<TInput, TOutput>, input: TInput): TOutput;
}

// Branch context for branch/merge operations - kept simple
export interface BranchContext {
  parentNode: XNode;           // Original document root
  selectedNodes: XNode[];      // Nodes that were branched
  originalPaths: number[][];   // Paths to original locations
}

// Extension registration interface
export interface ExtensionImplementation {
  method: (this: ExtensionContext, ...args: any[]) => any;
  isTerminal: boolean; // true = returns value, false = returns this for chaining
}

// Usage pattern for extension developers:
// 
// export function myExtension(this: ExtensionContext, param: string): void {
//   this.validateSource();
//   // ... extension logic
// }
// 
// XJX.registerExtension('myExtension', { 
//   method: myExtension, 
//   isTerminal: false 
// }, {
//   myExtension: { defaultOption: 'value' }
// });
```

### 1.4 Simplified Configuration
**File**: `src/core/config.ts`
**Intent**: Format-neutral core config with extension defaults merging

```typescript
/**
 * Simplified Configuration System - Format-neutral core with extension defaults
 * 
 * Design Intent:
 * - Core config is minimal and format-neutral
 * - Extensions add their own config sections
 * - Simple object merging (no wrapper classes)
 * - Global defaults managed automatically
 * - Clear separation of concerns
 */

export interface Configuration {
  // Core format-neutral settings
  preserveComments: boolean;       // Keep comment nodes during conversion (default: true)
  preserveInstructions: boolean;   // Keep processing instruction nodes (default: true)
  preserveWhitespace: boolean;     // Keep whitespace-only text nodes (default: false)
  
  // Output formatting (applies to all formats)
  formatting: {
    indent: number;                // Number of spaces for indentation (default: 2)
    pretty: boolean;               // Enable pretty-printing with indentation (default: true)
  };
  
  // Functional operations
  fragmentRoot: string;            // Root element name for fragmented results (default: 'results')
  
  // Extension-specific configurations (added by extensions when registered)
  // Example: xml: { preserveNamespaces: true, declaration: true }
  // Example: json: { attributePrefix: '@', highFidelity: false }
  [extensionName: string]: any;
}

export const DEFAULT_CONFIG: Configuration = {
  preserveComments: true,
  preserveInstructions: true,
  preserveWhitespace: false,
  formatting: {
    indent: 2,
    pretty: true
  },
  fragmentRoot: 'results'
};

// Global defaults that include extension defaults
let globalDefaults: Configuration = { ...DEFAULT_CONFIG };

export function mergeGlobalDefaults(extensionDefaults: Record<string, any>): void {
  globalDefaults = { ...globalDefaults, ...extensionDefaults };
}

export function createConfig(overrides?: Partial<Configuration>): Configuration {
  return overrides ? { ...globalDefaults, ...overrides } : { ...globalDefaults };
}

export function getGlobalDefaults(): Configuration {
  return { ...globalDefaults };
}

// For testing - reset to clean state
export function resetGlobalDefaults(): void {
  globalDefaults = { ...DEFAULT_CONFIG };
}
```

## Phase 2: Adapter Infrastructure

### 2.1 Unified Adapter Interface
**File**: `src/core/adapter.ts`
**Intent**: Simple, consistent interface for all format conversion

```typescript
/**
 * Unified Adapter Interface - Simple conversion pattern for all formats
 * 
 * Design Intent:
 * - Single interface for input->XNode and XNode->output conversion
 * - Fail-fast validation with clear error messages
 * - Adapters are self-contained and format-specific
 * - Simple execution pattern with logging
 * - No complex error recovery (fail fast principle)
 */

import { PipelineContext } from './context';
import { ProcessingError } from './error';

export interface Adapter<TInput, TOutput> {
  name: string; // For logging and debugging
  
  // Main conversion method
  execute(input: TInput, context: PipelineContext): TOutput;
  
  // Optional input validation (fail fast)
  validate?(input: TInput, context: PipelineContext): void;
}

export class AdapterExecutor {
  static execute<TInput, TOutput>(
    adapter: Adapter<TInput, TOutput>,
    input: TInput,
    context: PipelineContext
  ): TOutput {
    context.logOperation(`adapter-${adapter.name}`, { 
      inputType: typeof input,
      hasValidation: !!adapter.validate 
    });
    
    try {
      // Fail-fast validation
      if (adapter.validate) {
        adapter.validate(input, context);
      }
      
      // Execute conversion
      const result = adapter.execute(input, context);
      
      context.logger.debug(`Adapter ${adapter.name} completed successfully`);
      return result;
      
    } catch (error) {
      const errorMessage = `Adapter ${adapter.name} failed: ${error instanceof Error ? error.message : String(error)}`;
      context.logError(`adapter-${adapter.name}`, error as Error);
      
      // Always fail fast - no error recovery
      throw new ProcessingError(errorMessage, { 
        adapter: adapter.name, 
        input: typeof input === 'string' ? input.substring(0, 100) : input 
      });
    }
  }
}

// Usage pattern for adapter developers:
//
// export class MyFormatToXNodeAdapter implements Adapter<string, XNode> {
//   name = 'myformat-to-xnode';
//   
//   validate(input: string, context: PipelineContext): void {
//     if (!input || typeof input !== 'string') {
//       throw new ValidationError('Input must be a non-empty string');
//     }
//   }
//   
//   execute(input: string, context: PipelineContext): XNode {
//     // Conversion logic using context.config.myformat settings
//     return convertedNode;
//   }
// }
```

### 2.2 Main XJX Class Refactor
**File**: `src/XJX.ts`
**Intent**: Simplified class focused on extension registration and fluent API

```typescript
/**
 * Simplified XJX Class - Extension registration and fluent API
 * 
 * Design Intent:
 * - Single registration method for all extension types
 * - Automatic config defaults merging
 * - Simple prototype-based method registration
 * - Clear separation between core state and extension logic
 * - Unified execution pattern for all operations
 */

import { Configuration, createConfig, mergeGlobalDefaults } from './core/config';
import { PipelineContext } from './core/context';
import { XNode } from './core/xnode';
import { ExtensionContext, ExtensionImplementation, BranchContext } from './core/extension';
import { AdapterExecutor, Adapter } from './core/adapter';
import { ValidationError } from './core/error';
import { Logger, LoggerFactory } from './core/logger';

export class XJX implements ExtensionContext {
  public xnode: XNode | null = null;
  public branchContext: BranchContext | null = null;
  public context: PipelineContext;
  
  constructor(config?: Partial<Configuration>) {
    this.context = new PipelineContext(createConfig(config));
  }
  
  // Extension registration - single method for all types
  static registerExtension(
    name: string,
    implementation: ExtensionImplementation,
    configDefaults?: Record<string, any>
  ): void {
    // Merge extension config defaults into global defaults
    if (configDefaults) {
      mergeGlobalDefaults(configDefaults);
    }
    
    // Register method on prototype
    if (implementation.isTerminal) {
      // Terminal methods return values directly
      (XJX.prototype as any)[name] = implementation.method;
    } else {
      // Non-terminal methods return this for chaining
      (XJX.prototype as any)[name] = function(...args: any[]): XJX {
        implementation.method.apply(this, args);
        return this;
      };
    }
  }
  
  // Core operations for extensions
  validateSource(): void {
    if (!this.xnode) {
      throw new ValidationError('No source set. Call fromXml(), fromJson(), or fromXnode() first.');
    }
  }
  
  executeAdapter<TInput, TOutput>(adapter: Adapter<TInput, TOutput>, input: TInput): TOutput {
    return AdapterExecutor.execute(adapter, input, this.context);
  }
}

// Usage pattern for extension registration:
//
// // In extension files (src/adapters/xml.ts, src/extensions/functional.ts, etc.)
// import { XJX } from '../XJX';
//
// export function fromXml(this: ExtensionContext, xml: string): void {
//   const adapter = new XmlToXNodeAdapter();
//   this.xnode = this.executeAdapter(adapter, xml);
// }
//
// XJX.registerExtension('fromXml', { 
//   method: fromXml, 
//   isTerminal: false 
// }, {
//   xml: { preserveNamespaces: true, declaration: true }
// });
//
// Export for external use
export default XJX;
```

## Phase 3: Transform Functions

### 3.1 Pure Transform Functions
**File**: `src/transforms/index.ts`
**Intent**: Stateless, pure functions for value transformation

```typescript
/**
 * Pure Transform Functions - Stateless value and attribute transformers
 * 
 * Design Intent:
 * - Pure functions with no side effects
 * - Support both node values and attributes
 * - Composable through functional composition
 * - Self-contained with their own validation
 * - Configurable through options pattern
 */

import { XNode, XNodeAttribute } from '../core/xnode';

export type Transform = (node: XNode) => XNode;

// Transform targeting options - either values, attributes, or both
export interface TransformTarget {
  transformValue?: boolean;        // Transform node.value (default: true)
  transformAttributes?: boolean;   // Transform node.attributes (default: false)
}

// Number transformation
export interface NumberOptions extends TransformTarget {
  precision?: number;              // Number of decimal places to round to (e.g., 2 for currency)
  decimalSeparator?: string;       // Character used as decimal point (default: '.')
  thousandsSeparator?: string;     // Character used for thousands grouping (default: ',')
  allowIntegers?: boolean;         // Accept integer values (default: true)
  allowDecimals?: boolean;         // Accept decimal values (default: true)
  allowScientific?: boolean;       // Accept scientific notation like 1.5e10 (default: true)
}

export function toNumber(options: NumberOptions = {}): Transform {
  const config = {
    transformValue: true,
    transformAttributes: false,
    precision: undefined,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    allowIntegers: true,
    allowDecimals: true,
    allowScientific: true,
    ...options
  };
  
  return (node: XNode): XNode => {
    let result = { ...node };
    
    // Transform node value
    if (config.transformValue && node.value) {
      const converted = convertToNumber(node.value, config);
      if (converted !== null) {
        result.value = converted;
      }
    }
    
    // Transform attributes
    if (config.transformAttributes && node.attributes) {
      result.attributes = node.attributes.map(attr => {
        const converted = convertToNumber(attr.value, config);
        return converted !== null ? { ...attr, value: converted } : attr;
      });
    }
    
    return result;
  };
}

function convertToNumber(value: any, options: NumberOptions): number | null {
  if (typeof value === 'number') {
    return options.precision !== undefined 
      ? Number(value.toFixed(options.precision))
      : value;
  }
  
  if (typeof value !== 'string') return null;
  
  const cleaned = value.trim();
  if (!cleaned) return null;
  
  // Simple number parsing with custom separators
  let normalized = cleaned;
  
  if (options.thousandsSeparator) {
    normalized = normalized.replace(new RegExp(`\\${options.thousandsSeparator}`, 'g'), '');
  }
  
  if (options.decimalSeparator !== '.') {
    normalized = normalized.replace(new RegExp(`\\${options.decimalSeparator}`, 'g'), '.');
  }
  
  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return null;
  
  return options.precision !== undefined 
    ? Number(parsed.toFixed(options.precision))
    : parsed;
}

// Boolean transformation
export interface BooleanOptions extends TransformTarget {
  trueValues?: string[];   // Values to treat as true (default: ['true', 'yes', '1', 'on'])
  falseValues?: string[];  // Values to treat as false (default: ['false', 'no', '0', 'off'])
}

export function toBoolean(options: BooleanOptions = {}): Transform {
  const config = {
    transformValue: true,
    transformAttributes: false,
    trueValues: ['true', 'yes', '1', 'on'],
    falseValues: ['false', 'no', '0', 'off'],
    ...options
  };
  
  // Always use case insensitive comparison
  const normalizedTrue = config.trueValues.map(v => v.toLowerCase());
  const normalizedFalse = config.falseValues.map(v => v.toLowerCase());
  
  return (node: XNode): XNode => {
    let result = { ...node };
    
    // Transform node value
    if (config.transformValue && node.value) {
      const converted = convertToBoolean(node.value, normalizedTrue, normalizedFalse);
      if (converted !== null) {
        result.value = converted;
      }
    }
    
    // Transform attributes
    if (config.transformAttributes && node.attributes) {
      result.attributes = node.attributes.map(attr => {
        const converted = convertToBoolean(attr.value, normalizedTrue, normalizedFalse);
        return converted !== null ? { ...attr, value: converted } : attr;
      });
    }
    
    return result;
  };
}

function convertToBoolean(value: any, trueValues: string[], falseValues: string[]): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  
  const normalized = value.trim().toLowerCase();  // Always case insensitive
  if (!normalized) return null;
  
  if (trueValues.includes(normalized)) return true;
  if (falseValues.includes(normalized)) return false;
  
  return null;
}

// Regex transformation
export function regex(pattern: RegExp | string, replacement: string, options: TransformTarget = {}): Transform {
  const config = {
    transformValue: true,
    transformAttributes: false,
    ...options
  };
  
  const regexp = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
  
  return (node: XNode): XNode => {
    let result = { ...node };
    
    // Transform node value
    if (config.transformValue && typeof node.value === 'string') {
      result.value = node.value.replace(regexp, replacement);
    }
    
    // Transform attributes
    if (config.transformAttributes && node.attributes) {
      result.attributes = node.attributes.map(attr => {
        if (typeof attr.value === 'string') {
          return { ...attr, value: attr.value.replace(regexp, replacement) };
        }
        return attr;
      });
    }
    
    return result;
  };
}

// Functional composition
export function compose(...transforms: Transform[]): Transform {
  return (node: XNode): XNode => {
    return transforms.reduce((result, transform) => transform(result), node);
  };
}

// Usage examples for documentation:
//
// // Transform values only (default)
// .map(toNumber({ precision: 2 }))
//
// // Transform attributes only
// .map(toNumber({ transformValue: false, transformAttributes: true }))
//
// // Transform both values and attributes
// .map(toNumber({ 
//   transformAttributes: true
// }))
//
// // Compose multiple transforms
// .map(compose(
//   regex(/[^\d.]/g, ''),           // Remove non-numeric chars
//   toNumber({ precision: 2 }),     // Convert to number
//   node => ({ ...node, processed: true }) // Add metadata
// ))
```

## Phase 4: Functional Operations

### 4.1 Core Functional Operations
**File**: `src/extensions/functional.ts`
**Intent**: Tree manipulation operations using unified traversal

```typescript
/**
 * Core Functional Operations - Tree manipulation with unified traversal
 * 
 * Design Intent:
 * - All operations use single traversal algorithm
 * - Consistent error handling and logging
 * - Simple branch/merge without nesting
 * - Pure functional approach where possible
 * - Clear separation between selection and transformation
 */

import { ExtensionContext } from '../core/extension';
import { XNode, createCollection, addChild, cloneNode } from '../core/xnode';
import { Transform } from '../transforms';
import { traverseTree, TreeVisitor } from '../core/traversal';
import { XJX } from '../XJX';

// Filter - maintains hierarchy, removes non-matching nodes
export function filter(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  this.validateSource();
  this.context.logOperation('filter');
  
  const visitor: TreeVisitor<XNode | null> = {
    visit: (node) => {
      try {
        return predicate(node) ? this.context.cloneNode(node, false) : null;
      } catch (error) {
        this.context.logger.warn(`Filter predicate error on node ${node.name}:`, error);
        return null;
      }
    },
    
    combineResults: (parent, children) => {
      const validChildren = children.filter(child => child !== null) as XNode[];
      
      if (parent && (validChildren.length > 0 || predicate(parent))) {
        const result = { ...parent };
        if (validChildren.length > 0) {
          result.children = validChildren;
          validChildren.forEach(child => child.parent = result);
        }
        return result;
      }
      
      return null;
    }
  };
  
  const result = traverseTree(this.xnode!, visitor, { order: 'post', context: this.context });
  this.xnode = result || createCollection(this.context.config.fragmentRoot);
}

// Map - transforms every node in place
export function map(this: ExtensionContext, transform: Transform): void {
  this.validateSource();
  this.context.logOperation('map');
  
  const visitor: TreeVisitor<XNode> = {
    visit: (node) => {
      try {
        return transform(node);
      } catch (error) {
        this.context.logger.warn(`Transform error on node ${node.name}:`, error);
        return node; // Return original on error
      }
    },
    
    combineResults: (parent, children) => {
      const result = { ...parent };
      if (children.length > 0) {
        result.children = children;
        children.forEach(child => child.parent = result);
      }
      return result;
    }
  };
  
  this.xnode = traverseTree(this.xnode!, visitor, { order: 'both', context: this.context });
}

// Select - flattens matching nodes into collection (no hierarchy)
export function select(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  this.validateSource();
  this.context.logOperation('select');
  
  const selectedNodes: XNode[] = [];
  
  const visitor: TreeVisitor<void> = {
    visit: (node) => {
      try {
        if (predicate(node)) {
          selectedNodes.push(this.context.cloneNode(node, true));
        }
      } catch (error) {
        this.context.logger.warn(`Select predicate error on node ${node.name}:`, error);
      }
    }
  };
  
  traverseTree(this.xnode!, visitor, { order: 'pre', context: this.context });
  
  // Create flat collection
  const collection = createCollection(this.context.config.fragmentRoot);
  selectedNodes.forEach(node => addChild(collection, node));
  this.xnode = collection;
}

// Branch - creates isolated scope for operations on matching nodes
export function branch(this: ExtensionContext, predicate: (node: XNode) => boolean): void {
  this.validateSource();
  this.context.logOperation('branch');
  
  if (this.branchContext) {
    throw new Error('Cannot create nested branches. Call merge() first.');
  }
  
  const { nodes, paths } = collectNodesWithPaths(this.xnode!, predicate, this.context);
  
  // Store branch context
  this.branchContext = {
    parentNode: this.xnode!,
    selectedNodes: nodes,
    originalPaths: paths
  };
  
  // Create branch collection
  const branchCollection = createCollection('branch');
  nodes.forEach(node => {
    addChild(branchCollection, this.context.cloneNode(node, true));
  });
  
  this.xnode = branchCollection;
}

// Merge - applies branch changes back to parent document
export function merge(this: ExtensionContext): void {
  if (!this.branchContext) {
    this.context.logger.debug('No active branch to merge');
    return;
  }
  
  this.context.logOperation('merge');
  
  const { parentNode, originalPaths } = this.branchContext;
  const branchNodes = this.xnode?.children || [];
  
  // Clone parent for modification
  const mergedParent = this.context.cloneNode(parentNode, true);
  
  // Replace nodes at original paths (deepest first to avoid index issues)
  const sortedPaths = originalPaths
    .map((path, index) => ({ path, node: branchNodes[index] }))
    .sort((a, b) => b.path.length - a.path.length || b.path[b.path.length - 1] - a.path[a.path.length - 1]);
  
  for (const { path, node } of sortedPaths) {
    if (node && path.length > 0) {
      replaceNodeAtPath(mergedParent, node, path);
    } else if (!node && path.length > 0) {
      removeNodeAtPath(mergedParent, path);
    }
  }
  
  // Clear branch context and restore parent
  this.branchContext = null;
  this.xnode = mergedParent;
}

// Reduce - aggregate operation (terminal)
export function reduce<T>(
  this: ExtensionContext,
  reducer: (accumulator: T, node: XNode) => T,
  initialValue: T
): T {
  this.validateSource();
  this.context.logOperation('reduce');
  
  let accumulator = initialValue;
  
  const visitor: TreeVisitor<void> = {
    visit: (node) => {
      try {
        accumulator = reducer(accumulator, node);
      } catch (error) {
        this.context.logger.warn(`Reducer error on node ${node.name}:`, error);
      }
    }
  };
  
  traverseTree(this.xnode!, visitor, { order: 'pre', context: this.context });
  return accumulator;
}

// Helper functions
function collectNodesWithPaths(
  root: XNode, 
  predicate: (node: XNode) => boolean,
  context: any
): { nodes: XNode[], paths: number[][] } {
  const nodes: XNode[] = [];
  const paths: number[][] = [];
  
  function traverse(node: XNode, currentPath: number[]): void {
    if (predicate(node)) {
      nodes.push(node);
      paths.push([...currentPath]);
    }
    
    if (node.children) {
      node.children.forEach((child, index) => {
        traverse(child, [...currentPath, index]);
      });
    }
  }
  
  traverse(root, []);
  return { nodes, paths };
}

function replaceNodeAtPath(root: XNode, replacement: XNode, path: number[]): void {
  if (path.length === 0) return;
  
  let current = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current.children || path[i] >= current.children.length) return;
    current = current.children[path[i]];
  }
  
  const lastIndex = path[path.length - 1];
  if (current.children && lastIndex < current.children.length) {
    replacement.parent = current;
    current.children[lastIndex] = replacement;
  }
}

function removeNodeAtPath(root: XNode, path: number[]): void {
  if (path.length === 0) return;
  
  let current = root;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current.children || path[i] >= current.children.length) return;
    current = current.children[path[i]];
  }
  
  const lastIndex = path[path.length - 1];
  if (current.children && lastIndex < current.children.length) {
    current.children.splice(lastIndex, 1);
  }
}

// Register functional operations
XJFN.registerExtension('filter', { method: filter, isTerminal: false });
XJFN.registerExtension('map', { method: map, isTerminal: false });
XJFN.registerExtension('select', { method: select, isTerminal: false });
XJFN.registerExtension('branch', { method: branch, isTerminal: false });
XJFN.registerExtension('merge', { method: merge, isTerminal: false });
XJFN.registerExtension('reduce', { method: reduce, isTerminal: true });
```

## Phase 5: Format Adapters

### 5.1 XML Adapter
**File**: `src/adapters/xml.ts`
**Intent**: Self-contained XML conversion with rich namespace support

```typescript
/**
 * XML Adapter - Self-contained XML to XNode conversion
 * 
 * Design Intent:
 * - Handle XML-specific features (namespaces, CDATA, processing instructions)
 * - Provide XML-specific configuration options
 * - Maintain high-fidelity conversion capabilities
 * - Fail fast on invalid XML
 * - Support both browser and Node.js environments
 */

import { Adapter } from '../core/adapter';
import { ExtensionContext } from '../core/extension';
import { XNode, XNodeType, createRecord, createField, createComment, createInstruction, createData, addChild, addAttribute } from '../core/xnode';
import { PipelineContext } from '../core/context';
import { DOM } from '../core/dom';
import { ValidationError, ProcessingError } from '../core/error';
import { XJX } from '../XJX';

// XML-specific configuration
export interface XmlConfig {
  preserveNamespaces: boolean;     // Maintain namespace URIs and prefixes (default: true)
  preserveComments: boolean;       // Keep XML comment nodes (default: true)
  preserveInstructions: boolean;   // Keep processing instructions like <?xml-stylesheet?> (default: true)
  preserveCDATA: boolean;          // Keep CDATA sections as separate nodes (default: true)
  preserveWhitespace: boolean;     // Keep whitespace-only text nodes (default: false)
  
  // Output options
  declaration: boolean;            // Include <?xml version="1.0"?> declaration (default: true)
  encoding: string;                // Character encoding for declaration (default: 'UTF-8')
  standalone?: boolean;            // Standalone attribute in declaration (default: undefined)
  
  // Namespace handling
  defaultNamespace?: string;       // Default namespace URI when none specified
  namespacePrefixes: Record<string, string>; // Mapping of namespace URI to preferred prefix
}

// XML to XNode conversion
export class XmlToXNodeAdapter implements Adapter<string, XNode> {
  name = 'xml-to-xnode';
  
  validate(xml: string, context: PipelineContext): void {
    if (!xml || typeof xml !== 'string') {
      throw new ValidationError('XML input must be a non-empty string');
    }
    
    if (!xml.trim()) {
      throw new ValidationError('XML input cannot be empty or whitespace-only');
    }
  }
  
  execute(xml: string, context: PipelineContext): XNode {
    const config = context.config.xml as XmlConfig;
    
    try {
      const doc = DOM.parseFromString(xml.trim(), 'text/xml');
      
      // Store metadata about the original XML
      context.setMetadata('xml', 'hasDeclaration', xml.trim().startsWith('<?xml'));
      context.setMetadata('xml', 'originalLength', xml.length);
      context.setMetadata('xml', 'hasNamespaces', !!doc.documentElement.namespaceURI);
      
      return this.convertElementToXNode(doc.documentElement, config, context);
    } catch (error) {
      throw new ProcessingError(`XML parsing failed: ${error instanceof Error ? error.message : String(error)}`, xml);
    }
  }
  
  private convertElementToXNode(element: Element, config: XmlConfig, context: PipelineContext): XNode {
    const node = createRecord(element.localName || element.nodeName);
    
    // Handle namespace information
    if (config.preserveNamespaces) {
      if (element.namespaceURI) {
        node.namespace = element.namespaceURI;
      }
      if (element.prefix) {
        node.label = element.prefix;
      }
    }
    
    // Convert attributes
    Array.from(element.attributes).forEach(attr => {
      // Skip namespace declarations unless preserving them
      if (attr.name.startsWith('xmlns') && !config.preserveNamespaces) {
        return;
      }
      
      addAttribute(node, attr.localName || attr.name, attr.value, {
        namespace: attr.namespaceURI || undefined,
        label: attr.prefix || undefined
      });
    });
    
    // Convert child nodes
    Array.from(element.childNodes).forEach(child => {
      const childNode = this.convertDomNodeToXNode(child, config, context);
      if (childNode) {
        addChild(node, childNode);
      }
    });
    
    return node;
  }
  
  private convertDomNodeToXNode(domNode: Node, config: XmlConfig, context: PipelineContext): XNode | null {
    switch (domNode.nodeType) {
      case DOM.NodeType.ELEMENT_NODE:
        return this.convertElementToXNode(domNode as Element, config, context);
        
      case DOM.NodeType.TEXT_NODE:
        const textContent = domNode.textContent || '';
        if (!config.preserveWhitespace && !textContent.trim()) {
          return null;
        }
        return createField('#text', textContent);
        
      case DOM.NodeType.CDATA_SECTION_NODE:
        if (!config.preserveCDATA) return null;
        return createData('#cdata', domNode.textContent || '');
        
      case DOM.NodeType.COMMENT_NODE:
        if (!config.preserveComments) return null;
        return createComment(domNode.textContent || '');
        
      case DOM.NodeType.PROCESSING_INSTRUCTION_NODE:
        if (!config.preserveInstructions) return null;
        const pi = domNode as ProcessingInstruction;
        return createInstruction(pi.target, pi.data);
        
      default:
        context.logger.debug(`Skipping unsupported node type: ${domNode.nodeType}`);
        return null;
    }
  }
}

// XNode to XML conversion
export class XNodeToXmlAdapter implements Adapter<XNode, string> {
  name = 'xnode-to-xml';
  
  execute(xnode: XNode, context: PipelineContext): string {
    const config = context.config.xml as XmlConfig;
    
    const doc = DOM.createDocument();
    const element = this.convertXNodeToElement(xnode, doc, config, context);
    doc.appendChild(element);
    
    let result = DOM.serializeToString(doc);
    
    // Add XML declaration if requested
    if (config.declaration) {
      const declaration = `<?xml version="1.0" encoding="${config.encoding}"${config.standalone !== undefined ? ` standalone="${config.standalone ? 'yes' : 'no'}"` : ''}?>`;
      result = declaration + (context.config.formatting.pretty ? '\n' : '') + result;
    }
    
    return result;
  }
  
  private convertXNodeToElement(xnode: XNode, doc: Document, config: XmlConfig, context: PipelineContext): Element {
    let element: Element;
    
    if (xnode.namespace && config.preserveNamespaces) {
      const qualifiedName = xnode.label ? `${xnode.label}:${xnode.name}` : xnode.name;
      element = DOM.createElementNS(doc, xnode.namespace, qualifiedName);
    } else {
      element = DOM.createElement(doc, xnode.name);
    }
    
    // Add attributes
    if (xnode.attributes) {
      xnode.attributes.forEach(attr => {
        if (attr.namespace && config.preserveNamespaces) {
          const qualifiedName = attr.label ? `${attr.label}:${attr.name}` : attr.name;
          element.setAttributeNS(attr.namespace, qualifiedName, String(attr.value));
        } else {
          element.setAttribute(attr.name, String(attr.value));
        }
      });
    }
    
    // Add children
    if (xnode.children) {
      xnode.children.forEach(child => {
        const childNode = this.convertXNodeToDomNode(child, doc, config, context);
        if (childNode) {
          element.appendChild(childNode);
        }
      });
    }
    
    // Add text value if present
    if (xnode.value !== undefined && xnode.value !== null) {
      const textNode = DOM.createTextNode(doc, String(xnode.value));
      element.appendChild(textNode);
    }
    
    return element;
  }
  
  private convertXNodeToDomNode(xnode: XNode, doc: Document, config: XmlConfig, context: PipelineContext): Node | null {
    switch (xnode.type) {
      case XNodeType.RECORD:
      case XNodeType.COLLECTION:
        return this.convertXNodeToElement(xnode, doc, config, context);
        
      case XNodeType.FIELD:
      case XNodeType.VALUE:
        return DOM.createTextNode(doc, String(xnode.value || ''));
        
      case XNodeType.COMMENT:
        return config.preserveComments ? DOM.createComment(doc, String(xnode.value || '')) : null;
        
      case XNodeType.INSTRUCTION:
        return config.preserveInstructions ? DOM.createProcessingInstruction(doc, xnode.name, String(xnode.value || '')) : null;
        
      case XNodeType.DATA:
        return config.preserveCDATA ? DOM.createCDATASection(doc, String(xnode.value || '')) : null;
        
      default:
        context.logger.debug(`Skipping XNode type: ${xnode.type}`);
        return null;
    }
  }
}

// Extension methods
export function fromXml(this: ExtensionContext, xml: string): void {
  const adapter = new XmlToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, xml);
}

export function toXmlString(this: ExtensionContext): string {
  this.validateSource();
  const adapter = new XNodeToXmlAdapter();
  return this.executeAdapter(adapter, this.xnode!);
}

export function toXml(this: ExtensionContext): Document {
  this.validateSource();
  const xmlString = this.executeAdapter(new XNodeToXmlAdapter(), this.xnode!);
  return DOM.parseFromString(xmlString, 'text/xml');
}

// Register XML extensions with default configuration
XJFN.registerExtension('fromXml', { method: fromXml, isTerminal: false }, {
  xml: {
    preserveNamespaces: true,
    preserveComments: true,
    preserveInstructions: true,
    preserveCDATA: true,
    preserveWhitespace: false,
    declaration: true,
    encoding: 'UTF-8',
    namespacePrefixes: {}
  }
});

XJFN.registerExtension('toXmlString', { method: toXmlString, isTerminal: true });
XJFN.registerExtension('toXml', { method: toXml, isTerminal: true });
```

### 5.2 JSON Adapter
**File**: `src/adapters/json.ts`
**Intent**: Compact, user-friendly JSON conversion (lossy but readable)

```typescript
/**
 * JSON Adapter - Compact, user-friendly JSON conversion
 * 
 * Design Intent:
 * - Focus on compact, readable JSON representation
 * - Lossy conversion optimized for human consumption and APIs
 * - Configurable attribute and value handling strategies
 * - Simple array handling with clear semantics
 * - Self-contained configuration
 */

import { Adapter } from '../core/adapter';
import { ExtensionContext } from '../core/extension';
import { XNode, XNodeType, createRecord, createCollection, createField, addChild, addAttribute } from '../core/xnode';
import { PipelineContext } from '../core/context';
import { ValidationError, ProcessingError } from '../core/error';
import { XJFN } from '../XJFN';

// JSON-specific configuration (simplified - no high-fidelity mode)
export interface JsonConfig {
  // Attribute handling
  attributePrefix: string;         // Prefix for XML attributes in JSON (default: '@')
  attributeStrategy: 'prefix' | 'property' | 'merge'; // How to handle attributes
  
  // Value handling
  valueProperty: string;           // Property name for element text content (default: '#text')
  valueStrategy: 'property' | 'direct'; // How to handle element values
  
  // Array handling
  arrayStrategy: 'multiple' | 'always' | 'never'; // When to create arrays (default: 'multiple')
  forceArrays: string[];           // Element names to always treat as arrays (default: [])
  defaultItemName: string;         // Name for array items when converting from JSON (default: 'item')
  
  // Output formatting
  preserveNumbers: boolean;        // Keep numeric strings as numbers (default: false)
  preserveBooleans: boolean;       // Keep boolean strings as booleans (default: false)
  nullAsEmpty: boolean;           // Convert null values to empty strings (default: false)
  
  // Simplification options
  ignoreComments: boolean;         // Skip comment nodes (default: true)
  ignoreInstructions: boolean;     // Skip processing instructions (default: true)
  ignoreCData: boolean;           // Convert CDATA to regular text (default: true)
  flattenSingleChildren: boolean; // Flatten single-child elements (default: false)
}

// JSON to XNode conversion
export class JsonToXNodeAdapter implements Adapter<any, XNode> {
  name = 'json-to-xnode';
  
  validate(json: any, context: PipelineContext): void {
    if (json === undefined) {
      throw new ValidationError('JSON input cannot be undefined');
    }
  }
  
  execute(json: any, context: PipelineContext): XNode {
    const config = context.config.json as JsonConfig;
    
    try {
      // Store metadata about the original JSON
      context.setMetadata('json', 'originalType', typeof json);
      context.setMetadata('json', 'isArray', Array.isArray(json));
      context.setMetadata('json', 'hasAttributes', this.hasAttributeProperties(json, config));
      
      return this.convertJsonValueToXNode(json, 'root', config, context);
    } catch (error) {
      throw new ProcessingError(`JSON conversion failed: ${error instanceof Error ? error.message : String(error)}`, json);
    }
  }
  
  private hasAttributeProperties(obj: any, config: JsonConfig): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.keys(obj).some(key => key.startsWith(config.attributePrefix));
  }
  
  private convertJsonValueToXNode(value: any, name: string, config: JsonConfig, context: PipelineContext): XNode {
    // Handle null
    if (value === null) {
      return createField(name, config.nullAsEmpty ? '' : null);
    }
    
    // Handle primitives
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return createField(name, value);
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      const collection = createCollection(name);
      value.forEach((item, index) => {
        const itemName = config.defaultItemName;
        const itemNode = this.convertJsonValueToXNode(item, itemName, config, context);
        addChild(collection, itemNode);
      });
      return collection;
    }
    
    // Handle objects
    if (typeof value === 'object') {
      return this.convertJsonObjectToXNode(value, name, config, context);
    }
    
    // Fallback for unknown types
    return createField(name, String(value));
  }
  
  private convertJsonObjectToXNode(obj: Record<string, any>, name: string, config: JsonConfig, context: PipelineContext): XNode {
    const node = createRecord(name);
    
    // Separate attributes, values, and children
    const attributes: Array<{ name: string, value: any }> = [];
    const children: Array<{ name: string, value: any }> = [];
    let textValue: any = undefined;
    
    Object.entries(obj).forEach(([key, value]) => {
      if (key.startsWith(config.attributePrefix)) {
        // Handle as attribute
        const attrName = key.substring(config.attributePrefix.length);
        attributes.push({ name: attrName, value });
      } else if (key === config.valueProperty) {
        // Handle as text content
        textValue = value;
      } else {
        // Handle as child element
        children.push({ name: key, value });
      }
    });
    
    // Add attributes
    attributes.forEach(({ name, value }) => {
      addAttribute(node, name, value);
    });
    
    // Add text value
    if (textValue !== undefined) {
      node.value = textValue;
    }
    
    // Add children
    children.forEach(({ name, value }) => {
      // Handle array strategy
      if (this.shouldTreatAsArray(name, value, config)) {
        const arrayValue = Array.isArray(value) ? value : [value];
        arrayValue.forEach(item => {
          const childNode = this.convertJsonValueToXNode(item, name, config, context);
          addChild(node, childNode);
        });
      } else {
        const childNode = this.convertJsonValueToXNode(value, name, config, context);
        addChild(node, childNode);
      }
    });
    
    return node;
  }
  
  private shouldTreatAsArray(name: string, value: any, config: JsonConfig): boolean {
    switch (config.arrayStrategy) {
      case 'always':
        return true;
      case 'never':
        return false;
      case 'multiple':
        return Array.isArray(value) || config.forceArrays.includes(name);
      default:
        return Array.isArray(value);
    }
  }
}

// XNode to JSON conversion
export class XNodeToJsonAdapter implements Adapter<XNode, any> {
  name = 'xnode-to-json';
  
  execute(xnode: XNode, context: PipelineContext): any {
    const config = context.config.json as JsonConfig;
    return this.convertXNodeToJsonValue(xnode, config, context);
  }
  
  private convertXNodeToJsonValue(xnode: XNode, config: JsonConfig, context: PipelineContext): any {
    switch (xnode.type) {
      case XNodeType.FIELD:
      case XNodeType.VALUE:
        return this.convertPrimitive(xnode.value, config);
        
      case XNodeType.COLLECTION:
        return xnode.children?.map(child => this.convertXNodeToJsonValue(child, config, context)) || [];
        
      case XNodeType.RECORD:
        return this.convertRecordToJsonObject(xnode, config, context);
        
      case XNodeType.COMMENT:
        return config.ignoreComments ? undefined : xnode.value;
        
      case XNodeType.INSTRUCTION:
        return config.ignoreInstructions ? undefined : xnode.value;
        
      case XNodeType.DATA:
        return config.ignoreCData ? xnode.value : xnode.value; // Convert CDATA to regular text
        
      default:
        return xnode.value;
    }
  }
  
  private convertRecordToJsonObject(xnode: XNode, config: JsonConfig, context: PipelineContext): any {
    const result: any = {};
    
    // Add attributes with prefix
    if (xnode.attributes) {
      xnode.attributes.forEach(attr => {
        const key = `${config.attributePrefix}${attr.name}`;
        result[key] = this.convertPrimitive(attr.value, config);
      });
    }
    
    // Handle children and text content
    const childGroups = this.groupChildrenByName(xnode.children || []);
    
    Object.entries(childGroups).forEach(([name, children]) => {
      const validChildren = children.filter(child => {
        // Filter out ignored node types
        if (config.ignoreComments && child.type === XNodeType.COMMENT) return false;
        if (config.ignoreInstructions && child.type === XNodeType.INSTRUCTION) return false;
        return true;
      });
      
      if (validChildren.length === 0) return;
      
      if (validChildren.length === 1 && config.arrayStrategy !== 'always' && !config.forceArrays.includes(name)) {
        // Single child
        const converted = this.convertXNodeToJsonValue(validChildren[0], config, context);
        if (converted !== undefined) {
          result[name] = converted;
        }
      } else {
        // Multiple children or forced array
        const converted = validChildren
          .map(child => this.convertXNodeToJsonValue(child, config, context))
          .filter(val => val !== undefined);
        if (converted.length > 0) {
          result[name] = converted;
        }
      }
    });
    
    // Add text value if present and no children
    if (xnode.value !== undefined && Object.keys(result).length === 0) {
      return this.convertPrimitive(xnode.value, config);
    } else if (xnode.value !== undefined) {
      result[config.valueProperty] = this.convertPrimitive(xnode.value, config);
    }
    
    return result;
  }
  
  private groupChildrenByName(children: XNode[]): Record<string, XNode[]> {
    return children.reduce((groups, child) => {
      const name = child.name;
      if (!groups[name]) groups[name] = [];
      groups[name].push(child);
      return groups;
    }, {} as Record<string, XNode[]>);
  }
  
  private convertPrimitive(value: any, config: JsonConfig): any {
    if (value === null || value === undefined) {
      return config.nullAsEmpty ? '' : null;
    }
    
    if (typeof value === 'string') {
      // Try to preserve numbers and booleans if configured
      if (config.preserveNumbers && !isNaN(Number(value)) && !isNaN(parseFloat(value))) {
        return Number(value);
      }
      if (config.preserveBooleans && (value === 'true' || value === 'false')) {
        return value === 'true';
      }
    }
    
    return value;
  }
}

// Extension methods
export function fromJson(this: ExtensionContext, json: any): void {
  const adapter = new JsonToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, json);
}

export function toJson(this: ExtensionContext): any {
  this.validateSource();
  const adapter = new XNodeToJsonAdapter();
  return this.executeAdapter(adapter, this.xnode!);
}

export function toJsonString(this: ExtensionContext, indent?: number): string {
  this.validateSource();
  const json = this.executeAdapter(new XNodeToJsonAdapter(), this.xnode!);
  const indentValue = indent !== undefined ? indent : (this.context.config.formatting.pretty ? this.context.config.formatting.indent : 0);
  return JSON.stringify(json, null, indentValue);
}

// Register JSON extensions with default configuration (simplified)
XJFN.registerExtension('fromJson', { method: fromJson, isTerminal: false }, {
  json: {
    attributePrefix: '@',               // Prefix for attributes in JSON
    attributeStrategy: 'prefix',        // How to handle attributes
    valueProperty: '#text',             // Property name for text content
    valueStrategy: 'property',          // How to handle values
    arrayStrategy: 'multiple',          // When to create arrays
    forceArrays: [],                   // Always-array element names
    defaultItemName: 'item',           // Array item name
    preserveNumbers: false,            // Keep numbers as numbers
    preserveBooleans: false,           // Keep booleans as booleans
    nullAsEmpty: false,               // Convert nulls to empty strings
    ignoreComments: true,             // Skip comments for compact JSON
    ignoreInstructions: true,         // Skip processing instructions
    ignoreCData: true,               // Convert CDATA to regular text
    flattenSingleChildren: false     // Flatten single-child elements
  }
});

XJFN.registerExtension('toJson', { method: toJson, isTerminal: true });
XJFN.registerExtension('toJsonString', { method: toJsonString, isTerminal: true });
```

### 5.3 XNode Adapter
**File**: `src/adapters/xnode.ts`
**Intent**: Lossless XNode tree serialization for perfect round-trip conversions

```typescript
/**
 * XNode Adapter - Lossless semantic tree serialization
 * 
 * Design Intent:
 * - Perfect fidelity preservation of all XNode semantics
 * - Lossless round-trip conversions for any source format
 * - Direct serialization of XNode tree structure as JSON
 * - Maintains all metadata, namespaces, attributes, and semantic types
 * - Enables data archival and processing pipeline integration
 */

import { Adapter } from '../core/adapter';
import { ExtensionContext } from '../core/extension';
import { XNode, XNodeType, XNodeAttribute } from '../core/xnode';
import { PipelineContext } from '../core/context';
import { ValidationError, ProcessingError } from '../core/error';
import { XJFN } from '../XJFN';

// XNode serialization format
export interface SerializedXNode {
  type: XNodeType;
  name: string;
  value?: any;
  attributes?: XNodeAttribute[];
  children?: SerializedXNode[];
  namespace?: string;
  label?: string;
  id?: string;
  // Note: parent is excluded from serialization to avoid circular references
}

// XNode-specific configuration
export interface XNodeConfig {
  includeParentReferences: boolean;    // Include parent references in serialization (default: false)
  preserveUndefined: boolean;          // Preserve undefined values vs null (default: true)
  compactFormat: boolean;              // Use compact JSON format (default: false)
  validateOnDeserialize: boolean;      // Validate XNode structure on load (default: true)
}

// XNode to JSON serialization
export class XNodeToSerializedAdapter implements Adapter<XNode, SerializedXNode> {
  name = 'xnode-to-serialized';
  
  execute(xnode: XNode, context: PipelineContext): SerializedXNode {
    const config = context.config.xnode as XNodeConfig;
    
    // Store metadata about serialization
    context.setMetadata('xnode', 'serializedAt', new Date().toISOString());
    context.setMetadata('xnode', 'rootType', xnode.type);
    context.setMetadata('xnode', 'hasNamespace', !!xnode.namespace);
    
    return this.serializeXNode(xnode, config);
  }
  
  private serializeXNode(node: XNode, config: XNodeConfig): SerializedXNode {
    const serialized: SerializedXNode = {
      type: node.type,
      name: node.name
    };
    
    // Serialize primitive properties
    if (node.value !== undefined) {
      serialized.value = node.value;
    }
    
    if (node.namespace !== undefined) {
      serialized.namespace = node.namespace;
    }
    
    if (node.label !== undefined) {
      serialized.label = node.label;
    }
    
    if (node.id !== undefined) {
      serialized.id = node.id;
    }
    
    // Serialize attributes
    if (node.attributes && node.attributes.length > 0) {
      serialized.attributes = node.attributes.map(attr => ({ ...attr }));
    }
    
    // Serialize children recursively
    if (node.children && node.children.length > 0) {
      serialized.children = node.children.map(child => this.serializeXNode(child, config));
    }
    
    return serialized;
  }
}

// JSON to XNode deserialization
export class SerializedToXNodeAdapter implements Adapter<SerializedXNode, XNode> {
  name = 'serialized-to-xnode';
  
  validate(serialized: SerializedXNode, context: PipelineContext): void {
    const config = context.config.xnode as XNodeConfig;
    
    if (!serialized || typeof serialized !== 'object') {
      throw new ValidationError('Serialized XNode must be an object');
    }
    
    if (!serialized.type || !serialized.name) {
      throw new ValidationError('Serialized XNode must have type and name properties');
    }
    
    if (!Object.values(XNodeType).includes(serialized.type)) {
      throw new ValidationError(`Invalid XNode type: ${serialized.type}`);
    }
    
    if (config.validateOnDeserialize) {
      this.validateXNodeStructure(serialized);
    }
  }
  
  execute(serialized: SerializedXNode, context: PipelineContext): XNode {
    try {
      // Store metadata about deserialization
      context.setMetadata('xnode', 'deserializedAt', new Date().toISOString());
      context.setMetadata('xnode', 'sourceType', serialized.type);
      
      return this.deserializeXNode(serialized, context);
    } catch (error) {
      throw new ProcessingError(`XNode deserialization failed: ${error instanceof Error ? error.message : String(error)}`, serialized);
    }
  }
  
  private deserializeXNode(serialized: SerializedXNode, context: PipelineContext, parent?: XNode): XNode {
    const node: XNode = {
      type: serialized.type,
      name: serialized.name,
      parent
    };
    
    // Restore primitive properties
    if (serialized.value !== undefined) {
      node.value = serialized.value;
    }
    
    if (serialized.namespace !== undefined) {
      node.namespace = serialized.namespace;
    }
    
    if (serialized.label !== undefined) {
      node.label = serialized.label;
    }
    
    if (serialized.id !== undefined) {
      node.id = serialized.id;
    }
    
    // Restore attributes
    if (serialized.attributes && serialized.attributes.length > 0) {
      node.attributes = serialized.attributes.map(attr => ({ ...attr }));
    }
    
    // Restore children recursively
    if (serialized.children && serialized.children.length > 0) {
      node.children = serialized.children.map(childSerialized => 
        this.deserializeXNode(childSerialized, context, node)
      );
    }
    
    return node;
  }
  
  private validateXNodeStructure(serialized: SerializedXNode): void {
    // Validate attributes structure
    if (serialized.attributes) {
      serialized.attributes.forEach((attr, index) => {
        if (!attr.name || attr.value === undefined) {
          throw new ValidationError(`Invalid attribute at index ${index}: must have name and value`);
        }
      });
    }
    
    // Validate children recursively
    if (serialized.children) {
      serialized.children.forEach((child, index) => {
        try {
          this.validateXNodeStructure(child);
        } catch (error) {
          throw new ValidationError(`Invalid child at index ${index}: ${error instanceof Error ? error.message : String(error)}`);
        }
      });
    }
  }
}

// Extension methods
export function fromXNode(this: ExtensionContext, serialized: SerializedXNode | string): void {
  let parsed: SerializedXNode;
  
  if (typeof serialized === 'string') {
    try {
      parsed = JSON.parse(serialized);
    } catch (error) {
      throw new ValidationError('Invalid JSON string for XNode deserialization');
    }
  } else {
    parsed = serialized;
  }
  
  const adapter = new SerializedToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, parsed);
}

export function toXNode(this: ExtensionContext): SerializedXNode {
  this.validateSource();
  const adapter = new XNodeToSerializedAdapter();
  return this.executeAdapter(adapter, this.xnode!);
}

export function toXNodeString(this: ExtensionContext, indent?: number): string {
  this.validateSource();
  const serialized = this.executeAdapter(new XNodeToSerializedAdapter(), this.xnode!);
  const indentValue = indent !== undefined ? indent : (this.context.config.formatting.pretty ? this.context.config.formatting.indent : 0);
  return JSON.stringify(serialized, null, indentValue);
}

// Register XNode extensions with default configuration
XJFN.registerExtension('fromXNode', { method: fromXNode, isTerminal: false }, {
  xnode: {
    includeParentReferences: false,     // Avoid circular references
    preserveUndefined: true,           // Distinguish undefined from null
    compactFormat: false,              // Pretty format by default
    validateOnDeserialize: true       // Ensure data integrity
  }
});

XJFN.registerExtension('toXNode', { method: toXNode, isTerminal: true });
XJFN.registerExtension('toXNodeString', { method: toXNodeString, isTerminal: true });
```

## Phase 6: Configuration Extensions

### 6.1 Configuration Methods
**File**: `src/extensions/config.ts`
**Intent**: Simple configuration management

```typescript
/**
 * Configuration Extensions - Simple configuration management
 * 
 * Design Intent:
 * - Direct configuration merging without wrapper classes
 * - Support for logging level changes
 * - Validation of core configuration changes after source is set
 * - Clear error messages for configuration conflicts
 */

import { ExtensionContext } from '../core/extension';
import { Configuration } from '../core/config';
import { LogLevel, LoggerFactory } from '../core/logger';
import { XJX } from '../XJX';

export function withConfig(this: ExtensionContext, config: Partial<Configuration>): void {
  // Validate input
  this.context.validateInput(
    config !== null && typeof config === 'object',
    'Configuration must be an object'
  );
  
  // Skip if empty
  if (Object.keys(config).length === 0) {
    this.context.logger.debug('Empty configuration provided, skipping');
    return;
  }
  
  // Check for preservation setting changes after source is set
  const PRESERVATION_SETTINGS = ['preserveComments', 'preserveInstructions', 'preserveWhitespace'];
  
  if (this.xnode !== null) {
    const changedPreservation = PRESERVATION_SETTINGS.filter(setting => 
      config[setting as keyof Configuration] !== undefined &&
      config[setting as keyof Configuration] !== this.context.config[setting as keyof Configuration]
    );
    
    if (changedPreservation.length > 0) {
      throw new Error(
        `Cannot change preservation settings (${changedPreservation.join(', ')}) after source is set. ` +
        `Set these in the XJX constructor or before calling fromXml()/fromJson().`
      );
    }
  }
  
  // Merge configuration
  this.context.mergeConfig(config);
  
  this.context.logger.debug('Configuration updated', { 
    changedKeys: Object.keys(config),
    hasSource: this.xnode !== null
  });
}

export function withLogLevel(this: ExtensionContext, level: LogLevel | string): void {
  // Validate input
  this.context.validateInput(
    level !== undefined && level !== null,
    'Log level must be provided'
  );
  
  // Convert string to LogLevel if needed
  let logLevel: LogLevel;
  
  if (typeof level === 'string') {
    const normalizedLevel = level.toUpperCase();
    switch (normalizedLevel) {
      case 'DEBUG': logLevel = LogLevel.DEBUG; break;
      case 'INFO': logLevel = LogLevel.INFO; break;
      case 'WARN': logLevel = LogLevel.WARN; break;
      case 'ERROR': logLevel = LogLevel.ERROR; break;
      case 'NONE': logLevel = LogLevel.NONE; break;
      default:
        throw new Error(`Invalid log level: ${level}. Valid values are: debug, info, warn, error, none`);
    }
  } else {
    logLevel = level;
  }
  
  // Set global log level
  LoggerFactory.setDefaultLevel(logLevel);
  
  this.context.logger.info(`Log level set to ${logLevel}`);
}

// Register configuration extensions
XJFN.registerExtension('withConfig', { method: withConfig, isTerminal: false });
XJFN.registerExtension('withLogLevel', { method: withLogLevel, isTerminal: false });
```

## Usage Examples & Migration Guide

### 6.2 Complete Usage Examples

```typescript
/**
 * Complete Usage Examples - Demonstrating clean API patterns with metadata
 */

// Basic XML to JSON conversion
const basicResult = new XJX()
  .fromXml('<books><book id="1"><title>Guide</title><price>29.99</price></book></books>')
  .toJson();

// Access metadata about the conversion
const xjx = new XJX()
  .fromXml(complexXml);

console.log('Has namespaces:', xjx.context.getMetadata('xml', 'hasNamespaces'));
console.log('Original XML length:', xjx.context.getMetadata('xml', 'originalLength'));

const result = xjx.toJson();

// Advanced transformation with branching and metadata tracking
const advancedResult = new XJX()
  .withConfig({ 
    json: { attributePrefix: '
```

### 6.3 Extension Development Pattern

```typescript
/**
 * Extension Development Pattern - Template for new format adapters with metadata
 */

// Example CSV adapter
// File: src/adapters/csv.ts

export interface CsvConfig {
  delimiter: string;               // Column separator character (default: ',')
  quote: string;                   // Quote character for values (default: '"')
  escape: string;                  // Escape character (default: '"')
  headers: boolean;                // First row contains headers (default: true)
  skipEmptyLines: boolean;         // Skip empty lines during parsing (default: true)
}

export class CsvToXNodeAdapter implements Adapter<string, XNode> {
  name = 'csv-to-xnode';
  
  validate(csv: string, context: PipelineContext): void {
    if (!csv || typeof csv !== 'string') {
      throw new ValidationError('CSV input must be a non-empty string');
    }
  }
  
  execute(csv: string, context: PipelineContext): XNode {
    const config = context.config.csv as CsvConfig;
    
    // Store metadata about the CSV
    const lines = csv.split('\n').filter(line => line.trim());
    context.setMetadata('csv', 'totalLines', lines.length);
    context.setMetadata('csv', 'hasHeaders', config.headers);
    context.setMetadata('csv', 'delimiter', config.delimiter);
    
    if (config.headers && lines.length > 0) {
      const headers = this.parseCsvLine(lines[0], config);
      context.setMetadata('csv', 'columnCount', headers.length);
      context.setMetadata('csv', 'headers', headers);
    }
    
    // Conversion logic here
    const resultNode = this.convertCsvToXNode(csv, config, context);
    
    // Store final metadata
    context.setMetadata('csv', 'rowCount', resultNode.children?.length || 0);
    
    return resultNode;
  }
  
  private parseCsvLine(line: string, config: CsvConfig): string[] {
    // CSV parsing implementation
    return [];
  }
  
  private convertCsvToXNode(csv: string, config: CsvConfig, context: PipelineContext): XNode {
    // Conversion implementation
    return createCollection('data');
  }
}

export class XNodeToCsvAdapter implements Adapter<XNode, string> {
  name = 'xnode-to-csv';
  
  execute(xnode: XNode, context: PipelineContext): string {
    const config = context.config.csv as CsvConfig;
    
    // Use metadata from original CSV conversion if available
    const originalHeaders = context.getMetadata('csv', 'headers');
    const originalDelimiter = context.getMetadata('csv', 'delimiter') || config.delimiter;
    
    // Store output metadata
    context.setMetadata('csvOutput', 'delimiter', originalDelimiter);
    context.setMetadata('csvOutput', 'usingOriginalHeaders', !!originalHeaders);
    
    // Conversion logic using metadata-informed decisions
    return this.convertXNodeToCsv(xnode, config, context, originalHeaders);
  }
  
  private convertXNodeToCsv(xnode: XNode, config: CsvConfig, context: PipelineContext, headers?: string[]): string {
    // Implementation that uses headers from metadata if available
    return '';
  }
}

export function fromCsv(this: ExtensionContext, csv: string): void {
  const adapter = new CsvToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, csv);
  
  // Log metadata after conversion
  this.context.logger.info('CSV conversion completed', {
    rows: this.context.getMetadata('csv', 'rowCount'),
    columns: this.context.getMetadata('csv', 'columnCount'),
    hasHeaders: this.context.getMetadata('csv', 'hasHeaders')
  });
}

export function toCsv(this: ExtensionContext): string {
  this.validateSource();
  const adapter = new XNodeToCsvAdapter();
  const result = this.executeAdapter(adapter, this.xnode!);
  
  // Log output metadata
  this.context.logger.info('CSV output generated', {
    delimiter: this.context.getMetadata('csvOutput', 'delimiter'),
    preservedOriginalFormat: this.context.getMetadata('csvOutput', 'usingOriginalHeaders')
  });
  
  return result;
}

// Example of extension that uses metadata for processing decisions
export function analyzeCsv(this: ExtensionContext): any {
  this.validateSource();
  
  const analysis = {
    source: {
      totalLines: this.context.getMetadata('csv', 'totalLines'),
      rowCount: this.context.getMetadata('csv', 'rowCount'),
      columnCount: this.context.getMetadata('csv', 'columnCount'),
      headers: this.context.getMetadata('csv', 'headers'),
      delimiter: this.context.getMetadata('csv', 'delimiter')
    },
    structure: {
      // Analyze the XNode structure
      nodeTypes: this.analyzeNodeTypes(),
      dataTypes: this.analyzeDataTypes()
    }
  };
  
  // Store analysis results
  this.context.setMetadata('analysis', 'csvAnalysis', analysis);
  this.context.setMetadata('analysis', 'analyzedAt', new Date().toISOString());
  
  return analysis;
}

// Register with defaults and metadata usage examples
XJFN.registerExtension('fromCsv', { method: fromCsv, isTerminal: false }, {
  csv: {
    delimiter: ',',        // Column separator
    quote: '"',           // Quote character  
    escape: '"',          // Escape character
    headers: true,        // Expect headers in first row
    skipEmptyLines: true  // Skip blank lines
  }
});

XJFN.registerExtension('toCsv', { method: toCsv, isTerminal: true });
XJFN.registerExtension('analyzeCsv', { method: analyzeCsv, isTerminal: true });
```

## Implementation Phases

### Phase 1: Core Infrastructure
**Foundation Layer - Build core semantic system**

**Core Components:**
- [ ] Enhanced XNode system with structured attributes (`src/core/xnode.ts`)
- [ ] Simplified PipelineContext with namespaced metadata (`src/core/context.ts`)
- [ ] Unified extension system (`src/core/extension.ts`)
- [ ] Configuration management (`src/core/config.ts`)
- [ ] Adapter interface (`src/core/adapter.ts`)
- [ ] Error handling (`src/core/error.ts`)
- [ ] Logging system (`src/core/logger.ts`)
- [ ] Tree traversal utilities (`src/core/traversal.ts`)

**Dependencies:** DOM utilities, common utilities
**Output:** Complete core system ready for extensions

### Phase 2: Main XJFN Class & Extension Registration
**Extension Infrastructure - Build registration and execution system**

**Components:**
- [ ] Main XJFN class with unified extension registration (`src/XJFN.ts`)
- [ ] Extension context implementation
- [ ] Adapter execution framework
- [ ] Configuration merging system

**Dependencies:** Phase 1 core infrastructure
**Output:** Working XJFN class that can register and execute extensions

### Phase 3: Transform Functions  
**Value Transformation - Build pure transform functions**

**Components:**
- [ ] Transform function interface (`src/transforms/index.ts`)
- [ ] Number transformation (`src/transforms/number.ts`)
- [ ] Boolean transformation (`src/transforms/boolean.ts`) 
- [ ] Regex transformation (`src/transforms/regex.ts`)
- [ ] Composition utilities (`src/transforms/compose.ts`)

**Dependencies:** Phase 1 XNode system
**Output:** Complete transform function library for use with map()

### Phase 4: Functional Operations
**Tree Manipulation - Build functional API operations**

**Components:**
- [ ] filter() operation (`src/extensions/functional.ts`)
- [ ] map() operation  
- [ ] select() operation
- [ ] branch()/merge() operations
- [ ] reduce() operation
- [ ] Tree traversal and path utilities

**Dependencies:** Phase 1 core + Phase 2 extension system + Phase 3 transforms
**Output:** Complete functional API (filter, map, select, branch, merge, reduce)

### Phase 5: Format Adapters
**Format Conversion - Build self-contained format adapters**

**XML Adapter:**
- [ ] XML to XNode conversion (`src/adapters/xml.ts`)
- [ ] XNode to XML conversion
- [ ] Extension methods (fromXml, toXml, toXmlString)
- [ ] XML-specific configuration

**JSON Adapter:**
- [ ] JSON to XNode conversion (`src/adapters/json.ts`)
- [ ] XNode to JSON conversion  
- [ ] Extension methods (fromJson, toJson, toJsonString)
- [ ] JSON-specific configuration (compact, user-friendly format)

**XNode Adapter:**
- [ ] XNode serialization to JSON (`src/adapters/xnode.ts`)
- [ ] XNode deserialization from JSON
- [ ] Extension methods (fromXNode, toXNode, toXNodeString)
- [ ] Lossless semantic tree preservation

**Dependencies:** Phase 2 extension system + Phase 1 adapters
**Output:** Complete XML, JSON, and XNode format support with perfect round-trip capability

### Phase 6: Configuration Extensions
**Configuration API - Build configuration management extensions**

**Components:**
- [ ] withConfig() extension (`src/extensions/config.ts`)
- [ ] withLogLevel() extension
- [ ] Configuration validation and merging

**Dependencies:** Phase 2 extension system
**Output:** Complete configuration API

### Phase 7: Integration & Exports
**Public API - Assemble complete library**

**Components:**
- [ ] Main index.ts with all exports (`src/index.ts`)
- [ ] Adapter index (`src/adapters/index.ts`)
- [ ] Transform index (`src/transforms/index.ts`)
- [ ] Extension auto-registration
- [ ] TypeScript declarations

**Dependencies:** All previous phases
**Output:** Complete, usable XJFN library

## Implementation Priorities

### Critical Path
1. **XNode System** (Phase 1) - Foundation for everything
2. **Extension Registration** (Phase 2) - Enables all other functionality  
3. **Functional Operations** (Phase 4) - Core API functionality
4. **Format Adapters** (Phase 5) - Essential XML/JSON support

### Parallel Development
- **Transform Functions** (Phase 3) can be developed alongside Phase 4
- **Configuration Extensions** (Phase 6) can be developed alongside Phase 5
- **Integration** (Phase 7) happens after all components are complete

### Success Criteria
- **Clean Architecture**: Clear separation between core and adapters
- **Extensibility**: New format adapters can be added by implementing Adapter interface
- **Consistency**: All extensions follow same registration and execution pattern
- **Simplicity**: Core system is minimal and format-neutral
- **Perfect Round-Trip**: XNode serialization enables lossless conversions
- **Format Flexibility**: Compact JSON for APIs, lossless XNode for archival, native XML for systems

This implementation creates a clean, extensible framework where complexity lives in adapters, not the core, while providing both compact JSON representations and perfect round-trip conversion capabilities through XNode serialization., preserveNumbers: true },
    xml: { preserveNamespaces: false }
  })
  .fromXml(complexXml)
  .branch(node => node.name === 'price')
    .map(compose(
      regex(/[^\d.]/g, ''),                    // Remove currency symbols
      toNumber({ precision: 2 }),             // Convert to number
      node => ({ ...node, processed: true })  // Add metadata
    ))
  .merge()
  .filter(node => node.name !== 'comment')   // Remove comments
  .toJsonString(2);

// Extension using metadata for processing decisions
export function customProcessor(this: ExtensionContext): void {
  this.validateSource();
  
  // Check if source had attributes (stored by JSON adapter)
  const hasAttributes = this.context.getMetadata('json', 'hasAttributes');
  
  if (hasAttributes) {
    // Store our own metadata
    this.context.setMetadata('customProcessor', 'strategy', 'attribute-aware');
    this.context.setMetadata('customProcessor', 'processedAt', new Date().toISOString());
    
    // Different processing for attribute-rich documents
    // ... processing logic
  } else {
    this.context.setMetadata('customProcessor', 'strategy', 'simple');
  }
}

// Functional operations with metadata inspection
const summary = new XJX()
  .fromJson(data)
  .select(node => node.name === 'product' && node.attributes?.active)
  .reduce((stats, node) => {
    stats.count++;
    stats.totalPrice += Number(node.children?.find(c => c.name === 'price')?.value || 0);
    return stats;
  }, { count: 0, totalPrice: 0 });

// High-fidelity round-trip conversion with metadata preservation
const roundTripProcessor = new XJX()
  .withConfig({ 
    json: { highFidelity: true, attributePrefix: '@' },
    xml: { preserveNamespaces: true, preserveComments: true }
  })
  .fromXml(originalXml);

// Check what was preserved
const xmlMetadata = {
  hasDeclaration: roundTripProcessor.context.getMetadata('xml', 'hasDeclaration'),
  hasNamespaces: roundTripProcessor.context.getMetadata('xml', 'hasNamespaces'),
  originalSize: roundTripProcessor.context.getMetadata('xml', 'originalLength')
};

const jsonResult = roundTripProcessor.toJson();

// Convert back with metadata-informed settings
const backToXml = new XJX()
  .withConfig({ 
    json: { highFidelity: true },
    xml: { 
      declaration: xmlMetadata.hasDeclaration,
      encoding: 'UTF-8',
      preserveNamespaces: xmlMetadata.hasNamespaces
    }
  })
  .fromJson(jsonResult)
  .toXmlString();
```

### 6.3 Extension Development Pattern

```typescript
/**
 * Extension Development Pattern - Template for new format adapters
 */

// Example CSV adapter
// File: src/adapters/csv.ts

export interface CsvConfig {
  delimiter: string;
  quote: string;
  escape: string;
  headers: boolean;
  skipEmptyLines: boolean;
}

export class CsvToXNodeAdapter implements Adapter<string, XNode> {
  name = 'csv-to-xnode';
  
  validate(csv: string, context: PipelineContext): void {
    if (!csv || typeof csv !== 'string') {
      throw new ValidationError('CSV input must be a non-empty string');
    }
  }
  
  execute(csv: string, context: PipelineContext): XNode {
    const config = context.config.csv as CsvConfig;
    // Conversion logic here
    return resultNode;
  }
}

export function fromCsv(this: ExtensionContext, csv: string): void {
  const adapter = new CsvToXNodeAdapter();
  this.xnode = this.executeAdapter(adapter, csv);
}

export function toCsv(this: ExtensionContext): string {
  this.validateSource();
  const adapter = new XNodeToCsvAdapter();
  return this.executeAdapter(adapter, this.xnode!);
}

// Register with defaults
XJX.registerExtension('fromCsv', { method: fromCsv, isTerminal: false }, {
  csv: {
    delimiter: ',',
    quote: '"',
    escape: '"',
    headers: true,
    skipEmptyLines: true
  }
});

XJX.registerExtension('toCsv', { method: toCsv, isTerminal: true });
```

## Implementation Phases

### Phase 1: Core Infrastructure
**Foundation Layer - Build core semantic system**

**Core Components:**
- [ ] Enhanced XNode system with structured attributes (`src/core/xnode.ts`)
- [ ] Simplified PipelineContext (`src/core/context.ts`)
- [ ] Unified extension system (`src/core/extension.ts`)
- [ ] Configuration management (`src/core/config.ts`)
- [ ] Adapter interface (`src/core/adapter.ts`)
- [ ] Error handling (`src/core/error.ts`)
- [ ] Logging system (`src/core/logger.ts`)
- [ ] Tree traversal utilities (`src/core/traversal.ts`)

**Dependencies:** DOM utilities, common utilities
**Output:** Complete core system ready for extensions

### Phase 2: Main XJX Class & Extension Registration
**Extension Infrastructure - Build registration and execution system**

**Components:**
- [ ] Main XJX class with unified extension registration (`src/XJX.ts`)
- [ ] Extension context implementation
- [ ] Adapter execution framework
- [ ] Configuration merging system

**Dependencies:** Phase 1 core infrastructure
**Output:** Working XJX class that can register and execute extensions

### Phase 3: Transform Functions  
**Value Transformation - Build pure transform functions**

**Components:**
- [ ] Transform function interface (`src/transforms/index.ts`)
- [ ] Number transformation (`src/transforms/number.ts`)
- [ ] Boolean transformation (`src/transforms/boolean.ts`) 
- [ ] Regex transformation (`src/transforms/regex.ts`)
- [ ] Composition utilities (`src/transforms/compose.ts`)

**Dependencies:** Phase 1 XNode system
**Output:** Complete transform function library for use with map()

### Phase 4: Functional Operations
**Tree Manipulation - Build functional API operations**

**Components:**
- [ ] filter() operation (`src/extensions/functional.ts`)
- [ ] map() operation  
- [ ] select() operation
- [ ] branch()/merge() operations
- [ ] reduce() operation
- [ ] Tree traversal and path utilities

**Dependencies:** Phase 1 core + Phase 2 extension system + Phase 3 transforms
**Output:** Complete functional API (filter, map, select, branch, merge, reduce)

### Phase 5: Format Adapters
**Format Conversion - Build self-contained format adapters**

**XML Adapter:**
- [ ] XML to XNode conversion (`src/adapters/xml.ts`)
- [ ] XNode to XML conversion
- [ ] Extension methods (fromXml, toXml, toXmlString)
- [ ] XML-specific configuration

**JSON Adapter:**
- [ ] JSON to XNode conversion (`src/adapters/json.ts`)
- [ ] XNode to JSON conversion  
- [ ] Extension methods (fromJson, toJson, toJsonString)
- [ ] JSON-specific configuration with high-fidelity support

**Dependencies:** Phase 2 extension system + Phase 1 adapters
**Output:** Complete XML and JSON format support

### Phase 6: Configuration Extensions
**Configuration API - Build configuration management extensions**

**Components:**
- [ ] withConfig() extension (`src/extensions/config.ts`)
- [ ] withLogLevel() extension
- [ ] Configuration validation and merging

**Dependencies:** Phase 2 extension system
**Output:** Complete configuration API

### Phase 7: Integration & Exports
**Public API - Assemble complete library**

**Components:**
- [ ] Main index.ts with all exports (`src/index.ts`)
- [ ] Adapter index (`src/adapters/index.ts`)
- [ ] Transform index (`src/transforms/index.ts`)
- [ ] Extension auto-registration
- [ ] TypeScript declarations

**Dependencies:** All previous phases
**Output:** Complete, usable XJX library

## Implementation Priorities

### Critical Path
1. **XNode System** (Phase 1) - Foundation for everything
2. **Extension Registration** (Phase 2) - Enables all other functionality  
3. **Functional Operations** (Phase 4) - Core API functionality
4. **Format Adapters** (Phase 5) - Essential XML/JSON support

### Parallel Development
- **Transform Functions** (Phase 3) can be developed alongside Phase 4
- **Configuration Extensions** (Phase 6) can be developed alongside Phase 5
- **Integration** (Phase 7) happens after all components are complete

### Success Criteria
- **Clean Architecture**: Clear separation between core and adapters
- **Extensibility**: New format adapters can be added by implementing Adapter interface
- **Consistency**: All extensions follow same registration and execution pattern
- **Simplicity**: Core system is minimal and format-neutral
- **Functionality**: Complete API matches intended design

This implementation creates a clean, extensible framework where complexity lives in adapters, not the core, while providing the excellent semantic foundation and fluent API you envisioned.